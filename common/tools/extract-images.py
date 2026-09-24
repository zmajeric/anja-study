"""Pull every image out of a subject's resources into <subject>/assets/img/source/.

    python common/tools/extract-images.py <subject> [resource ...]

Without resource names it walks every PDF / DOCX / PPTX in <subject>/source/, skipping
`*_edited.*` copies (they carry iPad notes, not new images). Output:

    assets/img/source/<resource-slug>/p<page>-<n>.<ext>     (DOCX/PPTX: m<n>.<ext>, no page)
    assets/img/source/index.json                             one record per image

Each record: {file, resource, page, width, height, text} where `text` is up to 200 characters of
the page text nearest the image, so the agent can find a picture without opening it. Images
smaller than MIN_SIDE on either side (logos, bullets) and exact duplicates are skipped. Re-running
is safe: resources already in index.json are skipped unless named explicitly.

The agent later picks from this raw set, crops, and saves named copies as assets/img/<name>.jpg
for image questions (see .claude/skills/anja-teach/BANKS.md).
"""
import hashlib, json, re, sys, zipfile
from pathlib import Path

import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

MIN_SIDE = 120
NEARBY = 200


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', Path(name).stem.lower()).strip('-')


def nearby_text(page, rect):
    """Text blocks ordered by distance from the image, joined up to NEARBY characters."""
    blocks = [b for b in page.get_text('blocks') if b[4].strip()]
    cx, cy = (rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2
    blocks.sort(key=lambda b: ((b[0] + b[2]) / 2 - cx) ** 2 + ((b[1] + b[3]) / 2 - cy) ** 2)
    out = ''
    for b in blocks:
        t = ' '.join(b[4].split())
        if len(out) + len(t) > NEARBY:
            return (out + ' ' + t)[:NEARBY].strip()
        out = (out + ' ' + t).strip()
    return out


def from_pdf(path, outdir, seen):
    doc = pymupdf.open(path)
    records = []
    for pno, page in enumerate(doc, start=1):
        n = 0
        for info in page.get_images(full=True):
            xref = info[0]
            try:
                img = doc.extract_image(xref)
            except Exception:
                continue
            if not img or min(img['width'], img['height']) < MIN_SIDE:
                continue
            digest = hashlib.sha1(img['image']).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            ext = img['ext'] if img['ext'] in ('jpg', 'jpeg', 'png') else 'png'
            data = img['image']
            if ext == 'png' and img['ext'] != 'png':
                pix = pymupdf.Pixmap(doc, xref)
                if pix.n - pix.alpha >= 4:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                data = pix.tobytes('png')
            n += 1
            name = f'p{pno}-{n}.{"jpg" if ext == "jpeg" else ext}'
            (outdir / name).write_bytes(data)
            rects = page.get_image_rects(xref)
            records.append({'file': name, 'page': pno, 'width': img['width'], 'height': img['height'],
                            'text': nearby_text(page, rects[0]) if rects else ''})
    return records


def from_office(path, outdir, seen):
    """DOCX / PPTX are zip files with their pictures under */media/."""
    records, n = [], 0
    with zipfile.ZipFile(path) as z:
        for member in sorted(z.namelist()):
            if '/media/' not in member:
                continue
            ext = member.rsplit('.', 1)[-1].lower()
            if ext not in ('jpg', 'jpeg', 'png', 'gif'):
                continue
            data = z.read(member)
            digest = hashlib.sha1(data).hexdigest()
            if digest in seen:
                continue
            try:
                pix = pymupdf.Pixmap(data)
                w, h = pix.width, pix.height
            except Exception:
                continue
            if min(w, h) < MIN_SIDE:
                continue
            seen.add(digest)
            n += 1
            name = f'm{n}.{"jpg" if ext == "jpeg" else ext}'
            (outdir / name).write_bytes(data)
            records.append({'file': name, 'page': None, 'width': w, 'height': h, 'text': ''})
    return records


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    subject = Path(sys.argv[1])
    source = subject / 'source'
    root = subject / 'assets' / 'img' / 'source'
    root.mkdir(parents=True, exist_ok=True)
    index_path = root / 'index.json'
    index = json.loads(index_path.read_text(encoding='utf-8')) if index_path.exists() else []

    named = sys.argv[2:]
    files = [source / n for n in named] if named else sorted(
        p for p in source.iterdir()
        if p.suffix.lower() in ('.pdf', '.docx', '.pptx') and not p.stem.endswith('_edited'))
    done = {r['resource'] for r in index}
    seen = set()

    for path in files:
        if not named and path.name in done:
            print(f'skip  {path.name} (already extracted)')
            continue
        index = [r for r in index if r['resource'] != path.name]
        outdir = root / slug(path.name)
        outdir.mkdir(exist_ok=True)
        for old in outdir.iterdir():
            old.unlink()
        records = from_pdf(path, outdir, seen) if path.suffix.lower() == '.pdf' else from_office(path, outdir, seen)
        for r in records:
            r['file'] = f'{slug(path.name)}/{r["file"]}'
            r['resource'] = path.name
        index += records
        print(f'{len(records):4d}  {path.name}')

    index.sort(key=lambda r: (r['resource'], r['page'] or 0, r['file']))
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'index: {index_path} ({len(index)} images)')


if __name__ == '__main__':
    main()
