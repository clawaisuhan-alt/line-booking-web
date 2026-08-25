/* ledger —— 示範 layout 變體：同一份資料、同一套邏輯，
   改成由上往下的清單（agenda），不是七欄月曆。
   layout 只有 'grid' 與 'agenda' 兩種，由結構層提供，皮膚不自己寫版面。 */
LB.Skins.register({
  id: 'ledger',
  name: '帳本',
  author: 'line-booking',
  blurb: '等寬字清單式，一天一列。示範 agenda 佈局。',
  scheme: 'auto',
  layout: 'agenda',

  fonts: ['https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap'],

  tokens: {
    '--sk-font-num': '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    '--sk-day-size': '.92rem',
    '--sk-day-weight': '500',
    '--sk-label-case': 'uppercase',

    '--sk-open-bg': 'var(--sk-surface)',
    '--sk-open-rule': 'var(--sk-rule)',
    '--sk-closed-bg': 'transparent',
    '--sk-closed-rule': 'var(--sk-rule)',

    '--sk-radius': '0',
    '--sk-radius-sm': '0',
    '--sk-cell-radius': '0',
    '--sk-gap': '0',
    '--sk-maxw': '32rem',
    '--sk-motion': '90ms linear'
  },

  css: [
    '.lb-cal[data-layout="agenda"] .lb-day { border-width:0 0 1px 0; }',
    '.lb-cal[data-layout="agenda"] .lb-day:last-child { border-bottom-width:0; }',
    /* 清單式看不到「上個月的空白格」，過期的列也沒有意義 —— 收起來 */
    '.lb-cal[data-layout="agenda"] .lb-day[data-state="past"],',
    '.lb-cal[data-layout="agenda"] .lb-day[data-state="out_of_range"] { display:none; }',
    '.lb-cal[data-layout="agenda"] .lb-day[data-state="open"] .lb-day__num { font-weight:600; }',
    '.lb-cal[data-layout="agenda"] .lb-day[aria-selected="true"] { padding-left:1.1rem; }',
    '.lb-slot__btn { border-width:0 0 1px 0; }'
  ].join('\n'),

  hooks: {
    monthTitle: function (y, m) {
      return y + '-' + (m < 10 ? '0' + m : m);
    },
    dayNumber: function (day, n) {
      var wd = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][day.weekday];
      return (n < 10 ? '0' + n : n) + '  ' + wd;
    },
    dayMeta: function (day) {
      if (day.state === 'open') return day.openCount + '/' + day.totalCount + ' 可約';
      if (day.state === 'full') return '0/' + day.totalCount + ' 額滿';
      if (day.state === 'closed') return '公休';
      return '';
    }
  }
});
