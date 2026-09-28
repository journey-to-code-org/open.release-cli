export interface ParsedArgs {
  release: string | null;
  message: string | null;
  skipTests: boolean;
  npm: boolean;
  github: boolean;
  remote: string;
  access: string;
  dryRun: boolean;
  help: boolean;
  version: boolean;
}

export interface CommandStep {
  type: "command";
  executable: string;
  args: string[];
  label: string;
}

export interface CommitIfNeededStep {
  type: "commit-if-needed";
  label: string;
  message: string;
}

export interface GithubReleaseStep {
  type: "github-release";
  label: string;
  repoName: string;
}

export type ReleaseStep =
  | CommandStep
  | CommitIfNeededStep
  | GithubReleaseStep;

export interface ReleasePlanOptions {
  release: string;
  message: string;
  skipTests?: boolean;
  npm?: boolean;
  github?: boolean;
  remote?: string;
  access?: string;
  packageName: string;
  packageVersion: string;
  repoName: string;
  branch: string;
}

export function parseArgs(argv: string[]): ParsedArgs;
export function validateRelease(release: string): void;
export function buildReleasePlan(options: ReleasePlanOptions): ReleaseStep[];
