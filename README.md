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
| `whoami.html` | 開發用。跑 `liff.getProfile()` 顯示自己的 userId，供填入 GAS 的 `ADMIN_USER_IDS` |
| `index.html` | 佔位首頁 |

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
