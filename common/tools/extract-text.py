"""Extract the text of a subject's PDF resources into <subject>/source/<same name>.md.

    python common/tools/extract-text.py <subject> [resource ...] [--notes-beside-slides]

Without resource names it extracts every PDF in <subject>/source/ that has no .md yet, skipping
`*_edited.pdf` copies (their marks are iPad notes: common/tools/extract-notes.py). Named resources
are always re-extracted. DOCX / PPTX are not handled here (use the docx / pptx skills).

Output: `## Page N` per PDF page (the numbering of assets/img/source/index.json), with PDF bookmarks
as `#` chapter headings. Three things are handled on the way:

  - GoodNotes handwriting: invisible text in Apple's `.SFUI-*` font is handwriting recognition of the
    learner's ink. It is kept apart, under **Handwritten (OCR)**, never mixed with the printed text.
  - Broken ligatures: some typesetters (Type3 font subsets) map fi, fl, ff, Th ... to private-use
    code points, numbered differently in every subset. Each such glyph is keyed by its drawing
    (the CharProc stream, identical in every subset), its reading is learnt from the words where
    exactly one reading is an English word (/usr/share/dict/words), and then applied everywhere.
  - --notes-beside-slides: for slide handouts the learner typed notes on (GoodNotes text boxes, same
    font as the slides). Text on a slide image is the lecturer's; text off the slides is listed under
    **Typed notes (learner)**.
"""
import collections, datetime, hashlib, itertools, re, sys
from pathlib import Path

import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

TODAY = datetime.date.today().isoformat()
PUA = re.compile(r'[-]')
READINGS = ['fi', 'fl', 'ff', 'ffi', 'ffl', 'ft', 'Th', 'th', 'tt', ' ', '']
MAX_GLYPHS = 3           # words with more private-use glyphs are runs glued by them: vote only
SETTLED_VOTES, SETTLED_SHARE = 10, 0.8
DICT = Path('/usr/share/dict/words')
WORDS = (({w.strip().lower() for w in DICT.open(encoding='utf-8')} if DICT.exists() else set())
         - {'fie', 'fis', 'fiat'}) | {'et', 'al', 'vs'}


# ---------- spans ----------

def is_ocr(span):
    return span['font'].startswith('.SFUI') or span.get('alpha', 255) == 0


def spans(page):
    return [s for b in page.get_text('dict', sort=True)['blocks'] for l in b.get('lines', []) for s in l['spans']]


def visual_lines(items):
    """(bbox, text) items grouped into lines (same vertical band), each read left to right."""
    rows = []
    for bbox, text in sorted(items, key=lambda w: (w[0][1] + w[0][3]) / 2):
        yc, h = (bbox[1] + bbox[3]) / 2, bbox[3] - bbox[1]
        if rows and abs(yc - rows[-1][0]) < max(h, rows[-1][1]) * 0.5:
            rows[-1][2].append((bbox[0], text))
        else:
            rows.append([yc, h, [(bbox[0], text)]])
    return [' '.join(' '.join(t for _, t in sorted(r[2])).split()) for r in rows]


def printed_lines(page, keep=lambda s: True):
    out = []
    for b in page.get_text('dict', sort=True)['blocks']:
        for l in b.get('lines', []):
            t = ' '.join(''.join(s['text'] for s in l['spans'] if not is_ocr(s) and keep(s)).split())
            if t:
                out.append(t)
    return out


def ink_lines(page):
    return visual_lines([(s['bbox'], s['text'].strip()) for s in spans(page) if is_ocr(s) and s['text'].strip()])


def on_slide(page):
    rects = [r for img in page.get_images(full=True) for r in page.get_image_rects(img[0])]
    def inside(span):
        x, y = (span['bbox'][0] + span['bbox'][2]) / 2, (span['bbox'][1] + span['bbox'][3]) / 2
        return any(r.x0 <= x <= r.x1 and r.y0 <= y <= r.y1 for r in rects)
    return inside


# ---------- ligatures ----------

