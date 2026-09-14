# Learning records

What the **Copy my results** button produces, and what each attempt changed.

The exported line is deliberately terse:

```
<lesson> · mcq <correct>/<total> (missed <items>) · recall <correct>/<total> (missed <cards>) · <date>
```

A bare list of numbers stops meaning anything within about a day, so every lesson keeps an
item map below. The number is only an index; the **concept** is the record. Attempts are
newest last.

---

## L0001 — Reading a blood smear

### Item map

MCQ items, in the order they appear (options reshuffle on every render, the numbering does not):

| # | Concept under test | Where it is taught |
|---|---|---|
| 1 | Erythrocyte identity — anucleate, biconcave, hemoglobin | §2 The cells without a nucleus |
| 2 | Reticulocyte recognition — blue RNA strands and dots | §2 Reticulocyte |
| 3 | Giemsa vs Wright — when a microbial disease is suspected | §3 Making the colours |
| 4 | Neutrophil is the most numerous leukocyte | §4 The five leukocytes |
| 5 | Basophil — granules so dense they mask the nucleus | §4 The five leukocytes |
| 6 | Monocyte — largest WBC, kidney-bean nucleus | §4 The five leukocytes |
| 7 | Left shift — band neutrophils, horseshoe nuclei | §4 Clinical note |
| 8 | Platelet δ-granules — serotonin and Ca++ | §2 Platelet |
| 9 | Eosinophil vs larval parasitic worms | §4 The five leukocytes |
| 10 | Plasma cell derives from a B lymphocyte | §4 Two cells you never see in the blood |
| 11 | Erythrocyte lifespan, 120 days | §2 Erythrocyte |
| 12 | The extrude-the-nucleus trio and their proteins | §2 Eye link |
| 13 | **Micrograph ID** — plasma cell + its circulating precursor | §4 Eye link; image item |

Recall cards: 1 monocyte appearance and fate · 2 the three platelet granules · 3 Wright and
Giemsa components · 4 the extrude-the-nucleus trio · 5 what a left shift is and means.

### Attempts

#### 2026-09-14 — test run, not a study attempt

```
L0001 · mcq 1/13 (missed 13, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12) · recall 2/5 (missed 2, 3, 5) · 2026-09-14
```

Options were clicked to exercise the export, not answered. **Excluded from the spaced-review
queue**: a score produced by clicking carries no information about what is or isn't known, and
folding it into the review queue would put every concept in chapter 1 on the list on false
evidence. Recorded only because it is a real artefact of the tooling, and because it surfaced
one defect — question 13 leads the missed list, exposing that the list was ordered by when
each question was answered rather than by item number. Fixed; the list now sorts.

No teaching consequence. The first real attempt goes below.

---

## How an attempt gets read

When a line arrives from an actual attempt, it turns into three things:

1. **A diagnosis, not a score.** Missed items map through the table above to concepts, and
   concepts cluster. Missing 4, 5, 6 and 9 is not "four wrong" — it is the five-leukocyte
   table not yet being solid, and it gets retaught as a table, once. Missing 1, 2 and 11 is
   the anucleate group. Missing 13 alone, with 10 correct, is specifically micrograph
   recognition failing where the fact is known — a different problem needing images, not prose.
2. **Entries in the spaced-review queue.** Every lesson from L2 on opens with 3–5 questions
   drawn from earlier lessons; missed concepts go to the front of that queue, and a concept
   missed twice gets rewritten rather than merely re-asked.
3. **A note on the script's own ambiguities.** If a miss traces to one of the quirks in
   `NOTES.md` (the two different neutrophil ranges, "blue granules" in the overview vs. the
   detail section), that is the question being unfair, not the learner being wrong — the item
   gets reworded and the quirk gets flagged as something the exam may ask either way.

An unanswered question is never read as a wrong one. `(N unanswered)` in the export means the
attempt was interrupted; those items carry no evidence either way and stay out of the queue.
