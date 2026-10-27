"""Extract the learner's iPad notes from <subject>/source/*_edited.pdf into <subject>/notes/.

    python common/tools/extract-notes.py <subject>

Terms (CONTEXT.md): an iPad note is a HIGHLIGHT (marks existing content: text, or an area) or
INK (handwriting, drawings), in a named colour; its tag is ipad-note:<KIND>-<COLOUR>.

Two sources of notes, both read on every page:
  Real PDF annotations:
    Highlight / Underline / Squiggly / StrikeOut  → HIGHLIGHT, text = the words under it
                                                    (none under it → an area highlight, cropped)
    Ink / FreeText / Text / Square / Circle / Line / Polygon / PolyLine → INK, cropped
  Flattened marks (GoodNotes export; needs the clean original `<name>.pdf` beside it): vector
    paths the clean page does not have. Semi-transparent paths (highlighter) → HIGHLIGHT, the rest
    (pen, shapes) → INK; marks of one kind and colour lying close together are one note (a written
    line or paragraph, a drawing, a multi-line highlight). INK text is GoodNotes' own handwriting
    recognition, as a draft (textBy "ocr"). How: common/tools/flattened.py.
A page that differs from the clean original in neither way above but still renders differently
(e.g. raster marks) is listed under "unread" for the user.

Colours: the stroke colour's hue picks the name (PALETTE, hue ranges in degrees); dark or grey
colours are BLACK, pale reds are PINK.

Output:
    notes/notes.json      {"generated": date, "notes": [record...], "unread": [{resource, page}...]}
    notes/img/<id>.png    crop of every INK note and every HIGHLIGHT without printed words

Record: {id, kind, colour, tag, resource, page, rect, text, image, chapter, lesson, anchor, textBy}
  - id: stable hash of resource + page + kind + position (+ a suffix if two notes coincide), so a
    re-run on the same PDF recognises the same note.
  - text / textBy: HIGHLIGHT → words under it, "pdf". INK → a PDF annotation's own content ("pdf"),
    GoodNotes' recognition ("ocr", a draft), or empty; the agent checks or writes it from the crop
    (unreadable words as [?]) → "agent"; corrected by the learner → "user".
  - chapter / lesson / anchor: set by the agent (lesson = "lessons/NNNN-….html", anchor = heading id).
A re-run keeps chapter, lesson, anchor, and any agent/user text of notes it finds again, adds new
notes, and drops notes that are gone from the PDF (with their crops).
"""
import colorsys, datetime, hashlib, json, sys
from pathlib import Path

import pymupdf

import flattened

sys.stdout.reconfigure(encoding='utf-8')

HIGHLIGHTS = {'Highlight', 'Underline', 'Squiggly', 'StrikeOut'}
INKS = {'Ink', 'FreeText', 'Text', 'Square', 'Circle', 'Line', 'Polygon', 'PolyLine'}
PALETTE = [  # (name, hue from, hue to) in degrees; the first range that holds the hue wins
    ('RED', 0, 15), ('ORANGE', 15, 45), ('YELLOW', 45, 70), ('GREEN', 70, 170), ('BLUE', 170, 255),
    ('PURPLE', 255, 300), ('PINK', 300, 345), ('RED', 345, 361),
]
DARK, GREY, PALE = 0.25, 0.2, 0.5   # value below DARK or saturation below GREY → BLACK; red below PALE → PINK
KEEP = ('chapter', 'lesson', 'anchor')
CROP_ZOOM = 2.5
DIFF_DPI = 40


def colour_name(rgb):
    if not rgb:
        return 'BLACK'
    rgb = tuple(rgb[:3]) if len(rgb) >= 3 else (rgb[0],) * 3
    h, sat, val = colorsys.rgb_to_hsv(*rgb)
    if val < DARK or sat < GREY:
        return 'BLACK'
    name = next(n for n, lo, hi in PALETTE if lo <= h * 360 < hi)
    return 'PINK' if name == 'RED' and sat < PALE else name


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
    if r.is_empty or r.width < 1 or r.height < 1:   # a mark off the page or of no size
        r = page.rect
    page.get_pixmap(matrix=pymupdf.Matrix(CROP_ZOOM, CROP_ZOOM), clip=r).save(path)


