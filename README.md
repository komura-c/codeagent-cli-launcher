# CodeAgent CLI Launcher - Chrome Extension

GitHubで開いているページのURLを解析して、Claude Code / Codex をローカルリポジトリで起動するコマンドをワンクリックで取得できるChrome拡張。

## 機能

- GitHub URL を自動解析（リポジトリ、Issue、PR）
- Claude Code (`claude`) / Codex (`codex`) の起動コマンドを生成
- Issue/PR の場合はプロンプト付きでコマンド生成（選択式）
- ローカルリポジトリのベースパスを設定・保存可能
- ワンクリックでコマンドをクリップボードにコピー
- コマンドの追加・編集・削除が可能（built-in も同じUIで編集可）
- コマンドの Markdown エクスポート／インポート

## デフォルトコマンド（初回起動時に投入）

| コマンド名 | プロンプト | 対応ページ |
|---|---|---|
| PRレビュー | PRの内容を確認して、レビューしてください。 | PR |
| レビューコメント修正 | PRのレビューコメントを確認して、レビュー内容を修正してください。 | PR |
| Issue対応 | Issueの内容を確認して、対応してください。 | Issue |

> 初回起動時のみ seed され、以降はユーザーが自由に編集／削除／エクスポートできる通常のコマンドとして扱われる（削除後に自動復活しない）。

## 対応するGitHub URL

| URL パターン | 動作 |
|---|---|
| `github.com/{owner}/{repo}` | リポジトリルートで `claude` / `codex` を起動 |
| `github.com/{owner}/{repo}/issues/{n}` | Issue向けプロンプト付きで起動 |
| `github.com/{owner}/{repo}/pull/{n}` | PR向けプロンプト付きで起動 |

## 技術スタック

- TypeScript 6 (strict)
- Vite 8 + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)（Manifest V3 対応）
- Vitest + happy-dom
- pnpm

## 開発

```sh
pnpm install
pnpm dev          # HMR 付き開発ビルド（dist/ に watch 出力）
pnpm build        # 本番ビルド → dist/
pnpm test         # vitest watch
pnpm test:run     # CI ワンショット
pnpm typecheck    # tsc --noEmit
pnpm package      # build 後、releases/codeagent-cli-launcher-v{version}.zip を生成
```

> `pnpm package` は OS の `zip` コマンドを利用します（macOS / Linux 標準）。Windows で実行する場合は WSL 等をご利用ください。

## インストール（拡張機能ロード）

### 手動（unpacked）

1. `pnpm install` → `pnpm build` で `dist/` を生成
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」で `dist/` を選択

開発中は `pnpm dev` を起動しつつ `dist/` を読み込むと HMR が効く。

### zip からインストール

1. `pnpm package` を実行し `releases/codeagent-cli-launcher-v{version}.zip` を生成
2. zip を展開したディレクトリを `chrome://extensions` の「パッケージ化されていない拡張機能を読み込む」で選択

## 使い方

1. GitHub のページ（リポジトリ、Issue、PR）を開く
2. 拡張のアイコンをクリック
3. ローカルリポジトリのベースパス（例: `~/repos`）を設定
4. コマンド種別をドロップダウンから選択（Issue/PR ページのみ表示）
5. コマンドのコピーボタンをクリック → ターミナルに貼り付けて実行

## カスタムコマンドの管理

- ポップアップ右上の歯車アイコンから設定パネルを開く
- 各コマンドの「編集」「削除」で変更可能（built-in 含む）
- 新規追加: コマンド名・プロンプト・対応ページタイプを入力して「追加」
- 「エクスポート」で全コマンドを Markdown ファイルとして保存
- 「インポート」で Markdown ファイルからコマンドを追加
- 設定は `chrome.storage.local` に永続化される

## プロジェクト構成

```
src/
  popup/
    index.html, popup.ts, popup.css
  lib/
    types.ts, commands.ts, github.ts, shell.ts, markdown.ts, dom.ts
public/
  icons/
tests/
  github.test.ts, shell.test.ts, markdown.test.ts, commands.test.ts
scripts/
  zip.mjs
manifest.config.ts
vite.config.ts
vitest.config.ts
tsconfig.json
```

## ライセンス

MIT License — 詳細は [LICENSE](./LICENSE) を参照。
