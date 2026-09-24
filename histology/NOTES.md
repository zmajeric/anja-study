# Notes

## Learner preferences
- Teach **only from the study script**, nothing outside it, unless explicitly asked.
- Exam Sunday 20 Sept 2026; ~90% MCQ, ~10% written. Sessions 15–20 min.
- Start in book order from Chapter 1.
- Backend-developer mindset (from user memory): likes structure, decision trees, tables, explicit rules.

## Study plan (6 days, ~2 lessons/day)
| Day | Date | Lessons |
|---|---|---|
| Mon | 14 Sep | Ch1: formed elements & smear (L1) · hematopoiesis, growth factors, EPO (L2) |
| Tue | 15 Sep | Ch2: vessels & heart · Ch3: the cell |
| Wed | 16 Sep | Ch4: embryology · Ch5a: epithelium classification |
| Thu | 17 Sep | Ch5b: junctions & basement membrane · Ch6: neurons & glia |
| Fri | 18 Sep | Ch7: muscle · Ch8: cartilage & bone |
| Sat | 19 Sep | Ch9: soft connective tissue · cumulative mock exam |
Every lesson from L2 on opens with a 3–5 question spaced review of earlier lessons.

## Script quirks to remember (teach both values; the exam may use either)
- Neutrophils: overview says 60–70%, detail section says 50–70%.
- Lymphocytes: overview 20–25%, detail 25–35%.
- Monocytes: overview 4–8%, detail 3–9%.
- Eosinophils: overview 2–4%, detail "less than 5%".
- Overview says neutrophils have "blue granules"; detail says granules are tiny, light-staining and hard to see. Detail version is the recognition cue.
- Platelet concentration given as "150,000 to 450,000 per ml" — keep the script's wording.
- Ch9: Freddo's convention is fibro**cyte** = active, fibro**blast** = inactive (reverse of many textbooks). Teach Freddo's version.

## Workspace conventions
- Lessons: `lessons/NNNN-slug.html`, `<html data-subject="histology">`, linking `../../common/course.css`, `../../common/quiz.js`, `../../common/bank.js` and the chapter banks in `../assets/bank/`. Shared layout rules: root `AGENTS.md`.
- Reference sheets: `reference/<chapter-slug>.html`; glossary in `reference/glossary.html`, extended every lesson.
- Quiz answers must have equal word counts (no formatting clues).
- Drill components in `common/quiz.js`: `Quiz.mcq`, `Quiz.recall`, `Quiz.sort` (classification, reshuffles → good for interleaving), `Quiz.results`. Result keys: `L000N:review|mcq|sort|recall`, stored under `histology:`.
- Reusable diagrams live in `assets/img/` (e.g. `hematopoiesis-tree.svg`) and are `<img>`-ed by both lesson and reference sheet.

## Question banks and quizzes
- All questions live in `assets/bank/chN.js` (`Bank.register`), not in lessons. Shapes: `mcq` (text), `images` (image MCQs with `img`), `recall` (written), `sort`; chapters split over two lessons use `recall1/2`, `recallA/B`, `sortA/B`, and `images[].part`.
- The shared quiz pages (`/quiz/*.html?subject=histology`) read every bank listed in `subject.json`. Sets: `core` (text MCQ, written), `round1` (identify), `round2` (`assets/bank/round2.js`, facts about the picture), `round3` (`round3.js`, look-alikes, NOT-true, consequences). Old per-subject quiz pages (`quizzes/images*.html`, `mock-exam.html`) were replaced by these on 24 Sep 2026; their stored scores (`IMG:`, `IMG2:`, `IMG3:`, `MOCK:`) are no longer read.
- Question mix set on 24 Sep 2026 from the old mock exam's defaults (3 text + 1 image MCQ per chapter, 4 written): 70% MCQ · 10% written · 20% image, 40 questions.
- Option-length rule is enforced: a checker in the session found 52 items where the correct option was the unique longest/shortest; all rebalanced. Re-run the check (iterate `Bank.ids()`, compare word counts) after adding items.
- Lesson 0012 (eye only) is generated: it filters every bank by an ocular-vocabulary regex (`EYE` in the page) — no separate bank to maintain.
- Picture banks (round 1): ch1 12 · ch2 8 · ch3 3 (organelle EMs only) · ch4 0 (cilium EM lives in ch5) · ch5 21 · ch6 9 · ch7 7 · ch8 10 · ch9 13.
- Image → slide mapping (chapter, slide page, embedded image index): see `SPEC` in the extraction script used on 14 Sep; images are in `assets/img/<name>.jpg`, cropped to remove baked-in labels where possible. Labelled ones kept deliberately (as reference figures or because the sample exam itself used a labelled picture): `junctional-complex-em`, `osteons-labelled`, `spongy-bone-labelled`, `endochondral-ossification`, `cardiac-intercalated`, `smooth-muscle`.

## Progress
- 14 Sep morning: L1 (blood smear) and L2 (hematopoiesis, growth factors, EPO) written.
- 14 Sep: L1 results pasted — MCQ 3/13, recall 4/5 (learning record 0001). Unclear whether MCQ was taken before reading; awaiting retry score.
- 15 Sep: picture rounds 2 and 3 (166 items) and Lesson 0012 (the eye across all chapters) added.
- 14 Sep afternoon: lessons 3–11 written for every remaining chapter, plus image quiz and mock exam. Each lesson's warm-up re-tests the previous chapter (L3's is L1-heavy on purpose). Learner has not yet reported on any lesson beyond L1.
- Citations: "Script · Ch. N · §Section title".
