# anja-study

Teaching workspaces, one per subject. `histology/` is the first; more subjects arrive as
sibling directories.

## The workspace root is the subject directory

`/teach` treats the current directory as the workspace, so work from the subject directory.
`MISSION.md`, `NOTES.md`, `GLOSSARY.md`, `RESOURCES.md`, `lessons/`, `reference/`, `assets/`
and `learning-records/` each live inside one subject directory and describe that subject
alone — one mission per subject, which is why the subjects are nested rather than sharing a
root.

Started from the repo root instead, `/teach` finds no `MISSION.md` and interviews the user to
write a mission that already exists.

## Components are per subject, and drift

Each workspace owns its `assets/` — the stylesheet, the quiz engine, anything a second lesson
reuses. A new subject starts by copying them, and from then on the copies are separate files:
a fix to `histology/assets/quiz.js` leaves every other subject's copy carrying the bug. When
you change a component, change it in every subject that has one.

## Viewing a lesson

`node .claude/serve.js` serves the repo on :8765, putting a lesson at
`/histology/lessons/0001-reading-a-blood-smear.html`. Lessons also open directly from the
filesystem; they reach their components by relative path (`../assets/course.css`).

## Two glossaries, on purpose

`GLOSSARY.md` is the canonical language: only the terms that needed a ruling, with the aliases
to avoid. `reference/glossary.html` is the printable learner-facing sheet covering every term
in a chapter. Both are intended; each says so in its own text.
