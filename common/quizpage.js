/* The five shared quiz pages (quiz/*.html) are one program; each page only names its kind.
 *
 *   QuizPage.run('mcq' | 'write' | 'image' | 'mixed' | 'mock')
 *
 * The address carries the choice, so a link can open a focused quiz directly:
 *   quiz/image.html?subject=histology&chapter=ch5&set=round2
 *   chapter = a chapter id or 'all'      set = a set name, or absent for every set
 *   mine=1  = only questions written from the learner's iPad notes (items carrying `notes: [ids]`)
 * The mixed quiz and the mock exam draw MCQ / written / image questions in the subject's
 * question mix (subject.json → exam.mix, image forms split by exam.imageForms).
 * Scores are stored per kind, set and chapter: "<subject>:<KIND>:<set|all>:<chapter>:mcq|recall".
 */
(function () {
  var KINDS = {
    mcq:   { label: 'MCQ quiz',   title: 'MCQ quiz',   blurb: 'Text multiple choice only — no pictures, no written answers.' },
    write: { label: 'Write quiz', title: 'Write quiz', blurb: 'Written questions only. Say or write your answer first, then reveal and grade yourself honestly.' },
    image: { label: 'Image quiz', title: 'Image quiz', blurb: 'Image questions only. Look at the picture before the options and name what you see out loud — shape, colour, layers, neighbours — then answer.' },
    mixed: { label: 'Mixed quiz', title: 'Mixed quiz', blurb: 'MCQs, written and image questions together, in this subject\'s question mix.' },
    mock:  { label: 'Mock exam',  title: 'Mock exam',  blurb: 'A fresh random paper across every chapter, sized and mixed like the real exam. Start the clock and do not look anything up.' }
  };
  var PER_CHAPTER_ALL = 3;   /* single-type quizzes over "all chapters" draw this many per chapter */

  function $(s) { return document.querySelector(s); }
  function chapterTag(it) { return '[' + it.chapter.replace(/^ch/, 'Ch. ') + '] '; }
  function tagged(items) { return items.map(function (it) { var c = Object.assign({}, it); c.q = chapterTag(it) + c.q; return c; }); }

  /* Split n questions over the mix, rounding so the parts still add up to n. */
  function counts(subject, n) {
    var mix = (subject.exam && subject.exam.mix) || { mcq: 100, written: 0, image: 0 };
    var forms = (subject.exam && subject.exam.imageForms) || { mcq: 100, written: 0 };
    var image = Math.round(n * mix.image / 100), written = Math.round(n * mix.written / 100);
    var mcq = Math.max(0, n - image - written);
    var imageWritten = Math.round(image * forms.written / 100);
    return { mcq: mcq, written: written, imageMcq: image - imageWritten, imageWritten: imageWritten };
  }

  function draw(kind, subject, chapter, set, n, mine) {
    var only = chapter === 'all' ? null : [chapter];
    var keep = mine ? function (it) { return !!(it.notes && it.notes.length); } : function () { return true; };
    var isMcq = function (it) { return keep(it) && Bank.isImageMcq(it); }, notMcq = function (it) { return keep(it) && !it.options; };
    function whole(type, filter) {          /* one chapter: every question, in bank order */
      return Bank.items(chapter, type, set).filter(filter || keep);
    }
    var perAll = PER_CHAPTER_ALL * Bank.ids().length;
    if (kind === 'mcq') return { mcq: only ? whole('mcq') : Bank.draw('mcq', perAll, null, set, keep), recall: [] };
    if (kind === 'write') return { mcq: [], recall: only ? whole('written') : Bank.draw('written', perAll, null, set, keep) };
    if (kind === 'image') return {
      mcq: only ? whole('image', isMcq) : Bank.draw('image', perAll, null, set, isMcq),
      recall: only ? whole('image', notMcq) : Bank.draw('image', perAll, null, set, notMcq)
    };
    var c = counts(subject, n);
    return {
      mcq: Bank.shuffle(Bank.draw('mcq', c.mcq, only, set, keep).concat(Bank.draw('image', c.imageMcq, only, set, isMcq))),
      recall: Bank.draw('written', c.written, only, set, keep).concat(Bank.draw('image', c.imageWritten, only, set, notMcq))
    };
  }

  function nav(subject, kind) {
    var q = '?subject=' + encodeURIComponent(subject.id);
    var links = Object.keys(KINDS).map(function (k) {
      return k === kind ? '<strong>' + KINDS[k].label + '</strong>' : '<a href="' + k + '.html' + q + '">' + KINDS[k].label + '</a>';
    });
    $('#nav').innerHTML = '<a href="../subject.html' + q + '">← ' + subject.title + '</a> · ' + links.join(' · ');
  }

  function run(kind) {
    var K = KINDS[kind];
    Course.load().then(function (subject) {
      document.title = K.title + ' · ' + subject.title;
      $('#kicker').textContent = subject.title + ' · ' + K.label;
      $('#title').textContent = K.title;
      $('#blurb').textContent = K.blurb;
      nav(subject, kind);

      var type = { mcq: 'mcq', write: 'written', image: 'image' }[kind];
      var chapter = kind === 'mock' ? 'all' : (Course.param('chapter') || 'all');
      var set = Course.param('set') || '';
      var mine = Course.param('mine') === '1';
      var hasMine = ['mcq', 'written', 'image'].some(function (t) {
        return Bank.ids().some(function (id) { return Bank.items(id, t).some(function (it) { return it.notes && it.notes.length; }); });
      });
      if (hasMine) {
        $('#mine-label').hidden = false;
        Course.chips('#mine', [{ id: '', label: 'All questions' }, { id: '1', label: 'From my notes' }], mine ? '1' : '', function (v) { mine = v === '1'; render(); });
      }
      var setLabels = subject.sets || {};

      var ids = Bank.ids().filter(function (id) { return !type || Bank.items(id, type).length; });
      if (chapter !== 'all' && ids.indexOf(chapter) < 0) chapter = 'all';

      if (kind !== 'mock') {
        Course.chips('#chapters', [{ id: 'all', label: 'All chapters' }].concat(ids.map(function (id) {
          var b = Bank.get(id), n = type ? Bank.items(id, type).length : null;
          return { id: id, label: id.replace(/^ch/, 'Ch. ') + ' — ' + b.title + (n != null ? ' (' + n + ')' : '') };
        })), chapter, function (id) { chapter = id; render(); });
        $('#chapters-label').hidden = false;
      }
      function drawSets() {
        var types = type ? [type] : ['mcq', 'written', 'image'];
        var names = [];
        types.forEach(function (t) { Bank.sets(t, chapter === 'all' ? null : [chapter]).forEach(function (s) { if (names.indexOf(s) < 0) names.push(s); }); });
        var show = names.length > 1;
        $('#sets-label').hidden = !show; $('#sets').hidden = !show;
        if (show) Course.chips('#sets', [{ id: '', label: 'Every set' }].concat(names.map(function (s) { return { id: s, label: setLabels[s] || s }; })),
          set, function (s) { set = s; render(); });
      }

      var sized = kind === 'mixed' || kind === 'mock';
      var nInput = $('#n');
      if (sized) {
        $('#setup').hidden = false;
        nInput.value = kind === 'mock' ? (subject.exam && subject.exam.mockLength) || 40 : Course.param('n') || 20;
        $('#new').onclick = render;
        var mix = (subject.exam && subject.exam.mix) || {};
        $('#mixline').textContent = 'Question mix: ' + (mix.mcq || 0) + '% MCQ · ' + (mix.written || 0) + '% written · ' + (mix.image || 0) + '% image.';
      }

      var t0, tick;
      function clock() {
        t0 = Date.now(); clearInterval(tick);
        tick = setInterval(function () {
          var s = Math.floor((Date.now() - t0) / 1000);
          $('#timer').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
        }, 1000);
      }

      function render() {
        drawSets();
        Course.setParams({ chapter: kind === 'mock' ? null : chapter, set: set, n: kind === 'mixed' ? nInput.value : null, mine: mine ? '1' : null });
        var got = draw(kind, subject, chapter, set, +nInput.value || 20, mine);
        var tag = chapter === 'all';
        var mcq = tag ? tagged(got.mcq) : got.mcq, recall = tag ? tagged(got.recall) : got.recall;
        var key = kind.toUpperCase() + ':' + (set || 'all') + (mine ? '+mine' : '') + ':' + chapter;
        $('#part-mcq').hidden = !mcq.length; $('#part-recall').hidden = !recall.length;
        $('#none').hidden = !!(mcq.length || recall.length);
        if (mcq.length) Quiz.mcq('#mcq', mcq, { key: key + ':mcq' }); else $('#mcq').innerHTML = '';
        if (recall.length) Quiz.recall('#recall', recall, { key: key + ':recall' }); else $('#recall').innerHTML = '';
        Quiz.results('#results', key);
        $('#breakdown').textContent = mcq.length + ' to answer by choice · ' + recall.length + ' to answer in words.';
        if (kind === 'mock') clock();
      }
      render();
    });
  }

  window.QuizPage = { run: run };
})();
