import * as cp from 'child_process';
import * as path from 'path';

export interface GitCommit {
    hash: string;
    message: string;
    author: string;
    timestamp: number;
    files: string[];
}

export interface FileCommits {
    file: string;
    commits: GitCommit[];
}

export class GitHelper {
    constructor(private workspaceRoot: string) {}

    async getCommitsForDate(date: Date): Promise<GitCommit[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
        const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

        // Git log with custom format: hash|message|author|timestamp
        const format = '%H|%s|%an|%at';
        const cmd = `git log --pretty=format:'${format}' --since=${startTimestamp} --until=${endTimestamp} --all`;

        console.log('[GitHelper] Date:', date.toISOString());
        console.log('[GitHelper] Start timestamp:', startTimestamp, new Date(startTimestamp * 1000).toISOString());
        console.log('[GitHelper] End timestamp:', endTimestamp, new Date(endTimestamp * 1000).toISOString());
        console.log('[GitHelper] Command:', cmd);

        try {
            const output = await this.exec(cmd);
            console.log('[GitHelper] Output:', output);
            if (!output.trim()) {
                console.log('[GitHelper] No commits found');
                return [];
            }

            const commits: GitCommit[] = [];
            const lines = output.trim().split('\n');

            for (const line of lines) {
                const [hash, message, author, timestampStr] = line.split('|');
                const timestamp = parseInt(timestampStr, 10);

                // Get files changed in this commit (works for initial commits too)
                const filesOutput = await this.exec(`git show --name-only --pretty=format: ${hash}`);
                const files = filesOutput.trim().split('\n').filter(f => f.length > 0);

                commits.push({
                    hash,
                    message,
                    author,
                    timestamp,
                    files
                });
            }

            // Sort by timestamp descending (newest first)
            commits.sort((a, b) => b.timestamp - a.timestamp);

            console.log('[GitHelper] Found', commits.length, 'commits');
            return commits;
        } catch (err) {
            console.error('Git error:', err);
            return [];
        }
    }

    async getFileCommitsForDate(date: Date): Promise<FileCommits[]> {
        const commits = await this.getCommitsForDate(date);
        const fileMap = new Map<string, GitCommit[]>();

        for (const commit of commits) {
            for (const file of commit.files) {
                if (!fileMap.has(file)) {
                    fileMap.set(file, []);
                }
                fileMap.get(file)!.push(commit);
            }
        }

        const fileCommits: FileCommits[] = [];
        for (const [file, commits] of fileMap.entries()) {
            fileCommits.push({ file, commits });
        }

        // Sort by file path
        fileCommits.sort((a, b) => a.file.localeCompare(b.file));

        return fileCommits;
    }

    async getFileContent(commitHash: string, filePath: string): Promise<string> {
        try {
            return await this.exec(`git show ${commitHash}:${filePath}`);
        } catch {
            return '';
        }
    }

    async getPreviousCommitHash(commitHash: string): Promise<string | null> {
        try {
            const output = await this.exec(`git rev-parse ${commitHash}^`);
            return output.trim();
        } catch {
            return null;
        }
    }

    async fileExistsInCommit(commitHash: string, filePath: string): Promise<boolean> {
        try {
            await this.exec(`git cat-file -e ${commitHash}:${filePath}`);
            return true;
        } catch {
            return false;
        }
    }

    async getLastCommitDate(): Promise<Date | null> {
        try {
            const output = await this.exec(`git log -1 --format=%at --all`);
            const timestamp = parseInt(output.trim(), 10);
            if (isNaN(timestamp)) {
                return null;
            }
            return new Date(timestamp * 1000);
        } catch {
            return null;
        }
    }

    private exec(cmd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(cmd, { cwd: this.workspaceRoot, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}
