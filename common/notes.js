/* The learner's iPad notes (CONTEXT.md: iPad note, highlight, ink, colour) on the page.
 *
 * Data: <subject>/notes/notes.json, written by common/tools/extract-notes.py and enriched by the
 * agent (chapter, lesson, anchor, ink transcriptions).
 *
 *   IpadNotes.load(root, subject)   → Promise<[note]>   ([] when the subject has no notes yet)
 *   IpadNotes.parseTag('ipad-note:INK-BLUE') → {kind: 'INK', colour: 'BLUE'}   (either may be null)
 *   IpadNotes.matches(note, {kind, colour}) → bool
 *   IpadNotes.card(note, root, subject, opts) → <aside> element
 *   IpadNotes.anchor(text)          the id a lesson heading gets: 'sec-' + slug of its text. A note's
 *                                   `anchor` holds this value. The prefix keeps it clear of the quiz
 *                                   containers' ids (#mcq, #recall …).
 *
 * On a lesson page (loaded there by nav.js) it runs by itself: each note whose `lesson` is this
 * page is placed beside the heading its `anchor` names, as a margin note; notes of this lesson
 * without a matching heading, and notes of the lesson's chapter not tied to any lesson, go into a
 * "My notes" box at the end.
 */
(function () {
  var KINDS = ['HIGHLIGHT', 'INK'];
  var COLOURS = ['YELLOW', 'GREEN', 'BLUE', 'PINK', 'RED', 'PURPLE', 'ORANGE', 'BLACK'];

  function slug(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function anchor(text) { return 'sec-' + slug(text); }
  function parseTag(s) {
    var m = /ipad-note:([A-Z]+)(?:-([A-Z]+))?/i.exec(s || '');
    if (!m) return { kind: null, colour: null };
    var a = m[1].toUpperCase(), b = m[2] && m[2].toUpperCase();
    if (a === 'TEXT') a = 'INK';                                   /* the learner's first word for ink */
    if (KINDS.indexOf(a) >= 0) return { kind: a, colour: b || null };
    return { kind: null, colour: a };
  }
  function matches(n, f) {
    return (!f.kind || n.kind === f.kind) && (!f.colour || n.colour === f.colour);
  }
  function load(root, subject) {
    return fetch(new URL(subject + '/notes/notes.json', root), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { notes: [] }; })
      .then(function (d) { return d.notes || []; })
      .catch(function () { return []; });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  /* opts: {lessonLink: bool, lessons: {file: title}} */
  function card(n, root, subject, opts) {
    opts = opts || {};
    var a = el('aside', 'ipad-note');
    a.dataset.colour = n.colour; a.dataset.kind = n.kind; a.id = 'note-' + n.id;
    var head = el('div', 'ipad-note-head');
    head.appendChild(el('span', 'ipad-note-tag', n.kind.toLowerCase() + ' · ' + n.colour.toLowerCase()));
    head.appendChild(el('span', 'ipad-note-src', n.resource.replace(/\.pdf$/i, '') + ' · p. ' + n.page));
    a.appendChild(head);
    if (n.image) {
      var img = el('img'); img.src = new URL(subject + '/notes/' + n.image, root).href; img.alt = n.text || 'handwritten note';
      img.loading = 'lazy';
      a.appendChild(img);
    }
    if (n.text) a.appendChild(el('p', n.kind === 'INK' ? 'ipad-note-text ink' : 'ipad-note-text', n.kind === 'HIGHLIGHT' ? '“' + n.text + '”' : n.text));
    else if (n.kind === 'INK') a.appendChild(el('p', 'ipad-note-text empty', 'not transcribed yet'));
    if (opts.lessonLink && n.lesson) {
      var link = el('a', 'ipad-note-lesson', '→ ' + ((opts.lessons || {})[n.lesson] || n.lesson));
      link.href = new URL(subject + '/' + n.lesson + (n.anchor ? '#' + n.anchor : ''), root).href;
      a.appendChild(link);
    }
    return a;
  }

  window.IpadNotes = { KINDS: KINDS, COLOURS: COLOURS, anchor: anchor, parseTag: parseTag, matches: matches, load: load, card: card };

  /* ---- lesson pages ---- */
  var subject = document.documentElement.getAttribute('data-subject');
  var at = location.pathname.indexOf('/' + subject + '/lessons/');
  if (!subject || at < 0) return;
  var ROOT = new URL('..', document.currentScript.src);
  var lessonFile = decodeURIComponent(location.pathname.slice(at + subject.length + 2));

  Promise.all([
    fetch(new URL(subject + '/subject.json', ROOT), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    load(ROOT, subject)
  ]).then(function (res) {
    var subj = res[0], notes = res[1];
    if (!notes.length) return;
    var me = subj && subj.lessons.filter(function (l) { return l.file === lessonFile; })[0];
    var chapter = me && me.chapter;
    var main = document.querySelector('main') || document.body;

    var heads = {};
    Array.prototype.forEach.call(main.querySelectorAll('h2, h3'), function (h) {
      if (!h.id) h.id = anchor(h.textContent);
      heads[h.id] = h;
    });

    var loose = [];
    notes.forEach(function (n) {
      if (n.lesson === lessonFile) {
        var h = n.anchor && heads[n.anchor];
        if (h) { var c = card(n, ROOT, subject); c.classList.add('margin'); h.parentNode.insertBefore(c, h.nextSibling); }
        else loose.push(n);
      } else if (!n.lesson && chapter && chapter !== 'all' && n.chapter === chapter) loose.push(n);
    });
    if (!loose.length) return;
    var box = el('section', 'box ipad-notes-box');
    box.appendChild(el('div', 'label', 'My notes · this chapter'));
    loose.forEach(function (n) { box.appendChild(card(n, ROOT, subject)); });
    var more = el('a', null, 'All my notes →');
    more.href = new URL('notes.html?subject=' + encodeURIComponent(subject) + (chapter ? '&chapter=' + chapter : ''), ROOT).href;
    box.appendChild(more);
    var footer = main.querySelector('footer');
    main.insertBefore(box, footer || null);
  });
})();
