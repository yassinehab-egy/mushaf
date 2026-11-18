/* ==========================================================================
   Mushaf Reader · app.js
   Modules: Config · Store · Api · Render · Book · Audio · Bookmarks · UI · Boot
   ========================================================================== */
'use strict';

(() => {
  /* ───────────── Config ───────────── */
  const TOTAL_PAGES = 604;
  const TOTAL_AYAHS = 6236;
  const API = 'https://api.alquran.cloud/v1';
  const AUDIO_CDN = 'https://cdn.islamic.network/quran/audio/128';
  const FLIP_MS = 950;

  // First page of each surah in the 604-page Madani Mushaf
  const SURAH_START = [1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,586,587,587,589,590,591,591,592,593,594,595,595,596,596,597,597,598,598,599,599,600,600,601,601,601,602,602,602,603,603,603,604,604,604];
  const JUZ_START = [1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];

  /* ───────────── Helpers ───────────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = t => t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
  const fmtTime = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
  const setP = (input, frac) => input.style.setProperty('--p', `${clamp(frac, 0, 1) * 100}%`);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ───────────── Store (localStorage, fault tolerant) ───────────── */
  const Store = {
    get(k, d) { try { const v = localStorage.getItem('mushaf.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mushaf.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  const settings = Object.assign(
    { lang: /^ar/i.test(navigator.language || '') ? 'ar' : 'en', scale: 100, face: 'amiri-quran', reciter: 'ar.minshawi', speed: 1, autoFlip: true, autoContinue: true, reduceMotion: false },
    Store.get('settings', {})
  );
  const saveSettings = () => Store.set('settings', settings);

  /* ───────────── i18n: English / العربية ───────────── */
  const I18N = {
    en: {
      skip: 'Skip to the Mushaf', loader_prep: 'Preparing the Mushaf…', loader_open: 'Opening the Mushaf…', retrying: 'Retrying…',
      loader_fail: "Couldn't reach the Quran service. Use “Try again” above.", try_again: 'Try again', dismiss: 'Dismiss message', close: 'Close',
      err_page: "Couldn't load page {n}. Check your connection and try again.", toolbar_reader: 'Reader controls', goto: 'Go to',
      loc_page: 'Page {n}', bm_page_title: 'Bookmark this page (B)', bm_page_add: 'Bookmark this page', bm_page_remove: 'Remove bookmark from this page',
      settings: 'Settings', settings_aria: 'Settings and all controls', sec_quick: 'Quick actions', sec_nav: 'Navigate', sec_lang: 'Language',
      sec_read: 'Reading', sec_audio: 'Recitation', sec_keys: 'Keyboard shortcuts',
      act_bm_page: 'Bookmark page', act_bm_verse: 'Bookmark verse', act_bookmarks: 'Bookmarks', act_play: 'Play / pause', act_fullscreen: 'Fullscreen',
      act_prev_ayah: 'Previous verse', act_next_ayah: 'Next verse', act_prev_page: 'Previous page', act_next_page: 'Next page',
      text_size: 'Text size', smaller: 'Smaller text', larger: 'Larger text', script_style: 'Script style', reciter: 'Reciter', speed: 'Playback speed',
      opt_autoflip: 'Turn the page when recitation reaches it', opt_continue: 'Keep playing to the next verse', opt_reduce: 'Reduce page-turn animation',
      rc_minshawi: 'Mohamed Siddiq al-Minshawi', rc_alafasy: 'Mishary Alafasy', rc_husary: 'Mahmoud Khalil al-Husary',
      rc_abdulbasit: 'Abdul Basit (Murattal)', rc_hudhaify: 'Ali al-Hudhaify', rc_shaatree: 'Abu Bakr al-Shatri',
      k_pages: 'Next / previous page', k_verse: 'Next / previous verse', k_play: 'Play / pause', k_bm: 'Bookmark page', k_ends: 'First / last page', k_esc: 'Close menus',
      now_idle: 'Press play to begin recitation', now_verse: '{s} · verse {i}', play_rec: 'Play recitation', pause_rec: 'Pause recitation',
      play_title: 'Play / pause (Space)', seek_aria: 'Verse audio position', page_slider: 'Mushaf page',
      zone_next: 'Next page (left arrow)', zone_next_t: 'Next page', zone_prev: 'Previous page (right arrow)', zone_prev_t: 'Previous page',
      jump_by: 'Jump by', tab_surah: 'Surah', tab_juz: 'Juz', tab_page: 'Page', search_ph: 'Search by name or number', search_aria: 'Search surahs',
      surah_empty: 'No surah matches that search.', surah_fail: "The surah list couldn't be loaded. Close this window and open it again to retry.",
      page_label: 'Page number (1–604)', open_page: 'Open page', verses_count: '{c} verses', p_short: 'p. {n}', juz_n: 'Juz {n}',
      bm_title: 'Bookmarks', bm_empty: 'Nothing saved yet. Tap any verse and choose “Bookmark verse”, or bookmark a whole page.',
      clear_all: 'Clear all', confirm_clear: 'Remove all bookmarks?', bm_removed: 'Bookmark removed', bm_page_added: 'Page {n} bookmarked',
      bm_verse_added: '{s} {i} bookmarked', tag_verse: 'Verse', tag_page: 'Page', bm_page_meta: 'Page {n}', play_verse_btn: 'Play this verse', del_bm: 'Remove bookmark',
      play_verse: 'Verse {i} of {s}: open verse menu', vm_play: 'Play', vm_bm: 'Bookmark verse', vm_bm_on: 'Remove bookmark', vm_copy: 'Copy',
      copied: 'Verse copied', copy_fail: "Couldn't copy the verse", tap_verse_first: 'Tap a verse first, or start playing one.',
      toast_loading: 'The page is still loading.', toast_press_play: 'Press play to start the recitation.',
      toast_audio: "This verse's audio couldn't be loaded. Check your connection or try another reciter.", toast_fs: 'Fullscreen is not available here.',
    },
    ar: {
      skip: 'انتقل إلى المصحف', loader_prep: 'جارٍ تحضير المصحف…', loader_open: 'جارٍ فتح المصحف…', retrying: 'جارٍ إعادة المحاولة…',
      loader_fail: 'تعذّر الاتصال بخدمة القرآن. استخدم «حاول مرة أخرى» أعلاه.', try_again: 'حاول مرة أخرى', dismiss: 'إغلاق الرسالة', close: 'إغلاق',
      err_page: 'تعذّر تحميل الصفحة {n}. تحقّق من اتصالك ثم حاول مرة أخرى.', toolbar_reader: 'أدوات القراءة', goto: 'انتقال إلى',
      loc_page: 'صفحة {n}', bm_page_title: 'ضع علامة على هذه الصفحة (B)', bm_page_add: 'ضع علامة على هذه الصفحة', bm_page_remove: 'أزل العلامة من هذه الصفحة',
      settings: 'الإعدادات', settings_aria: 'الإعدادات وجميع أدوات التحكم', sec_quick: 'إجراءات سريعة', sec_nav: 'التنقّل', sec_lang: 'اللغة',
      sec_read: 'القراءة', sec_audio: 'التلاوة', sec_keys: 'اختصارات لوحة المفاتيح',
      act_bm_page: 'علامة للصفحة', act_bm_verse: 'علامة للآية', act_bookmarks: 'العلامات', act_play: 'تشغيل / إيقاف', act_fullscreen: 'ملء الشاشة',
      act_prev_ayah: 'الآية السابقة', act_next_ayah: 'الآية التالية', act_prev_page: 'الصفحة السابقة', act_next_page: 'الصفحة التالية',
      text_size: 'حجم الخط', smaller: 'تصغير الخط', larger: 'تكبير الخط', script_style: 'نمط الخط', reciter: 'القارئ', speed: 'سرعة التشغيل',
      opt_autoflip: 'اقلب الصفحة تلقائيًا عند وصول التلاوة إليها', opt_continue: 'تابع التشغيل إلى الآية التالية', opt_reduce: 'تقليل حركة قلب الصفحة',
      rc_minshawi: 'محمد صديق المنشاوي', rc_alafasy: 'مشاري العفاسي', rc_husary: 'محمود خليل الحصري',
      rc_abdulbasit: 'عبد الباسط عبد الصمد (مرتّل)', rc_hudhaify: 'علي الحذيفي', rc_shaatree: 'أبو بكر الشاطري',
      k_pages: 'الصفحة التالية / السابقة', k_verse: 'الآية التالية / السابقة', k_play: 'تشغيل / إيقاف', k_bm: 'علامة للصفحة', k_ends: 'أول / آخر صفحة', k_esc: 'إغلاق القوائم',
      now_idle: 'اضغط تشغيل لبدء التلاوة', now_verse: '{s} · الآية {i}', play_rec: 'تشغيل التلاوة', pause_rec: 'إيقاف التلاوة',
      play_title: 'تشغيل / إيقاف (مسطرة المسافة)', seek_aria: 'موضع الصوت في الآية', page_slider: 'صفحة المصحف',
      zone_next: 'الصفحة التالية (السهم الأيسر)', zone_next_t: 'الصفحة التالية', zone_prev: 'الصفحة السابقة (السهم الأيمن)', zone_prev_t: 'الصفحة السابقة',
      jump_by: 'انتقل حسب', tab_surah: 'السورة', tab_juz: 'الجزء', tab_page: 'الصفحة', search_ph: 'ابحث بالاسم أو الرقم', search_aria: 'البحث في السور',
      surah_empty: 'لا توجد سورة مطابقة للبحث.', surah_fail: 'تعذّر تحميل قائمة السور. أغلق هذه النافذة ثم افتحها مجددًا للمحاولة.',
      page_label: 'رقم الصفحة (١–٦٠٤)', open_page: 'افتح الصفحة', verses_count: '{c} آية', p_short: 'ص {n}', juz_n: 'الجزء {n}',
      bm_title: 'العلامات المرجعية', bm_empty: 'لا توجد علامات بعد. اضغط على أي آية واختر «علامة للآية»، أو ضع علامة على صفحة كاملة.',
      clear_all: 'مسح الكل', confirm_clear: 'هل تريد حذف كل العلامات؟', bm_removed: 'تمت إزالة العلامة', bm_page_added: 'تمت إضافة علامة للصفحة {n}',
      bm_verse_added: 'تمت إضافة علامة: {s} {i}', tag_verse: 'آية', tag_page: 'صفحة', bm_page_meta: 'صفحة {n}', play_verse_btn: 'تشغيل هذه الآية', del_bm: 'حذف العلامة',
      play_verse: 'الآية {i} من {s}: افتح قائمة الآية', vm_play: 'تشغيل', vm_bm: 'علامة للآية', vm_bm_on: 'إزالة العلامة', vm_copy: 'نسخ',
      copied: 'تم نسخ الآية', copy_fail: 'تعذّر نسخ الآية', tap_verse_first: 'اضغط على آية أولًا، أو ابدأ تشغيل آية.',
      toast_loading: 'الصفحة لا تزال قيد التحميل.', toast_press_play: 'اضغط تشغيل لبدء التلاوة.',
      toast_audio: 'تعذّر تحميل صوت هذه الآية. تحقّق من اتصالك أو جرّب قارئًا آخر.', toast_fs: 'وضع ملء الشاشة غير متاح هنا.',
    },
  };
  const t = (k, v = {}) => String(I18N[settings.lang]?.[k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
  const num = n => (settings.lang === 'ar' ? toAr(n) : String(n));
  const shortAr = n => (plain(n).startsWith('سورة') ? n.trim().split(/\s+/).slice(1).join(' ') : n);
  const surahLabel = a => (settings.lang === 'ar' ? shortAr(a.sName) : a.sEn);

  function updateLoc() {
    const first = pages.get(S.cur)?.ayahs[0];
    const pg = t('loc_page', { n: num(S.cur) });
    el.loc.textContent = first ? `${surahLabel(first)} · ${pg}` : pg;
  }

  /* ───────────── DOM refs ───────────── */
  const el = {
    body: document.body, scene: $('#scene'), book: $('#book'), slotL: $('#slotLeft'), slotR: $('#slotRight'),
    flipper: $('#flipper'), flipFront: $('#flipFront'), flipBack: $('#flipBack'), shade: $('.flip-shade'),
    tpl: $('#pageTemplate'), audio: $('#audio'),
    loader: $('#loader'), loaderText: $('#loaderText'),
    errBox: $('#errorBanner'), errMsg: $('#errorMsg'), retry: $('#retryBtn'), errX: $('#errorDismiss'),
    toast: $('#toast'), live: $('#srLive'),
    loc: $('#locationLabel'), bmBtn: $('#bookmarkBtn'), bmCount: $('#bookmarkCount'),
    play: $('#playBtn'), now: $('#nowPlaying'), nowRec: $('#nowReciter'),
    seek: $('#seek'), tCur: $('#timeCur'), tDur: $('#timeDur'),
    pageSlider: $('#pageSlider'), pageOut: $('#pageOut'),
    zoneNext: $('#zoneNext'), zonePrev: $('#zonePrev'),
    edgesL: $('#edgesLeft'), edgesR: $('#edgesRight'), vm: $('#verseMenu'),
  };

  /* ───────────── State ───────────── */
  const S = {
    cur: 0,               // right-hand page in spread mode; the shown page in single mode
    want: 1,              // last requested page (used for retries)
    mode: 'spread',
    busy: false,
    queued: null,
    rendered: false,
    surahs: null,
  };
  const pages = new Map();     // page number → { page, ayahs[] }
  const inflight = new Map();
  const ayahInfo = new Map();  // global ayah number → ayah

  /* ==========================================================================
     API
     ========================================================================== */
  async function fetchJSON(url, { retries = 3, timeout = 12000 } = {}) {
    let err;
    for (let i = 0; i < retries; i++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeout);
      try {
        const res = await fetch(url, { signal: ac.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (json.code !== 200 || !json.data) throw new Error('Unexpected response');
        return json.data;
      } catch (e) {
        clearTimeout(t);
        err = e;
        if (i < retries - 1) await sleep(500 * 2 ** i);
      }
    }
    throw err;
  }

  // The API prepends the basmala to the first verse of most surahs; we show it as its own line.
  function cleanText(a) {
    const s = a.surah.number;
    if (a.numberInSurah === 1 && s !== 1 && s !== 9 && plain(a.text).startsWith('بسم')) {
      const rest = a.text.trim().split(/\s+/).slice(4).join(' ');
      if (rest) return rest;
    }
    return a.text.trim();
  }

  function loadPage(n) {
    if (n < 1 || n > TOTAL_PAGES) return Promise.resolve(null);
    if (pages.has(n)) return Promise.resolve(pages.get(n));
    if (inflight.has(n)) return inflight.get(n);
    const p = fetchJSON(`${API}/page/${n}/quran-uthmani`)
      .then(d => {
        const ayahs = d.ayahs.map(a => ({
          n: a.number, i: a.numberInSurah, s: a.surah.number, sName: a.surah.name,
          sEn: a.surah.englishName, juz: a.juz, page: n, text: cleanText(a),
        }));
        const pg = { page: n, ayahs };
        pages.set(n, pg);
        ayahs.forEach(a => ayahInfo.set(a.n, a));
        return pg;
      })
      .finally(() => inflight.delete(n));
    inflight.set(n, p);
    return p;
  }

  const prefetch = (...ns) => ns.forEach(n => loadPage(n).catch(() => {}));

  async function loadSurahs() {
    if (S.surahs) return S.surahs;
    const cached = Store.get('surahs', null);
    if (cached) return (S.surahs = cached);
    const data = await fetchJSON(`${API}/surah`);
    S.surahs = data.map(s => ({
      n: s.number, ar: s.name, en: s.englishName, tr: s.englishNameTranslation, c: s.numberOfAyahs,
    }));
    Store.set('surahs', S.surahs);
    return S.surahs;
  }

  /* ==========================================================================
     RENDER
     ========================================================================== */
  function pageHTML(data) {
    let html = '', open = false;
    const close = () => { if (open) { html += '</p>'; open = false; } };
    for (const a of data.ayahs) {
      if (a.i === 1) {
        close();
        html += `<div class="surah-banner"><svg aria-hidden="true"><use href="#banner"/></svg><span>${esc(a.sName)}</span></div>`;
        if (a.s !== 1 && a.s !== 9) html += '<div class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>';
      }
      if (!open) { html += '<p class="verses">'; open = true; }
      html += `<span class="ayah" data-n="${a.n}" role="button" tabindex="-1" aria-label="${esc(t('play_verse', { i: num(a.i), s: surahLabel(a) }))}">${esc(a.text)} <span class="ayah-end"><svg aria-hidden="true"><use href="#medallion"/></svg><b>${toAr(a.i)}</b></span></span> `;
    }
    close();
    return html;
  }

  function fit(page) {
    const body = $('[data-role="content"]', page);
    if (!body) return;
    body.style.fontSize = '';
    let k = 1;
    while (body.scrollHeight > body.clientHeight + 2 && k > 0.72) { k -= 0.04; body.style.fontSize = k + 'em'; }
  }

  function paint(target, n) {
    target.replaceChildren(el.tpl.content.cloneNode(true));
    target.dataset.page = n;
    target.dataset.side = n % 2 ? 'right' : 'left';
    const empty = n < 1 || n > TOTAL_PAGES;
    target.classList.toggle('is-empty', empty);
    if (empty) return;
    const data = pages.get(n);
    const body = $('[data-role="content"]', target);
    $('[data-role="page-num"]', target).textContent = toAr(n);
    if (!data) { body.innerHTML = '<div class="page-fail">تعذّر تحميل الصفحة<br>Page unavailable</div>'; return; }
    const first = data.ayahs[0];
    $('[data-role="surah-name"]', target).textContent = first.sName;
    $('[data-role="juz"]', target).textContent = 'الجزء ' + toAr(first.juz);
    body.innerHTML = pageHTML(data);
    markBookmarks(target);
    fit(target);
    if (A.cur) $$(`.ayah[data-n="${A.cur}"]`, target).forEach(x => x.classList.add('playing'));
  }

  /* ==========================================================================
     BOOK: navigation and the 3D page turn
     ========================================================================== */
  const reduced = () => settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const normalize = p => (S.mode === 'spread' ? (p % 2 ? p : p - 1) : p);
  const visiblePages = () => (S.mode === 'spread' ? [S.cur, S.cur + 1] : [S.cur]);

  async function safeLoad(n) {
    try { return await loadPage(n); }
    catch (e) { showError(t('err_page', { n: num(n) })); return null; }
  }

  function goTo(p, opts = {}) {
    p = clamp(Math.round(Number(p)) || 1, 1, TOTAL_PAGES);
    S.want = p;
    if (S.busy) { S.queued = [p, opts]; return Promise.resolve(); }
    return run(p, opts);
  }

  async function run(p, opts) {
    const target = normalize(p);
    if (S.rendered && target === S.cur && !opts.force) return;
    S.busy = true;
    try {
      const animate = opts.animate !== false && S.rendered && !reduced();
      if (S.mode === 'spread') await goSpread(target, animate);
      else await goSingle(target, animate);
      S.rendered = true;
      afterNavigate();
    } finally {
      S.busy = false;
      if (S.queued) { const [qp, qo] = S.queued; S.queued = null; goTo(qp, qo); }
    }
  }

  function turn(dir, done) {
    const f = el.flipper;
    f.dataset.dir = dir;
    f.style.visibility = 'visible';
    const end = dir === 'forward' ? 180 : -180;
    const a = f.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${end}deg)` }],
      { duration: FLIP_MS, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' }
    );
    el.shade.animate([{ opacity: 0 }, { opacity: .6, offset: .5 }, { opacity: 0 }], { duration: FLIP_MS, easing: 'ease-in-out' });
    return a.finished.catch(() => {}).then(() => { done(); a.cancel(); f.style.visibility = 'hidden'; });
  }

  async function goSpread(r, animate) {
    const old = S.cur;
    await Promise.all([safeLoad(r), safeLoad(r + 1)]);
    if (!animate || !old) {
      paint(el.slotR, r); paint(el.slotL, r + 1);
      S.cur = r;
      return;
    }
    if (r > old) {            // forward: the left leaf lifts over the spine to the right
      paint(el.flipFront, old + 1); paint(el.flipBack, r); paint(el.slotL, r + 1);
      await turn('forward', () => paint(el.slotR, r));
    } else {                  // backward: the right leaf lifts over to the left
      paint(el.flipFront, old); paint(el.flipBack, r + 1); paint(el.slotR, r);
      await turn('backward', () => paint(el.slotL, r + 1));
    }
    S.cur = r;
  }

  async function goSingle(p, animate) {
    const old = S.cur;
    await safeLoad(p);
    paint(el.slotR, p);
    S.cur = p;
    if (animate && old) {
      const dx = p > old ? -40 : 40;
      el.slotR.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
    }
  }

  function afterNavigate() {
    const data = pages.get(S.cur);
    updateLoc();
    closeVerseMenu();
    el.pageSlider.value = S.cur; setP(el.pageSlider, (S.cur - 1) / (TOTAL_PAGES - 1));
    el.pageOut.textContent = toAr(S.cur);
    el.book.style.setProperty('--prog', ((S.cur - 1) / (TOTAL_PAGES - 1)).toFixed(3));
    const step = S.mode === 'spread' ? 2 : 1;
    el.zoneNext.disabled = S.cur + step > TOTAL_PAGES;
    el.zonePrev.disabled = S.cur <= 1;
    Store.set('last', S.cur);
    syncBookmarkBtn();
    el.live.textContent = t('loc_page', { n: num(S.cur) });
    prefetch(S.cur + 2, S.cur + 3, S.cur - 1, S.cur - 2);
    if (el.body.dataset.state === 'loading') el.body.dataset.state = 'ready';
    if (S.cur && data) hideError();
  }

  const step = () => (S.mode === 'spread' ? 2 : 1);
  const next = () => goTo(S.cur + step());
  const prev = () => goTo(S.cur - step());

  function setMode(initial) {
    const mode = matchMedia('(max-width: 860px), (max-aspect-ratio: 4/5)').matches ? 'single' : 'spread';
    if (mode === S.mode && !initial) return;
    S.mode = mode;
    el.book.dataset.mode = mode;
    if (!initial) {
      const keep = S.cur || S.want;
      S.cur = 0; S.rendered = false;
      goTo(keep, { animate: false, force: true });
    }
  }

  /* ==========================================================================
     AUDIO: verse-by-verse playback synced with the highlight
     ========================================================================== */
  const A = { cur: null, page: 1 };
  const audio = el.audio;
  audio.removeAttribute('crossorigin');   // the CDN streams fine without CORS; the attribute could block it
  const audioURL = n => `${AUDIO_CDN}/${settings.reciter}/${n}.mp3`;
  const reciterName = () => $('#reciterSelect').selectedOptions[0]?.textContent || 'Reciter';

  function setPlayState(st) {
    el.play.dataset.state = st;
    el.play.setAttribute('aria-label', t(st === 'playing' ? 'pause_rec' : 'play_rec'));
  }

  async function resolveInfo(n) {
    if (ayahInfo.has(n)) return ayahInfo.get(n);
    const hint = A.page || S.cur;
    for (const p of [hint, hint + 1, hint + 2]) {
      try { await loadPage(p); } catch { return null; }
      if (ayahInfo.has(n)) return ayahInfo.get(n);
    }
    return null;
  }

  function highlight(n) {
    $$('.ayah.playing').forEach(x => x.classList.remove('playing'));
    if (n) $$(`.ayah[data-n="${n}"]`).forEach(x => x.classList.add('playing'));
  }

  function firstAyahOnView() {
    for (const p of [...visiblePages()].sort((a, b) => b - a)) {   // right page is read first
      const d = pages.get(p);
      if (d) return d.ayahs[0].n;
    }
    return null;
  }

  async function playAyah(n) {
    if (n < 1 || n > TOTAL_AYAHS) { stopPlayback(); return; }
    A.cur = n;
    setPlayState('loading');
    const info = await resolveInfo(n);
    if (A.cur !== n) return;
    if (info) { A.page = info.page; highlight(n); updateNow(info); followPage(info); }
    audio.src = audioURL(n);
    audio.playbackRate = settings.speed;
    try { await audio.play(); }
    catch (e) {
      if (e.name === 'AbortError') return;
      setPlayState('idle');
      toast(e.name === 'NotAllowedError' ? t('toast_press_play') : t('toast_audio'));
      return;
    }
    if (A.cur === n && n < TOTAL_AYAHS) { const pre = new Audio(); pre.preload = 'auto'; pre.src = audioURL(n + 1); }
  }

  function updateNow(info) {
    A.info = info;
    el.now.textContent = t('now_verse', { s: surahLabel(info), i: num(info.i) });
    el.nowRec.textContent = reciterName();
    if ('mediaSession' in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: `${info.sEn} ${info.i}`, artist: reciterName(), album: 'Holy Quran' });
    }
  }

  function followPage(info) {
    if (settings.autoFlip && !visiblePages().includes(info.page)) goTo(info.page);
    requestAnimationFrame(() => {
      const target = $(`#spread .ayah[data-n="${info.n}"]`);
      if (target) target.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    });
  }

  function stopPlayback() {
    audio.pause(); A.cur = null; highlight(null); setPlayState('idle');
    A.info = null;
    el.now.textContent = t('now_idle');
  }

  function togglePlay() {
    if (A.cur && audio.src) { audio.paused ? audio.play().catch(() => {}) : audio.pause(); return; }
    const n = firstAyahOnView();
    if (n) playAyah(n); else toast(t('toast_loading'));
  }
  const stepAyah = d => { const n = A.cur ? A.cur + d : firstAyahOnView(); if (n) playAyah(n); };

  audio.addEventListener('playing', () => setPlayState('playing'));
  audio.addEventListener('pause', () => { if (!audio.ended) setPlayState('idle'); });
  audio.addEventListener('waiting', () => A.cur && setPlayState('loading'));
  audio.addEventListener('loadedmetadata', () => { el.tDur.textContent = fmtTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    const f = audio.duration ? audio.currentTime / audio.duration : 0;
    if (!seeking) { el.seek.value = Math.round(f * 1000); setP(el.seek, f); }
    el.tCur.textContent = fmtTime(audio.currentTime);
  });
  audio.addEventListener('ended', () => {
    if (settings.autoContinue && A.cur) playAyah(A.cur + 1); else setPlayState('idle');
  });
  audio.addEventListener('error', () => {
    if (!A.cur) return;
    setPlayState('idle');
    toast(t('toast_audio'));
  });

  let seeking = false;
  el.seek.addEventListener('input', () => { seeking = true; setP(el.seek, el.seek.value / 1000); });
  el.seek.addEventListener('change', () => {
    if (audio.duration) audio.currentTime = (el.seek.value / 1000) * audio.duration;
    seeking = false;
  });

  if ('mediaSession' in navigator) {
    const set = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { /* unsupported */ } };
    set('play', () => audio.play()); set('pause', () => audio.pause());
    set('nexttrack', () => stepAyah(1)); set('previoustrack', () => stepAyah(-1));
  }

  /* ==========================================================================
     BOOKMARKS: whole pages and individual verses
     ========================================================================== */
  let bookmarks = Store.get('bookmarks', []).map(b => Object.assign({ type: 'page' }, b));
  const bmDialog = $('#bookmarksPanel');
  const bmKey = b => (b.type === 'ayah' ? `v:${b.n}` : `p:${b.page}`);
  const sortBookmarks = () => bookmarks.sort((a, b) => a.page - b.page || (a.n || 0) - (b.n || 0));
  const hasVerseBm = n => bookmarks.some(b => b.type === 'ayah' && b.n === n);
  const hasPageBm = p => bookmarks.some(b => b.type === 'page' && b.page === p);

  function saveBookmarks() { Store.set('bookmarks', bookmarks); syncBookmarkBtn(); renderBookmarks(); }

  function markBookmarks(root = document) {
    const set = new Set(bookmarks.filter(b => b.type === 'ayah').map(b => b.n));
    $$('.ayah', root).forEach(a => a.classList.toggle('bookmarked', set.has(+a.dataset.n)));
  }

  function syncBookmarkBtn() {
    const on = hasPageBm(S.cur);
    [el.bmBtn, $('#actBmPage')].forEach(b => b && b.setAttribute('aria-pressed', on));
    el.bmBtn.setAttribute('aria-label', t(on ? 'bm_page_remove' : 'bm_page_add'));
    el.bmCount.hidden = !bookmarks.length;
    el.bmCount.textContent = num(bookmarks.length);
  }

  function toggleBookmark() {
    const i = bookmarks.findIndex(b => b.type === 'page' && b.page === S.cur);
    if (i >= 0) { bookmarks.splice(i, 1); toast(t('bm_removed')); }
    else {
      const first = pages.get(S.cur)?.ayahs[0];
      bookmarks.push({ type: 'page', page: S.cur, sEn: first ? first.sEn : 'Mushaf', sAr: first ? first.sName : '', t: Date.now() });
      sortBookmarks();
      toast(t('bm_page_added', { n: num(S.cur) }));
    }
    saveBookmarks();
  }

  function toggleVerseBookmark(n) {
    const a = ayahInfo.get(n);
    if (!a) return;
    const i = bookmarks.findIndex(b => b.type === 'ayah' && b.n === n);
    if (i >= 0) { bookmarks.splice(i, 1); toast(t('bm_removed')); }
    else {
      bookmarks.push({
        type: 'ayah', n, s: a.s, i: a.i, sEn: a.sEn, sAr: a.sName, page: a.page,
        text: a.text.split(/\s+/).slice(0, 8).join(' '), t: Date.now(),
      });
      sortBookmarks();
      toast(t('bm_verse_added', { s: surahLabel(a), i: num(a.i) }));
    }
    saveBookmarks(); markBookmarks(); syncVerseMenu();
  }

  function renderBookmarks() {
    $('#bookmarkEmpty').hidden = bookmarks.length > 0;
    $('#clearBookmarks').hidden = !bookmarks.length;
    $('#bookmarkList').innerHTML = bookmarks.map(b => {
      const name = settings.lang === 'ar' ? shortAr(b.sAr || b.ar || '') : (b.sEn || b.label || '');
      const key = esc(bmKey(b));
      const del = `<button type="button" class="icon-btn" data-del="${key}" aria-label="${esc(t('del_bm'))}"><svg aria-hidden="true"><use href="#i-trash"/></svg></button>`;
      if (b.type === 'ayah') {
        return `<li><div class="row bm">
          <button type="button" class="row" data-go="${b.page}" data-n="${b.n}">
            <span class="num">${num(b.i)}</span>
            <span class="names"><b>${esc(name)} ${num(b.i)}<span class="tag">${esc(t('tag_verse'))}</span></b><small>${esc(t('p_short', { n: num(b.page) }))}</small></span>
            <span class="ar" lang="ar" dir="rtl">${esc(b.text)}</span>
          </button>
          <button type="button" class="icon-btn" data-play="${b.n}" data-page="${b.page}" aria-label="${esc(t('play_verse_btn'))}"><svg aria-hidden="true"><use href="#i-play"/></svg></button>
          ${del}</div></li>`;
      }
      return `<li><div class="row bm">
          <button type="button" class="row" data-go="${b.page}">
            <span class="num">${num(b.page)}</span>
            <span class="names"><b>${esc(name)}<span class="tag">${esc(t('tag_page'))}</span></b><small>${esc(t('bm_page_meta', { n: num(b.page) }))}</small></span>
            <span class="ar" lang="ar" dir="rtl">${esc(b.sAr || b.ar || '')}</span>
          </button>
          ${del}</div></li>`;
    }).join('');
  }

  /* After jumping to a bookmarked verse, pulse it (and optionally play it) */
  async function focusVerse(n, play) {
    for (let i = 0; i < 40 && S.busy; i++) await sleep(100);
    const nodes = $$(`#spread .ayah[data-n="${n}"]`);
    nodes.forEach(x => { x.classList.remove('flash'); void x.offsetWidth; x.classList.add('flash'); });
    if (nodes[0]) nodes[0].scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    if (play) playAyah(n);
  }

  function bookmarkCurrentVerse() {
    const n = A.cur || lastVerse;
    if (!n) { toast(t('tap_verse_first')); return; }
    toggleVerseBookmark(n);
  }

  /* ==========================================================================
     UI
     ========================================================================== */
  let toastT;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.toast.hidden = true; }, 3200);
  }
  function showError(msg) { el.errMsg.textContent = msg; el.errBox.hidden = false; el.loaderText.textContent = msg; }
  function hideError() { el.errBox.hidden = true; }
  el.errX.addEventListener('click', hideError);
  el.retry.addEventListener('click', () => {
    hideError(); el.loaderText.textContent = t('retrying');
    S.cur = 0; S.rendered = false; goTo(S.want, { animate: false, force: true });
  });

  /* Dialogs */
  function openDialog(d) { if (!d.open) d.showModal(); }
  $$('dialog.panel').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  /* Jump: Surah / Juz / Page */
  const jump = $('#jumpDialog');
  const tabs = $$('.tab', jump);
  function selectTab(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(n); n.focus();
    });
  });

  function go(page, ayah = 0, play = false) {
    jump.open && jump.close();
    bmDialog.open && bmDialog.close();
    togglePanel(false);
    goTo(page).then(() => { if (ayah) focusVerse(ayah, play); });
  }

  async function buildSurahList() {
    const ul = $('#surahList');
    try {
      const list = await loadSurahs();
      const ar = settings.lang === 'ar';
      ul.innerHTML = list.map((s, i) => `
        <li data-q="${s.n} ${esc(s.en.toLowerCase())} ${esc(s.tr.toLowerCase())} ${esc(plain(s.ar))}">
          <button type="button" class="row" data-go="${SURAH_START[i]}">
            <span class="num">${num(s.n)}</span>
            <span class="names"><b>${esc(ar ? shortAr(s.ar) : s.en)}</b><small>${esc(ar ? t('verses_count', { c: num(s.c) }) : `${s.tr} · ${t('verses_count', { c: s.c })}`)}</small></span>
            ${ar ? `<span class="cnt" dir="ltr">${esc(s.en)}</span>` : `<span class="ar" lang="ar" dir="rtl">${esc(shortAr(s.ar))}</span>`}
            <span class="cnt">${esc(t('p_short', { n: num(SURAH_START[i]) }))}</span>
          </button></li>`).join('');
    } catch {
      ul.innerHTML = `<li class="empty">${esc(t('surah_fail'))}</li>`;
      S.surahs = null;
    }
  }
  $('#surahSearch').addEventListener('input', e => {
    const q = plain(e.target.value.trim().toLowerCase());
    let shown = 0;
    $$('#surahList li[data-q]').forEach(li => { const m = !q || li.dataset.q.includes(q); li.hidden = !m; shown += m; });
    $('#surahEmpty').hidden = shown > 0;
  });

  function buildJuz() {
    $('#juzList').innerHTML = JUZ_START.map((p, i) => `
      <li><button type="button" class="row" data-go="${p}"><span class="num">${num(i + 1)}</span><b>${esc(t('juz_n', { n: num(i + 1) }))}</b><small>${esc(t('p_short', { n: num(p) }))}</small></button></li>`).join('');
  }

  jump.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go); });
  bmDialog.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'), p = e.target.closest('[data-play]'), d = e.target.closest('[data-del]');
    if (d) { bookmarks = bookmarks.filter(b => bmKey(b) !== d.dataset.del); saveBookmarks(); markBookmarks(); return; }
    if (p) { go(+p.dataset.page, +p.dataset.play, true); return; }
    if (g) go(+g.dataset.go, +g.dataset.n || 0);
  });
  const pageInput = $('#pageInput');
  const submitPage = () => { const v = clamp(parseInt(pageInput.value, 10) || 1, 1, TOTAL_PAGES); pageInput.value = v; go(v); };
  $('#pageGo').addEventListener('click', submitPage);
  pageInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitPage(); });

  $('#jumpBtn').addEventListener('click', () => {
    openDialog(jump); pageInput.value = S.cur;
    if (!S.surahs || !$('#surahList').children.length || $('#surahList .empty')) buildSurahList();
    selectTab(tabs[0]); $('#surahSearch').focus();
  });
  $('#clearBookmarks').addEventListener('click', () => {
    if (confirm(t('confirm_clear'))) { bookmarks = []; saveBookmarks(); markBookmarks(); }
  });
  el.bmBtn.addEventListener('click', toggleBookmark);

  /* Settings: one menu with every control */
  const panel = $('#settingsPanel'), settingsBtn = $('#settingsBtn');
  const fontRange = $('#fontRange');
  function togglePanel(force) {
    const open = force ?? panel.hidden;
    panel.hidden = !open; settingsBtn.setAttribute('aria-expanded', open);
    if (open) { closeVerseMenu(); panel.scrollTop = 0; }
  }
  settingsBtn.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target)) togglePanel(false); });

  const refit = debounce(() => $$('#spread .page').forEach(fit), 120);
  function applyScale(v) {
    settings.scale = clamp(v, 70, 160);
    el.book.style.setProperty('--scale', settings.scale / 100);
    fontRange.value = settings.scale; setP(fontRange, (settings.scale - 70) / 90);
    $('#fontOut').textContent = num(settings.scale) + '%';
    saveSettings(); refit();
  }
  fontRange.addEventListener('input', () => applyScale(+fontRange.value));
  $('#fontMinus').addEventListener('click', () => applyScale(settings.scale - 5));
  $('#fontPlus').addEventListener('click', () => applyScale(settings.scale + 5));

  $('#fontFace').addEventListener('change', e => { settings.face = e.target.value; el.body.dataset.face = settings.face; saveSettings(); refit(); });
  $('#reciterSelect').addEventListener('change', e => {
    settings.reciter = e.target.value; saveSettings(); el.nowRec.textContent = reciterName();
    if (A.cur && !audio.paused) playAyah(A.cur);
  });
  $('#speedSelect').addEventListener('change', e => { settings.speed = +e.target.value; audio.playbackRate = settings.speed; saveSettings(); });
  $('#autoFlip').addEventListener('change', e => { settings.autoFlip = e.target.checked; saveSettings(); });
  $('#autoContinue').addEventListener('change', e => { settings.autoContinue = e.target.checked; saveSettings(); });
  $('#reduceMotion').addEventListener('change', e => { settings.reduceMotion = e.target.checked; el.body.classList.toggle('reduce-motion', settings.reduceMotion); saveSettings(); });

  /* Quick actions: buttons that close the menu after use, and ones that keep it open */
  const act = (sel, fn, keepOpen) => $(sel).addEventListener('click', () => { fn(); if (!keepOpen) togglePanel(false); });
  act('#actGo', () => $('#jumpBtn').click());
  act('#actBmPage', toggleBookmark, true);
  act('#actBmVerse', () => bookmarkCurrentVerse(), true);
  act('#bookmarksBtn', () => { renderBookmarks(); openDialog(bmDialog); });
  act('#actPlay', () => togglePlay(), true);
  act('#actPrevAyah', () => stepAyah(-1), true);
  act('#actNextAyah', () => stepAyah(1), true);
  act('#actPrevPage', () => prev(), true);
  act('#actNextPage', () => next(), true);

  /* Language */
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => { settings.lang = b.dataset.lang; saveSettings(); applyLang(); }));

  function applyLang() {
    const ar = settings.lang === 'ar';
    document.documentElement.lang = ar ? 'ar' : 'en';
    el.body.classList.toggle('lang-ar', ar);
    $$('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
    $$('[data-i18n-attr]').forEach(n => n.dataset.i18nAttr.split(';').forEach(p => { const [a, k] = p.split(':'); n.setAttribute(a, t(k)); }));
    $('#zoneNext').setAttribute('aria-label', t('zone_next')); $('#zoneNext').title = t('zone_next_t');
    $('#zonePrev').setAttribute('aria-label', t('zone_prev')); $('#zonePrev').title = t('zone_prev_t');
    $('.skip-link').textContent = t('skip');
    $$('.popover, dialog.panel, .error-banner, .toast').forEach(n => n.setAttribute('dir', ar ? 'rtl' : 'ltr'));
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === settings.lang));
    $('#fontOut').textContent = num(settings.scale) + '%';
    el.nowRec.textContent = reciterName();
    setPlayState(el.play.dataset.state || 'idle');
    if (A.info) updateNow(A.info);
    updateLoc(); syncBookmarkBtn(); renderBookmarks(); buildJuz(); syncVerseMenu();
    if (S.surahs) buildSurahList();
    [el.slotL, el.slotR].forEach(s => { if (s.dataset.page) paint(s, +s.dataset.page); });
  }

  function applySettings() {
    if (![...$('#reciterSelect').options].some(o => o.value === settings.reciter)) settings.reciter = 'ar.minshawi';
    $('#reciterSelect').value = settings.reciter;
    $('#fontFace').value = settings.face; el.body.dataset.face = settings.face;
    $('#speedSelect').value = String(settings.speed); audio.playbackRate = settings.speed;
    $('#autoFlip').checked = settings.autoFlip; $('#autoContinue').checked = settings.autoContinue;
    $('#reduceMotion').checked = settings.reduceMotion; el.body.classList.toggle('reduce-motion', settings.reduceMotion);
    if (!I18N[settings.lang]) settings.lang = 'en';
    applyScale(settings.scale);
    applyLang();
  }

  /* Player + page slider + zones */
  el.play.addEventListener('click', togglePlay);
  $('#prevAyah').addEventListener('click', () => stepAyah(-1));
  $('#nextAyah').addEventListener('click', () => stepAyah(1));
  el.pageSlider.addEventListener('input', () => {
    const v = +el.pageSlider.value; el.pageOut.textContent = toAr(v); setP(el.pageSlider, (v - 1) / (TOTAL_PAGES - 1));
  });
  el.pageSlider.addEventListener('change', () => goTo(+el.pageSlider.value));
  el.zoneNext.addEventListener('click', next);
  el.zonePrev.addEventListener('click', prev);

  /* Tap a verse: menu with play · bookmark · copy */
  let lastVerse = null;
  function syncVerseMenu() {
    if (el.vm.hidden || !lastVerse) return;
    const on = hasVerseBm(lastVerse);
    $('#vmBm').setAttribute('aria-pressed', on);
    $('#vmBmText').textContent = t(on ? 'vm_bm_on' : 'vm_bm');
  }
  function closeVerseMenu() {
    el.vm.hidden = true;
    $$('.ayah.selected').forEach(x => x.classList.remove('selected'));
  }
  function openVerseMenu(n, x, y) {
    lastVerse = n;
    $$('.ayah.selected').forEach(a => a.classList.remove('selected'));
    $$(`.ayah[data-n="${n}"]`).forEach(a => a.classList.add('selected'));
    el.vm.hidden = false; syncVerseMenu();
    const w = el.vm.offsetWidth, h = el.vm.offsetHeight;
    el.vm.style.left = clamp(x - w / 2, 8, innerWidth - w - 8) + 'px';
    el.vm.style.top = (y - h - 16 < 8 ? y + 24 : y - h - 16) + 'px';
  }
  el.scene.addEventListener('click', e => {
    const a = e.target.closest('.ayah');
    if (a) openVerseMenu(+a.dataset.n, e.clientX, e.clientY); else closeVerseMenu();
  });
  document.addEventListener('click', e => { if (!el.vm.hidden && !e.target.closest('#verseMenu, .ayah')) closeVerseMenu(); });
  el.scene.addEventListener('scroll', closeVerseMenu, true);
  $('#vmPlay').addEventListener('click', () => { const n = lastVerse; closeVerseMenu(); if (n) playAyah(n); });
  $('#vmBm').addEventListener('click', () => { if (lastVerse) toggleVerseBookmark(lastVerse); });
  $('#vmCopy').addEventListener('click', async () => {
    const a = ayahInfo.get(lastVerse);
    closeVerseMenu();
    if (!a) return;
    try { await navigator.clipboard.writeText(`${a.text} ﴿${toAr(a.i)}﴾\n[${a.sName} : ${toAr(a.i)}]`); toast(t('copied')); }
    catch { toast(t('copy_fail')); }
  });

  /* Swipe (RTL: swipe right = next page) */
  let sx = null, sy = 0;
  el.scene.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { sx = e.clientX; sy = e.clientY; } });
  el.scene.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? next : prev)();
  });

  /* Fullscreen */
  const fsBtn = $('#fullscreenBtn');
  const toggleFS = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => toast(t('toast_fs'))));
  fsBtn.addEventListener('click', toggleFS);

  /* Auto-fading toolbars */
  let idleT;
  const pinned = () => !panel.hidden || $('dialog[open]') || $('.toolbar:hover') || $('.toolbar:focus-within') || el.play.dataset.state === 'loading';
  function wake() {
    el.body.classList.remove('idle'); clearTimeout(idleT);
    idleT = setTimeout(() => { if (pinned()) wake(); else el.body.classList.add('idle'); }, 3800);
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, wake, { passive: true }));

  /* Keyboard: arrows follow the RTL reading flow (← is forward) */
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if ($('dialog[open]') || e.target.closest('input, select, textarea')) return;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); e.shiftKey ? stepAyah(1) : next(); break;
      case 'ArrowRight': e.preventDefault(); e.shiftKey ? stepAyah(-1) : prev(); break;
      case 'PageDown': next(); break;
      case 'PageUp': prev(); break;
      case 'Home': goTo(1); break;
      case 'End': goTo(TOTAL_PAGES); break;
      case ' ': if (!e.target.closest('button')) { e.preventDefault(); togglePlay(); } break;
      case 'b': case 'B': toggleBookmark(); break;
      case 'f': case 'F': toggleFS(); break;
      case 'g': case 'G': e.preventDefault(); $('#jumpBtn').click(); break;
      case 'Escape': togglePanel(false); closeVerseMenu(); break;
    }
  });

  /* Responsive mode + refit */
  const mq = matchMedia('(max-width: 860px), (max-aspect-ratio: 4/5)');
  mq.addEventListener('change', () => setMode(false));
  window.addEventListener('resize', refit);

  /* ==========================================================================
     BOOT
     ========================================================================== */
  async function init() {
    applySettings();
    setMode(true);
    syncBookmarkBtn();
    wake();
    const last = Store.get('last', 1);
    el.loaderText.textContent = t('loader_open');
    await goTo(last, { animate: false });
    if (!S.rendered) el.loaderText.textContent = t('loader_fail');
    if (document.fonts?.ready) document.fonts.ready.then(refit);
    loadSurahs().catch(() => {});
  }

  init();
})();