# Shared engine in `common/`

The stylesheet and quiz engine (`course.css`, `quiz.js`, `bank.js`, plus the shared-page scripts) exist once, in the root `common/`, and the quiz pages once, in `quiz/`. A subject's `assets/` holds only that subject's content (`bank/`, `img/`). This deliberately departs from the `teach` skill this workspace grew from, which keeps every component inside the workspace: with one workspace per subject that means one copy per subject, and the copies drifted (a fix in one subject left the bug in the others), while every subject must look and behave the same.

## Consequences

- Pages outside a subject load it by `?subject=<id>` and read `<subject>/subject.json`, so they need HTTP (GitHub Pages, or `node .claude/serve.js`), not `file://`.
- Bank image paths stay lesson-relative (`../assets/img/…`); `Bank.root` rewrites them for the shared pages.