def cmap_pairs(cmap):
    """(code, unicode) pairs from a ToUnicode CMap's bfchar and bfrange sections."""
    pairs = []
    for body in re.findall(r'beginbfchar(.*?)endbfchar', cmap, re.S):
        pairs += [(int(a, 16), int(b, 16)) for a, b in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]{4})>', body)]
    for body in re.findall(r'beginbfrange(.*?)endbfrange', cmap, re.S):
        for lo, hi, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]{4})>', body):
            pairs += [(c, int(dst, 16) + c - int(lo, 16)) for c in range(int(lo, 16), int(hi, 16) + 1)]
    return pairs


def glyph_shapes(doc):
    """{(font name, private-use char): hash of the glyph's drawing} for every Type3 font."""
    shapes = {}
    for xref in range(1, doc.xref_length()):
        if doc.xref_get_key(xref, 'Subtype')[1] != '/Type3':
            continue
        tu, procs = doc.xref_get_key(xref, 'ToUnicode'), doc.xref_get_key(xref, 'CharProcs')
        if tu[0] != 'xref' or procs[0] != 'dict':
            continue
        cmap = doc.xref_stream(int(tu[1].split()[0])).decode('latin1')
        names = dict(re.findall(r'/(g[0-9A-F]+) (\d+) 0 R', procs[1]))
        for code, uni in cmap_pairs(cmap):
            proc = names.get('g' + format(code, 'X'))
            if PUA.match(chr(uni)) and proc:
                shapes[(f'Type3 ({xref} 0 R)', chr(uni))] = hashlib.sha1(doc.xref_stream(int(proc))).hexdigest()[:12]
    return shapes


def words_of_line(line):
    """A rawdict line as words, each a list of (char, font)."""
    words, word = [], []
    for ch, font in [(c['c'], s['font']) for s in line['spans'] for c in s['chars']] + [(' ', '')]:
        if ch.isspace():
            if word:
                words.append(word)
            word = []
        else:
            word.append((ch, font))
    return words


def is_english(text):
    toks = [re.sub(r'^[^A-Za-z]+|[^A-Za-z]+$', '', t).lower() for t in text.split()]
    toks = [t for t in toks if t]
    return bool(toks) and all(t in WORDS or (t.endswith('s') and t[:-1] in WORDS) for t in toks)


class Ligatures:
    def __init__(self, doc):
        self.shapes = glyph_shapes(doc)
        self.votes = collections.defaultdict(collections.Counter)
        words = [w for page in doc for b in page.get_text('rawdict')['blocks'] for l in b.get('lines', [])
                 for w in words_of_line(l) if any(PUA.match(c) for c, _ in w)]
        for word in words:
            keys = self.keys(word)
            if len(keys) > MAX_GLYPHS:
                continue
            passing = {}
            for combo in itertools.product(READINGS, repeat=len(keys)):
                text = self.spell(word, combo)
                if is_english(text):
                    passing.setdefault(text.lower(), combo)
            if len(passing) == 1:                      # learn only from unambiguous words
                for k, r in zip(keys, next(iter(passing.values()))):
                    self.votes[k][r] += 1

    def keys(self, word):
        return [self.shapes.get((f, c), (f, c)) for c, f in word if PUA.match(c)]

    @staticmethod
    def spell(word, combo):
        it = iter(combo)
        return ''.join(next(it) if PUA.match(c) else c for c, _ in word)

    def settled(self, key):
        if not self.votes[key]:
            return None
        top, n = self.votes[key].most_common(1)[0]
        return top if n >= SETTLED_VOTES and n >= SETTLED_SHARE * sum(self.votes[key].values()) else None

    def fix(self, word):
        keys = self.keys(word)
        if len(keys) > MAX_GLYPHS:
            return self.spell(word, [self.votes[k].most_common(1)[0][0] if self.votes[k] else ' ' for k in keys])
        def score(combo):
            sure = all(self.settled(k) in (None, r) for k, r in zip(keys, combo))
            return sure, is_english(self.spell(word, combo)), sum(self.votes[k][r] for k, r in zip(keys, combo))
        return self.spell(word, max(itertools.product(READINGS, repeat=len(keys)), key=score))


