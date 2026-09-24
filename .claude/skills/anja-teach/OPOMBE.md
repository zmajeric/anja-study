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
transcriptions of notes it has seen before (its header documents the record). Read its summary:

- **flattened marks**: pages whose marks GoodNotes burned into the page. They are not extracted
  yet. Tell the user which pages, and that this needs the comparison step tuned on a real GoodNotes
  sample; it is the next thing to build once one exists.

## 2. Transcribe ink

For every INK note with empty `text`, look at `notes/<image>` and write what it says into `text`,
with `textBy: "agent"`. Mark each word you cannot read as `[?]`; never guess a word to make a
sentence read well. When the user corrects a transcription, write their version with
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

Counts by kind and colour, new and removed notes, ink you could not fully read, flattened pages,
and the link `notes.html?subject=<id>`.

## Questions about notes

A message containing `ipad-note:<KIND>`, `ipad-note:<COLOUR>` or `ipad-note:<KIND>-<COLOUR>`
(`TEXT` means `INK`) asks for those notes: answer from `notes/notes.json`, grouped by chapter with
resource and page, and give the filtered link `notes.html?subject=<id>&tag=<the tag>`.
