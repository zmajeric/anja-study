# anja-study

Study courses, one **subject** per top-level directory (`histology/` is the first and the worked
example). Terms (subject, chapter, lesson, the quiz kinds, question mix, resource, exam sample) are
defined in `CONTEXT.md`; use them as defined there.

## Study session or development session

Every session is one of two kinds, fixed once chosen, and only the user chooses:

- **Study session** (the default): exactly one **active subject**. Started inside `<subject>/` →
  that subject. Started at the repo root → first ask *"Is this a study session, and for which
  subject?"*; the user answers `predmet <name>` (or just the name) on a line of its own.
  Read and write only the active subject and the shared parts (`common/`, `quiz/`, `docs/`, the root
  files). When the user asks about another subject, tell them it needs a new session started in that
  subject's directory, and say so plainly whenever anything from another subject would enter this
  session.
- **Development session**: for work on the workspace itself, root only. When the user says a root
  session is for development, ask them to confirm by typing `development` on a line of its own.
  Every subject is then open; keep each subject's content inside its own subject.

Wait for the user's line before touching any subject. In Claude Code a hook
(`.claude/hooks/subject-guard.js`) enforces all of this and shows the session kind on every reply of
a development session.

## Sources

Teach, quiz and explain only from the active subject's **resources**: the files in `<subject>/source/`,
listed in `<subject>/RESOURCES.md`. Where they are silent, say so and note the gap in `RESOURCES.md`.
Two keywords in the user's message open another source, for that message only and for one chapter
at most:

- `poglej-internet`: web search. Record each source in `RESOURCES.md` as "web · chapter N · date"
  and label web-sourced facts in whatever you write.
- `poglej-agenta`: your own general knowledge. Label each such fact "general knowledge, not from the
  resources".

## Layout

```
common/            the shared engine: course.css, quiz.js, bank.js, course.js, quizpage.js, nav.js, notes.js
common/tools/      extract-images.py (resources → assets/img/source/), extract-notes.py (iPad notes)
quiz/              the five shared quiz pages: mcq, write, image, mixed, mock  (?subject=&chapter=&set=&mine=)
index.html         subject list (from subjects.json) · subject.html: one subject's home (from subject.json)
notes.html         the learner's iPad notes, grouped by chapter  (?subject=&tag=ipad-note:…)
<subject>/         MISSION, NOTES, GLOSSARY, RESOURCES, subject.json, source/, lessons/, reference/,
                   learning-records/, assets/ (this subject's banks and images only),
                   notes/ (iPad notes: notes.json + img/),
                   .claude/settings.json (identical copy of the root one)
```

- `source/<name>_edited.pdf` is the learner's annotated copy of `source/<name>.pdf` (iPad notes). Keep
  both: the original is what a flattened GoodNotes export is compared against.

- A component (style, widget, page logic) lives once in `common/`; a subject holds only its content.
  Why: `docs/adr/0001-shared-engine-in-common.md`.
- A subject's numbers (question mix, options, mock length, chapters, lessons, cheat sheets) live
  in its `subject.json`; the pages read them from there.
- Every subject page (home, lessons, cheat sheets, quizzes) loads `common/nav.js`, the menu bar
  built from `subject.json`.
- Every page uses relative paths: the site is published on GitHub Pages under a sub-path. Pages that
  read JSON need HTTP: `node .claude/serve.js` serves the repo on http://localhost:8765.

## Teaching work

Lessons, new subjects, new resources (`nov-vir`), focused quizzes (`kviz`) and the learner's iPad
notes (`opombe`, any `ipad-note:` tag) follow the
`anja-teach` skill: `.claude/skills/anja-teach/SKILL.md`, which routes to one file per branch.

## Two glossaries, on purpose

`<subject>/GLOSSARY.md` is the canonical language: only the terms that needed a ruling, with the
aliases to avoid. `<subject>/reference/glossary.html` is the printable learner-facing sheet covering
every term in a chapter. Both are intended; each says so in its own text. (`CONTEXT.md` is a third,
different thing: the vocabulary of the workspace itself.)