def join_lines(lines):
    """A block's lines as one paragraph, re-joining words hyphenated across a line break."""
    text = lines[0]
    for nxt in lines[1:]:
        m, tail = re.search(r'([A-Za-z]+)-$', text), re.match(r'[A-Za-z]+', nxt)
        if m and tail and nxt[:1].islower():
            head = m.group(1)
            keep = (head + tail.group(0)).lower() not in WORDS and head.lower() in WORDS and tail.group(0).lower() in WORDS
            text = text[:-1] + ('-' if keep else '') + nxt
        else:
            text += ' ' + nxt
    return text


def paragraphs(page, lig):
    paras = []
    for b in page.get_text('rawdict')['blocks']:
        lines = []
        for l in b.get('lines', []):
            if any(is_ocr(s) for s in l['spans']):
                continue
            line = ' '.join(lig.fix(w) if any(PUA.match(c) for c, _ in w) else ''.join(c for c, _ in w)
                            for w in words_of_line(l)).strip()
            if line:
                lines.append(line)
        if lines:
            paras.append(join_lines(lines))
    return paras


# ---------- pages ----------

def page_md(page, lig, notes_beside_slides):
    if lig:
        body = [p + '\n' for p in paragraphs(page, lig)]
    elif notes_beside_slides:
        inside = on_slide(page)
        body = printed_lines(page, inside) or ['_(no slide text)_']
        typed = [t for t in printed_lines(page, lambda s: not inside(s)) if not t.isdigit()]
        if typed:
            body += ['', '**Typed notes (learner):** ' + ' / '.join(typed)]
    else:
        body = printed_lines(page) or ['_(no printed text)_']
    ink = ink_lines(page)
    if ink:
        body += ['', '**Handwritten (OCR):** ' + ' / '.join(ink)]
    return body


def header(path, has_ink, lig, notes_beside_slides):
    lines = [f'# {path.name}', '', f'Text extracted from `{path.name}` on {TODAY} by `common/tools/extract-text.py`. '
             '`## Page N` is the PDF page (the numbering of `assets/img/source/index.json`).']
    if lig:
        lines.append('Ligatures (fi, fl, ff, Th …) were restored from the font glyphs; a rare word may still be wrong.')
    if notes_beside_slides:
        lines.append('Slide text is the lecturer\'s. **Typed notes (learner)** are the learner\'s own notes typed '
                     'beside the slides: unchecked, and possibly in another language.')
    if has_ink:
        lines.append('**Handwritten (OCR)** is handwriting recognition of the learner\'s own ink: unreliable '
                     '(misread words, stray symbols). Check the page image before trusting it.')
    return lines + ['']


def to_md(path, notes_beside_slides):
    doc = pymupdf.open(path)
    lig = Ligatures(doc) if any(PUA.search(p.get_text()) for p in doc) else None
    toc = {p: t.replace('\x00', '').strip() for _, t, p in doc.get_toc()}
    has_ink = any(is_ocr(s) for p in doc for s in spans(p))
    parts = header(path, has_ink, lig, notes_beside_slides)
    for pno, page in enumerate(doc, start=1):
        if pno in toc:
            parts += [f'# {toc[pno]}', '']
        parts += [f'## Page {pno}', ''] + page_md(page, lig, notes_beside_slides) + ['']
    return '\n'.join(parts)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    notes_beside_slides = '--notes-beside-slides' in sys.argv
    source = Path(args[0]) / 'source'
    named = args[1:]
    files = [source / n for n in named] if named else sorted(
        p for p in source.iterdir()
        if p.suffix.lower() == '.pdf' and not p.stem.endswith('_edited') and not p.with_suffix('.md').exists())
    for path in files:
        text = to_md(path, notes_beside_slides)
        path.with_suffix('.md').write_text(text, encoding='utf-8')
        print(f'{len(text):8d}  {path.with_suffix(".md").name}')
    if not files:
        print('nothing to extract (every PDF has its .md; name a resource to re-extract it)')


if __name__ == '__main__':
    main()
