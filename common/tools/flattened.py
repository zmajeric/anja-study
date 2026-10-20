"""Flattened iPad notes: marks GoodNotes burned into an exported page (used by extract-notes.py).

A GoodNotes export keeps the learner's strokes as vector paths. Diffing the edited page's paths
against the clean original's (same page, by type + rounded box + colours) leaves only the marks:
    stroke opacity < 1 (the highlighter)            → HIGHLIGHT
    anything else (pen = filled outlines, shapes)   → INK
Marks of one kind and colour whose boxes come within GAP points of each other form one note
(union of boxes), so a written line, a paragraph or a drawing is one note, and a multi-line
highlight is one note.

A pen mark with no recognised words that underlines or encloses printed words (an underline, a
circle round a phrase) marks that content: it becomes a HIGHLIGHT with those words.

GoodNotes also writes its handwriting recognition as invisible text (render mode 3, fonts
`.SFUI-*`). Each recognised word goes to the INK note whose strokes cover most of its box; the
words, in recognition order, are that note's draft text (textBy "ocr"). Visible symbols GoodNotes
adds (⑮, ↳) are not read: printed words come from the clean page.
"""
import pymupdf

GAP = {'INK': (30.0, 12.0), 'HIGHLIGHT': (3.0, 3.0)}   # (across, down) points between boxes of one note
MIN_ALPHA = 0.9                          # a path drawn with less opacity is a highlighter stroke
UNDERLINE, UNDERLINE_REACH = 8.0, 6.0     # a pen mark this flat underlines words ending this far above it
ENCLOSED = 0.6                           # share of a printed word's box a pen mark must enclose


def _sig(d):
    return (d.get('type'), tuple(round(v) for v in d['rect']),
            tuple(round(c, 2) for c in (d.get('color') or ())), tuple(round(c, 2) for c in (d.get('fill') or ())))


def new_paths(page, clean):
    """The edited page's drawings that the clean page does not have."""
    left = {}
    for d in clean.get_drawings():
        left[_sig(d)] = left.get(_sig(d), 0) + 1
    out = []
    for d in page.get_drawings():
        s = _sig(d)
        if left.get(s):
            left[s] -= 1
        else:
            out.append(d)
    return out


def _stroke(d, colour_name):
    alpha = d.get('stroke_opacity') if d['type'] == 's' else d.get('fill_opacity')
    kind = 'HIGHLIGHT' if (alpha if alpha is not None else 1) < MIN_ALPHA else 'INK'
    rgb = d.get('color') if d['type'] == 's' else d.get('fill') or d.get('color')
    pad = (d.get('width') or 0) / 2 if d['type'] != 'f' else 0
    return {'kind': kind, 'colour': colour_name(rgb), 'rect': pymupdf.Rect(d['rect']) + (-pad, -pad, pad, pad),
            'points': _points(d), 'width': (d.get('width') or 0) if d['type'] != 'f' else 0}


def _points(d):
    pts = []
    for it in d['items']:
        if it[0] in ('l', 'c'):
            pts.append([(p.x, p.y) for p in it[1:]])
        elif it[0] == 're':
            r = it[1]
            pts.append([(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1), (r.x0, r.y0)])
        elif it[0] == 'qu':
            q = it[1]
            pts.append([(p.x, p.y) for p in (q.ul, q.ur, q.lr, q.ll, q.ul)])
    return pts


def _near(a, b, gap=(0, 0)):
    gx, gy = gap
    return a.x0 - gx <= b.x1 and b.x0 - gx <= a.x1 and a.y0 - gy <= b.y1 and b.y0 - gy <= a.y1