def page_differs(a, b):
    """True when two renders differ in more than a trace of pixels (flattened marks)."""
    pa, pb = a.get_pixmap(dpi=DIFF_DPI), b.get_pixmap(dpi=DIFF_DPI)
    if (pa.width, pa.height) != (pb.width, pb.height):
        return True
    sa, sb, n = pa.samples, pb.samples, pa.n
    diff = sum(1 for i in range(0, len(sa), n * 3) if abs(sa[i] - sb[i]) + abs(sa[i + 1] - sb[i + 1]) > 60)
    return diff > (len(sa) // (n * 3)) * 0.002


def annotation_notes(page):
    """The page's real PDF annotations as notes: [{kind, colour, rect, text, textBy}]."""
    out = []
    for a in page.annots() or []:
        sub = a.type[1]
        if sub in HIGHLIGHTS:
            kind = 'HIGHLIGHT'
        elif sub in INKS:
            kind = 'INK'
        else:
            continue
        cols = a.colors or {}
        text = words_under(page, a) if kind == 'HIGHLIGHT' else (a.info.get('content') or '').strip()
        out.append({'kind': kind, 'colour': colour_name(cols.get('stroke') or cols.get('fill')),
                    'rect': a.rect, 'text': text, 'textBy': 'pdf' if text else None})
    return out


def record(found, resource, pno, page, out, old, taken):
    """A notes.json record for one found note: stable id, crop, and what a re-run keeps."""
    kind, colour = found['kind'], found['colour']
    rect = [round(v, 1) for v in found['rect']]
    nid = note_id(resource, pno, kind, rect)
    while nid in taken:
        nid = hashlib.sha1((nid + '+').encode('utf-8')).hexdigest()[:10]
    taken.add(nid)
    rec = {'id': nid, 'kind': kind, 'colour': colour, 'tag': f'ipad-note:{kind}-{colour}',
           'resource': resource, 'page': pno, 'rect': rect, 'text': found['text'], 'image': None,
           'chapter': None, 'lesson': None, 'anchor': None, 'textBy': found['textBy']}
    if kind == 'INK' or found['textBy'] != 'pdf':
        rec['image'] = f'img/{nid}.png'
        crop(page, found['rect'], out / rec['image'])
    prev = old.get(nid)
    if prev:
        for k in KEEP:
            rec[k] = prev.get(k)
        if prev.get('textBy') in ('agent', 'user'):
            rec['text'], rec['textBy'] = prev['text'], prev['textBy']
    return rec


def extract(subject):
    source, out = subject / 'source', subject / 'notes'
    (out / 'img').mkdir(parents=True, exist_ok=True)
    store = out / 'notes.json'
    old = {n['id']: n for n in json.loads(store.read_text(encoding='utf-8'))['notes']} if store.exists() else {}

    notes, unread, taken = [], [], set()
    for edited in sorted(source.glob('*_edited.pdf')):
        resource = edited.name.replace('_edited', '')
        original = source / resource
        doc = pymupdf.open(edited)
        clean = pymupdf.open(original) if original.exists() else None
        for pno, page in enumerate(doc, start=1):
            found = annotation_notes(page)
            twin = clean[pno - 1] if clean and pno <= len(clean) else None
            if twin and not found:   # annotation appearances would read as strokes too
                found = flattened.notes(page, twin, colour_name)
            notes += [record(f, resource, pno, page, out, old, taken) for f in found]
            if not found and twin and page_differs(page, twin):
                unread.append({'resource': resource, 'page': pno})

    notes.sort(key=lambda n: (n['resource'], n['page'], n['rect'][1], n['rect'][0]))
    live = {n['id'] for n in notes}
    for gone in set(old) - live:
        img = old[gone].get('image')
        if img and (out / img).exists():
            (out / img).unlink()
    store.write_text(json.dumps({'generated': datetime.date.today().isoformat(), 'notes': notes,
                                 'unread': unread}, ensure_ascii=False, indent=1), encoding='utf-8')
    report(notes, old, unread, store)


def report(notes, old, unread, store):
    live = {n['id'] for n in notes}
    print(f'{len(notes)} notes ({len(live - set(old))} new, {len(set(old) - live)} removed) -> {store}')
    for kind in ('HIGHLIGHT', 'INK'):
        by = {}
        for n in notes:
            if n['kind'] == kind:
                by[n['colour']] = by.get(n['colour'], 0) + 1
        if by:
            print(f'  {kind}: ' + ', '.join(f'{c} {k}' for c, k in sorted(by.items())))
    check = [n for n in notes if n['kind'] == 'INK' and n['textBy'] not in ('agent', 'user')]
    if check:
        print(f'  INK to transcribe or check against its crop: {len(check)} '
              f'({sum(1 for n in check if n["textBy"] == "ocr")} with a recognition draft)')
    unplaced = [n for n in notes if not n['chapter']]
    if unplaced:
        print(f'  without chapter: {len(unplaced)}')
    if unread:
        print(f'  marks not read (page differs, no annotations or vector marks) on {len(unread)} page(s): ' +
              ', '.join(f'{f["resource"]} p{f["page"]}' for f in unread[:10]))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    extract(Path(sys.argv[1]))
