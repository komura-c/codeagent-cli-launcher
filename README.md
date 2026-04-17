# CodeAgent CLI Launcher - Chrome Extension

GitHub のページ（リポジトリ / Issue / PR）を開くだけで、**Claude Code** や **Codex** をローカルリポジトリ上で起動するワンライナーをワンクリックでクリップボードにコピーできる Chrome 拡張です。

## Features

- GitHub URL を自動解析（リポジトリ / Issue / PR を自動判別）
- `claude` / `codex` の起動コマンドを生成
- Issue / PR ではタイトル付きプロンプトで起動
- ワンクリックでクリップボードにコピー
- コマンドの追加・編集・削除（built-in コマンドも編集可）
- Markdown でのエクスポート / インポート（チーム共有向け）
- ネットワーク送信なし・完全ローカル動作

## Installation

### Load unpacked

```sh
pnpm install
pnpm build
```

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」で `dist/` を選択

### From packaged zip

```sh
pnpm package
# → releases/codeagent-cli-launcher-v{version}.zip
```

zip を展開したディレクトリを同様に読み込んでください。

## Usage

1. GitHub のリポジトリ / Issue / PR ページを開く
2. 拡張のアイコンをクリック
3. ローカルリポジトリのベースパス（例: `~/repos`）を設定
4. コマンド種別を選択（Issue / PR ページのみ）
5. コピーボタン → ターミナルに貼り付けて実行

### Supported URLs

| URL Pattern | Action |
|---|---|
| `github.com/{owner}/{repo}` | リポジトリルートで `claude` / `codex` を起動 |
| `github.com/{owner}/{repo}/issues/{n}` | Issue 向けプロンプト付きで起動 |
| `github.com/{owner}/{repo}/pull/{n}` | PR 向けプロンプト付きで起動 |

## Default Commands

初回起動時に以下のコマンドがシードされます。編集・削除・再エクスポートすべて自由です（削除後に自動復活はしません）。

| Name | Prompt | Target |
|---|---|---|
| PRレビュー | PRの内容を確認して、レビューしてください。 | PR |
| レビューコメント修正 | PRのレビューコメントを確認して、レビュー内容を修正してください。 | PR |
| Issue対応 | Issueの内容を確認して、対応してください。 | Issue |

## Sharing Commands

設定パネルから **エクスポート** するとコマンドが Markdown（YAML frontmatter 付き）として出力されます。チームで共有し、**インポート** で取り込めます。

```md
---
name: PRレビュー
types:
  - pr
---
PRの内容を確認して、レビューしてください。
```

## Development

```sh
pnpm install
pnpm dev          # HMR 付き開発ビルド（dist/ に watch 出力）
pnpm build        # 本番ビルド
pnpm test         # vitest watch
pnpm test:run     # CI ワンショット
pnpm test:coverage # カバレッジ付きで実行
pnpm typecheck    # tsc --noEmit
pnpm package      # build 後に zip を生成
```

### Tech Stack

- TypeScript (strict)
- Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)（Manifest V3）
- Vitest + happy-dom
- pnpm

## Privacy

本拡張は **外部へのネットワーク送信を一切行いません**。すべての設定は `chrome.storage.local` に保存され、あなたのブラウザ内にのみ存在します。必要な Chrome 権限は `activeTab` / `clipboardWrite` / `storage` のみです。

## Contributing

バグ報告・機能要望は [Issues](https://github.com/komura-c/codeagent-cli-launcher/issues) へ。Pull Request も歓迎です。変更前に Issue を立てて方針をすり合わせていただけるとスムーズです。

## License

[MIT](./LICENSE) © komura-c
