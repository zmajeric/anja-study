#!/usr/bin/env node
/* Session kinds, and no web without the keyword. Wired in .claude/settings.json for
 * SessionStart, UserPromptSubmit and PreToolUse; every subject carries an identical
 * <subject>/.claude/settings.json, because Claude Code reads settings only from the directory a
 * session starts in.
 *
 * A subject is any top-level directory of the repo that is not hidden and not in SHARED.
 * Every session is one of two kinds (CONTEXT.md), fixed once chosen and stored in
 * .claude/state/<session_id>.json as {mode, active}:
 *   - study session (the default): one active subject; touching any other subject is refused.
 *     Started inside a subject -> that subject. Started at the root -> the user names it on a line
 *     of its own: `predmet <name>` or just `<name>`.
 *   - development session: root only, confirmed by the user typing `development` on a line of its
 *     own; every subject is open, and every reply carries a notice saying so.
 * Until a root session is one or the other, every tool call that touches a subject is refused.
 * The agent cannot choose either: only the user's own message does. Web tools are refused unless
 * the user's current message contains `poglej-internet`, in both kinds.
 *
 * Fails open: a crash here prints nothing and exits 0, so a broken hook never locks the session.
 */
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SHARED = new Set(['common', 'quiz', 'docs', 'node_modules']);
const STATE_DIR = path.join(__dirname, '..', 'state');

function subjects() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SHARED.has(d.name))
    .map(d => d.name);
}
function subjectOf(abs) {
  const rel = path.relative(ROOT, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const seg = rel.split(/[\\/]/)[0];
  return subjects().includes(seg) ? seg : null;
}
function isRoot(abs) { return path.relative(ROOT, abs) === ''; }

function stateFile(id) { return path.join(STATE_DIR, String(id || 'unknown').replace(/[^\w-]/g, '_') + '.json'); }
function load(id) { try { return JSON.parse(fs.readFileSync(stateFile(id), 'utf8')); } catch (e) { return null; } }
function save(id, s) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(stateFile(id), JSON.stringify(s)); }

function out(obj) { process.stdout.write(JSON.stringify(obj)); process.exit(0); }
function context(event, text, notice) {
  const o = { hookSpecificOutput: { hookEventName: event, additionalContext: text } };
  if (notice) o.systemMessage = notice;
  out(o);
}
function deny(reason) {
  out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
}

/* Files in <subject>/source/ that RESOURCES.md does not mention by name. */
function unregistered(subject) {
  const dir = path.join(ROOT, subject, 'source');
  let res;
  try { res = fs.readFileSync(path.join(ROOT, subject, 'RESOURCES.md'), 'utf8'); } catch (e) { return []; }
  let files;
  try { files = fs.readdirSync(dir); } catch (e) { return []; }
  return files.filter(f => !/^(\.~lock|~\$|\.)/.test(f))
    .filter(f => !res.includes(f) && !res.includes(encodeURI(f)) && !res.includes(f.replace(/ /g, '%20')));
}

/* `*_edited.*` files in source/ changed since notes/notes.json was written (or never extracted). */
function staleNotes(subject) {
  const dir = path.join(ROOT, subject, 'source');
  let since = 0;
  try { since = fs.statSync(path.join(ROOT, subject, 'notes', 'notes.json')).mtimeMs; } catch (e) {}
  try {
    return fs.readdirSync(dir).filter(f => /_edited\.[^.]+$/.test(f) && fs.statSync(path.join(dir, f)).mtimeMs > since);
  } catch (e) { return []; }
}

function sessionStart(input) {
  const cwd = path.resolve(input.cwd || process.cwd());
  const prev = load(input.session_id);
  if (prev && input.source !== 'startup') {           /* resume / clear / compact: keep the kind */
    if (prev.mode === 'development') return context('SessionStart', DEV_TEXT, DEV_NOTICE);
    if (prev.active) return context('SessionStart', activeText(prev.active));
    return context('SessionStart', undecidedText());
  }
  const active = subjectOf(cwd);
  save(input.session_id, { mode: active ? 'study' : null, active, web: false, agent: false });
  if (active) return context('SessionStart', activeText(active), 'Study session · ' + active);
  return context('SessionStart', undecidedText(), 'Study session — which subject? Type: predmet <ime>  (' + subjects().join(', ') + ')');
}
const DEV_NOTICE = 'Development session: all subjects open';
const DEV_TEXT = 'This is a development session, confirmed by the user: work on the workspace itself (common/, quiz/, ' +
  '.claude/, docs, and any subject). Every subject is open to read and write. Keep each subject\'s content in its ' +
  'own subject: no facts, notes or questions from one subject go into another. Web access still needs `poglej-internet`.';
