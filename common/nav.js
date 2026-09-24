/* The subject menu bar at the top of every subject page: lessons, quizzes, cheat sheets, my notes.
 * On lesson pages it also loads common/notes.js (the learner's iPad notes as margin notes).
 *
 *   <script src="<path to>/common/nav.js" defer></script>
 *
 * Works out everything itself: the repo root from this script's own URL, the subject from
 * <html data-subject> (lessons, cheat sheets) or ?subject= (subject home, quiz pages). Menus come
 * from <subject>/subject.json, so a new lesson or sheet shows up once it is listed there.
 * Without HTTP (a page opened from disk) it shows only the fixed links.
 */
(function () {
  var ROOT = new URL('..', document.currentScript.src);          /* common/nav.js → repo root */
  var subject = document.documentElement.getAttribute('data-subject') || new URLSearchParams(location.search).get('subject');
  if (!subject) return;

  var here = location.href.split('#')[0];
  function url(rel) { return new URL(rel, ROOT).href; }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function isHere(href) {
    var a = new URL(href), b = new URL(here);
    if (a.pathname !== b.pathname) return false;
    var s = a.searchParams.get('subject');
    return !s || s === b.searchParams.get('subject');
  }
  /* One dropdown: a <details> whose summary is the section name. */
  function menu(label, rows) {
    var d = el('details', { class: 'menu' });
    var active = rows.some(function (r) { return isHere(r.href); });
    var s = el('summary', active ? { class: 'on' } : {}, label);
    d.appendChild(s);
    var list = el('div', { class: 'menu-list' });
    if (!rows.length) list.appendChild(el('span', { class: 'empty' }, 'None yet'));
    rows.forEach(function (r) {
      var a = el('a', { href: r.href }, r.title);
      if (isHere(r.href)) a.className = 'on';
      if (r.note) a.appendChild(el('span', { class: 'note' }, r.note));
      list.appendChild(a);
    });
    d.appendChild(list);
    return d;
  }

  var q = '?subject=' + encodeURIComponent(subject);
  var bar = el('nav', { class: 'topbar', 'aria-label': 'Subject menu' });
  var home = el('a', { class: 'brand', href: url('subject.html' + q) }, subject);
  bar.appendChild(el('a', { class: 'up', href: url('index.html'), title: 'All subjects' }, '⌂'));
  bar.appendChild(home);
  document.body.insertBefore(bar, document.body.firstChild);

  /* Lessons also show the learner's iPad notes beside their sections (notes.js). */
  if (location.pathname.indexOf('/' + subject + '/lessons/') >= 0 && !window.IpadNotes) {
    var s = document.createElement('script'); s.src = url('common/notes.js'); document.body.appendChild(s);
  }

  /* Close an open menu on outside click, and keep only one open at a time. */
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(bar.querySelectorAll('details[open]'), function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });

  fetch(url(subject + '/subject.json'), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
    if (!s) return;
    home.textContent = s.title;
    var dir = subject + '/';
    var chapter = {}; s.chapters.forEach(function (c) { chapter[c.id] = 'Ch. ' + c.n; });
    bar.appendChild(menu('Lessons', s.lessons.map(function (l, i) {
      return { href: url(dir + l.file), title: (i + 1) + '. ' + l.title, note: chapter[l.chapter] || 'all' };
    })));
    bar.appendChild(menu('Quizzes', [
      ['mixed', 'Mixed quiz'], ['mcq', 'MCQ quiz'], ['write', 'Write quiz'], ['image', 'Image quiz'], ['mock', 'Mock exam'], ['custom', 'Custom quiz']
    ].map(function (k) { return { href: url('quiz/' + k[0] + '.html' + q), title: k[1] }; })));
    bar.appendChild(menu('Cheat sheets', s.reference.map(function (r) { return { href: url(dir + r.file), title: r.title }; })));
    var notes = el('a', { class: 'item', href: url('notes.html' + q) }, 'My notes');
    if (isHere(notes.href)) notes.className += ' on';
    bar.appendChild(notes);
  }).catch(function () {});
})();
