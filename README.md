# line-booking-web

`line-booking` 專案的 LIFF 前端（純靜態，透過 GitHub Pages 服務）。

## 為什麼這個 repo 是公開的

這裡只放瀏覽器拿得到的東西。LIFF ID 本來就會曝露給客戶端，沒有秘密可言。
所有機密（`CHANNEL_ACCESS_TOKEN`、clasp 憑證）都在 GAS 的指令碼屬性裡，
後端程式碼與環境文件在另一個**私有** repo `line-booking`。

**不要把任何 token、憑證或 `docs/環境資訊.md` 的內容放進這個 repo。**

## 頁面

| 檔案 | 用途 |
|---|---|
| `booking.html` | 預約頁。月曆 → 選日 → 選時段。`Bookings.create` 未實作前只到「已選」為止 |
| `skins.html` | 調色間。拉一拉就能做出新皮膚，可匯出 `.js` |
| `whoami.html` | 開發用。跑 `liff.getProfile()` 顯示自己的 userId，供填入 GAS 的 `ADMIN_USER_IDS` |
| `index.html` | 佔位首頁 |

## 皮膚系統

樣式與行為是分開的：皮膚可以換色、換字、換版面、加裝飾，但改不動「哪一天能不能約」。
撰寫方式與可用介面見 **[docs/SKIN.md](docs/SKIN.md)**；不寫程式的話直接開 `skins.html`。

現成皮膚：`classic`（原色）、`washi`（和紙）、`neon`（霓虹）、`ledger`（帳本，清單式）。
用 `?skin=washi` 可直接指定。

## 本機預覽

```
node serve.js     # http://localhost:8788
```

`assets/config.js` 的 `GAS_URL` 留空時前端走 **MOCK 模式**，用本機模擬資料
（週二三五六開放、提前 24 小時、730 天上限），不必連後端就能調樣式。
`GAS_URL` 是環境值，刻意不進這個公開 repo。

## LIFF app

| 名稱 | LIFF ID |
|---|---|
| `booking-dev` | `2011187534-1zGL0McE` |
| `admin-dev` | `2011187534-7AVcJ9o4` |

Login channel `2011187534`（Provider 楊士賢 / 2005458704）。

`whoami.html` 預設用 `booking-dev`；要換成 admin-dev 改檔案裡的 `LIFF_ID` 常數。

## 部署

推上 `main` 後由 GitHub Pages 自動發布。LIFF app 的 Endpoint URL 必須指向
發布後的網址，例如 `https://<user>.github.io/line-booking-web/whoami.html`。
