/* ═══════════════════════════════════════════════════════════════
   line-booking — Skin Engine
   ───────────────────────────────────────────────────────────────
   皮膚可以改「長相」，不能改「行為」。

   引擎提供三種改法，由淺到深：
     1. tokens —— 換 CSS 變數。九成的需求到這裡就結束了。
     2. css    —— 一段自由 CSS，套用時注入，換皮時整段拔掉。
     3. hooks  —— 少數幾個「顯示用」函式（標題怎麼寫、格子上加什麼裝飾）。

   引擎對 hooks 的三道封印（見 seal / guardDeco）：
     · hook 全程 try/catch，連續出錯就停用該皮膚的 hooks，畫面照常。
     · hook 執行前後比對 data-state / data-date 等關鍵屬性，被改就還原。
     · 「能不能點」由 booking-core 依自己的資料模型判斷，不看 DOM 屬性
       —— 所以皮膚就算把 data-state 竄改成 open，也點不出預約。

   撰寫指南見 docs/SKIN.md。
   ═══════════════════════════════════════════════════════════════ */
(function (w, d) {
  'use strict';

  var LB = w.LB = w.LB || {};
  var CFG = w.LB_CONFIG || {};

  /* 皮膚可以設定的 token 白名單。Skin Lab 也讀這張表產生調色介面。
     加新 token 時：base.css 補預設值 + 這裡補一行 + SKIN.md 補說明。 */
  var TOKENS = [
    { k: '--sk-bg',          t: 'color', g: '底色',   n: '頁面背景' },
    { k: '--sk-surface',     t: 'color', g: '底色',   n: '卡片面' },
    { k: '--sk-surface-2',   t: 'color', g: '底色',   n: '次要面' },
    { k: '--sk-ink',         t: 'color', g: '文字',   n: '主要文字' },
    { k: '--sk-ink-muted',   t: 'color', g: '文字',   n: '次要文字' },
    { k: '--sk-rule',        t: 'color', g: '線條',   n: '分隔線' },
    { k: '--sk-accent',      t: 'color', g: '主色',   n: '強調色' },
    { k: '--sk-accent-ink',  t: 'color', g: '主色',   n: '強調色上的字' },
    { k: '--sk-accent-wash', t: 'color', g: '主色',   n: '強調色淡底' },
    { k: '--sk-open-bg',     t: 'color', g: '日期格', n: '可預約 底' },
    { k: '--sk-open-ink',    t: 'color', g: '日期格', n: '可預約 字' },
    { k: '--sk-open-rule',   t: 'color', g: '日期格', n: '可預約 框' },
    { k: '--sk-closed-bg',   t: 'color', g: '日期格', n: '公休 底' },
    { k: '--sk-closed-ink',  t: 'color', g: '日期格', n: '公休 字' },
    { k: '--sk-closed-rule', t: 'color', g: '日期格', n: '公休 框' },
    { k: '--sk-full-bg',     t: 'color', g: '日期格', n: '額滿 底' },
    { k: '--sk-full-ink',    t: 'color', g: '日期格', n: '額滿 字' },
    { k: '--sk-past-ink',    t: 'color', g: '日期格', n: '過期／超出範圍 字' },
    { k: '--sk-sel-bg',      t: 'color', g: '選取',   n: '選取 底' },
    { k: '--sk-sel-ink',     t: 'color', g: '選取',   n: '選取 字' },
    { k: '--sk-sel-rule',    t: 'color', g: '選取',   n: '選取 框' },
    { k: '--sk-danger',      t: 'color', g: '錯誤',   n: '錯誤色' },
    { k: '--sk-danger-wash', t: 'color', g: '錯誤',   n: '錯誤淡底' },
    { k: '--sk-font',        t: 'text',  g: '字體',   n: '內文字體堆疊' },
    { k: '--sk-font-num',    t: 'text',  g: '字體',   n: '數字字體堆疊' },
    { k: '--sk-size',        t: 'text',  g: '字體',   n: '基準字級' },
    { k: '--sk-line',        t: 'text',  g: '字體',   n: '行高' },
    { k: '--sk-day-size',    t: 'text',  g: '字體',   n: '日期數字大小' },
    { k: '--sk-day-weight',  t: 'text',  g: '字體',   n: '日期數字字重' },
    { k: '--sk-tracking',    t: 'text',  g: '字體',   n: '字距' },
    { k: '--sk-label-case',  t: 'text',  g: '字體',   n: '標籤大小寫' },
    { k: '--sk-radius',      t: 'text',  g: '形狀',   n: '卡片圓角' },
    { k: '--sk-radius-sm',   t: 'text',  g: '形狀',   n: '小圓角' },
    { k: '--sk-cell-radius', t: 'text',  g: '形狀',   n: '日期格圓角' },
    { k: '--sk-cell-ratio',  t: 'text',  g: '形狀',   n: '日期格長寬比' },
    { k: '--sk-gap',         t: 'text',  g: '形狀',   n: '格線間距' },
    { k: '--sk-pad',         t: 'text',  g: '形狀',   n: '卡片內距' },
    { k: '--sk-maxw',        t: 'text',  g: '形狀',   n: '版面最大寬' },
    { k: '--sk-shadow',      t: 'text',  g: '效果',   n: '卡片陰影' },
    { k: '--sk-cell-shadow', t: 'text',  g: '效果',   n: '日期格陰影' },
    { k: '--sk-sel-shadow',  t: 'text',  g: '效果',   n: '選取陰影' },
    { k: '--sk-motion',      t: 'text',  g: '效果',   n: '轉場' },
    { k: '--sk-deco-display',t: 'text',  g: '效果',   n: '裝飾層開關 block/none' }
  ];

  var TOKEN_SET = {};
  TOKENS.forEach(function (x) { TOKEN_SET[x.k] = x; });

  var HOOK_NAMES = [
    'onApply', 'onRelease',
    'monthTitle', 'weekdayLabel', 'dayNumber', 'dayMeta',
    'decorateDay', 'slotLabel', 'slotTag'
  ];

  var LAYOUTS = { grid: 1, agenda: 1 };

  /* 只允許 Google Fonts —— 與 Artifact / GitHub Pages 的 CSP 習慣一致，
     也避免皮膚把使用者的瀏覽器指向任意第三方主機。 */
  var FONT_HOSTS = ['https://fonts.googleapis.com/'];

  var MAX_HOOK_ERRORS = 5;
  var MAX_DECO_NODES = 24;

  var registry = {};
  var order = [];
  var active = null;
  var hookErrors = 0;
  var hooksDisabled = false;
  var styleEl = null;
  var fontEls = [];
  var overrides = {};          /* Skin Lab 的即時覆寫，優先於皮膚 tokens */
  var listeners = [];

  function warn() {
    if (w.console && console.warn) {
      console.warn.apply(console, ['[skin]'].concat([].slice.call(arguments)));
    }
  }

  /* ── 註冊 ───────────────────────────────────────────────────── */

  function register(def) {
    if (!def || typeof def.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(def.id)) {
      warn('皮膚 id 不合法（限小寫英數與 - _，最長 32）', def && def.id);
      return false;
    }
    if (registry[def.id]) warn('皮膚 id 重複，後者覆蓋前者：', def.id);

    var skin = {
      id: def.id,
      name: String(def.name || def.id),
      author: String(def.author || ''),
      blurb: String(def.blurb || ''),
      scheme: def.scheme === 'light' || def.scheme === 'dark' ? def.scheme : 'auto',
      layout: LAYOUTS[def.layout] ? def.layout : 'grid',
      tokens: {},
      css: typeof def.css === 'string' ? def.css : '',
      fonts: [],
      hooks: {}
    };

    Object.keys(def.tokens || {}).forEach(function (k) {
      if (!TOKEN_SET[k]) { warn(def.id + ': 未知 token 已忽略 —— ' + k); return; }
      skin.tokens[k] = String(def.tokens[k]);
    });

    (def.fonts || []).forEach(function (u) {
      var ok = FONT_HOSTS.some(function (h) { return String(u).indexOf(h) === 0; });
      if (ok) { skin.fonts.push(String(u)); }
      else { warn(def.id + ': 字體來源未在白名單，已忽略 —— ' + u); }
    });

    Object.keys(def.hooks || {}).forEach(function (k) {
      if (HOOK_NAMES.indexOf(k) < 0) { warn(def.id + ': 未知 hook 已忽略 —— ' + k); return; }
      if (typeof def.hooks[k] !== 'function') { warn(def.id + ': hook 不是函式 —— ' + k); return; }
      skin.hooks[k] = def.hooks[k];
    });

    registry[skin.id] = skin;
    if (order.indexOf(skin.id) < 0) order.push(skin.id);
    return true;
  }

  /* ── 套用 ───────────────────────────────────────────────────── */

  function clearInjected() {
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    styleEl = null;
    fontEls.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    fontEls = [];
  }

  function clearTokens() {
    TOKENS.forEach(function (x) { d.documentElement.style.removeProperty(x.k); });
  }

  function paintTokens() {
    var s = d.documentElement.style;
    var t = active ? active.tokens : {};
    Object.keys(t).forEach(function (k) { s.setProperty(k, t[k]); });
    Object.keys(overrides).forEach(function (k) {
      if (TOKEN_SET[k]) s.setProperty(k, overrides[k]);
    });
  }

  function apply(id, opts) {
    var skin = registry[id];
    if (!skin) { warn('找不到皮膚：' + id); return false; }
    if (active && active.hooks.onRelease) safeCall('onRelease', [], null);

    clearInjected();
    clearTokens();
    active = skin;
    hookErrors = 0;
    hooksDisabled = false;

    paintTokens();

    d.documentElement.setAttribute('data-skin', skin.id);
    if (skin.scheme === 'auto') d.documentElement.removeAttribute('data-scheme');
    else d.documentElement.setAttribute('data-scheme', skin.scheme);

    skin.fonts.forEach(function (u) {
      var l = d.createElement('link');
      l.rel = 'stylesheet';
      l.href = u;
      d.head.appendChild(l);
      fontEls.push(l);
    });

    if (skin.css) {
      styleEl = d.createElement('style');
      styleEl.setAttribute('data-skin-css', skin.id);
      styleEl.textContent = skin.css;
      d.head.appendChild(styleEl);
    }

    if (!(opts && opts.noPersist)) {
      try { w.localStorage.setItem(CFG.SKIN_STORAGE_KEY || 'lb.skin', skin.id); } catch (e) {}
    }

    safeCall('onApply', [{ root: d.documentElement }], null);
    listeners.forEach(function (fn) { try { fn(skin); } catch (e) { warn(e); } });
    return true;
  }

  /* ── hook 的安全呼叫 ────────────────────────────────────────── */

  function safeCall(name, args, fallback) {
    if (hooksDisabled || !active || !active.hooks[name]) return fallback;
    try {
      var r = active.hooks[name].apply(null, args);
      return r === undefined || r === null ? fallback : r;
    } catch (e) {
      hookErrors++;
      warn(active.id + '.' + name + ' 出錯（第 ' + hookErrors + ' 次）', e);
      if (hookErrors >= MAX_HOOK_ERRORS) {
        hooksDisabled = true;
        warn(active.id + ' 的 hooks 已停用，改用預設顯示。皮膚的顏色與 CSS 仍然生效。');
      }
      return fallback;
    }
  }

  /* 文字類 hook：回傳一律當純文字用，塞不進 HTML */
  function text(name, args, fallback) {
    var r = safeCall(name, args, fallback);
    return typeof r === 'string' || typeof r === 'number' ? String(r) : fallback;
  }

  /* 裝飾類 hook：只能動 deco 容器，動完再封回去 */
  function decorate(dayEl, decoEl, day) {
    if (hooksDisabled || !active || !active.hooks.decorateDay) return;

    var snap = {
      state: dayEl.getAttribute('data-state'),
      date: dayEl.getAttribute('data-date'),
      blank: dayEl.getAttribute('data-blank'),
      sel: dayEl.getAttribute('aria-selected'),
      cls: dayEl.className
    };

    decoEl.textContent = '';
    safeCall('decorateDay', [decoEl, Object.freeze({
      date: day.date, state: day.state, weekday: day.weekday,
      openCount: day.openCount, totalCount: day.totalCount, note: day.note
    })], null);
    guardDeco(decoEl);

    /* 關鍵屬性被 hook 動過就還原 */
    if (dayEl.getAttribute('data-state') !== snap.state) {
      warn(active.id + ' 嘗試修改 data-state，已還原');
      setAttr(dayEl, 'data-state', snap.state);
    }
    if (dayEl.getAttribute('data-date') !== snap.date) setAttr(dayEl, 'data-date', snap.date);
    if (dayEl.getAttribute('data-blank') !== snap.blank) setAttr(dayEl, 'data-blank', snap.blank);
    if (dayEl.getAttribute('aria-selected') !== snap.sel) setAttr(dayEl, 'aria-selected', snap.sel);
    if (dayEl.className.indexOf('lb-day') < 0) dayEl.className = snap.cls;
  }

  function setAttr(el, k, v) {
    if (v === null) el.removeAttribute(k); else el.setAttribute(k, v);
  }

  /* deco 容器的消毒：拔 script / iframe / on* / javascript: ，並限制節點數 */
  function guardDeco(decoEl) {
    decoEl.className = 'lb-day__deco';
    decoEl.style.pointerEvents = 'none';
    decoEl.setAttribute('aria-hidden', 'true');

    var all = decoEl.querySelectorAll('*');
    var i, el, j, at;
    for (i = all.length - 1; i >= 0; i--) {
      el = all[i];
      var tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'iframe' || tag === 'object' ||
          tag === 'embed' || tag === 'link' || tag === 'form') {
        if (el.parentNode) el.parentNode.removeChild(el);
        continue;
      }
      for (j = el.attributes.length - 1; j >= 0; j--) {
        at = el.attributes[j].name;
        if (at.toLowerCase().indexOf('on') === 0) el.removeAttribute(at);
        if ((at === 'href' || at === 'src' || at === 'xlink:href') &&
            /^\s*javascript:/i.test(el.getAttribute(at) || '')) {
          el.removeAttribute(at);
        }
      }
    }
    if (decoEl.querySelectorAll('*').length > MAX_DECO_NODES) {
      warn((active ? active.id : '?') + ': 裝飾層節點過多（上限 ' + MAX_DECO_NODES + '），已清空');
      decoEl.textContent = '';
    }
  }

  /* ── Skin Lab 用：即時覆寫單一 token ─────────────────────────── */

  function setOverride(k, v) {
    if (!TOKEN_SET[k]) return false;
    if (v === null || v === '') delete overrides[k];
    else overrides[k] = String(v);
    clearTokens();
    paintTokens();
    return true;
  }
  function getOverrides() { var o = {}; Object.keys(overrides).forEach(function (k) { o[k] = overrides[k]; }); return o; }
  function clearOverrides() { overrides = {}; clearTokens(); paintTokens(); }

  /* 目前實際生效的 token 值（含預設值），Skin Lab 顯示與匯出用 */
  function effective(k) {
    if (overrides[k] !== undefined) return overrides[k];
    if (active && active.tokens[k] !== undefined) return active.tokens[k];
    return getComputedStyle(d.documentElement).getPropertyValue(k).trim();
  }

  /* ── 啟動 ───────────────────────────────────────────────────── */

  function pick() {
    var q = null;
    try {
      q = new URLSearchParams(w.location.search).get(CFG.SKIN_PARAM || 'skin');
    } catch (e) {}
    if (q && registry[q]) return q;
    var s = null;
    try { s = w.localStorage.getItem(CFG.SKIN_STORAGE_KEY || 'lb.skin'); } catch (e) {}
    if (s && registry[s]) return s;
    if (registry[CFG.DEFAULT_SKIN]) return CFG.DEFAULT_SKIN;
    return order[0] || null;
  }

  function boot() {
    var id = pick();
    if (id) apply(id, { noPersist: true });
    return id;
  }

  LB.Skins = {
    TOKENS: TOKENS,
    HOOK_NAMES: HOOK_NAMES,
    register: register,
    apply: apply,
    boot: boot,
    list: function () { return order.map(function (id) { return registry[id]; }); },
    get: function (id) { return registry[id] || null; },
    current: function () { return active; },
    hooksOk: function () { return !hooksDisabled; },
    text: text,
    decorate: decorate,
    setOverride: setOverride,
    getOverrides: getOverrides,
    clearOverrides: clearOverrides,
    effective: effective,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})(window, document);
