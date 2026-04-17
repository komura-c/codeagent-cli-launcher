import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "CodeAgent CLI Launcher",
  version: "1.0.0",
  description:
    "GitHubページからClaude Code/Codexの起動コマンドをワンクリックで取得",
  permissions: ["activeTab", "clipboardWrite", "storage"],
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
});
