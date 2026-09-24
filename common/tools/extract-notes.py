"""Extract the learner's iPad notes from <subject>/source/*_edited.pdf into <subject>/notes/.

    python common/tools/extract-notes.py <subject>

Terms (CONTEXT.md): an iPad note is a HIGHLIGHT (marks existing content: text, or an area) or
INK (handwriting), in a named colour; its tag is ipad-note:<KIND>-<COLOUR>.

Reads real PDF annotations:
    Highlight / Underline / Squiggly / StrikeOut  → HIGHLIGHT, text = the words under it
                                                    (none under it → an area highlight, cropped)
    Ink / FreeText / Text / Square / Circle / Line / Polygon / PolyLine → INK, cropped
A page with no annotations that still differs from the clean original (`<name>.pdf` beside
`<name>_edited.pdf`) holds *flattened* marks (GoodNotes export). Those are reported, not yet
extracted: that needs a GoodNotes sample to tune (see docs/adr, iPad notes).

Output:
    notes/notes.json      {"generated": date, "notes": [record...], "flattened": [{resource, page}...]}
    notes/img/<id>.png    crop of every INK note and every area HIGHLIGHT

Record: {id, kind, colour, tag, resource, page, rect, text, image, chapter, lesson, anchor, textBy}
  - id: stable hash of resource + page + kind + position, so a re-run recognises the same note.
  - text: HIGHLIGHT → words under it (from the PDF); INK → empty until the agent transcribes the
    crop (unreadable words as [?]), textBy "agent"; corrected by the learner → textBy "user".
  - chapter / lesson / anchor: set by the agent (lesson = "lessons/NNNN-….html", anchor = heading id).
A re-run keeps chapter, lesson, anchor, and any agent/user text of notes it finds again, adds new
notes, and drops notes that are gone from the PDF.
"""
import datetime, hashlib, json, sys
from pathlib import Path

import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

HIGHLIGHTS = {'Highlight', 'Underline', 'Squiggly', 'StrikeOut'}
INKS = {'Ink', 'FreeText', 'Text', 'Square', 'Circle', 'Line', 'Polygon', 'PolyLine'}
PALETTE = {
    'YELLOW': (1.0, 0.9, 0.2), 'GREEN': (0.3, 0.8, 0.3), 'BLUE': (0.2, 0.5, 1.0), 'PINK': (1.0, 0.5, 0.8),
    'RED': (0.9, 0.15, 0.15), 'PURPLE': (0.6, 0.3, 0.9), 'ORANGE': (1.0, 0.6, 0.1), 'BLACK': (0.1, 0.1, 0.1),
}
KEEP = ('chapter', 'lesson', 'anchor')
CROP_ZOOM = 2.5
DIFF_DPI = 40


def colour_name(rgb):
    if not rgb:
        return 'BLACK'
    rgb = tuple(rgb[:3]) if len(rgb) >= 3 else (rgb[0],) * 3
    return min(PALETTE, key=lambda k: sum((a - b) ** 2 for a, b in zip(PALETTE[k], rgb)))


def note_id(resource, page, kind, rect):
    key = f'{resource}|{page}|{kind}|' + ','.join(str(round(v / 4)) for v in rect)
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:10]


def words_under(page, annot):
    """The page words whose centres fall inside the highlight's quads (reading order)."""
    verts = annot.vertices or []
    quads = [pymupdf.Quad(verts[i:i + 4]).rect for i in range(0, len(verts) - 3, 4)] or [annot.rect]
    out = []
    for w in page.get_text('words'):
        cx, cy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        if any(q.x0 - 1 <= cx <= q.x1 + 1 and q.y0 - 1 <= cy <= q.y1 + 1 for q in quads):
            out.append(w[4])
    return ' '.join(out)


def crop(page, rect, path):
    r = pymupdf.Rect(rect) + (-6, -6, 6, 6)
    r &= page.rect
    page.get_pixmap(matrix=pymupdf.Matrix(CROP_ZOOM, CROP_ZOOM), clip=r).save(path)


