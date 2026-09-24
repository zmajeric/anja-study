/* The custom quiz page (quiz/custom.html?subject=<id>): the learner picks how many questions of each
 * type — MCQ, written, image MCQ, image written — narrows by chapter, set and source like the other
 * quiz pages, and generates a paper. Every generated paper is saved in this browser under
 * "<subject>:CUSTOM:saved", newest first, labelled with the moment it was made (DD-MM-YY HH:MM:SS),
 * so it can be reopened exactly as drawn. A saved paper keeps copies of its questions, not
 * references, so it still opens after the banks change.
 * Scores are stored per paper: "<subject>:CUSTOM:<paper id>:mcq|recall".
 */
(function () {
  var TYPES = [
    { id: 'mcq',          label: 'MCQ' },
    { id: 'written',      label: 'Written' },
    { id: 'imageMcq',     label: 'Image MCQ' },
    { id: 'imageWritten', label: 'Image written' }
  ];

  function $(s) { return document.querySelector(s); }
  function pad(n) { return ('0' + n).slice(-2); }
  function stamp(ms) {
    var d = new Date(ms);
    return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getFullYear() % 100) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function chapterTag(it) { return '[' + it.chapter.replace(/^ch/, 'Ch. ') + '] '; }

  function savedKey() { return window.SUBJECT + ':CUSTOM:saved'; }
  function loadSaved() { try { return JSON.parse(localStorage.getItem(savedKey())) || []; } catch (e) { return []; } }
  function storeSaved(list) {
    try { localStorage.setItem(savedKey(), JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  function draw(counts, chapter, set, mine) {
    var only = chapter === 'all' ? null : [chapter];
    var keep = mine ? function (it) { return !!(it.notes && it.notes.length); } : function () { return true; };
    var isMcq = function (it) { return keep(it) && Bank.isImageMcq(it); }, notMcq = function (it) { return keep(it) && !it.options; };
    return {
      mcq: Bank.shuffle(Bank.draw('mcq', counts.mcq, only, set, keep).concat(Bank.draw('image', counts.imageMcq, only, set, isMcq))),
      recall: Bank.draw('written', counts.written, only, set, keep).concat(Bank.draw('image', counts.imageWritten, only, set, notMcq))
    };
  }

  /* What the bank can supply for each type under the current filters. */
  function available(chapter, set, mine) {
    var only = chapter === 'all' ? Bank.ids() : [chapter];
    var keep = mine ? function (it) { return !!(it.notes && it.notes.length); } : function () { return true; };
    function n(type, f) { return only.reduce(function (a, id) { return a + Bank.items(id, type, set).filter(f).length; }, 0); }
    return {
      mcq: n('mcq', keep), written: n('written', keep),
      imageMcq: n('image', function (it) { return keep(it) && Bank.isImageMcq(it); }),
      imageWritten: n('image', function (it) { return keep(it) && !it.options; })
    };
  }

  function run() {
    Course.load().then(function (subject) {
      document.title = 'Custom quiz · ' + subject.title;
      $('#kicker').textContent = subject.title + ' · Custom quiz';
      var q = '?subject=' + encodeURIComponent(subject.id);
      $('#nav').innerHTML = '<a href="../subject.html' + q + '">← ' + subject.title + '</a>';

      var chapter = 'all', set = '', mine = false;
      var saved = loadSaved();
      var current = null;
      var setLabels = subject.sets || {};

      Course.chips('#chapters', [{ id: 'all', label: 'All chapters' }].concat(Bank.ids().map(function (id) {
        return { id: id, label: id.replace(/^ch/, 'Ch. ') + ' — ' + Bank.get(id).title };
      })), chapter, function (id) { chapter = id; filters(); });

      var hasMine = ['mcq', 'written', 'image'].some(function (t) {
        return Bank.ids().some(function (id) { return Bank.items(id, t).some(function (it) { return it.notes && it.notes.length; }); });
      });
      if (hasMine) {
        $('#mine-label').hidden = false;
        Course.chips('#mine', [{ id: '', label: 'All questions' }, { id: '1', label: 'From my notes' }], '', function (v) { mine = v === '1'; filters(); });
      }

      var inputs = {};
      TYPES.forEach(function (t) {
        var label = document.createElement('label');
        var input = document.createElement('input');
        input.type = 'number'; input.min = '0'; input.max = '200'; input.value = '0';
        var avail = document.createElement('span'); avail.className = 'avail';
        label.appendChild(document.createTextNode(t.label + ' '));
        label.appendChild(input); label.appendChild(avail);
        $('#counts').appendChild(label);
        inputs[t.id] = { input: input, avail: avail };
      });
      var mix = (subject.exam && subject.exam.mix) || {};
      inputs.mcq.input.value = 10;
      if (mix.written) inputs.written.input.value = 2;
      if (mix.image) inputs.imageMcq.input.value = 4;

      function filters() {
        var names = [];
        ['mcq', 'written', 'image'].forEach(function (t) {
          Bank.sets(t, chapter === 'all' ? null : [chapter]).forEach(function (s) { if (names.indexOf(s) < 0) names.push(s); });
        });
        if (set && names.indexOf(set) < 0) set = '';
        var show = names.length > 1;
        $('#sets-label').hidden = !show; $('#sets').hidden = !show;
        if (show) Course.chips('#sets', [{ id: '', label: 'Every set' }].concat(names.map(function (s) { return { id: s, label: setLabels[s] || s }; })),
          set, function (s) { set = s; filters(); });
        var a = available(chapter, set, mine);
        TYPES.forEach(function (t) { inputs[t.id].avail.textContent = 'of ' + a[t.id]; inputs[t.id].input.max = a[t.id]; });
      }

      function describe(p) {
        var parts = TYPES.filter(function (t) { return p.counts[t.id]; }).map(function (t) { return p.counts[t.id] + ' ' + t.label; });
        var ch = p.chapter === 'all' ? 'all chapters' : p.chapter.replace(/^ch/, 'Ch. ');
        return parts.join(' · ') + ' — ' + ch + (p.set ? ' · ' + (setLabels[p.set] || p.set) : '') + (p.mine ? ' · from my notes' : '');
      }

      function list() {
        var root = $('#saved');
        root.innerHTML = '';
        $('#saved-none').hidden = !!saved.length;
        saved.forEach(function (p) {
          var li = document.createElement('li');
          var a = document.createElement('a'); a.href = '#'; a.textContent = stamp(p.at);
          a.onclick = function (e) { e.preventDefault(); open(p); };
          if (current && current.id === p.id) a.className = 'on';
          var note = document.createElement('span'); note.className = 'note'; note.textContent = describe(p);
          var del = document.createElement('button'); del.type = 'button'; del.className = 'del'; del.textContent = 'Delete';
          del.title = 'Delete this saved quiz';
          del.onclick = function () {
            if (!confirm('Delete the quiz from ' + stamp(p.at) + '?')) return;
            saved = saved.filter(function (x) { return x.id !== p.id; });
            storeSaved(saved);
            try { localStorage.removeItem(window.SUBJECT + ':CUSTOM:' + p.id + ':mcq'); localStorage.removeItem(window.SUBJECT + ':CUSTOM:' + p.id + ':recall'); } catch (e) {}
            if (current && current.id === p.id) { current = null; show(null); }
            list();
          };
          li.appendChild(a); li.appendChild(note); li.appendChild(del);
          root.appendChild(li);
        });
      }

      function show(p) {
        $('#paper').hidden = !p;
        if (!p) { Course.setParams({ quiz: null }); return; }
        Course.setParams({ quiz: p.id });
        $('#paper-title').textContent = 'Quiz of ' + stamp(p.at);
        $('#paper-desc').textContent = describe(p);
        var tag = p.chapter === 'all';
        function tagged(items) { return items.map(function (it) { var c = Object.assign({}, it); c.q = chapterTag(it) + c.q; return c; }); }
        var mcq = tag ? tagged(p.mcq) : p.mcq, recall = tag ? tagged(p.recall) : p.recall;
        var key = 'CUSTOM:' + p.id;
        $('#part-mcq').hidden = !mcq.length; $('#part-recall').hidden = !recall.length;
        if (mcq.length) Quiz.mcq('#mcq', mcq, { key: key + ':mcq' }); else $('#mcq').innerHTML = '';
        if (recall.length) Quiz.recall('#recall', recall, { key: key + ':recall' }); else $('#recall').innerHTML = '';
        Quiz.results('#results', key);
        $('#breakdown').textContent = mcq.length + ' to answer by choice · ' + recall.length + ' to answer in words.';
      }

      function open(p) { current = p; show(p); list(); $('#paper').scrollIntoView({ behavior: 'smooth' }); }

      $('#generate').onclick = function () {
        var counts = {};
        TYPES.forEach(function (t) { counts[t.id] = Math.max(0, Math.floor(+inputs[t.id].input.value || 0)); });
        var got = draw(counts, chapter, set, mine);
        if (!got.mcq.length && !got.recall.length) { $('#msg').textContent = 'No questions match — raise a count or widen the filters.'; return; }
        var at = Date.now();
        var p = { id: String(at), at: at, counts: counts, chapter: chapter, set: set, mine: mine, mcq: got.mcq, recall: got.recall };
        var drawn = got.mcq.length + got.recall.length, asked = TYPES.reduce(function (a, t) { return a + counts[t.id]; }, 0);
        saved.unshift(p);
        var ok = storeSaved(saved);
        $('#msg').textContent = (drawn < asked ? 'Only ' + drawn + ' of the ' + asked + ' asked for were available. ' : '') +
          (ok ? '' : 'Browser storage is full or blocked — this quiz will not be kept after you leave the page.');
        open(p);
      };

      filters();
      var want = Course.param('quiz');
      var first = want && saved.filter(function (p) { return p.id === want; })[0];
      if (first) current = first;
      list();
      show(current);
    });
  }

  window.CustomQuiz = { run: run };
})();
