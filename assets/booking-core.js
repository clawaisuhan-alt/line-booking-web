/* ═══════════════════════════════════════════════════════════════
   line-booking — 預約流程核心
   ───────────────────────────────────────────────────────────────
   負責：抓資料、算狀態、產生 DOM、處理點擊。

   與皮膚的分界：
     · DOM 結構與 data-* 屬性是對皮膚公開的契約，不可隨意改名。
     · 「這一格能不能點」永遠查 core 自己的 model（this.days），
       不看 DOM 上的 data-state —— 皮膚竄改屬性也影響不了行為。
     · 顯示用文字一律經過 LB.Skins.text()，皮膚不接手就用預設值。
   ═══════════════════════════════════════════════════════════════ */
(function (w, d) {
  'use strict';

  var LB = w.LB = w.LB || {};
  var CFG = w.LB_CONFIG || {};
  var AD = w.LB_ADAPT || {};
  var S = function () { return LB.Skins; };

  var BOOKABLE = { open: 1 };   /* 唯一可點的狀態 */

  /* ── 日期工具（一律本地時間，避免 UTC 位移把日期算差一天）──── */

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
  function ymOf(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1); }
  function parseISO(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(dt, n) { var x = new Date(dt.getTime()); x.setDate(x.getDate() + n); return x; }
  function startOfMonth(dt) { return new Date(dt.getFullYear(), dt.getMonth(), 1); }
  function addMonths(dt, n) { return new Date(dt.getFullYear(), dt.getMonth() + n, 1); }
  function daysInMonth(dt) { return new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate(); }

  /* ── MOCK 資料（GAS_URL 未設定時使用）─────────────────────────
     規則刻意與 Slots.gs 對齊，皮膚在沒有後端的情況下也調得準。 */

  function hash(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    /* 收尾攪一次。少了這段，連號日期取餘數會擠在同一邊，
       假資料會出現「整個月大半額滿」這種不像話的分布。 */
    h ^= h >>> 13; h = (h * 0x5bd1e995) >>> 0; h ^= h >>> 15;
    return h >>> 0;
  }

  /* 時段與「開放日預設只開哪幾格」都取自 2026-08-26 編輯器實測紀錄：
       testOverrides 印出 0:11:00 1:13:30 2:16:00 3:18:30 4:21:00
       testWeekdayRule 對 2026-08-29（週六）回 open=2，
       且 open_day 只讓 idx 2、3 變 open —— 所以預設開放的是這兩格，
       idx 0/1/4 要另外下 slot override 才會開。
     後端若之後改了，這裡跟著改；MOCK 只影響調樣式時看到的畫面。 */
  var MOCK_TIMES = [
    ['11:00', '12:00'], ['13:30', '14:30'], ['16:00', '17:00'],
    ['18:30', '19:30'], ['21:00', '22:00']
  ];
  var MOCK_DEFAULT_OPEN = [2, 3];

  function mockState(dateStr) {
    var now = new Date();
    var lead = new Date(now.getTime() + (CFG.MIN_LEAD_HOURS || 24) * 3600e3);
    var day = parseISO(dateStr);
    var end = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), CFG.HORIZON_DAYS || 730);
    if (day < new Date(lead.getFullYear(), lead.getMonth(), lead.getDate())) return 'past';
    if (day > end) return 'out_of_range';
    if ((CFG.OPEN_WEEKDAYS || []).indexOf(day.getDay()) < 0) return 'closed';
    return 'open';
  }

  function mockSlotState(dateStr, idx, dayState) {
    if (dayState !== 'open') return dayState;
    if (MOCK_DEFAULT_OPEN.indexOf(idx) < 0) return 'closed';
    return hash(dateStr + '#' + idx) % 4 === 0 ? 'booked' : 'open';
  }

  /* 刻意產生與 getMonth 相同的形狀：以日期為鍵的物件，每日 {state, open, booked}。
     open 是「該日依規則可預約的格數」（容量），不是 SLOT_COUNT，也不是剩餘數。
     MOCK 與正式後端因此共用同一條轉接路徑，切換時不會有形狀落差。 */
  function mockMonth(ym) {
    var base = parseISO(ym + '-01');
    var n = daysInMonth(base), out = {}, i, j, dateStr, st, capacity, booked, slotSt;
    for (i = 1; i <= n; i++) {
      dateStr = ym + '-' + pad(i);
      st = mockState(dateStr);
      capacity = 0; booked = 0;
      if (st === 'open') {
        for (j = 0; j < CFG.SLOT_COUNT; j++) {
          slotSt = mockSlotState(dateStr, j, st);
          if (slotSt === 'open') capacity++;
          else if (slotSt === 'booked') { capacity++; booked++; }
        }
        if (capacity === 0) st = 'closed';
        else if (booked === capacity) st = 'full';
      }
      out[dateStr] = { state: st, open: capacity, booked: booked };
    }
    return out;
  }

  /* 後端的 getDay 會濾掉 state 為 closed 的格（規格 §8.3，避免暴露完整時段結構），
     MOCK 也照做，否則前端會在 MOCK 下看到正式環境永遠拿不到的格子。 */
  function mockDay(dateStr) {
    var st = mockState(dateStr), i, slotSt, out = [];
    for (i = 0; i < CFG.SLOT_COUNT; i++) {
      slotSt = mockSlotState(dateStr, i, st);
      if (slotSt === 'closed') continue;
      out.push({
        idx: i,
        start: MOCK_TIMES[i] ? MOCK_TIMES[i][0] : '',
        end: MOCK_TIMES[i] ? MOCK_TIMES[i][1] : '',
        state: slotSt
      });
    }
    return out;
  }

  /* ── 後端存取 ───────────────────────────────────────────────── */

  function isMock() {
    try {
      if (new URLSearchParams(w.location.search).get('mock') === '1') return true;
    } catch (e) {}
    return !CFG.GAS_URL;
  }

  /* ── 快取與預抓 ─────────────────────────────────────────────
   * GAS 每次呼叫要冷啟動 + 開試算表 + 查 Calendar + 302 轉址，
   * 單次 1~3 秒是天性壓不掉；能壓的是「頻率」。
   * 空檔狀態變動不頻繁（別人訂走一格才會變），90 秒內重看同一個月
   * 直接用快取；建立預約成功後應呼叫 cacheClear() 讓畫面重新拉。
   */
  var CACHE_TTL_MS = 90 * 1000;
  var cache = {};   /* key -> { at, value(Promise) } */

  function cacheClear() { cache = {}; }
  LB.cacheClear = cacheClear;

  function cacheFresh(key) {
    var hit = cache[key];
    return !!(hit && (Date.now() - hit.at) < CACHE_TTL_MS);
  }

  function cachedCall(action, params, key) {
    var hit = cache[key];
    if (hit && (Date.now() - hit.at) < CACHE_TTL_MS) return hit.value;
    var value = call(action, params).then(function (raw) {
      /* 失敗的回應不留在快取裡，下次重試 */
      if (!raw || raw.ok === false) delete cache[key];
      return raw;
    }, function (e) {
      delete cache[key];
      throw e;
    });
    cache[key] = { at: Date.now(), value: value };
    return value;
  }

  function call(action, params) {
    if (isMock()) {
      return new Promise(function (res) {
        setTimeout(function () {
          if (action === 'getMonth') res({ ok: true, data: mockMonth(params.month) });
          else if (action === 'getDay') res({ ok: true, data: { date: params.date, slots: mockDay(params.date) } });
          else res({ ok: false, error: { code: 'MOCK_ONLY', message: action + ' 在 MOCK 模式下不可用' } });
        }, 90);
      });
    }
    /* WebView 會把整頁連同過期的 idToken 一起從快取撈回來（LINE 內建瀏覽器尤甚）。
       打出去之前先問頁面 token 還新不新鮮；過期就交給頁面重新登入（redirect），
       並回傳一個永不 resolve 的 promise——頁面即將導走，別讓錯誤訊息閃出來。 */
    if (typeof LB.checkTokenStale === 'function' && LB.checkTokenStale() &&
        typeof LB.onAuthError === 'function' && LB.onAuthError()) {
      return new Promise(function () {});
    }

    /* 傳輸方式抄自 whoami.html —— 那支是實際打通過的。
       Content-Type 必須是 text/plain：GAS 的 /exec 不處理 preflight 的 OPTIONS，
       改成 application/json 會觸發 preflight，整個請求會被瀏覽器擋掉（規格 §8.1）。 */
    var payload = AD.request ? AD.request(action, params || {}) : {};
    if (!AD.request) {
      Object.keys(params || {}).forEach(function (k) { payload[k] = params[k]; });
    }
    if (LB.idToken) payload.idToken = LB.idToken;

    return fetch(CFG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify({ action: action, payload: payload })
    }).then(function (r) {
      return r.text();
    }).then(function (t) {
      var body;
      try {
        body = JSON.parse(t);
      } catch (e) {
        e = null;
        body = null;
      }
      if (body) {
        /* 後端說 token 失效：同樣交給頁面自動重新登入，而不是把
           「登入已失效」丟給看不懂的客戶。 */
        if (body.ok === false && body.error && body.error.code === 'UNAUTHORIZED' &&
            typeof LB.onAuthError === 'function' && LB.onAuthError()) {
          return new Promise(function () {});
        }
        return body;
      }
      try {
        return JSON.parse(t);
      } catch (e) {
        /* GAS 丟 HTML 錯誤頁時會走到這裡。剛 deploy 完的幾秒內是正常現象，
           重試即可；持續發生就是部署版本有問題或 /exec 網址不對。 */
        throw { code: 'BAD_RESPONSE', message: '後端回的不是 JSON，多半是部署版本有問題或網址不對' };
      }
    });
  }

  /* ── 元件 ───────────────────────────────────────────────────── */

  function Booking(root) {
    this.root = root;
    this.month = startOfMonth(new Date());
    this.days = {};            /* dateStr -> day model（唯一的真相來源）*/
    this.selected = null;
    this.slots = [];
    this.busy = false;
    this.build();
    this.bind();
  }

  Booking.prototype.build = function () {
    var cfg = CFG;
    this.root.innerHTML =
      '<div class="lb-cal" data-layout="grid">' +
        '<div class="lb-cal__bar">' +
          '<button class="lb-nav" data-nav="prev" type="button" aria-label="上個月">&#8592;</button>' +
          '<h2 class="lb-cal__title" data-role="title"></h2>' +
          '<button class="lb-nav" data-nav="next" type="button" aria-label="下個月">&#8594;</button>' +
        '</div>' +
        '<ol class="lb-week" data-role="week"></ol>' +
        '<ol class="lb-grid" data-role="grid" role="grid"></ol>' +
        '<p class="lb-msg" data-role="calmsg"></p>' +
        '<div class="lb-legend">' +
          '<span><i data-k="open"></i>可預約</span>' +
          '<span><i data-k="full"></i>額滿</span>' +
          '<span><i data-k="closed"></i>公休</span>' +
          '<span><i data-k="sel"></i>已選</span>' +
        '</div>' +
      '</div>' +
      '<section class="lb-slots lb-hide" data-role="slots">' +
        '<h2 class="lb-slots__title" data-role="slotstitle"></h2>' +
        '<ol class="lb-slotlist" data-role="slotlist"></ol>' +
        '<p class="lb-msg" data-role="slotmsg"></p>' +
      '</section>' +
      '<form class="lb-form lb-hide" data-role="form">' +
        '<h2 class="lb-form__title" data-role="formtitle"></h2>' +
        '<label class="lb-field"><span>姓名 *</span>' +
          '<input name="name" type="text" maxlength="40" required autocomplete="name"></label>' +
        '<label class="lb-field"><span>電話</span>' +
          '<input name="phone" type="tel" maxlength="20" autocomplete="tel" inputmode="tel"></label>' +
        '<label class="lb-field"><span>備註</span>' +
          '<textarea name="note" maxlength="200" rows="2"></textarea></label>' +
        '<button class="lb-submit" type="submit">送出預約</button>' +
        '<p class="lb-msg" data-role="formmsg"></p>' +
      '</form>' +
      '<section class="lb-done lb-hide" data-role="done"></section>';

    this.el = {};
    ['title', 'week', 'grid', 'calmsg', 'slots', 'slotstitle', 'slotlist', 'slotmsg',
     'form', 'formtitle', 'formmsg', 'done']
      .forEach(function (k) { this.el[k] = this.root.querySelector('[data-role="' + k + '"]'); }, this);
    this.el.cal = this.root.querySelector('.lb-cal');
    this.el.prev = this.root.querySelector('[data-nav="prev"]');
    this.el.next = this.root.querySelector('[data-nav="next"]');

    /* 元件可能在皮膚套用之後才建立（onChange 那時還沒註冊），
       所以初始佈局直接跟目前的皮膚要。 */
    var cur = S().current();
    if (cur) this.el.cal.setAttribute('data-layout', cur.layout);
    void cfg;
  };

  Booking.prototype.bind = function () {
    var self = this;
    this.el.form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      self.submit();
    });

    this.el.prev.addEventListener('click', function () { self.go(-1); });
    this.el.next.addEventListener('click', function () { self.go(1); });

    /* 事件委派在容器上：皮膚就算重畫格子內部，點擊照樣有效 */
    this.el.grid.addEventListener('click', function (e) {
      var cell = e.target.closest ? e.target.closest('.lb-day') : null;
      if (!cell) return;
      self.pickDay(cell.getAttribute('data-date'));
    });
    this.el.grid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var cell = e.target.closest ? e.target.closest('.lb-day') : null;
      if (!cell) return;
      e.preventDefault();
      self.pickDay(cell.getAttribute('data-date'));
    });

    this.el.slotlist.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.lb-slot__btn') : null;
      if (!btn) return;
      var li = btn.closest('.lb-slot');
      self.pickSlot(parseInt(li.getAttribute('data-idx'), 10));
    });

    /* 換皮膚時整頁重畫，讓 hooks 重新跑一遍 */
    S().onChange(function (skin) {
      self.el.cal.setAttribute('data-layout', skin.layout);
      self.paintTitle();
      self.paintWeek();
      self.paintGrid();
      if (self.selected) self.paintSlots();
    });
  };

  Booking.prototype.go = function (delta) {
    var next = addMonths(this.month, delta);
    var floor = startOfMonth(new Date());
    var ceil = startOfMonth(addDays(new Date(), CFG.HORIZON_DAYS || 730));
    if (next < floor || next > ceil) return;
    this.month = next;
    this.dir = delta < 0 ? -1 : 1;
    this.load();
  };

  Booking.prototype.load = function () {
    var self = this, ym = ymOf(this.month);
    this.busy = true;
    this.paintTitle();
    this.paintWeek();

    /* 需要真的打後端時，立刻清空月曆並顯示載入中——
       留著上個月的格子會讓人以為換月沒反應（GAS 一趟要一兩秒）。
       已有快取則跳過清空，直接無縫換頁。 */
    if (!cacheFresh('m:' + ym)) {
      this.days = {};
      this.paintGrid();
      this.msg('calmsg', '載入中，請稍候…');
    }

    /* 朝移動方向一次抓三個月（首次載入視為向前）。
       三個請求平行發出、各自進快取；只有當前月驅動畫面。 */
    this.batchMonths(this.dir || 1);

    return cachedCall('getMonth', { month: ym }, 'm:' + ym).then(function (raw) {
      if (raw && raw.ok === false) throw AD.error(raw);
      var list = AD.month(raw);
      self.days = {};
      list.forEach(function (x) {
        x.weekday = parseISO(x.date).getDay();
        self.days[x.date] = x;
      });
      self.busy = false;
      self.msg('calmsg', isMock() ? 'MOCK 模式：資料為本機模擬，未連線後端。' : '');
      self.paintGrid();
    }).catch(function (e) {
      self.busy = false;
      self.days = {};
      self.paintGrid();
      self.msg('calmsg', '讀取失敗 — ' + (e.code ? e.code + '：' : '') + (e.message || e), 'error');
    });
  };

  /* 朝移動方向把接下來兩個月一併拉回快取（連同當月共三個月）。
     全程靜默：成功了換月就即時，失敗了也不打擾——到時候會正常載入。 */
  Booking.prototype.batchMonths = function (dir) {
    if (isMock()) return;
    var floor = startOfMonth(new Date());
    var ceil = startOfMonth(addDays(new Date(), CFG.HORIZON_DAYS || 730));
    [dir, dir * 2].forEach(function (delta) {
      var m = addMonths(this.month, delta);
      if (m < floor || m > ceil) return;
      var ym = ymOf(m);
      if (cacheFresh('m:' + ym)) return;
      cachedCall('getMonth', { month: ym }, 'm:' + ym).catch(function () {});
    }, this);
  };

  Booking.prototype.msg = function (key, txt, tone) {
    var el = this.el[key];
    el.textContent = txt || '';
    if (tone) el.setAttribute('data-tone', tone); else el.removeAttribute('data-tone');
  };

  Booking.prototype.paintTitle = function () {
    var y = this.month.getFullYear(), m = this.month.getMonth() + 1;
    this.el.title.textContent = S().text('monthTitle', [y, m], y + ' 年 ' + m + ' 月');

    var floor = startOfMonth(new Date());
    var ceil = startOfMonth(addDays(new Date(), CFG.HORIZON_DAYS || 730));
    this.el.prev.disabled = addMonths(this.month, -1) < floor;
    this.el.next.disabled = addMonths(this.month, 1) > ceil;
  };

  Booking.prototype.paintWeek = function () {
    var labels = CFG.WEEKDAY_LABELS || ['日', '一', '二', '三', '四', '五', '六'];
    var html = '', i, wd;
    for (i = 0; i < 7; i++) {
      wd = (i + 1) % 7;   /* 週一為每週首欄；labels 仍以 getDay() 的 0=日 索引 */
      html += '<li class="lb-week__cell">' +
        esc(S().text('weekdayLabel', [wd], labels[wd])) + '</li>';
    }
    this.el.week.innerHTML = html;
  };

  Booking.prototype.paintGrid = function () {
    var self = this;
    var first = startOfMonth(this.month);
    var lead = (first.getDay() + 6) % 7;   /* 週一起始的前置空格數 */
    var n = daysInMonth(first);
    var frag = d.createDocumentFragment();
    var i;

    this.el.grid.textContent = '';

    for (i = 0; i < lead; i++) {
      var blank = d.createElement('li');
      blank.className = 'lb-day';
      blank.setAttribute('data-blank', '1');
      blank.setAttribute('aria-hidden', 'true');
      frag.appendChild(blank);
    }

    for (i = 1; i <= n; i++) {
      var dateStr = ymOf(first) + '-' + pad(i);
      var day = this.days[dateStr] || {
        date: dateStr, state: 'closed', openCount: 0,
        totalCount: CFG.SLOT_COUNT, note: '', weekday: parseISO(dateStr).getDay()
      };
      frag.appendChild(this.cell(day, i));
    }

    this.el.grid.appendChild(frag);
    void self;
  };

  Booking.prototype.cell = function (day, dayNum) {
    var li = d.createElement('li');
    li.className = 'lb-day';
    li.setAttribute('role', 'gridcell');
    li.setAttribute('data-date', day.date);
    li.setAttribute('data-state', day.state);
    li.setAttribute('data-weekday', String(day.weekday));
    li.setAttribute('data-open-count', String(day.openCount == null ? '' : day.openCount));
    li.setAttribute('data-total', String(day.totalCount));
    li.setAttribute('aria-selected', this.selected === day.date ? 'true' : 'false');

    var bookable = !!BOOKABLE[day.state];
    li.setAttribute('tabindex', bookable ? '0' : '-1');
    li.setAttribute('aria-disabled', bookable ? 'false' : 'true');

    var num = d.createElement('span');
    num.className = 'lb-day__num';
    num.textContent = S().text('dayNumber', [day, dayNum], String(dayNum));
    li.appendChild(num);

    var metaDefault = day.state === 'open' && day.openCount != null
      ? day.openCount + ' 席'
      : (day.state === 'full' ? '額滿' : (day.state === 'closed' ? '休' : ''));
    var metaTxt = S().text('dayMeta', [day], metaDefault);
    if (metaTxt) {
      var meta = d.createElement('span');
      meta.className = 'lb-day__meta';
      meta.textContent = metaTxt;
      li.appendChild(meta);
    }

    var deco = d.createElement('span');
    deco.className = 'lb-day__deco';
    deco.setAttribute('aria-hidden', 'true');
    li.appendChild(deco);

    li.setAttribute('aria-label', day.date + '，' + stateLabel(day.state));
    S().decorate(li, deco, day);
    return li;
  };

  function stateLabel(s) {
    return { open: '可預約', full: '額滿', closed: '公休', booked: '已被預約',
             past: '已過期', out_of_range: '超出開放範圍' }[s] || s;
  }

  /* ── 選日期 ─────────────────────────────────────────────────── */

  Booking.prototype.pickDay = function (dateStr) {
    if (this.busy || !dateStr) return;
    var day = this.days[dateStr];
    /* ★ 封印點：查 model，不查 DOM。皮膚改不動這一行的判斷。 */
    if (!day || !BOOKABLE[day.state]) return;

    this.selected = dateStr;
    Array.prototype.forEach.call(this.el.grid.querySelectorAll('.lb-day'), function (el) {
      el.setAttribute('aria-selected', el.getAttribute('data-date') === dateStr ? 'true' : 'false');
    });

    var self = this;
    this.el.slots.classList.remove('lb-hide');
    /* 換日就收起上一輪的表單與完成畫面，避免日期與表單標題對不上 */
    this.el.form.classList.add('lb-hide');
    this.el.done.classList.add('lb-hide');
    this.pickedSlot = null;
    this.el.slotstitle.textContent = dateStr;
    this.el.slotlist.textContent = '';
    this.msg('slotmsg', '載入時段…');

    cachedCall('getDay', { date: dateStr }, 'd:' + dateStr).then(function (raw) {
      if (raw && raw.ok === false) throw AD.error(raw);
      self.slots = AD.day(raw);
      self.paintSlots();
      self.msg('slotmsg', '');
      self.el.slots.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }).catch(function (e) {
      self.slots = [];
      self.el.slotlist.textContent = '';
      self.msg('slotmsg', '讀取時段失敗 — ' + (e.code ? e.code + '：' : '') + (e.message || e), 'error');
    });
  };

  Booking.prototype.paintSlots = function () {
    var frag = d.createDocumentFragment();
    this.el.slotlist.textContent = '';

    this.slots.forEach(function (slot) {
      var li = d.createElement('li');
      li.className = 'lb-slot';
      li.setAttribute('data-idx', String(slot.idx));
      li.setAttribute('data-state', slot.state);

      var btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'lb-slot__btn';
      btn.disabled = !BOOKABLE[slot.state];

      var t = d.createElement('span');
      t.className = 'lb-slot__time';
      t.textContent = S().text('slotLabel', [slot],
        slot.start && slot.end ? slot.start + ' – ' + slot.end : '時段 ' + (slot.idx + 1));
      btn.appendChild(t);

      var tag = d.createElement('span');
      tag.className = 'lb-slot__tag';
      tag.textContent = S().text('slotTag', [slot], stateLabel(slot.state));
      btn.appendChild(tag);

      li.appendChild(btn);
      frag.appendChild(li);
    });

    this.el.slotlist.appendChild(frag);
  };

  Booking.prototype.pickSlot = function (idx) {
    var slot = null;
    this.slots.forEach(function (s) { if (s.idx === idx) slot = s; });
    /* ★ 同樣查 model */
    if (!slot || !BOOKABLE[slot.state]) return;

    if (typeof this.onBook === 'function') { this.onBook(this.selected, slot); return; }

    this.pickedSlot = slot;
    this.el.done.classList.add('lb-hide');
    this.el.form.classList.remove('lb-hide');
    this.el.formtitle.textContent =
      this.selected + '　' + slot.start + ' – ' + slot.end;
    this.msg('formmsg', '');
    this.el.form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    this.el.form.elements.name.focus();
  };

  /**
   * 送出預約。後端把「拿鎖之後重新判定」當唯一真相，
   * 前端不做樂觀更新——成功了就清快取重拉，被拒了就把後端的話照實顯示。
   */
  Booking.prototype.submit = function () {
    if (this.busy || !this.pickedSlot) return;
    var f = this.el.form.elements;
    var name = String(f.name.value || '').trim();
    if (!name) { this.msg('formmsg', '請填姓名', 'error'); return; }

    var self = this;
    var btn = this.el.form.querySelector('.lb-submit');
    this.busy = true;
    btn.disabled = true;
    this.msg('formmsg', '送出中…');

    call('createBooking', {
      date: this.selected,
      slotIdx: this.pickedSlot.idx,
      name: name,
      phone: String(f.phone.value || '').trim(),
      note: String(f.note.value || '').trim()
    }).then(function (raw) {
      if (raw && raw.ok === false) throw AD.error(raw);
      var b = (raw && raw.data) || {};

      self.el.form.classList.add('lb-hide');
      self.el.form.reset();
      self.el.done.classList.remove('lb-hide');
      self.el.done.textContent = '';
      var h = d.createElement('h2');
      h.textContent = '預約申請已送出 ✓';
      var p1 = d.createElement('p');
      p1.textContent = (b.date || self.selected) + '　' +
                       (b.start || self.pickedSlot.start) + ' – ' + (b.end || self.pickedSlot.end);
      var p2 = d.createElement('p');
      p2.className = 'lb-done__hint';
      p2.textContent = '狀態：待確認。確認後會以 LINE 通知您。';
      self.el.done.appendChild(h); self.el.done.appendChild(p1); self.el.done.appendChild(p2);
      self.el.done.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // 空位狀態變了，快取全部作廢並重拉當月與時段
      if (LB.cacheClear) LB.cacheClear();
      try { self.root.dispatchEvent(new CustomEvent('lb:booked', { bubbles: true })); } catch (e2) {}
      self.busy = false;
      btn.disabled = false;
      self.load();
      self.pickDay(self.selected);
    }).catch(function (e) {
      self.busy = false;
      btn.disabled = false;
      /* 被搶先訂走是正常情境，話講白一點並讓使用者立刻看到最新狀態 */
      var m = (e.code ? e.code + '：' : '') + (e.message || e);
      self.msg('formmsg', '未能完成 — ' + m, 'error');
      if (e.code === 'SLOT_UNAVAILABLE' || e.code === 'LEAD_TIME') {
        if (LB.cacheClear) LB.cacheClear();
        self.load();
        self.pickDay(self.selected);
      }
    });
  };

  /* ── 匯出 ───────────────────────────────────────────────────── */

  LB.Booking = Booking;
  LB.util = { iso: iso, parseISO: parseISO, ymOf: ymOf, isMock: isMock, call: call, stateLabel: stateLabel };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
})(window, document);
