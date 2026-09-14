/* Histology course — quiz components.
 *
 *   Quiz.mcq(el, items, {key})     items: [{q, options: [...], answer: <index>, why, cite, img}]
 *   Quiz.recall(el, items, {key})  items: [{q, a, img}]
 *
 * `img` is optional: {src, alt, caption} — a micrograph shown above the question stem,
 * for "identify what is shown" items like the ones on the real exam.
 * Options are shuffled on every render so position can't be memorised.
 * Feedback is immediate. Scores persist in localStorage under "histology:<key>".
 *
 * Stored shapes — both record the number of items the attempt was made against, so a
 * half-finished attempt still counts and an attempt made before a question was added
 * is recognisable rather than being reported as a current score:
 *   mcq     {correct, total, answered, missed: [n...], at, stale?}
 *   recall  {r: {n: bool...}, total, at}          (older flat {n: bool} is still read)
 */
(function () {
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('histology:' + k)) || null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('histology:' + k, JSON.stringify(v)); } catch (e) {} }
  };
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      el.appendChild(kid instanceof Node ? kid : document.createTextNode(kid));
    }
    return el;
  }

  function figure(img) {
    if (!img) return null;
    var fig = h('figure', { class: 'fig' }, h('img', { src: img.src, alt: img.alt || '' }));
    if (img.caption) fig.appendChild(h('figcaption', {}, img.caption));
    return fig;
  }

  function byNumber(a, b) { return a - b; }

  /* How a stored attempt reads back, once the quiz itself may have changed under it. */
  function prevLine(p) {
    if (p.stale) return 'Last attempt (' + p.correct + '/' + p.total + ') was taken before this quiz grew — take it again for a score you can send.';
    var left = p.total - (p.answered == null ? p.total : p.answered);
    return 'Last attempt: ' + p.correct + '/' + p.total +
      (left ? ' — ' + left + ' left unanswered' : '') +
      (p.missed.length ? ' — missed questions ' + p.missed.join(', ') : '');
  }

  function mcq(root, items, opts) {
    opts = opts || {};
    root = typeof root === 'string' ? document.querySelector(root) : root;
    root.classList.add('quiz');
    var key = opts.key || root.id || 'quiz';
    var answered = 0, correct = 0, missed = [];
    root.innerHTML = '';
    var prev = store.get(key);
    /* An attempt at a different number of questions is not this quiz's score. Mark it
     * so the banner and the export both say so instead of quoting a stale total. */
    if (prev && prev.total !== items.length) { prev.stale = true; store.set(key, prev); }
    if (prev) root.appendChild(h('p', { class: 'cite' }, prevLine(prev)));

    items.forEach(function (it, i) {
      var why = h('div', { class: 'why' });
      var optsEl = h('div', { class: 'opts' });
      var item = h('div', { class: 'item' });
      var fig = figure(it.img); if (fig) item.appendChild(fig);
      item.appendChild(h('div', { class: 'stem' }, h('span', { class: 'n' }, String(i + 1)), it.q));
      item.appendChild(optsEl); item.appendChild(why);
      var order = shuffle(it.options.map(function (_, idx) { return idx; }));
      var buttons = order.map(function (idx) {
        return h('button', { class: 'opt', onclick: function () { pick(idx); } }, it.options[idx]);
      });
      buttons.forEach(function (b) { optsEl.appendChild(b); });
      function pick(idx) {
        buttons.forEach(function (b) { b.disabled = true; });
        var ok = idx === it.answer;
        buttons.forEach(function (b, bi) {
          if (order[bi] === it.answer) b.classList.add('ok');
          else if (order[bi] === idx && !ok) b.classList.add('bad');
        });
        why.appendChild(document.createTextNode((ok ? 'Correct. ' : 'Not quite. ') + (it.why || '')));
        if (it.cite) why.appendChild(h('span', { class: 'cite' }, it.cite));
        why.classList.add('show');
        answered++; if (ok) correct++; else missed.push(i + 1);
        save();
        if (answered === items.length) done(); else progress();
      }
      root.appendChild(item);
    });

    var score = h('div', { class: 'score' });
    root.appendChild(score);

    /* Save after every answer, not only on completion: a half-finished attempt is still
     * evidence worth sending, and the last question — the one most likely to be left
     * hanging — must not be able to void the twelve above it. */
    /* Sorted on the way out: `missed` accumulates in answering order, which would
     * otherwise report the order she clicked rather than which questions to revisit. */
    function save() {
      store.set(key, { correct: correct, total: items.length, answered: answered, missed: missed.slice().sort(byNumber), at: Date.now() });
    }
    function progress() {
      var left = items.length - answered;
      score.textContent = 'Answered ' + answered + ' of ' + items.length + ' — ' + correct + ' correct. ' +
        left + (left === 1 ? ' question still unanswered.' : ' questions still unanswered.');
      score.classList.add('show');
    }
    function done() {
      score.textContent = 'Score: ' + correct + '/' + items.length + '. ' + (missed.length ? 'Re-read the explanations for ' + missed.slice().sort(byNumber).join(', ') + ', then retry.' : 'Clean sweep.');
      score.appendChild(h('button', { onclick: function () { mcq(root, items, opts); } }, 'Retry (reshuffled)'));
      score.classList.add('show');
    }
  }

  function recall(root, items, opts) {
    opts = opts || {};
    root = typeof root === 'string' ? document.querySelector(root) : root;
    root.classList.add('recall');
    var key = opts.key || (root.id + ':recall');
    root.innerHTML = '';
    var saved = store.get(key);
    var results = (saved && saved.r) ? saved.r : (saved || {});
    function save() { store.set(key, { r: results, total: items.length, at: Date.now() }); }
    items.forEach(function (it, i) {
      var ans = h('div', { class: 'answer' }, it.a);
      var card = h('div', { class: 'card' });
      var got, miss;
      var reveal = h('button', { onclick: function () { ans.classList.add('show'); reveal.disabled = true; got.disabled = false; miss.disabled = false; } }, 'Reveal');
      got = h('button', { class: 'got', disabled: 'disabled', onclick: function () { grade(true); } }, 'I had it');
      miss = h('button', { class: 'miss', disabled: 'disabled', onclick: function () { grade(false); } }, 'I missed it');
      function grade(ok) {
        card.classList.remove('got', 'miss'); card.classList.add(ok ? 'got' : 'miss');
        results[i + 1] = ok; save();
      }
      var fig = figure(it.img); if (fig) card.appendChild(fig);
      card.appendChild(h('div', { class: 'prompt' }, it.q));
      card.appendChild(h('p', { class: 'cite' }, 'Say or write your answer first. Then reveal.'));
      card.appendChild(ans);
      card.appendChild(h('div', { class: 'controls' }, reveal, got, miss));
      root.appendChild(card);
    });
  }

  /* Quiz.results(el, lessonId): a "Copy my results" button that gathers every stored
   * score whose key starts with "histology:<lessonId>" and puts a one-line summary on the
   * clipboard (and on screen, in case the clipboard is blocked) — paste it to the teacher. */
  function results(root, lessonId) {
    root = typeof root === 'string' ? document.querySelector(root) : root;
    root.classList.add('results');
    root.innerHTML = '';
    var out = h('textarea', { readonly: 'readonly', rows: '2', 'aria-label': 'Results summary' });
    out.style.display = 'none';
    var status = h('span', { class: 'cite' });
    function summary() {
      var parts = [lessonId];

      var m = store.get(lessonId + ':mcq');
      if (!m) {
        parts.push('mcq not done');
      } else if (m.stale) {
        parts.push('mcq ' + m.correct + '/' + m.total + ' — taken before the quiz grew to its current length, not retaken');
      } else {
        var mNotes = [];
        var unanswered = m.total - (m.answered == null ? m.total : m.answered);
        if (m.missed.length) mNotes.push('missed ' + m.missed.join(', '));
        if (unanswered) mNotes.push(unanswered + ' unanswered');
        parts.push('mcq ' + m.correct + '/' + m.total + ' (' + (mNotes.length ? mNotes.join('; ') : 'clean') + ')');
      }

      var rec = store.get(lessonId + ':recall');
      var map = (rec && rec.r) ? rec.r : rec;
      var keys = map ? Object.keys(map) : [];
      if (!keys.length) {
        parts.push('recall not done');
      } else {
        /* Denominator is every card in the set, not just the ones graded so far. */
        var total = (rec && rec.total) || keys.length;
        var missedR = keys.filter(function (k) { return !map[k]; });
        var rNotes = [];
        if (missedR.length) rNotes.push('missed ' + missedR.join(', '));
        if (total > keys.length) rNotes.push((total - keys.length) + ' ungraded');
        parts.push('recall ' + (keys.length - missedR.length) + '/' + total + ' (' + (rNotes.length ? rNotes.join('; ') : 'clean') + ')');
      }

      parts.push(new Date().toISOString().slice(0, 10));
      return parts.join(' · ');
    }
    var btn = h('button', { onclick: function () {
      var text = summary();
      out.value = text; out.style.display = 'block'; out.select();
      var done = function (ok) { status.textContent = ok ? 'Copied — paste it to your teacher.' : 'Clipboard blocked — copy the text above by hand.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(document.execCommand && document.execCommand('copy')); });
      else done(document.execCommand && document.execCommand('copy'));
    } }, 'Copy my results');
    root.appendChild(h('div', { class: 'controls' }, btn, status));
    root.appendChild(out);
  }

  window.Quiz = { mcq: mcq, recall: recall, results: results };
})();
