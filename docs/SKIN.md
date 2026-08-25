# 皮膚（Skin）撰寫指南

預約頁的「長相」和「行為」是分開的。長相全部可以換，行為一行都改不動。
這份文件說明可以改到哪裡、怎麼改、以及為什麼有些東西改不了。

---

## 三種改法，由淺到深

| 層級 | 怎麼做 | 適合 |
|---|---|---|
| 1. tokens | 換 CSS 變數的值 | 換色、換字、換圓角、換間距 —— 九成需求 |
| 2. css | 寫一段自由 CSS | 加紋理、加漸層、改單一元件細節 |
| 3. hooks | 幾個顯示用小函式 | 改標題寫法、在格子上加裝飾 |

大部分人停在第 1 層就夠了。**不會寫程式也能做：**打開 `skins.html`（調色間），
左邊拉一拉、右邊即時看，滿意之後按「複製」或「下載 .js」，就得到一個皮膚檔。

---

## 最短的皮膚

```js
LB.Skins.register({
  id: 'mine',          // 小寫英數與 - _，同時是網址參數 ?skin=mine
  name: '我的樣式',
  tokens: {
    '--sk-accent': '#c0392b',
    '--sk-cell-radius': '50%'
  }
});
```

存成 `skins/mine.js`，然後在 `booking.html` 加一行：

```html
<script src="skins/mine.js"></script>
```

完成。皮膚選單會自動多一項。

---

## 完整欄位

```js
LB.Skins.register({
  id:     'mine',
  name:   '我的樣式',
  author: '你的名字',        // 選填
  blurb:  '一句話說明',      // 選填，調色間會顯示

  scheme: 'auto',           // 'auto' | 'light' | 'dark'
                            // auto = 跟隨系統深淺色；指定則固定

  layout: 'grid',           // 'grid'（七欄月曆）| 'agenda'（一天一列）
                            // 只有這兩種，版面由結構層提供

  fonts: [                  // 只接受 https://fonts.googleapis.com/ 開頭
    'https://fonts.googleapis.com/css2?family=Noto+Serif+TC&display=swap'
  ],

  tokens: { /* 見下表 */ },

  css: '.lb-day { ... }',   // 套用時注入，換皮時整段拔掉

  hooks: { /* 見下節 */ }
});
```

不認得的欄位、不認得的 token、非白名單的字體來源，都會被忽略並在 console 留一行警告 ——
不會讓頁面壞掉。

---

## Token 一覽

`--sk-*` 全部可改。權威清單在 `assets/skin-engine.js` 的 `TOKENS`，預設值在 `assets/base.css`。

**底色**：`--sk-bg` `--sk-surface` `--sk-surface-2`
**文字**：`--sk-ink` `--sk-ink-muted`　**線條**：`--sk-rule`
**主色**：`--sk-accent` `--sk-accent-ink` `--sk-accent-wash`

**日期格**（最常改的一組）

| token | 意思 |
|---|---|
| `--sk-open-bg` / `-ink` / `-rule` | 可預約的底／字／框 |
| `--sk-closed-bg` / `-ink` / `-rule` | 公休 |
| `--sk-full-bg` / `-ink` | 額滿 |
| `--sk-past-ink` | 已過期、超出開放範圍 |
| `--sk-sel-bg` / `-ink` / `-rule` / `--sk-sel-shadow` | 選取中 |

**字體**：`--sk-font` `--sk-font-num` `--sk-size` `--sk-line` `--sk-day-size` `--sk-day-weight` `--sk-tracking` `--sk-label-case`
**形狀**：`--sk-radius` `--sk-radius-sm` `--sk-cell-radius` `--sk-cell-ratio` `--sk-gap` `--sk-pad` `--sk-maxw`
**效果**：`--sk-shadow` `--sk-cell-shadow` `--sk-sel-shadow` `--sk-motion` `--sk-deco-display`
**錯誤**：`--sk-danger` `--sk-danger-wash`

> 想加新 token：`base.css` 補預設值 → `skin-engine.js` 的 `TOKENS` 補一行 → 這裡補說明。三個地方缺一不可。

---

## 可以安全依賴的 DOM

寫 `css` 的時候拿這些當選擇器。這是**對皮膚公開的契約**，不會隨意改名。

```html
<div class="lb-cal" data-layout="grid|agenda">
  <div class="lb-cal__bar">
    <button class="lb-nav" data-nav="prev|next">
    <h2 class="lb-cal__title">
  <ol class="lb-week">  <li class="lb-week__cell">
  <ol class="lb-grid">
    <li class="lb-day"
        data-date="2026-08-28"
        data-state="open|full|closed|past|out_of_range"
        data-weekday="0..6"
        data-open-count="3"
        data-total="5"
        aria-selected="true|false"
        data-blank="1">          ← 月初補位的空格
      <span class="lb-day__num">
      <span class="lb-day__meta">
      <span class="lb-day__deco">   ← 裝飾層，見下
<section class="lb-slots">
  <ol class="lb-slotlist">
    <li class="lb-slot" data-idx="0" data-state="open|booked|closed|past">
      <button class="lb-slot__btn">
        <span class="lb-slot__time">  <span class="lb-slot__tag">
<p class="lb-msg" data-tone="error">
<div class="lb-legend">
```

