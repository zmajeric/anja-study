/* Shared question banks — the engine every subject's banks register into.
 *
 * Each chapter registers one bank in <subject>/assets/bank/chN.js:
 *   Bank.register('ch2', { title, lessons, mcq: [...], images: [...], recall: [...], sort: {...} })
 * Item shapes are the ones Quiz.mcq / Quiz.recall / Quiz.sort take (see quiz.js).
 *
 * Three question types (CONTEXT.md):
 *   mcq      text MCQs                         — `mcq`
 *   written  answered in words, self-checked   — `recall` (and recall1/recallA… splits)
 *   image    built on an image: an image MCQ has {options, answer}, an image written question has {a}
 *                                              — `images` (+ `images2`, `images3` rounds)
 * Every question belongs to a *set*: the chapter's own arrays are the sets `core` (mcq, written)
 * and `round1`/`round2`/`round3` (image). Later additions — a focused quiz, an exam sample — come in
 * through Bank.add(chapter, type, set, items) under their own set name (a date, or `sample`).
 * Lessons read the chapter arrays directly; the shared quiz pages read Bank.items(), which sees every set.
 *
 * Image paths in a bank are written relative to a lesson ('../assets/img/x.jpg'). A page that is not
 * inside the subject sets Bank.root (e.g. '../histology/') before the banks load, and the paths are
 * rewritten against it.
 */
(function () {
  var chapters = {};
  var root = null;

  function resolve(img) {
    if (img && root && typeof img.src === 'string' && img.src.indexOf('../') === 0 && !img._resolved) {
      img.src = root + img.src.slice(3); img._resolved = true;
    }
  }
  function resolveAll(items) { (items || []).forEach(function (it) { if (it && it.img) resolve(it.img); }); }

  /* Chapters split over two lessons keep recall1/recall2 (or recallA/recallB); `recall` is the union. */
  function register(id, data) {
    data.id = id;
    if (!data.recall) data.recall = Object.keys(data).filter(function (k) { return /^recall./.test(k); }).reduce(function (a, k) { return a.concat(data[k]); }, []);
    Object.keys(data).forEach(function (k) { if (Array.isArray(data[k])) resolveAll(data[k]); });
    data.added = { mcq: [], written: [], image: [] };
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
      var b = chapters[id]; if (!b) return;
      var pool = kind === 'images' ? pictures(id) : b[kind];   /* pictures: all rounds that are loaded */
      if (!pool || !pool.length) return;
      shuffle(pool).slice(0, perChapter).forEach(function (it) { var c = Object.assign({}, it); c.chapter = id; out.push(c); });
    });
    return shuffle(out);
  }
  /* Extra question sets over the same pictures (assets/bank/round2.js, round3.js): appended under `key`
   * on an already-registered chapter, so the picture is stored once and the rounds stay in separate files. */
  function extend(id, key, items) { var b = chapters[id]; resolveAll(items); b[key] = (b[key] || []).concat(items); }
  /* The picture object of a registered image item, found by file name — rounds reuse it. */
  function picture(id, name) {
    var hit = (chapters[id].images || []).filter(function (it) { return it.img.src.indexOf('/' + name + '.') >= 0; })[0];
    if (!hit) throw new Error('no picture ' + name + ' in ' + id);
    return hit.img;
  }
  function isImageMcq(it) { return !!it.options; }
  /* Every image MCQ of a chapter across all rounds and added sets. */
  function pictures(id) {
    var b = chapters[id];
    return (b.images || []).concat(b.images2 || [], b.images3 || [], b.added.image.filter(isImageMcq));
  }

  /* A new set of questions for a chapter: type is 'mcq' | 'written' | 'image', set a short name
   * ('2026-09-24', 'sample'). Load the file that calls this after the chapter banks. */
  function add(id, type, set, items) {
    var b = chapters[id];
    if (!b) throw new Error('Bank.add: no chapter ' + id + ' registered');
    if (!b.added[type]) throw new Error('Bank.add: unknown question type ' + type);
    resolveAll(items);
    items.forEach(function (it) { b.added[type].push(Object.assign({ set: set }, it)); });
  }
  var LEGACY = {
    mcq: [['mcq', 'core']],
    written: [['recall', 'core']],
    image: [['images', 'round1'], ['images2', 'round2'], ['images3', 'round3']]
  };
  /* Every question of one type in a chapter, each a copy tagged {chapter, set}; `set` narrows it. */
  function items(id, type, set) {
    var b = chapters[id]; if (!b) return [];
    var out = [];
    LEGACY[type].forEach(function (pair) {
      (b[pair[0]] || []).forEach(function (it) { out.push(Object.assign({}, it, { chapter: id, set: pair[1] })); });
    });
    b.added[type].forEach(function (it) { out.push(Object.assign({}, it, { chapter: id })); });
    return set ? out.filter(function (it) { return it.set === set; }) : out;
  }
  /* The set names present for a type across the given chapters, in first-seen order. */
  function sets(type, only) {
    var seen = [];
    (only || ids()).forEach(function (id) { items(id, type).forEach(function (it) { if (seen.indexOf(it.set) < 0) seen.push(it.set); }); });
    return seen;
  }
  /* n random questions of one type spread evenly over the given chapters (round-robin, so a
   * big chapter cannot crowd out a small one). `filter` narrows the pool (e.g. image MCQs only). */
  function draw(type, n, only, set, filter) {
    var pools = (only || ids()).map(function (id) {
      return shuffle(items(id, type, set).filter(filter || function () { return true; }));
    }).filter(function (p) { return p.length; });
    var out = [];
    while (out.length < n && pools.some(function (p) { return p.length; })) {
      pools.forEach(function (p) { if (out.length < n && p.length) out.push(p.pop()); });
    }
    return shuffle(out);
  }

  window.Bank = {
    register: register, get: get, ids: ids, mix: mix, sample: sample, shuffle: shuffle, extend: extend,
    picture: picture, pictures: pictures, add: add, items: items, sets: sets, draw: draw, isImageMcq: isImageMcq,
    set root(v) { root = v; }, get root() { return root; }
  };
})();
