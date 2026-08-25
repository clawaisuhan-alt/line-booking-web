/* line-booking 前端設定。
 * 這個檔案是唯一需要跟後端對齊的地方 —— 皮膚作者不必看這裡。
 */
(function (w) {
  'use strict';

  w.LB_CONFIG = {
    /* ── 後端 ────────────────────────────────────────────────
     * GAS Web App 的 /exec 網址。留空時前端自動進入 MOCK 模式，
     * 用本機產生的假資料跑完整流程（調樣式不需要後端）。
     *
     * 網址本身不是機密——它是端點，存取控制走 idToken，`whoami.html`
     * 裡也已經寫死了同一個值。
     *
     * 2026-08-26：傳輸層與回應形狀都已對齊實際後端（部署 @4），
     * 填入網址即可從 MOCK 切到正式後端。
     */
    GAS_URL: '',

    LIFF_ID: '2011187534-1zGL0McE',   // booking-dev

    /* ── 業務常數（與規格書一致，僅供顯示與前端預檢）────────── */
    SLOT_COUNT: 5,
    MIN_LEAD_HOURS: 24,
    HORIZON_DAYS: 730,
    OPEN_WEEKDAYS: [2, 3, 5, 6],      // 二三五六，僅 MOCK 用

    /* ── 皮膚 ──────────────────────────────────────────────── */
    DEFAULT_SKIN: 'classic',
    SKIN_PARAM: 'skin',               // ?skin=washi 可覆寫
    SKIN_STORAGE_KEY: 'lb.skin',

    /* ── 語系 ──────────────────────────────────────────────── */
    LOCALE: 'zh-TW',
    WEEKDAY_LABELS: ['日', '一', '二', '三', '四', '五', '六']
  };

  /* ── 後端轉接層 ─────────────────────────────────────────────
   * 已對齊 2026-08-26 的實際後端（部署 @4，Slots.gs / Main.gs）。
   * 後端形狀若再變動，只要改這裡，booking-core.js 與所有皮膚都不用動。
   *
   * 送出（POST /exec，body = {action, payload}，Content-Type: text/plain）
   *   getMonth  payload: { year:2026, month:9, idToken }   ← 數字，不是 'YYYY-MM'
   *   getDay    payload: { date:'2026-09-16', idToken }
   *
   * 收到
   *   getMonth  data 是「以日期為鍵的物件」，不是陣列：
   *             { '2026-09-16': { state:'open', open:2, booked:1 }, ... }
   *             ⚠️ open 是該日「依規則可預約的格數」（容量），
   *                不是剩餘數、也不是 SLOT_COUNT。剩餘 = open - booked。
   *                開放日預設只開 idx2(16:00) 與 idx3(18:30)，所以容量通常是 2 而非 5。
   *   getDay    { date, slots:[ {idx,start,end,state} ] }
   *             後端已濾掉 state='closed' 的格，且絕不回傳預約者資訊。
   *   失敗      { ok:false, error:{ code, message } }
   *
   * state：日層級 open / full / closed / past / out_of_range
   *        格層級 open / booked / closed / past / out_of_range
   */
  w.LB_ADAPT = {
    request: function (action, params) {
      if (action === 'getMonth') {
        var m = String(params.month || '').split('-');   // 'YYYY-MM'
        return { year: Number(m[0]), month: Number(m[1]) };
      }
      var out = {};
      Object.keys(params).forEach(function (k) { out[k] = params[k]; });
      return out;
    },

    month: function (raw) {
      var d = (raw && raw.data) || {};
      return Object.keys(d).sort().map(function (date) {
        var x = d[date] || {};
        var capacity = typeof x.open === 'number' ? x.open : 0;
        var booked = typeof x.booked === 'number' ? x.booked : 0;
        return {
          date: date,
          state: x.state,
          /* 顯示成「2/2 可約」而非「2/5 可約」——後者會讓客戶以為
             還有三格可能開出來，但那三格預設就是關的。 */
          openCount: Math.max(capacity - booked, 0),
          totalCount: capacity,
          note: ''
        };
      });
    },

    day: function (raw) {
      var d = (raw && raw.data) || {};
      return (d.slots || []).map(function (x, i) {
        return {
          idx: typeof x.idx === 'number' ? x.idx : i,
          start: x.start || '',
          end: x.end || '',
          state: x.state,
          note: x.note || ''
        };
      });
    },

    error: function (raw) {
      var e = (raw && raw.error) || {};
      return { code: e.code || 'UNKNOWN', message: e.message || '未知錯誤' };
    }
  };
})(window);
