# Question banks

Every question lives in its subject's `assets/bank/`, never inside a lesson or quiz page. The engine
is `common/bank.js` (its header documents the API); the shared quiz pages
(`quiz/{mcq,write,image,mixed,mock}.html`) and the lessons both read the banks.

## Question types and shapes

| Type | Shape | Rendered by |
|---|---|---|
| MCQ | `{ q, options: [...], answer: <index>, why, cite }` | `Quiz.mcq` |
| Written question | `{ q, a, cite? }` | `Quiz.recall` |
| Image MCQ | `{ img: {src, alt, caption?}, q, options, answer, why, cite }` | `Quiz.mcq` |
| Image written question | `{ img, q, a }` | `Quiz.recall` |

`img.src` is written relative to a lesson: `'../assets/img/<name>.jpg'`. Reuse an image already in
the bank with `Bank.picture(chapter, name)`. A new image comes from the raw set
(`assets/img/source/index.json` finds it by resource, page and nearby text): crop away baked-in
labels that give the answer, and save it as `assets/img/<meaningful-name>.jpg`.

Any item may carry `notes: [<iPad note ids>]` when it was written from the learner's notes
(`kviz … ipad-note:…`); the quiz pages' "From my notes" filter shows exactly those.

## Where questions go

- A chapter's first bank: `assets/bank/chN.js`, `Bank.register('chN', { title, lessons, mcq, images, recall, sort })`.
- Every later set: its own file calling `Bank.add('chN', 'mcq' | 'written' | 'image', '<set>', [...])`,
  listed in `subject.json` → `extraBanks` (loaded after the chapter banks, in order).
- Set names: `core` / `round1..3` (the chapter's own arrays), the date and time for a focused quiz
  (`2026-09-24-1430`), `sample` for exam-sample questions. Give a new set a human label in `subject.json` → `sets`.

## Rules for every item

- Options per question follow `subject.json` → `exam.options`.
- **Equal length**: every option of an item has the same word count, so the correct one is never
  the unique longest or shortest. Check after writing: load the banks in the browser (or node with
  a `window` stub) and, for each item, compare the correct option's word count with the others.
- `cite` names the resource, chapter and section, in the subject's citation style (see `NOTES.md`).
- The stem and options are in the exam language.
