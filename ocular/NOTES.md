# Notes

## Learner preferences
- Exam Friday 13 Nov 2026, in English. Question mix 70% MCQ · 10% written · 20% image, 4 options,
  40-question mock exam (set at subject creation, 20 Oct 2026).
- Handouts **and** slides are learning material, not only the handouts.
- Up to lecture 6 the learner wrote on the handouts only; from lecture 6 on, on both handouts and slides.
- The learner studies in Aalen: typed notes mix English and German ("ablauf von tränendrüse bis nase").
  Teach and quiz in English.

## Decisions (26 Oct 2026, later)
- **All twelve lessons written** (`lessons/0001`–`0012`), one per chapter, each built on the
  anja-teach pattern of lesson 1: one tightly-scoped win, the chapter's objectives quoted in a
  "What the exam asks" box, label drills with `details.check` answers, then the chapter's own MCQ
  and image bank through `Quiz.mcq(Bank.mix(Bank.items(ch,'mcq'), Bank.items(ch,'image')))`.
  Lessons 2–12 have **no recall drill**: the learner dropped written questions on 23 Oct.
  Chapters 2–12 keep their questions in the extra bank files, so each lesson loads `chN.js`
  **and** its extra bank; the five pre-26-Oct ones carry `?v=2`, as `extraBanks` does.

## Decisions (26 Oct 2026, second round)
- **A second question per topic, all twelve chapters**: set `2026-10-26-1726`, 240 new MCQs, 20 per
  chapter. Same substance as the first round, asked from the other direction — from the finding back
  to the structure, from the function back to the name, and as short clinical vignettes — so that
  recognising the wording is not enough. Bank now 574 items, 407 tagged to an exam objective.
- Image questions were **not** expanded: they need cropped figures, and `assets/img/` holds 111. The
  textbook is back in `source/` (26 Oct), so `extract-images.py` can now cut more when wanted.

## Decisions (26 Oct 2026)
- **Full question banks for all twelve chapters**: 334 items (286 MCQ + 48 image), set `2026-10-26`
  for chapters 6–12. Every item that answers one of Prof. Goodwin's exam objectives carries
  `exam: '<the objective in her words>'`. The quiz shows it as a quiet superscript § on the stem
  (objective in the tooltip) and spells it out with the explanation: `goalMark`/`goalNote` in
  `common/quiz.js`, `.goal` / `.goal-note` in `common/course.css`.
  256 of 334 items are tagged. Chapter 1 has none on purpose: the guidelines list no objective for
  lecture 1 (the script says so in its own "What the exam asks" box).
- `subject.json` → `extraBanks` carries `?v=2` on the five files edited after they had already been
  served, because browsers had cached the old copies. Bump the number if a bank is edited in place
  again; new files need no version.

## Decisions (23 Oct 2026)
- **No written questions.** The learner does not use them, so `subject.json` → `exam.mix` is now
  80% MCQ · 0% written · 20% image. The written question type still exists (the Write quiz page and
  chapter 1's ten `recall` items are untouched); it is only out of the mixed quiz and the mock exam.
  Put the share back if the learner wants them again.
- Question counts are set per paper: the "Questions" box on every quiz page, `?n=` in the URL, or the
  custom quiz. A bank only has to be deep enough: ch1–ch5 now hold 29/13/14/15/18 MCQ + 3/4/4/4/4 image.

## Decisions (20 Oct 2026)
- Scope = the exam guidelines' objectives + the handout and slide points; the textbook explains them.
- Facts from textbook, handouts, slides; a fact only in the learner's notes is labelled "from your notes".
- No chapter for Circulation (textbook ch. 12): taught only where handouts and slides cover it.
- Call `14 Review slide handout.pdf` the **exam guidelines** ("smernice"), not "review".

## Source map (chapter → textbook chapter)
1 → 1 · 2 → 2 · 3 → 3, 4 · 4 → 7 · 5 → 5 · 6 → 6 · 7 → 8 · 8 → 10 · 9 → 11 · 10 → 13, 14 · 11 → 14 · 12 → 15.
The handouts' "Images used" / "Figures" lines name the textbook figures each lecture showed.

## Workspace conventions
- Lessons: `lessons/NNNN-slug.html`, `<html lang="en" data-subject="ocular">`; layout as in histology
  (root `AGENTS.md`, `.claude/skills/anja-teach/SKILL.md`).
- Question banks: `assets/bank/chN.js`, one per chapter, created empty with the subject.
- Raw images: `assets/img/source/` (git-ignored, from `common/tools/extract-images.py`); named crops
  for image questions go to `assets/img/<name>.jpg`.

## Citation style (set 21 Oct 2026, lesson 0001)
`TB 1 · p. 1` (textbook chapter · page) · `Handout 1 · p. 5` · `Slides 1 · #3` (slide number) ·
`Your notes` for a fact only in the learner's annotations · `Exam guidelines`. The study script
(`reference/study-script.html`) already uses these; lessons and banks follow it.

## Image questions
The labelled figure is teaching material; questions use the blank one. Where a whole figure has no
numbered markers, crop it so the asked structure is the only thing a leader line or arrow can mean:
`fig-1-1-anterior-segment.jpg`, `fig-1-1-wall-layers.jpg`, `fig-1-1-nerve-head.jpg` are crops of
`fig-1-1-globe-blank.jpg` made with `sips -c <h> <w> --cropOffset <y> <x>`.
