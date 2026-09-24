@AGENTS.md

## Claude Code specifics

- `.claude/settings.json` wires `.claude/hooks/subject-guard.js` (SessionStart, UserPromptSubmit,
  PreToolUse) and makes web tools ask. Claude Code reads settings only from the directory a session
  starts in, so each subject carries an identical copy at `<subject>/.claude/settings.json`; change
  both together. Per-session state goes to `.claude/state/` (git-ignored).
- The skill is `/anja-teach`, stored in the repo so every checkout behaves the same. It has its own
  name because a personal skill with the same name would override a project one.
- Preview: the `course` entry in `.claude/launch.json` runs `.claude/serve.js`.