function activeText(s) {
  const extra = unregistered(s);
  return 'Active subject for this whole session: ' + s + '. Work only inside ' + s + '/ and the shared folders ' +
    '(common/, quiz/, docs/, root docs). Reading or writing any other subject is blocked; if the user asks for ' +
    'another subject, tell them to start a new session in that subject\'s directory.' +
    (extra.length ? '\nUnregistered resources in ' + s + '/source/ (not in RESOURCES.md): ' + extra.join(', ') +
      '. Mention them to the user and suggest `/anja-teach nov-vir`.' : '') +
    (staleNotes(s).length ? '\nEdited resources with iPad notes not yet extracted: ' + staleNotes(s).join(', ') +
      '. Mention them to the user and suggest `/anja-teach opombe`.' : '');
}
function undecidedText() {
  return 'This root session has no kind yet. Before doing anything else, ask the user exactly: "Is this a study ' +
    'session, and for which subject?" (subjects: ' + subjects().join(', ') + '). They choose a subject by typing ' +
    '`predmet <name>` (or just the name) on a line of its own. If they say instead that this is a development ' +
    'session, ask them to confirm by typing `development` on a line of its own. Until one of those lines arrives, ' +
    'every tool call touching a subject directory is blocked; you cannot choose the kind or the subject yourself.';
}

function promptSubmit(input) {
  const prompt = String(input.prompt || '');
  const st = load(input.session_id) || (a => ({ mode: a ? 'study' : null, active: a }))(subjectOf(path.resolve(input.cwd || process.cwd())));
  if (!st.mode && st.active) st.mode = 'study';          /* state written before session kinds existed */
  st.web = /poglej-internet/i.test(prompt);
  st.agent = /poglej-agenta/i.test(prompt);
  const notes = [];
  let notice = null;
  /* Choices count only as a line of their own: prose that mentions the words is not a choice. */
  const dev = /^\s*development\s*$/im.test(prompt);
  const m = prompt.match(/^\s*predmet\s+([A-Za-z0-9_-]+)\s*$/im) ||
    prompt.split(/\r?\n/).map(l => l.trim()).filter(l => subjects().includes(l)).map(l => [l, l])[0];
  if (dev) {
    if (!st.mode) { st.mode = 'development'; st.active = null; }
    else if (st.mode === 'study') notes.push('The user typed `development`, but this is a study session for "' + st.active + '" and stays one. Tell them a development session starts fresh at the repo root.');
  } else if (m) {
    const want = m[1];
    if (st.mode === 'development') notes.push('The user named subject "' + want + '", but this is a development session and stays one. Tell them a study session for ' + want + ' needs a new session.');
    else if (!subjects().includes(want)) notes.push('The user named subject "' + want + '", which does not exist. Subjects: ' + subjects().join(', ') + '. To start a new subject, create its directory, add resources, and start a session there.');
    else if (!st.active) { st.mode = 'study'; st.active = want; notice = 'Study session · ' + want; notes.push(activeText(want)); }
    else if (st.active !== want) notes.push('The user asked for subject "' + want + '" but this session is fixed to "' + st.active + '". Do not switch: tell them one subject per session, and to start a new session in ' + want + '/.');
  } else if (!st.mode) notes.push(undecidedText());
  if (st.mode === 'development') { notice = DEV_NOTICE; notes.push(DEV_TEXT); }
  if (st.web) notes.push('`poglej-internet`: web search is allowed for this message only, scoped to one chapter at most (ask which, if unclear). Record every source used in RESOURCES.md, marked "web · chapter N · ' + new Date().toISOString().slice(0, 10) + '", and label web-sourced facts as such in anything you write.');
  if (st.agent) notes.push('`poglej-agenta`: your own general knowledge may be used for this message only, scoped to one chapter at most. Label every such fact "general knowledge, not from the resources".');
  const tag = prompt.match(/ipad-note:[A-Za-z]+(?:-[A-Za-z]+)?/i);
  if (tag && st.active) notes.push('`' + tag[0] + '` is a query over the learner\'s iPad notes: answer from ' + st.active +
    '/notes/notes.json (kind and/or colour; TEXT means INK), and give the link notes.html?subject=' + st.active +
    '&tag=' + tag[0] + '. With `kviz`, it narrows the quiz to those notes (see the anja-teach skill, KVIZ.md).');
  save(input.session_id, st);
  if (notes.length) return context('UserPromptSubmit', notes.join('\n'), notice);
  out({});
}

