# Focused quiz (`kviz`)

`kviz <poglavje|vse> [mcq|slike|pisno|mešano] [n]`, or the same in plain words ("naredi kviz za
poglavje 5, samo slike").

| Argument | Meaning | Default |
|---|---|---|
| `poglavje` | a chapter number, or `vse` for every chapter | ask |
| type | `mcq` → MCQ quiz · `slike` → image quiz · `pisno` → write quiz · `mešano` → mixed quiz | `mešano` |
| `n` | number of new questions (for `vse`: per chapter) | 10 |
| `ipad-note:<tag>` | write only about the content under those iPad notes | none |

## 1. Find what is missing

Read the chapter's bank (`assets/bank/chN.js` and every file that `Bank.add`s to it) and the
learning records. New questions target what the existing ones leave untested and what the learner
missed. Take the facts only from the chapter's resources.

With an `ipad-note:` tag, the pool is the notes matching it in `notes/notes.json` (and the
chapter, if given): the words under each highlight, the transcription of each ink note, and the
resource page around them. Name the set `notes-<colour or kind>-<date>` and give every question
`notes: [<note ids>]`, which feeds the quiz pages' "From my notes" filter.

## 2. Write the questions

Add them as a new set named with today's date (`2026-09-24`; append `-2` for a second set the same
day) in a new file `assets/bank/<chapter>-<set>.js`, per [BANKS.md](./BANKS.md). A mixed request
splits `n` by the subject's question mix; image questions need images the resources contain.
Add the file to `subject.json` → `extraBanks`.

Done when the option-length check in BANKS.md passes for every new item.

## 3. Hand over

Give the link to the new set on its shared page, e.g.
`quiz/image.html?subject=histology&chapter=ch5&set=2026-09-24` (published site or local server).
The new set also joins the mixed quiz and the mock exam from now on.