def page_differs(a, b):
    """True when two renders differ in more than a trace of pixels (flattened marks)."""
    pa, pb = a.get_pixmap(dpi=DIFF_DPI), b.get_pixmap(dpi=DIFF_DPI)
    if (pa.width, pa.height) != (pb.width, pb.height):
        return True
    sa, sb, n = pa.samples, pb.samples, pa.n
    diff = sum(1 for i in range(0, len(sa), n * 3) if abs(sa[i] - sb[i]) + abs(sa[i + 1] - sb[i + 1]) > 60)
    return diff > (len(sa) // (n * 3)) * 0.002


def extract(subject):
    source, out = subject / 'source', subject / 'notes'
    (out / 'img').mkdir(parents=True, exist_ok=True)
    store = out / 'notes.json'
    old = {n['id']: n for n in json.loads(store.read_text(encoding='utf-8'))['notes']} if store.exists() else {}

    notes, flattened = [], []
    for edited in sorted(source.glob('*_edited.pdf')):
        resource = edited.name.replace('_edited', '')
        original = source / resource
        doc = pymupdf.open(edited)
        clean = pymupdf.open(original) if original.exists() else None
        for pno, page in enumerate(doc, start=1):
            annots = list(page.annots() or [])
            for a in annots:
                sub = a.type[1]
                if sub in HIGHLIGHTS:
                    kind = 'HIGHLIGHT'
                elif sub in INKS:
                    kind = 'INK'
                else:
                    continue
                cols = a.colors or {}
                colour = colour_name(cols.get('stroke') or cols.get('fill'))
                rect = [round(v, 1) for v in a.rect]
                nid = note_id(resource, pno, kind, rect)
                text = words_under(page, a) if kind == 'HIGHLIGHT' else (a.info.get('content') or '').strip()
                image = None
                if kind == 'INK' or not text:
                    image = f'img/{nid}.png'
                    crop(page, a.rect, out / image)
                rec = {'id': nid, 'kind': kind, 'colour': colour, 'tag': f'ipad-note:{kind}-{colour}',
                       'resource': resource, 'page': pno, 'rect': rect, 'text': text, 'image': image,
                       'chapter': None, 'lesson': None, 'anchor': None, 'textBy': 'pdf' if text else None}
                prev = old.get(nid)
                if prev:
                    for k in KEEP:
                        rec[k] = prev.get(k)
                    if prev.get('textBy') in ('agent', 'user'):
                        rec['text'], rec['textBy'] = prev['text'], prev['textBy']
                notes.append(rec)
            if not annots and clean and pno <= len(clean) and page_differs(page, clean[pno - 1]):
                flattened.append({'resource': resource, 'page': pno})

    notes.sort(key=lambda n: (n['resource'], n['page'], n['rect'][1], n['rect'][0]))
    live = {n['id'] for n in notes}
    for gone in set(old) - live:
        img = old[gone].get('image')
        if img and (out / img).exists():
            (out / img).unlink()
    store.write_text(json.dumps({'generated': datetime.date.today().isoformat(), 'notes': notes,
                                 'flattened': flattened}, ensure_ascii=False, indent=1), encoding='utf-8')

    added = live - set(old)
    print(f'{len(notes)} notes ({len(added)} new, {len(set(old) - live)} removed) -> {store}')
    for kind in ('HIGHLIGHT', 'INK'):
        by = {}
        for n in notes:
            if n['kind'] == kind:
                by[n['colour']] = by.get(n['colour'], 0) + 1
        if by:
            print(f'  {kind}: ' + ', '.join(f'{c} {k}' for c, k in sorted(by.items())))
    todo = [n['id'] for n in notes if n['kind'] == 'INK' and not n['text']]
    if todo:
        print(f'  to transcribe (INK without text): {len(todo)}')
    unplaced = [n['id'] for n in notes if not n['chapter']]
    if unplaced:
        print(f'  without chapter: {len(unplaced)}')
    if flattened:
        print(f'  flattened marks (not extracted yet) on {len(flattened)} page(s): ' +
              ', '.join(f'{f["resource"]} p{f["page"]}' for f in flattened[:10]))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    extract(Path(sys.argv[1]))
