<!--
Template for REFERENCE.md.

Bootstrap fills the GLOBAL sections thinly and leaves Coverage and Area notes empty.
Scoped updates add and refine Area notes, and only promote a fact to a GLOBAL section
once it has been observed in three or more separate areas.

Fill from observed facts only. Delete sections the repo has nothing to say about.
Soft ceiling ~300 lines: this file is read before planning, so it must stay cheap.
-->

# REFERENCE.md

> Bootstrapped {{DATE}} - updated incrementally as areas are worked on.
> Each area below is only as current as its row in Coverage says.

## Coverage

Which parts of this repo have actually been examined, and when. Areas absent from this
table are undocumented: assume nothing about them.

| Area | Last updated | Facts came from |
| --- | --- | --- |
| _(repo-wide)_ | {{DATE}} | bootstrap scan |

---

# Global

<!-- Repo-wide facts. Changed only by bootstrap, or when a scoped update finds a
     pattern in a third separate area, or finds a contradiction worth recording. -->

## Stack

| Concern | Choice | Version | Evidence |
| --- | --- | --- | --- |
| Language | | | |
| Framework | | | |
| Build tool | | | |
| Styling | | | |
| State | | | |
| Routing | | | |
| HTTP | | | |
| Tests | | | |

TypeScript config: `strict: {{true/false}}`, path aliases: {{list or "none"}}.

## Directory map

```
{{tree to depth 3, build output and vendored assets excluded}}
```

| Path | Holds |
| --- | --- |

**New code goes in:** {{concrete path pattern, e.g. `src/Components/<Area>/<Name>.tsx`}}

## Naming rules

Confirmed repo-wide. The consistency column shows how strongly the tree supports each.

| Thing | Rule | Example | Consistency |
| --- | --- | --- | --- |
| Directories | | | |
| Component files | | | |
| Component symbol | | | |
| Props type | | | |
| Hooks | | | |
| Test files | | | |
| Style files | | | |
| Barrel exports | | | |
| Export form | | | |

Known exceptions:
- {{"none recorded" or `Area X: rule Y (n files)`}}

## Design tokens

Source of truth: `{{path}}`

| Token | Value | Use for |
| --- | --- | --- |

Rules:
- Use token names, never raw values or one-off arbitrary values.
- {{methodology rule: ITCSS layering, BEM, CSS Modules, utility-class policy}}

## Component anatomy

The shape a new component is expected to have here:

```{{lang}}
{{minimal skeleton matching this repo's real style - imports, props type, export form}}
```

## Cross-cutting patterns

| Concern | Pattern | Import from |
| --- | --- | --- |
| State | | |
| Data fetching | | |
| Forms | | |
| i18n | | |
| Icons | | |
| Error handling | | |

## Verification

Must pass before a change is done:

```bash
{{typecheck / lint / test commands, read from package.json scripts or build files}}
```

---

# Area notes

<!-- One section per area actually worked in. Added and refined by scoped updates.
     ~15 lines each. Never edit an area this task has no evidence about. -->

## `{{path/to/area}}`

_Updated {{DATE}} from {{what the task was}}._

- **Layout:** {{how files are arranged here, companion files present or absent}}
- **Naming:** {{anything specific to this area, or "follows repo-wide rules"}}
- **Wiring:** {{state, data source, i18n, the imports that recur here}}
- **Gotchas:** {{what would trip up someone adding code here}}

```{{lang}}
{{10-25 line excerpt from the most representative file, with its path}}
```

---

## Not established in this repo

Conventions that scaffolding will need but that no code seen so far settles.

- {{item - and which area would settle it}}

<!-- manual:start -->
<!-- Hand-written notes below are preserved verbatim across every regeneration. -->
<!-- manual:end -->
