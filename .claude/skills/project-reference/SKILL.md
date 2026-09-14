---
name: project-reference
description: Create or incrementally update REFERENCE.md, the per-project conventions file (naming rules, directory map, design tokens, exemplar components) that planning and scaffolding skills read before writing code. Updates are scoped to the files the current task actually touched, not a full rescan. Use after a plan is approved in a project under Projects/, when REFERENCE.md is missing, or when the user asks to update the project reference.
---

# project-reference

`REFERENCE.md` records **how this codebase actually names, places, styles and tests
things**, so planning and scaffolding match existing code instead of generic defaults.

It is an **accreting document**. It is not regenerated from a whole-repo scan every
time. It starts as a thin skeleton and gains depth in the areas you actually work in.

## Two modes

Check for `REFERENCE.md` at the project root first, then pick a mode.

| Situation | Mode | Cost |
| --- | --- | --- |
| No REFERENCE.md exists | **Bootstrap** | one repo-wide pass, deliberately shallow |
| REFERENCE.md exists | **Scoped update** | only the files this task touched |

A full rescan happens **once**. After that, only the user asking for one
("rebuild REFERENCE.md from scratch", "full rescan") justifies repeating it.

## Prime rule: observe, never assume

Every statement must come from a file read in this repository.

- Do not write "Tailwind" unless a Tailwind config or `tailwind` dependency exists.
- Do not write "Next.js App Router", "Server Components", or `src/features/` unless
  they exist here. A Vite + SCSS repo gets a Vite + SCSS reference.
- Inconsistent conventions are reported as such, with counts:
  `PascalCase (42 dirs) vs kebab-case (3 dirs) - dominant: PascalCase`.
- Undetermined things get `Not established in this repo`, never a guess. That line is
  a signal to the user, not a failure.

---

## Mode A: Bootstrap (first run only)

Goal is a **thin, cheap skeleton** - global facts that apply everywhere, plus an empty
coverage table. Do not try to document every area of the repo; areas get filled in
later, as they are worked on.

1. **Locate the project root** - nearest ancestor of the cwd holding `package.json`,
   `*.sln`/`*.csproj`, `pyproject.toml`, `go.mod`, or `.git`. REFERENCE.md goes there,
   next to the manifest, never in `src/`. If the cwd is the `Projects/` workspace
   itself rather than one project, ask which project; never span repos.

2. **Collect global facts:**

   ```bash
   bash ~/.claude/skills/project-reference/scripts/scan.sh --full <project-root>
   ```

   Fill only these sections of `TEMPLATE.md`: Stack, Directory map, repo-wide Naming
   rules, Design tokens (the token source and its actual token names), Verification
   commands. Leave Area notes empty and Coverage empty.

3. Write the file, stamp the header, report.

---

## Mode B: Scoped update (every other run)

The task just planned or implemented caused a set of files to be read and written.
**Those files are the scope.** They are also the best available evidence about that
part of the codebase, because they were chosen for relevance, not sampled at random.

### 1. Determine the scope

List the files this task actually touched - read, edited, or created. Take them from
the conversation, not from a new search. Reduce to the **directories** containing them.

If fewer than two source files were touched, or they are all config/docs, there is
nothing to learn. Say so in one line and stop. Do not manufacture an update.

### 2. Read REFERENCE.md as it stands

Note what it already claims about these directories, and what it lists under
`Not established in this repo`.

### 3. Gather facts for the scope only

```bash
bash ~/.claude/skills/project-reference/scripts/scan.sh --paths <dir> [<dir>...]
```

That reports, for those subtrees only: naming casing counts, **companion-file
patterns** (what files sit beside a component - styles, tests, barrels, types), the
most frequent imports, and locally used style classes or tokens.

Combine it with what you already know from having read the files. The scan gives
frequencies; the files you read give the idioms - prop typing style, export form,
how state is wired, how strings are localised.

### 4. Merge, do not regenerate

This is the part that matters. Editing rules, in order of precedence:

1. **Never touch a section this task has no evidence about.** An update about
   `Components/Subscribers` must leave the `Editors` notes byte-identical.
2. **`<!-- manual:start -->` to `<!-- manual:end -->` is the user's.** Carry through
   verbatim, always.
3. **Promote, don't duplicate.** If a pattern now shows up in a third separate area,
   move it out of Area notes and into the repo-wide Naming rules table, and say so in
   the report.
4. **Resolve `Not established` entries** when the touched files settle them. Move the
   line out of that list into the relevant table.
5. **Contradictions get recorded, not silently overwritten.** If the touched files
   disagree with an existing repo-wide claim, keep both and mark it:
   `Repo-wide: PascalCase. Exception in Lib/Http: camelCase (7 files).`
   Then surface it in the report - a contradiction is a decision for the user.
6. **Append a new Area note** if the area has none, using the Area note shape in
   `TEMPLATE.md`. Keep it to ~15 lines: path, conventions specific to it, one short
   exemplar excerpt with its file path, and the gotchas worth knowing.

### 5. Update the coverage table

One row per documented area: path, date last updated, and what the facts came from
(e.g. `plan: subscriber list filters`). This table is how the user sees which parts
of REFERENCE.md are current and which are stale guesses from months ago.

### 6. Keep it bounded

REFERENCE.md is read into context before planning, so it must stay cheap.

- Soft ceiling ~300 lines. Approaching it, compress: merge Area notes that say the
  same thing, cut exemplar excerpts to their distinctive lines.
- Exemplar excerpts are 10-25 lines, never whole files.
- Prefer a table or a quoted token list over prose.

---

## Report

Keep it to a few lines:

1. Path written; bootstrap, scoped update, or "nothing to learn".
2. Areas touched, and what was added or changed in each.
3. **Contradictions** found against existing claims - these need a human decision.
4. Anything still `Not established in this repo` that scaffolding will need.

## Timing note

Plan mode is read-only. Do not attempt to write REFERENCE.md while a plan is being
drafted - read it then, and write the update after the plan is approved, as the first
step of the work. If invoked during plan mode anyway, report what you *would* record
and let the user approve first.
