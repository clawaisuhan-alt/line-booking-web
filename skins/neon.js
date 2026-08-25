/* neon —— 示範 token + CSS 就能把整體氣氛換掉，一個 hook 都不用寫。 */
LB.Skins.register({
  id: 'neon',
  name: '霓虹',
  author: 'line-booking',
  blurb: '暗底、青紫發光。固定深色。',
  scheme: 'dark',
  layout: 'grid',

  fonts: ['https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap'],

  tokens: {
    '--sk-bg': '#07080f',
    '--sk-surface': '#0d1020',
    '--sk-surface-2': '#161b31',
    '--sk-ink': '#e6ecff',
    '--sk-ink-muted': '#7f8bb8',
    '--sk-rule': '#232a45',

    '--sk-accent': '#22e6c8',
    '--sk-accent-ink': '#04140f',
    '--sk-accent-wash': '#0c2a26',

    '--sk-open-bg': '#101528',
    '--sk-open-ink': '#d7e2ff',
    '--sk-open-rule': '#2b3a6b',
    '--sk-closed-bg': 'transparent',
    '--sk-closed-ink': '#39406a',
    '--sk-closed-rule': 'transparent',
    '--sk-full-bg': '#1a1230',
    '--sk-full-ink': '#8d7ac0',
    '--sk-past-ink': '#2c3252',

    '--sk-sel-bg': '#22e6c8',
    '--sk-sel-ink': '#04140f',
    '--sk-sel-rule': '#22e6c8',
    '--sk-sel-shadow': '0 0 14px rgba(34,230,200,.55)',

    '--sk-danger': '#ff6b8b',
    '--sk-danger-wash': '#2a0f1a',

    '--sk-font-num': '"Orbitron", ui-monospace, monospace',
    '--sk-day-size': '1rem',
    '--sk-day-weight': '700',
    '--sk-label-case': 'uppercase',
    '--sk-tracking': '.02em',

    '--sk-radius': '.15rem',
    '--sk-radius-sm': '.15rem',
    '--sk-cell-radius': '.15rem',
    '--sk-gap': '.28rem',
    '--sk-shadow': '0 0 0 1px rgba(34,230,200,.1), 0 0 30px rgba(34,230,200,.06)',
    '--sk-motion': '110ms cubic-bezier(.2,.9,.3,1)'
  },

  css: [
    '.lb-cal__title { text-shadow:0 0 10px rgba(34,230,200,.5); }',
    '.lb-day[data-state="open"]:hover { border-color:#22e6c8; box-shadow:0 0 10px rgba(34,230,200,.3); }',
    '.lb-day[data-state="open"] .lb-day__deco::before {',
    '  content:""; position:absolute; left:0; top:0; width:100%; height:2px;',
    '  background:linear-gradient(90deg, transparent, #22e6c8, transparent); opacity:.4; }',
    '.lb-day[data-state="full"] .lb-day__deco::before {',
    '  content:""; position:absolute; left:0; top:0; width:100%; height:2px;',
    '  background:linear-gradient(90deg, transparent, #a06bff, transparent); opacity:.5; }',
    '.lb-slot__btn { text-transform:uppercase; letter-spacing:.06em; font-size:.9rem; }',
    '.lb-legend i { border-radius:0; }'
  ].join('\n')
});
