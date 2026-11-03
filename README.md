# Hono + lit-html SSR PoC

Hono が返す SSR HTML に、通常の `lit-html` の `TemplateResult` を使って
`@lit-labs/ssr-client` の `hydrate()` でイベントを接続する PoC です。
React / JSX / TSX / LitElement は使用しません。

## 結論

この構成で SSR とクライアント Hydration が成立します。
JavaScript 無効でも初期カウント `5` を表示し、有効時は同じ DOM を保持して
`@click=${() => onIncrement()}` を接続します。クリック後の更新も Lit が行います。
アプリの DOM を手動で作り直す処理や、イベント関数の HTML への埋め込みはありません。

## 実行

プロジェクトのルートディレクトリで実行してください。検証環境は Node.js `24.19.0`、
npm `11.17.0`、macOS arm64 です。Node 24 以上を使用します。
開発時は Node のネイティブ TypeScript 型除去を使います。

```sh
npm ci
npm run dev
```

`http://127.0.0.1:3000` を開きます。`PORT` 環境変数でポートを変更できます。
開発時は Vite middleware と Hono が同じ HTTP サーバーを共有します。
Node がサーバーの依存ファイルを監視し、Vite がブラウザ用モジュールを変換します。
View の変更時にカウンター状態を保持する専用 HMR は実装していません。

```sh
npm run typecheck
npm run build
npm start
```

ビルドは `dist/client` と `dist/server` を生成します。本番起動時はクライアントの
Vite manifest からハッシュ付きエントリーを読み、Hono が `/assets/*` を配信します。
Lit のサーバー依存は外部化され、Node の conditional exports が維持されます。
文書 HTML には `Cache-Control: no-store` を設定しています。

## バージョンと互換性

実装開始時（2026-10-30）に npm 公式レジストリの `latest` と公開済み package.json を確認しました。
アプリ依存は固定し、推移依存も `package-lock.json` に記録しています。

| パッケージ | 確認時の latest / 採用バージョン | 条件・判断 |
| --- | --- | --- |
| `hono` | 4.13.14 | Node >=16.9.0 |
| `@hono/node-server` | 2.1.5 | Node >=20 |
| `lit-html` | 3.3.3 | SSR と SSR client の `^3.1.2` に適合 |
| `@lit-labs/ssr` | 4.1.0 | Node >=13.9.0、SSR client `^1.1.7`、lit-html `^3.1.2` |
| `@lit-labs/ssr-client` | 1.1.8 | lit-html `^3.1.2` |
| `vite` | 8.3.5 | Node `^20.19.0 || >=22.12.0` |
| `typescript` | 7.0.2 | Node >=16.20.0 |
| `@playwright/test` | 1.64.1 | Node >=20 |
| `@types/node` | latest 26.6.6 / 採用 24.19.2 | SSR の optional peer が `>=20.0.0 <25.0.0` のため 24 系を選択 |

`npm ls lit-html @lit-labs/ssr-client` で、SSR とクライアントが同じ
`lit-html@3.3.3` / `ssr-client@1.1.8` に dedupe されることを確認しました。
SSR パッケージの推移依存には `lit` / `lit-element` もありますが、アプリの View は
`lit-html` からインポートしています。

## ディレクトリ

```text
src/
  server/
    index.ts             Hono、HTTP、Vite 開発 middleware、本番アセット配信
    render.ts            Lit SSR、文書の枠、初期 JSON のシリアライズ
  client/
    index.ts             初期データ検証、hydrate、状態更新と render
  views/
    layouts/default.ts   共有レイアウト
    pages/home.ts        共有ページ
    components/counter.ts 共有カウンターと @click
  shared/
    types.ts             データ型と実行時検証
tests/ssr.spec.ts         Chromium による検証
vite.config.ts           クライアント／サーバーのビルド設定
playwright.config.ts     本番／開発テストサーバー
```

## SSR と Hydration の流れ

1. Hono がリクエストごとに初期データを作ります。状態をリクエスト間で共有しません。
2. サーバーが `home({ ...data, count: data.initialCount }, noop)` を呼びます。
   内部の layout / counter も含め、クライアントと同じ View 関数です。
3. `@lit-labs/ssr` の `render()` を `collectResult()` で文字列にまとめ、
   `#app` に配置します。`lit-part` / `lit-node` コメントは保持します。
4. 同じ初期データを `script[type="application/json"]` に入れます。
   `<` / `>` / `&` / U+2028 / U+2029 を Unicode escape に変換し、
   `</script>` による脱出を防ぎます。本文の文字列は Lit がエスケープします。
5. クライアントは JSON を parse し、整数・文字列の型を検証します。
   同じ値と View で `hydrate(home(state, increment), container)` を一度だけ呼びます。
6. Hydration が既存ノードにイベントを接続します。SSR 時の noop の関数本体や
   関数の同一性をクライアントと一致させる必要はありません。
7. クリック時はクライアントの状態を増やし、同じコンテナへ
   `lit-html` の `render(home(state, increment), container)` を呼びます。