/* Subject names a shell command mentions as a path component. */
function mentioned(cmd) {
  return subjects().filter(s => new RegExp('(^|[\\s"\'=/\\\\:(])' + s.replace(/[-]/g, '\\-') + '([/\\\\"\'\\s)]|$)').test(cmd));
}
const RECURSIVE = /\b(rg|grep\s+-\w*r|find|ls\s+-\w*R|tree|git\s+grep|Get-ChildItem\b[^|;]*-Recurse|gci\b[^|;]*-Recurse|dir\b[^|;]*\/s|Select-String)\b/i;

function preTool(input) {
  const st = load(input.session_id) || { mode: null, active: null, web: false };
  const tool = input.tool_name, ti = input.tool_input || {};
  const cwd = path.resolve(input.cwd || process.cwd());

  if (tool === 'WebSearch' || tool === 'WebFetch') {
    if (!st.web) deny('Web access is off. Only the subject\'s own resources are used; the user enables a chapter-scoped web search by writing `poglej-internet` in their message.');
    return out({});
  }
  if (st.mode === 'development') return out({});

  const touched = new Set();
  let wholeRepo = false;
  const add = p => { if (!p) return; const abs = path.resolve(cwd, p); const s = subjectOf(abs); if (s) touched.add(s); return abs; };

  if (tool === 'Glob' || tool === 'Grep') {
    const base = path.resolve(cwd, ti.path || '.');
    const s = subjectOf(base);
    if (s) touched.add(s);
    else if (isRoot(base)) {
      const pat = String(ti.pattern || '');
      if (tool === 'Glob') {
        const lead = pat.split(/[*?[{]/)[0];               /* literal prefix before the first wildcard */
        const ls = subjectOf(path.resolve(base, lead || '.'));
        if (ls) touched.add(ls);
        else if (/\*\*|[\\/]/.test(pat.slice(lead.length)) || /^\*\*/.test(pat)) wholeRepo = true;
      } else wholeRepo = true;                              /* Grep recurses */
    }
  } else if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(ti.command || '');
    mentioned(cmd).forEach(s => touched.add(s));
    const here = subjectOf(cwd);
    if (here) touched.add(here);
    else if (isRoot(cwd) && RECURSIVE.test(cmd) && !touched.size) wholeRepo = true;
  } else {
    add(ti.file_path); add(ti.notebook_path); add(ti.path);
  }

  if (!st.active) {
    if (touched.size || wholeRepo) deny('This root session is neither a study session nor a development session yet. Ask the user: "Is this a study session, and for which subject?" They answer `predmet <name>`, or confirm a development session by typing `development`. You cannot choose it yourself.');
    return out({});
  }
  const others = [...touched].filter(s => s !== st.active);
  if (others.length) deny('This session is fixed to subject "' + st.active + '"; ' + others.join(', ') + ' belongs to another subject. One subject per session: do not read or write it. Tell the user that working on ' + others.join(', ') + ' needs a new session started in that directory.');
  if (wholeRepo) deny('This search would cover every subject. Limit it to ' + st.active + '/ or a shared folder (common/, quiz/, docs/).');
  out({});
}

let raw = '';
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const ev = input.hook_event_name;
    if (ev === 'SessionStart') return sessionStart(input);
    if (ev === 'UserPromptSubmit') return promptSubmit(input);
    if (ev === 'PreToolUse') return preTool(input);
  } catch (e) { /* fail open */ }
  process.exit(0);
});
