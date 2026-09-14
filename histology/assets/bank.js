/* Histology course — question banks.
 *
 * Each chapter registers one bank in assets/bank/chN.js:
 *   Bank.register('ch2', { title, lesson, mcq: [...], images: [...], recall: [...], sort: {...} })
 * Item shapes are the ones Quiz.mcq / Quiz.recall / Quiz.sort take (see quiz.js).
 * `images` are "identify what is shown" MCQs, each with an {img} — the exam's picture questions.
 *
 * A lesson mixes text and picture items (Bank.mix); quizzes/images.html drills pictures only;
 * quizzes/mock-exam.html samples every chapter. One source, three views — edit here only.
 */
(function () {
  var chapters = {};
  /* Chapters split over two lessons keep recall1/recall2 (or recallA/recallB); `recall` is the union. */
  function register(id, data) {
    data.id = id;
    if (!data.recall) data.recall = Object.keys(data).filter(function (k) { return /^recall./.test(k); }).reduce(function (a, k) { return a.concat(data[k]); }, []);
    chapters[id] = data;
  }
  function get(id) { return chapters[id]; }
  function ids() { return Object.keys(chapters); }
  /* Interleave `n` picture items into the text items at even spacing (keeps text order). */
  function mix(text, images, n) {
    var pics = images.slice(0, n == null ? images.length : n);
    if (!pics.length) return text.slice();
    var out = [], step = Math.max(1, Math.floor(text.length / (pics.length + 1)));
    text.forEach(function (t, i) { out.push(t); if ((i + 1) % step === 0 && pics.length) out.push(pics.shift()); });
    return out.concat(pics);
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* n items sampled from every registered chapter (or the given ids), tagged with their chapter. */
  function sample(kind, perChapter, only) {
    var out = [];
    (only || ids()).forEach(function (id) {
      var b = chapters[id]; if (!b || !b[kind]) return;
      shuffle(b[kind]).slice(0, perChapter).forEach(function (it) { var c = Object.assign({}, it); c.chapter = id; out.push(c); });
    });
    return shuffle(out);
  }
  window.Bank = { register: register, get: get, ids: ids, mix: mix, sample: sample, shuffle: shuffle };
})();
