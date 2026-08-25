/* washi —— 完整示範：token + 外部字體 + 自訂 CSS + 全部四個顯示 hook。
   想知道皮膚能做到什麼程度，看這個檔就夠了。 */
LB.Skins.register({
  id: 'washi',
  name: '和紙',
  author: 'line-booking',
  blurb: '米色紙面、明體、朱印圓點。固定淺色。',
  scheme: 'light',
  layout: 'grid',

  fonts: ['https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600&display=swap'],

  tokens: {
    '--sk-bg': '#efe9dc',
    '--sk-surface': '#faf6ec',
    '--sk-surface-2': '#e8e0cf',
    '--sk-ink': '#2b2620',
    '--sk-ink-muted': '#8a7f6c',
    '--sk-rule': '#d9cfb8',

    '--sk-accent': '#9c2b23',
    '--sk-accent-ink': '#faf6ec',
    '--sk-accent-wash': '#f0dcd8',

    '--sk-open-bg': 'transparent',
    '--sk-open-rule': 'transparent',
    '--sk-closed-ink': '#c3b79f',
    '--sk-closed-rule': 'transparent',
    '--sk-full-bg': '#e8e0cf',
    '--sk-full-ink': '#a2957e',
    '--sk-past-ink': '#cec4ae',

    '--sk-sel-bg': 'transparent',
    '--sk-sel-ink': '#9c2b23',
    '--sk-sel-rule': 'transparent',

    '--sk-font': '"Noto Serif TC", "Songti TC", serif',
    '--sk-font-num': '"Noto Serif TC", "Songti TC", serif',
    '--sk-day-size': '1.1rem',
    '--sk-day-weight': '400',
    '--sk-tracking': '.01em',

    '--sk-radius': '.2rem',
    '--sk-radius-sm': '.15rem',
    '--sk-cell-radius': '50%',
    '--sk-gap': '.15rem',
    '--sk-pad': '1.15rem',
    '--sk-shadow': '0 1px 0 #ded3bb'
  },

  css: [
    '.lb-cal, .lb-slots { background-image:',
    '  radial-gradient(circle at 20% 10%, rgba(160,140,100,.06) 0 1px, transparent 1px),',
    '  radial-gradient(circle at 70% 60%, rgba(160,140,100,.05) 0 1px, transparent 1px);',
    '  background-size: 13px 13px, 19px 19px; }',
    '.lb-week__cell { font-size:.7rem; color:#a2957e; }',
    '.lb-day__meta { font-size:.58rem; letter-spacing:.04em; }',
    /* 選取靠朱印圓環，不靠填色 —— 紙的質感留著 */
    '.lb-day[aria-selected="true"] .lb-day__deco::after {',
    '  content:""; position:absolute; inset:8%; border-radius:50%;',
    '  border:1.5px solid #9c2b23; }',
    '.lb-slot__btn { border-style:none; border-bottom:1px solid #d9cfb8; border-radius:0; }',
    '.lb-slot__btn:hover:not(:disabled) { background:#f3ece0; }'
  ].join('\n'),

  hooks: {
    /* 顯示用文字：回傳字串，引擎當純文字處理 */
    monthTitle: function (y, m) {
      var K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      var kan = String(y).split('').map(function (c) { return K[+c]; }).join('');
      var names = ['', '睦月', '如月', '彌生', '卯月', '皋月', '水無月',
                   '文月', '葉月', '長月', '神無月', '霜月', '師走'];
      return kan + '年 ' + names[m] + '（' + m + '月）';
    },

    dayMeta: function (day) {
      if (day.state === 'open') return '空 ' + day.openCount;
      if (day.state === 'full') return '滿';
      if (day.state === 'closed') return '休';
      return '';
    },

    /* 裝飾層：只能塞進 deco 容器，永遠不吃點擊。
       引擎會消毒（拔 script/on*）並限制節點數。 */
    decorateDay: function (deco, day) {
      if (day.state === 'open') {
        var dot = document.createElement('span');
        dot.style.cssText =
          'position:absolute;left:50%;bottom:6%;transform:translateX(-50%);' +
          'width:4px;height:4px;border-radius:50%;background:#9c2b23;opacity:.55';
        deco.appendChild(dot);
      } else if (day.state === 'closed') {
        var line = document.createElement('span');
        line.style.cssText =
          'position:absolute;left:22%;right:22%;top:50%;height:1px;' +
          'background:#c3b79f;transform:rotate(-24deg)';
        deco.appendChild(line);
      }
    },

    slotTag: function (slot) {
      return { open: '受付', booked: '先約あり', closed: '休', past: '—' }[slot.state] || '';
    }
  }
});
