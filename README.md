# Debug-Viewer-Country / Nikkei-Flags

国設定用の `Debug-Viewer-Country` とPro表示用の `Nikkei-Flags` リクエストヘッダーを、指定したドメインにだけ付与する開発用 Chrome 拡張機能（Manifest V3）。Pro表示は `true` / `false` / OFF（付与しない）から選べ、国設定とは独立して変更できる。

## インストール

1. `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選ぶ

すでに旧版を使用している場合は、同じフォルダのファイルを更新し、`chrome://extensions` でこの拡張機能の再読み込みボタンを押す。従来の国設定・対象ドメインは引き継がれる。1.0.0から更新した場合、Pro表示は初期状態でOFFになる。

1.1.0から更新した場合は、Pro表示のONを `true` に、OFFを「ヘッダーを付与しない」に引き継ぐ。旧版のOFFが自動的に `false` 送信へ変わることはない。

## Proの表示設定をONにする

1. Pro表示を確認したいWebページを開く
2. ツールバーからこの拡張機能を開く
3. 「今開いているページを対象にする」を押す
4. Proの表示設定で `true` を選ぶ
5. 「保存して今のページを再読み込み」を押す

対象ドメインへのリクエストに、次のヘッダーが付く。Networkから個々のリクエストを探す必要はない。

```http
Nikkei-Flags: enableProRenewalProPage=true
```

国設定が不要な場合、`Debug-Viewer-Country` はOFFのままでよい。Pro表示を明示的に無効にする場合は `false` を選び、もう一度ページを再読み込みする。

```http
Nikkei-Flags: enableProRenewalProPage=false
```

OFFを選ぶと、この拡張による `Nikkei-Flags` の付与を停止する。`false` の送信と、ヘッダーを付与しないOFFは別の設定。

確認する場合は、開発者ツールの Network を開いてページを再読み込みし、Docで絞り込む。対象ページの行の Headers → Request Headers に `Nikkei-Flags: enableProRenewalProPage=true` があることを確認する。

## 使い方

ツールバーのアイコンからポップアップを開く。

| 設定 | 動作 |
| --- | --- |
| Pro表示：true | `Nikkei-Flags: enableProRenewalProPage=true` を付与する |
| Pro表示：false | `Nikkei-Flags: enableProRenewalProPage=false` を付与する |
| Pro表示：OFF | この拡張による `Nikkei-Flags` の付与を停止する |
| 国設定：OFF | `Debug-Viewer-Country` を付与しない（Pro表示の設定は独立） |
| 国設定：JP | `Debug-Viewer-Country: JP` を付与する |
| 国設定：JP以外 | 入力欄の値（初期値 `US`、英字は大文字に変換）を付与する |
| 対象URL・ドメイン | 1行に1つ記述する。URLの場合はドメイン部分を使用する（例: `https://example.com/pro/` → `example.com`）。サブドメインも対象 |
| 今開いているページを対象にする | 現在のタブのドメインを対象に追加する |
| 保存して今のページを再読み込み | ヘッダーの設定完了後、現在の対象ページをキャッシュを使わずに再読み込みする |

- 設定は `chrome.storage.local` に保存され、ブラウザを再起動しても残る
- 対象ドメインが空の場合、ヘッダーは付与されない
- 対象サイトは両ヘッダーで共通。対象へのページ本体・iframe・Fetch/XHR・スクリプト・画像・メディア等のリクエストが対象
- 設定を変更すると自動保存される。保存やルール登録に失敗した場合はポップアップにエラーを表示する

## 設計方針

- **ドメイン限定**: 全サイトにヘッダーが乗って意図しない送信先へ漏れるのを防ぐため、対象ドメインを必須にしている
- **外部通信なし**: ネットワーク通信を行うコードは含まない
- **ヘッダー固定**: 扱うのは `Debug-Viewer-Country` とPro表示フラグだけ。`Nikkei-Flags` が元から送られている場合、`true` / `false` の選択ではその値を `enableProRenewalProPage=選択した値` に置き換える

## 権限

| 権限 | 理由 |
| --- | --- |
| `declarativeNetRequest` | リクエストヘッダーの書き換え（`modifyHeaders`） |
| `storage` | 設定の保存 |
| `activeTab` | 拡張機能を開いたタブのURLの取得と、対象ドメインの追加 |
| `host_permissions: <all_urls>` | ユーザーが指定する任意の対象ドメインでヘッダーを書き換えるため。実際に書き換えるのは対象ドメインのみ |

## ファイル構成

| ファイル | 内容 |
| --- | --- |
| `manifest.json` | 拡張機能の定義 |
| `popup.html` | ポップアップの UI |
| `popup.js` | 設定の保存とヘッダー書き換えルールの登録 |
| `header-rules.mjs` | URL・ドメインの検証とヘッダー書き換えルールの生成 |
| `tests/header-rules.test.mjs` | Pro・国設定の組み合わせと対象ドメインのテスト |

## テスト

Node.js 18以降で、追加のパッケージをインストールせずに実行できる。

```sh
node --test tests/*.test.mjs
```
