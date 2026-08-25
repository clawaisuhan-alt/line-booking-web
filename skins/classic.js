/* classic —— 最小示範：只換 token，一行 CSS 都沒寫。
   九成的改色需求長這樣。複製這個檔改顏色就是一個新皮膚。 */
LB.Skins.register({
  id: 'classic',
  name: '原色',
  author: 'line-booking',
  blurb: '乾淨的預設樣式，跟隨系統深淺色。',
  scheme: 'auto',
  layout: 'grid',
  tokens: {
    '--sk-accent': '#1c5c57',
    '--sk-accent-ink': '#ffffff',
    '--sk-cell-radius': '.45rem',
    '--sk-cell-shadow': 'none'
  }
});