常用寫法：

```css
.lb-day[data-state="open"]:hover { ... }
.lb-day[aria-selected="true"] { ... }
.lb-day[data-weekday="0"] .lb-day__num { color: crimson; }   /* 週日標紅 */
.lb-cal[data-layout="agenda"] .lb-day { ... }
```

---

## Hooks

全部都是**顯示用**的。回傳字串的 hook，引擎一律當純文字處理（塞不進 HTML）。

| hook | 簽名 | 用途 |
|---|---|---|
| `monthTitle` | `(year, month) → string` | 標題怎麼寫 |
| `weekdayLabel` | `(index 0-6) → string` | 星期列 |
| `dayNumber` | `(day, n) → string` | 格子裡的數字 |
| `dayMeta` | `(day) → string` | 數字下面那行小字 |
| `slotLabel` | `(slot) → string` | 時段文字 |
| `slotTag` | `(slot) → string` | 時段右邊的標籤 |
| `decorateDay` | `(decoEl, day)` | 往裝飾層塞東西 |
| `onApply` / `onRelease` | `(ctx)` | 套用／卸下時 |

`day` 物件是唯讀的：`{ date, state, weekday, openCount, totalCount, note }`。

`decorateDay` 只能動傳進來的 `decoEl`（就是 `.lb-day__deco`）。它覆蓋整格、
`pointer-events: none`、`aria-hidden`，所以怎麼畫都不會擋到點擊或干擾螢幕閱讀器。

```js
hooks: {
  decorateDay: function (deco, day) {
    if (day.state !== 'open') return;
    var dot = document.createElement('span');
    dot.style.cssText = 'position:absolute;left:50%;bottom:6%;' +
      'transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#c0392b';
    deco.appendChild(dot);
  }
}
```

---

## 改不動的東西（本質）

皮膚是外掛，不是後門。以下由核心決定，皮膚碰不到：

1. **哪一天／哪一格能點。** 核心查的是自己的資料模型，不是 DOM 上的 `data-state`。
   皮膚把屬性竄改成 `open` 也點不出預約。
2. **關鍵屬性會被還原。** `decorateDay` 執行前後會比對 `data-state`、`data-date`、
   `data-blank`、`aria-selected` 與基礎 class，被動過就還原並在 console 警告。
3. **裝飾層會被消毒。** `script` / `iframe` / `form` / `on*` 屬性 / `javascript:` 連結一律移除，
   節點數上限 24，超過就整層清空。
4. **hook 出錯不會弄壞頁面。** 全程 try/catch；同一個皮膚連續出錯 5 次就停用它的 hooks，
   顏色與 CSS 照常生效，畫面回到預設顯示。
5. **字體來源限 Google Fonts。** 其他主機的 `fonts` 會被忽略。
6. **點擊用事件委派掛在容器上。** 皮膚重畫格子內部也不會弄丟互動。

換句話說：**改壞了最多是難看，不會變成點不到、點錯、或點了出事。**

---

## 怎麼試

```bash
node serve.js
```

然後開 <http://localhost:8788/skins.html>（調色間）或
<http://localhost:8788/booking.html?skin=washi>（直接指定皮膚）。

沒設定 `GAS_URL` 時前端自動走 MOCK 模式，用本機模擬資料（週二三五六開放、
提前 24 小時、730 天上限），不需要後端也調得準。

指定皮膚的三種方式，優先序由高到低：

1. 網址 `?skin=washi`
2. 上次在皮膚選單選的（存在瀏覽器 localStorage）
3. `assets/config.js` 的 `DEFAULT_SKIN`

正式上線要固定樣式的話，把 `booking.html` 裡的 `<div class="lb-skinbar">` 整段刪掉，
只留 `DEFAULT_SKIN` 即可。

---

## 現成皮膚（也是範例）

| 檔案 | 示範什麼 |
|---|---|
| `skins/classic.js` | 只有 tokens，一行 CSS 都沒有 |
| `skins/washi.js` | tokens + 外部字體 + CSS + 全部四類 hook |
| `skins/neon.js` | tokens + CSS，完全不用 hook 也能大改氣氛 |
| `skins/ledger.js` | `layout: 'agenda'`，同一份資料換成清單式 |

想做新皮膚，複製最接近的那一個改就好。