`data-hydrated="true"` は hydrate が正常終了したことをテストで観測する印です。
この属性は Lit の管理対象の子ツリーの外側にあり、Hydration の代わりには使いません。
失敗時に CSR へ置き換えるフォールバックは実装していません。

## 検証

```sh
npx playwright install chromium
npm run build
npm test
npm run test:dev
```

本番テストはビルド済みファイルを使用するため、先に `npm run build` が必要です。
テストはそれぞれポート 3100 / 3101 のサーバーを自動で起動・停止します。
`test:dev` の環境変数設定は macOS / Linux のシェル向けです。

2026-11-03 の実行結果: ビルド・型チェック成功、本番 3/3 テスト成功、開発 3/3 テスト成功。
開発時の Lit dev mode 通知は warning として表示されますが、Hydration 関連のエラーはありません。

| 要件 | 検証方法 |
| --- | --- |
| JS 無効で初期 HTML が表示される | `javaScriptEnabled: false` のブラウザで見出し・初期値・現在値を検証 |
| Hydration が成功する | クライアントモジュールの取得を一時停止し、解除後の完了属性を検証 |
| `@click` が動く | クリック後の現在値を検証 |
| イベントが重複しない | 再描画を挟んで 10 回クリックし、毎回正確に +1 を検証 |
| 初期構造が一致する | hydrate 前後の `#app.innerHTML` 完全一致と button / output の参照同一性を検証 |
| 初期データの安全な受け渡し | `</script>`、script / img 攻撃文字列、`&`、U+2028 / U+2029 の復元と非実行を検証。初期値 42 でも hydrate して 43 へ更新 |
| コンソールエラーがない | 通常画面の `console.error` と `pageerror` が空であることを検証 |
| ビルド・型チェック | `npm run build` / `npm run typecheck`。依存ライブラリの型チェックも有効 |

## 参照した公式仕様・ソース

- [Lit SSR: server usage](https://lit.dev/docs/ssr/server-usage/): `render()`、RenderResult の収集、Node の動作環境
- [Lit SSR: client usage](https://lit.dev/docs/ssr/client-usage/): standalone template の `hydrate()`、同じ初期データ、以後の `render()`
- [Lit SSR: overview](https://lit.dev/docs/ssr/overview/): Lit Labs としての位置づけ
- [SSR のソース](https://github.com/lit/lit/blob/main/packages/labs/ssr/src/lib/render-value.ts): EventPart の値を HTML に出力しない処理
- [Hydration のソース](https://github.com/lit/lit/blob/main/packages/labs/ssr-client/src/lib/hydrate-lit-html.ts): マーカー／digest の検証、イベント Part の commit、二重 hydrate のエラー
- [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs): Node との接続
- [Vite SSR](https://vite.dev/guide/ssr.html): middleware とサーバービルド

上記 GitHub リンクは main を指します。実際の実装判断ではインストールした固定版の
`@lit-labs/ssr/lib/render-value.js`、`lib/render-result.d.ts`、
`@lit-labs/ssr-client/development/lib/hydrate-lit-html.js`、
各 `index.d.ts` と `package.json` も読み、API と挙動を照合しています。
Hono adapter の `getRequestListener` と Vite の `rolldownOptions` 等も固定版の型定義で確認しています。

## 制約と今後の課題

- Lit SSR / SSR client は Lit Labs の実験的パッケージです。将来の更新時には依存範囲、
  SSR マーカー、Hydration API を再確認し、本テストを再実行する必要があります。
- 検証は Node 24.19.0 と Chromium に限定しています。他の Node メジャー、Firefox / Safari は未検証です。
- 一般の `lit-html` テンプレートのみが対象です。LitElement、Shadow DOM、
  カスタム要素のライフサイクル、非同期 directive の SSR 対応を実証する PoC ではありません。
  DOM shim の手動導入や VM module の実験フラグは使用しません。
- SSR マーカーを削除する HTML 圧縮や、hydrate 前の DOM 改変を行わないでください。
  無効な HTML によるブラウザの構造補正、サーバー／クライアント間のテンプレートやデータ差異も避けます。
- 日時・乱数・ブラウザ依存条件を View に追加する場合は、初期値をサーバーで確定して渡す必要があります。
- カウンターはページ内のメモリーにだけ保存します。再読み込みで初期値へ戻ります。
  永続化、API 更新、認証、複数ページのナビゲーションは今後の課題です。
- SSR 結果は全体を収集してから送信します。ストリーミングと大規模ページでの性能は未検証です。
- JSON エスケープは、このデータ用 script 要素への埋め込みに対するものです。
  初期データに秘密情報を含めず、文書枠やアセット URL に利用者入力を直接渡さないでください。
- 開発時は Node watch に干渉する一時設定ファイルを避けるため、Vite をインライン設定で起動します。
  `vite.config.ts` はビルド専用です。Vite 設定を拡張する場合は開発用設定との整合も確認してください。