def _group(strokes, gap):
    """Union-find over strokes whose boxes come within `gap` (across, down); returns lists of strokes."""
    parent = list(range(len(strokes)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    order = sorted(range(len(strokes)), key=lambda i: strokes[i]['rect'].x0)
    for n, i in enumerate(order):
        ri = strokes[i]['rect']
        for j in order[n + 1:]:
            rj = strokes[j]['rect']
            if rj.x0 - gap[0] > ri.x1:
                break
            if _near(ri, rj, gap):
                parent[root(i)] = root(j)
    groups = {}
    for i in range(len(strokes)):
        groups.setdefault(root(i), []).append(strokes[i])
    return list(groups.values())


def _seg_dist(px, py, a, b):
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5


def _printed_words(clean, group):
    """Printed words of the clean page lying under a group of highlighter strokes."""
    return ' '.join(w[4] for w in clean.get_text('words')
                    if any(_under(s, (w[0] + w[2]) / 2, (w[1] + w[3]) / 2) for s in group))


def _under(s, x, y):
    """A point lies under a stroke: within half its width of the stroke's line (a filled shape:
    inside its box)."""
    if not s['rect'].contains((x, y)):
        return False
    if not s['width']:
        return True
    reach = s['width'] / 2 + 2
    return any(_seg_dist(x, y, p[k], p[k + 1]) <= reach for p in s['points'] for k in range(len(p) - 1))


def _recognised(page):
    """GoodNotes' invisible handwriting recognition: [(rect, text)] in recognition order."""
    out = []
    for t in page.get_texttrace():
        if t['type'] == 3 and t['font'].startswith('.SFUI'):
            text = ''.join(chr(c[0]) for c in t['chars']).strip()
            if text:
                out.append((pymupdf.Rect(t['bbox']), text))
    return out


def notes(page, clean, colour_name):
    """The flattened notes of one page: [{kind, colour, rect, text, textBy}]."""
    strokes = [_stroke(d, colour_name) for d in new_paths(page, clean)]
    out = []
    for kind in ('HIGHLIGHT', 'INK'):
        by_colour = {}
        for s in strokes:
            if s['kind'] == kind:
                by_colour.setdefault(s['colour'], []).append(s)
        for colour, group in sorted(by_colour.items()):
            for g in _group(group, GAP[kind]):
                rect = pymupdf.Rect(g[0]['rect'])
                for s in g[1:]:
                    rect |= s['rect']
                text = _printed_words(clean, g) if kind == 'HIGHLIGHT' else ''
                out.append({'kind': kind, 'colour': colour, 'rect': rect, 'strokes': g,
                            'text': text, 'textBy': 'pdf' if text else None})
    _assign_recognised(page, [n for n in out if n['kind'] == 'INK'])
    for n in out:
        del n['strokes']
        if n['kind'] == 'INK' and sum(ch.isalnum() for ch in n['text']) < 2:
            marked = _marked_words(clean, n['rect'])
            if marked:
                n.update(kind='HIGHLIGHT', text=marked, textBy='pdf')
    return out


def _marked_words(clean, rect):
    """Printed words a pen mark points at: underlined by a flat mark, or enclosed by any other."""
    out = []
    for w in clean.get_text('words'):
        box = pymupdf.Rect(w[:4])
        cx = (box.x0 + box.x1) / 2
        if rect.height <= UNDERLINE:
            hit = rect.x0 <= cx <= rect.x1 and rect.y0 - UNDERLINE_REACH <= box.y1 <= rect.y1 + 2
        else:
            hit = (box & rect).get_area() >= ENCLOSED * box.get_area() > 0
        if hit:
            out.append(w[4])
    return ' '.join(out)


def _assign_recognised(page, inks):
    words = {id(n): [] for n in inks}
    for box, text in _recognised(page):
        best, cover = None, 0.0
        for n in inks:
            if not _near(n['rect'], box):
                continue
            c = sum((s['rect'] & box).get_area() for s in n['strokes'] if _near(s['rect'], box))
            if c > cover:
                best, cover = n, c
        if best is not None:
            words[id(best)].append(text)
    for n in inks:
        if words[id(n)]:
            n['text'], n['textBy'] = ' '.join(words[id(n)]), 'ocr'
