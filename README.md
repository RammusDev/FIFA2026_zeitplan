# FIFA2026_zeitplan

依賽事階段、小組與球隊篩選 FIFA 2026 賽程，產生可供行事曆訂閱的 ICS feed。

包含德文網頁介面與 Cloudflare Worker；賽程由外部 Google Apps Script 提供。

## 功能

- 按小組賽及各淘汰賽階段篩選。
- 按 A–L 小組或個別球隊篩選。
- 多項條件採聯集（OR），並依賽事 ID 去重。
- 未選任何條件時，輸出全部賽事。
- 依開賽時間排序，輸出 UTC 格式行事曆事件。
- 每場事件暫設兩小時。
- 網頁產生 `webcal://` 訂閱連結，Worker 提供 `text/calendar` 回應。

## 使用方式

1. 開啟網頁，選擇賽事階段、小組或球隊。
2. 按「ICS generieren」。
3. 在支援的行事曆 App 中確認訂閱。

例如，同時選「決賽」與「Germany」，結果是決賽加上德國隊所有賽事，而不是只保留德國隊參加的決賽。

`webcal://` 的開啟方式取決於作業系統及行事曆 App；也可使用相同參數的 HTTPS feed 網址。

## 專案結構

| 檔案 | 職責 |
| --- | --- |
| index.html | 德文操作介面、篩選選項與訂閱網址產生 |
| index.js | Cloudflare Worker：讀取資料、篩選及輸出 ICS |
| wrangler.jsonc | Worker 名稱、入口與相容性設定 |

## 本機與部署設定

### 網頁

在根目錄使用靜態伺服器，例如：

```sh
python -m http.server 8000
```

開啟 `http://localhost:8000`。

### Worker

需先安裝 Node.js 與 npm。在專案根目錄啟動開發伺服器：

```sh
npx wrangler dev
```

部署至自己的 Cloudflare 帳號時使用 Wrangler 的登入及部署流程：

```sh
npx wrangler login
npx wrangler deploy
```

部署前需調整：

- `wrangler.jsonc`：自己的 Worker 名稱及適用設定。
- `index.js` 的 `API_URL`：自己的 Apps Script 資料來源。
- `index.html` 的 `API_URL`：相同資料來源，供頁面讀取。
- `index.html` 的 `baseUrl`：自己部署的 Worker HTTPS 網址。

網頁與 Worker 是分開的入口；目前 Wrangler 設定只指定 Worker 程式，未設定靜態 HTML 資產託管。網頁需另行部署至靜態網站服務。

## Feed 參數

| 參數 | 範例 | 用途 |
| --- | --- | --- |
| stage | `group,final` | 賽事階段 |
| group | `A,B` | 小組 |
| team | `Germany,Japan` | 球隊 |

HTTPS 請求範例：

```text
https://YOUR-WORKER.workers.dev/?team=Germany,Japan&stage=final
```

階段值：`group`、`round32`、`round16`、`quarter`、`semi`、`third`、`final`。

## 資料來源格式

Google Apps Script 需回傳 JSON 陣列，每筆包含：

| 欄位 | 用途 |
| --- | --- |
| id | 去重與行事曆 UID |
| round | 與 stage 對應的階段值 |
| group | 小組代號 |
| team1 / team2 | 與選項完全一致的球隊名稱 |
| time | 可由 JavaScript Date 解析、建議含時區的 ISO 時間 |
| memo | 選填的事件說明 |

Apps Script 接收／資料處理程式不包含在 repo。頁面註記的原始資料來源為 [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)，程式實際透過 Apps Script 讀取，並非直接讀取該來源。

## 目前限制

- 依賴外部 Apps Script 的可用性與資料更新；repo 不保證賽程正確或即時。
- 球隊名稱與階段值需與資料完全一致。
- 行事曆重新抓取頻率由各 App 決定；Worker 回應設定五分鐘快取。
- ICS 文字欄位尚未完整處理特殊字元跳脫與長行折行。
- 此次文件整理未實際驗證外部 feed 或完整訂閱流程。

## 後續整理方向

- 補充介面截圖及行事曆訂閱畫面。
- 加入資料載入失敗提示與輸入資料驗證。
- 完善 ICS 相容性。
- 將資料來源及部署網址集中管理。
