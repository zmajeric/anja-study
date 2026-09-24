/* Shared page plumbing for pages outside a subject (the root index, subject home, /quiz/*).
 *
 *   Course.subjects()          → Promise<[{id, title, status}]>  from subjects.json
 *   Course.loadSubject()       → Promise<subject>  reads ?subject=<id>, fetches <id>/subject.json only.
 *   Course.load()              → Promise<subject>  reads ?subject=<id>, fetches <id>/subject.json,
 *                                 points Bank.root and the score storage at that subject, then loads
 *                                 every bank file the subject lists, in order.
 *   Course.param(name) / Course.setParams({...})   read / rewrite the query string in place.
 *   Course.chips(el, choices, current, onPick)     one row of toggle buttons (chapter, set).
 *
 * Pages sit one level below the repo root (quiz/, or the root itself for index.html), so HOME is
 * the relative path back to the root. Every path stays relative: the site is served from a
 * sub-path on GitHub Pages, and from / by .claude/serve.js.
 */
(function () {
  var HOME = document.currentScript.getAttribute('data-home');
  if (HOME == null) HOME = '../';                  /* "" (a root page) is a real value, not a default */

  function param(name) { return new URLSearchParams(location.search).get(name); }
  function setParams(obj) {
    var q = new URLSearchParams(location.search);
    Object.keys(obj).forEach(function (k) { if (obj[k] == null || obj[k] === '') q.delete(k); else q.set(k, obj[k]); });
    if (history.replaceState) history.replaceState(null, '', '?' + q.toString());
  }
  function json(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    });
  }
  function script(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src;
      s.onload = ok; s.onerror = function () { fail(new Error('could not load ' + src)); };
      document.body.appendChild(s);
    });
  }
  function fail(err) {
    if (err && err.shown) throw err;              /* already on screen (a nested load failed) */
    if (err && typeof err === 'object') err.shown = true;
    var m = document.querySelector('main') || document.body;
    var box = document.createElement('div'); box.className = 'box';
    box.innerHTML = '<div class="label">This page could not load</div><p></p>';
    box.querySelector('p').textContent = String(err && err.message || err) +
      (location.protocol === 'file:' ? ' — open it through the server (node .claude/serve.js) or the published site, not from disk.' : '');
    m.insertBefore(box, m.firstChild);
    throw err;
  }

  function subjects() { return json(HOME + 'subjects.json').catch(fail); }

  /* subject.json only, without the banks (pages that show no questions). */
  function loadSubject() {
    var id = param('subject');
    if (!id) return Promise.reject(new Error('No subject chosen: the address needs ?subject=<name>.')).catch(fail);
    var dir = HOME + id + '/';
    return json(dir + 'subject.json').then(function (subject) {
      subject.dir = dir;
      window.SUBJECT = subject.id;
      return subject;
    }).catch(fail);
  }

  function load() {
    return loadSubject().then(function (subject) {
      var dir = subject.dir;
      Bank.root = dir;
      var files = subject.chapters.map(function (c) { return c.bank; }).concat(subject.extraBanks || []);
      return files.reduce(function (p, f) { return p.then(function () { return script(dir + f); }); }, Promise.resolve())
        .then(function () { document.title = document.title + ' · ' + subject.title; return subject; });
    }).catch(fail);
  }

  /* choices: [{id, label}] — a click calls onPick(id) and moves the highlight. */
  function chips(el, choices, current, onPick) {
    el = typeof el === 'string' ? document.querySelector(el) : el;
    el.innerHTML = ''; el.classList.add('chips');
    choices.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button';
      b.textContent = c.label; b.dataset.id = c.id;
      if (c.id === current) b.classList.add('on');
      b.onclick = function () {
        Array.prototype.forEach.call(el.children, function (x) { x.classList.toggle('on', x === b); });
        onPick(c.id);
      };
      el.appendChild(b);
    });
  }

  window.Course = { HOME: HOME, param: param, setParams: setParams, json: json, subjects: subjects, loadSubject: loadSubject, load: load, chips: chips };
})();
