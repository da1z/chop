import { $ } from "bun";
import { NotInGitRepoError } from "../errors.ts";

// Get the root directory of the current git repository
export async function getGitRepoRoot(): Promise<string> {
	try {
		const result = await $`git rev-parse --show-toplevel`.text();
		return result.trim();
	} catch {
		throw new NotInGitRepoError();
	}
}

// Get the git remote origin URL (if available)
export async function getGitRemoteUrl(): Promise<string | null> {
	try {
		const result = await $`git remote get-url origin`.text();
		return result.trim();
	} catch {
		return null;
	}
}

// Normalize a remote URL to a consistent project ID format
// e.g., "git@github.com:user/repo.git" -> "github.com/user/repo"
// e.g., "https://github.com/user/repo.git" -> "github.com/user/repo"
function normalizeRemoteUrl(url: string): string {
	// Remove .git suffix
	let normalized = url.replace(/\.git$/, "");

	// Handle SSH format: git@github.com:user/repo
	if (normalized.startsWith("git@")) {
		normalized = normalized.replace(/^git@/, "").replace(":", "/");
	}

	// Handle HTTPS format: https://github.com/user/repo
	if (normalized.startsWith("https://")) {
		normalized = normalized.replace(/^https:\/\//, "");
	}

	if (normalized.startsWith("http://")) {
		normalized = normalized.replace(/^http:\/\//, "");
	}

	return normalized;
}

// Hash a string to create a short identifier
function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(16).slice(0, 8);
}

// Get a unique project identifier for the current repository
// Uses remote URL if available, otherwise uses repo path hash
export async function getProjectId(): Promise<string> {
	const remoteUrl = await getGitRemoteUrl();
	if (remoteUrl) {
		return normalizeRemoteUrl(remoteUrl);
	}

	// Fall back to repo path hash for local-only repos
	const repoRoot = await getGitRepoRoot();
	return hashString(repoRoot);
}

// Check if we're inside a git repository
export async function isInGitRepo(): Promise<boolean> {
	try {
		await $`git rev-parse --git-dir`.quiet();
		return true;
	} catch {
		return false;
	}
}
