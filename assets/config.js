/* line-booking 前端設定。
 * 這個檔案是唯一需要跟後端對齊的地方 —— 皮膚作者不必看這裡。
 */
(function (w) {
  'use strict';

  w.LB_CONFIG = {
    /* ── 後端 ────────────────────────────────────────────────
     * GAS Web App 的 /exec 網址。留空時前端自動進入 MOCK 模式，
     * 用本機產生的假資料跑完整流程（皮膚開發不需要後端）。
     * 正式值在 Mac 的 docs/環境資訊.md，刻意不進這個公開 repo。
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

  /* ── 後端回應轉接層 ─────────────────────────────────────────
   * 後端實際格式若與這裡假設的不同，只要改這兩個函式，
   * booking-core.js 與所有皮膚都不用動。
   *
   * 目前假設：
   *   GET ?action=getMonth&month=YYYY-MM
   *     -> { ok:true, data:{ days:[ {date,state,openCount,totalCount} ] } }
   *   GET ?action=getDay&date=YYYY-MM-DD
   *     -> { ok:true, data:{ slots:[ {idx,start,end,state,note} ] } }
   *   失敗 -> { ok:false, error:{ code, message } }
   *
   * state 取值沿用 Slots.gs：open / closed / past / out_of_range /
   * full（本前端把「全被預約」視為 full，後端若不回這個值也無妨）。
   */
  w.LB_ADAPT = {
    month: function (raw) {
      var d = (raw && raw.data) || raw || {};
      return (d.days || []).map(function (x) {
        return {
          date: x.date,
          state: x.state,
          openCount: typeof x.openCount === 'number' ? x.openCount : null,
          totalCount: typeof x.totalCount === 'number' ? x.totalCount : w.LB_CONFIG.SLOT_COUNT,
          note: x.note || ''
        };
      });
    },
    day: function (raw) {
      var d = (raw && raw.data) || raw || {};
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
