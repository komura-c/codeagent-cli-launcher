import {
  DEFAULT_BASE_PATH,
  loadBasePath,
  loadCommands,
  saveBasePath,
  saveCommands,
} from "../lib/commands";
import { buildCommands, parseGitHubUrl, extractGitHubTitle } from "../lib/github";
import type { Command, CommandType, GitHubInfo } from "../lib/types";
import {
  commandsToMarkdown,
  parseMultiCommandMarkdown,
} from "../lib/markdown";
import { clear, el } from "../lib/dom";

const ALL_TYPES: ReadonlyArray<{ value: CommandType; label: string }> = [
  { value: "issue", label: "Issue" },
  { value: "pr", label: "PR" },
];

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Element #${id} not found`);
  return node as T;
}

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function showFeedback(message: string): void {
  const feedback = byId("copy-feedback");
  feedback.textContent = message;
  feedback.classList.remove("hidden");
  setTimeout(() => feedback.classList.add("hidden"), 1500);
}

function populateCommandSelect(
  commands: Command[],
  pageType: GitHubInfo["type"],
): void {
  const select = byId<HTMLSelectElement>("command-select");
  clear(select);

  const filtered = commands.filter((cmd) =>
    (cmd.types as string[]).includes(pageType),
  );
  const section = byId("command-select-section");
  if (filtered.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  select.disabled = false;
  filtered.forEach((cmd) => {
    const opt = el("option", { text: cmd.name });
    opt.value = cmd.id;
    select.appendChild(opt);
  });
}

function getSelectedPromptTemplate(commands: Command[]): string {
  const select = byId<HTMLSelectElement>("command-select");
  const cmd = commands.find((c) => c.id === select.value);
  return cmd ? cmd.prompt : "";
}

function renderCommandList(
  commands: Command[],
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
): void {
  const list = byId("command-list");
  clear(list);

  commands.forEach((cmd) => {
    const editBtn = el("button", { class: "btn-small", text: "編集" });
    editBtn.addEventListener("click", () => onEdit(cmd.id));

    const deleteBtn = el("button", {
      class: "btn-small btn-danger",
      text: "削除",
    });
    deleteBtn.addEventListener("click", () => onDelete(cmd.id));

    const item = el("div", {
      class: "cmd-item",
      children: [
        el("div", {
          class: "cmd-item-info",
          children: [
            el("span", { class: "cmd-item-name", text: cmd.name }),
            el("span", { class: "cmd-item-types", text: cmd.types.join(", ") }),
          ],
        }),
        el("div", {
          class: "cmd-item-actions",
          children: [editBtn, deleteBtn],
        }),
      ],
    });
    list.appendChild(item);
  });
}

function createTypeCheckboxes(
  container: HTMLElement,
  selectedTypes: CommandType[] = [],
): void {
  clear(container);
  ALL_TYPES.forEach(({ value, label }) => {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = value;
    cb.checked = selectedTypes.includes(value);

    const lbl = el("label", {
      class: "type-checkbox-label",
      children: [cb, document.createTextNode(label)],
    });
    container.appendChild(lbl);
  });
}

function getCheckedTypes(container: HTMLElement): CommandType[] {
  return Array.from(
    container.querySelectorAll<HTMLInputElement>(
      "input[type=checkbox]:checked",
    ),
  )
    .map((cb) => cb.value)
    .filter((v): v is CommandType => v === "issue" || v === "pr");
}

function exportCommandsToFile(commands: Command[]): void {
  if (commands.length === 0) {
    showFeedback("エクスポートするコマンドがありません");
    return;
  }
  const content = commandsToMarkdown(commands);
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "codeagent-cli-launcher-commands.md";
  a.click();
  URL.revokeObjectURL(url);
}

function setIssueInfo(info: GitHubInfo, pageTitle: string): void {
  const section = byId("issue-section");
  if (info.type !== "issue" && info.type !== "pr") {
    section.classList.add("hidden");
    return;
  }
  const label = info.type === "issue" ? "Issue" : "PR";
  const title = extractGitHubTitle(pageTitle, info.type);
  const suffix = title && title !== pageTitle ? ` - ${title}` : "";
  byId("issue-info").textContent = `${label} #${info.issueNumber}${suffix}`;
}

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";
  const pageTitle = tab?.title ?? "";

  const info = parseGitHubUrl(url);

  if (!info) {
    byId("not-github").classList.remove("hidden");
    return;
  }

  byId("github-content").classList.remove("hidden");
  byId("repo-name").textContent = `${info.owner}/${info.repo}`;
  setIssueInfo(info, pageTitle);

  const basePath = await loadBasePath();
  byId<HTMLInputElement>("base-path").value = basePath;

  let commands = await loadCommands();
  let editingId: string | null = null;

  function updateCommandDisplay(): void {
    const bp =
      byId<HTMLInputElement>("base-path").value.trim() || DEFAULT_BASE_PATH;
    const promptTemplate = getSelectedPromptTemplate(commands);
    const cmds = buildCommands(info!, bp, pageTitle, promptTemplate);
    byId("claude-cmd").textContent = cmds.claude;
    byId("codex-cmd").textContent = cmds.codex;
  }

  function refreshSettingsPanel(): void {
    renderCommandList(commands, handleEditCommand, handleDeleteCommand);
  }

  async function applyCommands(next: Command[]): Promise<void> {
    commands = next;
    await saveCommands(commands);
    populateCommandSelect(commands, info!.type);
    updateCommandDisplay();
    refreshSettingsPanel();
  }

  function handleEditCommand(id: string): void {
    const cmd = commands.find((c) => c.id === id);
    if (!cmd) return;

    editingId = id;
    byId<HTMLInputElement>("add-name").value = cmd.name;
    byId<HTMLTextAreaElement>("add-prompt").value = cmd.prompt;
    createTypeCheckboxes(addTypesContainer, cmd.types);
    byId("add-submit").textContent = "更新";
    byId("cancel-edit").classList.remove("hidden");
  }

  function cancelEdit(): void {
    editingId = null;
    byId<HTMLInputElement>("add-name").value = "";
    byId<HTMLTextAreaElement>("add-prompt").value = "";
    createTypeCheckboxes(addTypesContainer);
    byId("add-submit").textContent = "追加";
    byId("cancel-edit").classList.add("hidden");
  }

  async function handleDeleteCommand(id: string): Promise<void> {
    await applyCommands(commands.filter((c) => c.id !== id));
  }

  populateCommandSelect(commands, info.type);
  updateCommandDisplay();

  const addTypesContainer = byId("add-types");
  createTypeCheckboxes(addTypesContainer);

  byId("command-select").addEventListener("change", updateCommandDisplay);

  byId("save-path").addEventListener("click", async () => {
    const bp =
      byId<HTMLInputElement>("base-path").value.trim() || DEFAULT_BASE_PATH;
    await saveBasePath(bp);
    updateCommandDisplay();
  });

  byId("base-path").addEventListener("input", updateCommandDisplay);

  document.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.dataset["target"];
      if (!targetId) return;
      const text = byId(targetId).textContent ?? "";
      await copyToClipboard(text);
      showFeedback("コピーしました!");
    });
  });

  const settingsPanel = byId("settings-panel");
  byId("settings-toggle").addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
    if (!settingsPanel.classList.contains("hidden")) {
      refreshSettingsPanel();
    }
  });

  byId("cancel-edit").addEventListener("click", cancelEdit);

  byId("export-commands").addEventListener("click", () => {
    exportCommandsToFile(commands);
  });

  const importInput = byId<HTMLInputElement>("import-commands");
  byId("import-commands-btn").addEventListener("click", () => {
    importInput.click();
  });
  importInput.addEventListener("change", async (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const imported = parseMultiCommandMarkdown(text);
    if (imported.length > 0) {
      await applyCommands([...commands, ...imported]);
      showFeedback(`${imported.length}件インポートしました`);
    }
    importInput.value = "";
  });

  byId("add-submit").addEventListener("click", async () => {
    const name = byId<HTMLInputElement>("add-name").value.trim();
    const prompt = byId<HTMLTextAreaElement>("add-prompt").value.trim();
    const types = getCheckedTypes(addTypesContainer);

    if (!name || !prompt || types.length === 0) return;

    if (editingId) {
      const next = commands.map((c) =>
        c.id === editingId ? { ...c, name, prompt, types } : c,
      );
      cancelEdit();
      await applyCommands(next);
    } else {
      const next: Command[] = [
        ...commands,
        { id: crypto.randomUUID(), name, prompt, types },
      ];
      byId<HTMLInputElement>("add-name").value = "";
      byId<HTMLTextAreaElement>("add-prompt").value = "";
      createTypeCheckboxes(addTypesContainer);
      await applyCommands(next);
    }
  });
}

void init();
