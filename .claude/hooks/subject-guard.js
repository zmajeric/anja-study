#!/usr/bin/env node
/* Session kinds, no web without the keyword, and a source guard in development sessions. Wired in
 * .claude/settings.json for SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop;
 * every subject carries an identical
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
 * Source guard, development sessions only (study sessions are unaffected):
 *   - protected: <subject>/source/** and <subject>/RESOURCES.md. A write-type tool call on them
 *     (Write/Edit/..., or a shell command naming them with a write-type verb) asks the user first.
 *   - reported: <subject>/reference/** (the cheat sheets). Never asks; listed in the summary.
 *   A snapshot (size + mtime per file), taken when the session became a development session, is
 *   the baseline (.claude/state/<id>.dev.json). After every tool call, a protected change the user
 *   did not approve is reported at once; at the end of every reply, a summary lists everything
 *   changed since the baseline.
 *
 * Fails open: a crash here prints nothing and exits 0, so a broken hook never locks the session.
 * The one exception: a crashed PreToolUse for a write-type call that names a protected path asks.
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
function ask(reason) {
  out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason } });
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

/* ---- Source guard (development sessions) ---- */
const TEMP_FILE = /^(\.~lock|~\$)/;                       /* office lock files: not real changes */
function relOf(abs) { return path.relative(ROOT, abs).split(path.sep).join('/'); }
function kindOf(rel) {
  const p = rel.split('/');
  if (p.length < 2 || !subjects().includes(p[0])) return null;
  const second = p[1].toLowerCase();
  if (second === 'source' || (p.length === 2 && second === 'resources.md')) return 'protected';
  if (second === 'reference') return 'reported';
  return null;
}
function scan() {
  const snap = {};
  const stat = r => { try { const s = fs.statSync(path.join(ROOT, r)); snap[r] = s.size + ':' + Math.round(s.mtimeMs); } catch (e) {} };
  const walk = rel => {
    let ents;
    try { ents = fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }); } catch (e) { return; }
    for (const d of ents) {
      if (TEMP_FILE.test(d.name)) continue;
      if (d.isDirectory()) walk(rel + '/' + d.name); else stat(rel + '/' + d.name);
    }
  };
  for (const s of subjects()) { walk(s + '/source'); walk(s + '/reference'); stat(s + '/RESOURCES.md'); }
  return snap;
}
function changes(a, b) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => a[k] !== b[k])
    .map(k => ({ path: k, change: !(k in a) ? 'added' : !(k in b) ? 'removed' : 'modified' }));
}
function devFile(id) { return stateFile(id).replace(/\.json$/, '.dev.json'); }
function saveDev(id, d) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(devFile(id), JSON.stringify(d)); }
function freshDev(id) { const now = scan(); const d = { base: now, last: now, pending: {}, approved: [] }; saveDev(id, d); return d; }
function loadDev(id) { try { return JSON.parse(fs.readFileSync(devFile(id), 'utf8')); } catch (e) { return freshDev(id); } }

/* A shell command that names a protected path (source/, not assets/img/source/; RESOURCES.md) and
 * could write. Deliberately broad on verbs: scripts and git can rewrite anything they are given. */
