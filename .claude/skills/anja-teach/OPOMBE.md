# iPad notes (`opombe`)

The learner marks resources in GoodNotes and puts the export beside the clean original:
`source/<name>_edited.pdf` next to `source/<name>.pdf`. Both stay: the original is what a flattened
export is compared against. Terms (iPad note, highlight, ink, colour, `ipad-note:` tags) are in the
root `CONTEXT.md`; colours carry the learner's private meaning, so filter on them and never
interpret them.

## 1. Extract

```
python common/tools/extract-notes.py <subject>
```

It writes `notes/notes.json` and `notes/img/`, keeping the chapter, lesson, anchor and
transcriptions of notes it has seen before (its header documents the record). It reads both real
PDF annotations and **flattened marks**, the strokes GoodNotes burns into an exported page: it
compares each page with the clean original, so the original must stay beside the export. Strokes
of one colour lying close together become one note (a written line or paragraph, a drawing, a
multi-line highlight); a drawing in several colours is one note per colour. A pen underline or
circle round printed words counts as a highlight of those words. Ink comes with GoodNotes' own
handwriting recognition as a draft (`textBy: "ocr"`), often wrong.

Read its summary. **Marks not read** are pages that differ from the original in a way the tool does
not read (no annotations, no vector strokes, e.g. pasted images): tell the user which pages.

## 2. Transcribe ink

For every INK note whose `textBy` is not `agent` or `user` (empty, or an `ocr` draft), look at
`notes/<image>` and write what it says into `text`, with `textBy: "agent"`. The crop may show
printed text and other notes: transcribe only the handwriting in the note's colour. Mark each word
you cannot read as `[?]`; never guess a word to make a sentence read well, and use the draft only as
a hint. A note with no words (a drawing, arrow, bracket, dot) gets `[drawing]`; a drawing with
labels gets its labels. Many notes: split them into batches for parallel subagents, each returning
`{id: text}`, and merge. When the user corrects a transcription, write their version with
`textBy: "user"`; re-extraction keeps both.

## 3. Place each note

For every note without `chapter`, set:

- `chapter`: the chapter its resource page belongs to (`subject.json` → `chapters`);
- `lesson`: the lesson (`lessons/NNNN-….html`) that teaches the marked content, if one does;
- `anchor`: that lesson's section heading, as `sec-<slug of the heading text>` (lowercase, accents
  dropped, non-alphanumerics → `-`), e.g. "1. Prokaryote, eukaryote, virus" →
  `sec-1-prokaryote-eukaryote-virus`.

Lessons show a placed note beside its section and the rest in a "My notes" box; the notes page
groups by chapter. Done when every note has a chapter.

## 4. Report

Counts by kind and colour, new and removed notes, ink you could not fully read, pages with marks not
read, and the link `notes.html?subject=<id>`.

## Questions about notes

A message containing `ipad-note:<KIND>`, `ipad-note:<COLOUR>` or `ipad-note:<KIND>-<COLOUR>`
(`TEXT` means `INK`) asks for those notes: answer from `notes/notes.json`, grouped by chapter with
resource and page, and give the filtered link `notes.html?subject=<id>&tag=<the tag>`.
