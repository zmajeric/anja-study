# New resource (`nov-vir`)

The user added a file to `<subject>/source/`. The session-start hook lists files `RESOURCES.md`
does not mention yet; those are the candidates. Ask which file(s) if more than one and the user
did not say.

## 1. Read it

A `*_edited.pdf` is not a new resource: it is the learner's annotated copy of the file of the same
name without `_edited`. Add its name to that resource's line in `RESOURCES.md` ("edited copy with
iPad notes: …"), keep the original, run [OPOMBE.md](./OPOMBE.md), and stop here.

Otherwise extract the text to `source/<same name>.md`, and its images with
`python common/tools/extract-images.py <subject> "<file name>"`. Decide its kind, and ask the user
when unsure:

- **Knowledge**: teaching material (script, slides, notes, book chapter).
- **Exam sample**: real exam questions showing the exam's style.

## 2. Register it

Add it to `RESOURCES.md` by exact file name, with one line on what it covers and which chapters.
Done when the session-start check would no longer list it.

## 3a. Knowledge: compare against what is taught

Walk every chapter it touches and report to the user, per chapter:

- **Conflicts**: a fact, number or name that differs from what a lesson, reference sheet or bank
  item states. Quote both, with their sources.
- **Gaps filled**: material the lessons lacked, including items under `## Gaps` in `RESOURCES.md`.
- **New images** usable for image questions (now in `assets/img/source/index.json`).

Then ask which changes to make. Change lessons, reference sheets and banks only after the user
chooses; record conflicts they decide in `NOTES.md`.

## 3b. Exam sample

1. Put its questions into the banks as the set `sample`, one `Bank.add(chapter, type, 'sample', …)`
   call per chapter and type, per [BANKS.md](./BANKS.md). Images go to `assets/img/`.
2. Describe the format you see: question types, number of options, image style, stem style.
3. Compare with `subject.json` and `NOTES.md`, and ask the user whether anything should change
   (options per question, mock exam length, question mix). The question mix and every number in
   `subject.json` change only on the user's answer: a sample shows style, the user sets proportions.
4. If the format changes, offer to rebalance existing bank items to match (e.g. 4 → 5 options).

## 4. Done

Tell the user what was registered, what changed, and the link to try it:
`quiz/mixed.html?subject=<id>&set=sample` for an exam sample.
