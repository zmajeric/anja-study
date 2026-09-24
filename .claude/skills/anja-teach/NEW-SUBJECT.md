# New subject

The user made `<subject>/`, put their resources in it, and started a session there. Turn it into a
subject that looks and works like every other one. Histology (`histology/`) is the worked example of
every file named below.

## 1. Gather the resources

Move every resource file into `<subject>/source/` (keep names). A `*_edited.pdf` is the learner's
annotated copy of the file with the same name without `_edited`: keep both, and handle the notes
in step 4 per [OPOMBE.md](./OPOMBE.md). Extract each one's text to
`source/<same name>.md` so later sessions read text, not binaries (use the `pdf` / `docx` skills).
Then pull every image out of them:

```
python common/tools/extract-images.py <subject>
```

It fills `assets/img/source/<resource>/` and `assets/img/source/index.json` (resource, page, nearby
text for each image). These are raw; named, cropped copies for image questions come later, per
[BANKS.md](./BANKS.md).

Done when every non-`.md` file in `source/` (other than `*_edited.pdf`) has its `.md` beside it and the image index lists
every resource that has pictures.

## 2. Interview

Ask these as one numbered round, each with your proposed answer; wait for the user's answers.
Items the user leaves open stay open: ask again, never fill them from the resources.

<!-- INTERVIEW: add new questions to this list; each needs a destination in step 3. -->
1. **Name**: the subject's title (the directory name stays the id).
2. **Mission**: why they study it, the exam date, the exam language.
3. **Question mix**: MCQ % / written % / image %, summing to 100. Image questions are image MCQs
   unless the user sets a share of image written questions.
4. **Options**: how many options per MCQ and per image MCQ.
5. **Mock exam length**: number of questions.
6. **Chapters**: propose a numbered list from the resources' own structure; the user confirms or edits.
7. **Limits**: anything not to teach beyond "only these resources" (e.g. histology: teach from the
   script, take only micrographs from the slides).

Done when every item has an answer from the user.

## 3. Write the subject

| File | From |
|---|---|
| `subject.json` | 1, 3, 4, 5, 6: copy `histology/subject.json`'s shape; `status: "active"`, `lessons: []`, `reference: []`, one `chapters[]` entry per chapter with `bank: "assets/bank/chN.js"` |
| `MISSION.md` | 2, 3 and 7 in words, per [MISSION-FORMAT.md](./MISSION-FORMAT.md); point to `subject.json` for the numbers |
| `RESOURCES.md` | every file in `source/` by exact name, per [RESOURCES-FORMAT.md](./RESOURCES-FORMAT.md) |
| `NOTES.md` | the user's teaching preferences from the interview |
| `GLOSSARY.md` | created with the first term that needs a ruling |
| `.claude/settings.json` | a byte-for-byte copy of the root `.claude/settings.json` (it switches on the subject guard for sessions started here) |
| `assets/bank/`, `assets/img/`, `lessons/`, `reference/`, `learning-records/` | empty directories |
| root `subjects.json` | append `{ "id", "title", "status": "active" }` |

Done when the subject home page (`subject.html?subject=<id>`, served by `node .claude/serve.js`)
lists the subject with its chapters and the five quiz kinds.

## 4. Hand back

If `source/` holds `*_edited.pdf` files, run [OPOMBE.md](./OPOMBE.md) now. Tell the user the
subject is ready and offer the first lesson (chapter 1, or wherever the mission
points).
