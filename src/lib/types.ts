export type CommandType = "issue" | "pr";

export interface Command {
  id: string;
  name: string;
  prompt: string;
  types: CommandType[];
}

export type GitHubInfoType = "issue" | "pr" | "repo";

export interface GitHubInfo {
  owner: string;
  repo: string;
  type: GitHubInfoType;
  issueNumber: string | null;
}
