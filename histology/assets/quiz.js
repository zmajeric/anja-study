/* Histology course — quiz components.
 *
 *   Quiz.mcq(el, items, {key})     items: [{q, options: [...], answer: <index>, why, cite}]
 *   Quiz.recall(el, items, {key})  items: [{q, a}]
 *
 * Options are shuffled on every render so position can't be memorised.
 * Feedback is immediate. Scores persist in localStorage under "histology:<key>".
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

  function mcq(root, items, opts) {
    opts = opts || {};
    root = typeof root === 'string' ? document.querySelector(root) : root;
    root.classList.add('quiz');
    var key = opts.key || root.id || 'quiz';
    var answered = 0, correct = 0, missed = [];
    root.innerHTML = '';
    var prev = store.get(key);
    if (prev) root.appendChild(h('p', { class: 'cite' }, 'Last attempt: ' + prev.correct + '/' + prev.total + (prev.missed.length ? ' — missed questions ' + prev.missed.join(', ') : '')));

    items.forEach(function (it, i) {
      var why = h('div', { class: 'why' });
      var optsEl = h('div', { class: 'opts' });
      var item = h('div', { class: 'item' }, h('div', { class: 'stem' }, h('span', { class: 'n' }, String(i + 1)), it.q), optsEl, why);
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
        if (answered === items.length) done();
      }
      root.appendChild(item);
    });

    var score = h('div', { class: 'score' });
    root.appendChild(score);
    function done() {
      store.set(key, { correct: correct, total: items.length, missed: missed, at: Date.now() });
      score.textContent = 'Score: ' + correct + '/' + items.length + '. ' + (missed.length ? 'Re-read the explanations for ' + missed.join(', ') + ', then retry.' : 'Clean sweep.');
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
    var results = store.get(key) || {};
    items.forEach(function (it, i) {
      var ans = h('div', { class: 'answer' }, it.a);
      var card = h('div', { class: 'card' });
      var got, miss;
      var reveal = h('button', { onclick: function () { ans.classList.add('show'); reveal.disabled = true; got.disabled = false; miss.disabled = false; } }, 'Reveal');
      got = h('button', { class: 'got', disabled: 'disabled', onclick: function () { grade(true); } }, 'I had it');
      miss = h('button', { class: 'miss', disabled: 'disabled', onclick: function () { grade(false); } }, 'I missed it');
      function grade(ok) {
        card.classList.remove('got', 'miss'); card.classList.add(ok ? 'got' : 'miss');
        results[i + 1] = ok; store.set(key, results);
      }
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
      var mcq = store.get(lessonId + ':mcq');
      parts.push(mcq ? 'mcq ' + mcq.correct + '/' + mcq.total + (mcq.missed.length ? ' (missed ' + mcq.missed.join(', ') + ')' : ' (clean)') : 'mcq not done');
      var rec = store.get(lessonId + ':recall');
      if (rec) {
        var keys = Object.keys(rec), missedR = keys.filter(function (k) { return !rec[k]; });
        parts.push('recall ' + (keys.length - missedR.length) + '/' + keys.length + (missedR.length ? ' (missed ' + missedR.join(', ') + ')' : ' (clean)'));
      } else parts.push('recall not done');
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