const PROTECTED_MENTION = /(?<![\w.-]|img[\\/])source(?=[\\/"'\s)]|$)|\bRESOURCES\.md\b/i;
const WRITE_VERB = new RegExp('>|\\b(' + [
  'rm', 'rmdir', 'mv', 'cp', 'del', 'erase', 'move', 'copy', 'ren', 'rename', 'touch', 'tee', 'truncate', 'dd',
  'sed\\s+-i', 'perl\\s+-i', 'unzip', 'tar', 'python3?', 'py', 'node', 'pandoc', 'soffice',
  'Set-Content', 'Add-Content', 'Clear-Content', 'Out-File', 'Remove-Item', 'Move-Item', 'Copy-Item',
  'Rename-Item', 'New-Item', 'Expand-Archive', 'sc', 'ac', 'ri', 'mi', 'cpi', 'rni', 'ni',
  'git\\s+(checkout|restore|rm|mv|stash|reset|clean|pull|merge|rebase|switch|apply|am|cherry-pick|revert)'
].join('|') + ')\\b', 'i');
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function guardSources(input, tool, ti, cwd) {
  const d = loadDev(input.session_id);                    /* makes sure a baseline exists before any change */
  let hit = null, rel = null;
  if (WRITE_TOOLS.has(tool)) {
    rel = relOf(path.resolve(cwd, ti.file_path || ti.notebook_path || ''));
    if (kindOf(rel) === 'protected') hit = [rel.toLowerCase()];
  } else if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(ti.command || '');
    if ((kindOf(relOf(cwd)) === 'protected' || PROTECTED_MENTION.test(cmd)) && WRITE_VERB.test(cmd)) hit = '*';
  }
  if (!hit) return out({});
  d.pending[input.tool_use_id || 'unknown'] = hit;
  saveDev(input.session_id, d);
  ask(hit === '*'
    ? 'Development session: this command may change protected resource files (<subject>/source/ or RESOURCES.md). Approve only if that is intended.'
    : 'Development session: this changes the protected resource file ' + rel + '. Approve only if that is intended.');
}

function postTool(input) {
  const st = load(input.session_id);
  if (!st || st.mode !== 'development') return out({});
  const d = loadDev(input.session_id), now = scan();
  const allowed = d.pending[input.tool_use_id];
  delete d.pending[input.tool_use_id];
  const unconfirmed = [];
  for (const c of changes(d.last, now)) {
    if (kindOf(c.path) !== 'protected') continue;
    if (allowed === '*' || (allowed && allowed.includes(c.path.toLowerCase()))) {
      if (!d.approved.includes(c.path)) d.approved.push(c.path);
    } else unconfirmed.push(c);
  }
  d.last = now;
  saveDev(input.session_id, d);
  if (!unconfirmed.length) return out({});
  const list = unconfirmed.map(c => c.path + ' (' + c.change + ')').join(', ');
  out({
    systemMessage: 'Protected resource files changed during this session (possibly outside Claude), not confirmed: ' + list,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: 'Protected resource files changed without the user\'s confirmation: ' + list + '. Stop, tell the ' +
        'user exactly which files changed and how (say so if your last tool call did it), and wait for their decision.'
    }
  });
}

function stop(input) {
  const st = load(input.session_id);
  if (!st || st.mode !== 'development') return out({});
  const d = loadDev(input.session_id);
  d.pending = {};                                          /* denied calls leave entries behind */
  saveDev(input.session_id, d);
  const all = changes(d.base, scan());
  const prot = all.filter(c => kindOf(c.path) === 'protected');
  const rep = all.filter(c => kindOf(c.path) === 'reported');
  if (!prot.length && !rep.length) return out({});
  const lines = [];
  if (prot.length) lines.push('Protected resource files changed this session: ' + prot.map(c =>
    c.path + ' (' + c.change + ', ' + (d.approved.includes(c.path) ? 'approved' : 'NOT confirmed') + ')').join(', '));
  if (rep.length) lines.push('Cheat sheets changed this session: ' + rep.map(c => c.path + ' (' + c.change + ')').join(', '));
  out({ systemMessage: lines.join('\n') });
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
    if (!st.mode) { st.mode = 'development'; st.active = null; freshDev(input.session_id); }
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
  if (st.mode === 'development') return guardSources(input, tool, ti, cwd);

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
    if (ev === 'PostToolUse') return postTool(input);
    if (ev === 'Stop') return stop(input);
  } catch (e) {
    /* Fail open, except a write-type call naming a protected path in a (possibly) development session. */
    try {
      let st = null;
      try { st = load(JSON.parse(raw).session_id); } catch (e2) {}
      if ((!st || st.mode === 'development') && /"hook_event_name"\s*:\s*"PreToolUse"/.test(raw) &&
        /"tool_name"\s*:\s*"(Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell)"/.test(raw) &&
        /source[\\/]|RESOURCES\.md/i.test(raw))
        ask('The subject guard failed on a call that may change protected resource files (source/ or RESOURCES.md). Approve only if intended.');
    } catch (e3) {}
  }
  process.exit(0);
});
