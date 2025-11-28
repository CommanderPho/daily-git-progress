import * as vscode from 'vscode';
import * as path from 'path';
import { GitHelper, GitCommit } from './gitHelper';
import { TIME_RANGES, getTimeRange, formatTimeInterval } from './timeHelper';

function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

type TreeItem = DateHeaderItem | TimeRangeItem | CommitItem | FileItem;

class DateHeaderItem {
    constructor(public date: Date) {}
}

class TimeRangeItem {
    constructor(public rangeName: string, public commits: GitCommit[], public icon: string, public timeInterval: string) {}
}

class CommitItem {
    constructor(public commit: GitCommit, public timeIcon: string) {}
}

class FileItem {
    constructor(public file: string, public commit: GitCommit) {}
}

export class TimeTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private currentDate: Date = new Date();
    private commits: GitCommit[] = [];

    constructor(private gitHelper: GitHelper, private asAbsolutePath: (relativePath: string) => string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    async setDate(date: Date): Promise<void> {
        this.currentDate = date;
        this.commits = await this.gitHelper.getCommitsForDate(date);
        this.refresh();
    }

    async initialize(): Promise<void> {
        await this.setDate(this.currentDate);
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        if (element instanceof DateHeaderItem) {
            const dateStr = formatDateLocal(element.date);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayOfWeek = dayNames[element.date.getDay()];
            const label = `${dayOfWeek}, ${dateStr}`;

            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            item.iconPath = new vscode.ThemeIcon('calendar');
            item.contextValue = 'dateHeader';
            item.tooltip = 'Current viewing date - click calendar icon to change';
            return item;
        } else if (element instanceof TimeRangeItem) {
            const label = `${element.rangeName} (${element.timeInterval}) - ${element.commits.length} commit${element.commits.length > 1 ? 's' : ''}`;
            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
            item.iconPath = element.icon;
            item.contextValue = 'timeRange';
            return item;
        } else if (element instanceof CommitItem) {
            const commit = element.commit;
            const time = new Date(commit.timestamp * 1000);
            const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
            const label = `[${timeStr}] ${commit.message} (${commit.hash.substring(0, 7)})`;

            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = `${commit.message}\n\nAuthor: ${commit.author}\nHash: ${commit.hash}`;
            item.iconPath = element.timeIcon;
            item.contextValue = 'commit';
            return item;
        } else {
            const fileItem = element as FileItem;
            const item = new vscode.TreeItem(path.basename(fileItem.file), vscode.TreeItemCollapsibleState.None);
            item.description = path.dirname(fileItem.file);
            item.tooltip = fileItem.file;
            item.contextValue = 'file';
            item.command = {
                command: 'dailyGitProgress.openDiff',
                title: 'Open Diff',
                arguments: [fileItem.file, fileItem.commit.hash]
            };
            item.resourceUri = vscode.Uri.file(fileItem.file);
            item.iconPath = vscode.ThemeIcon.File;
            return item;
        }
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            const items: TreeItem[] = [new DateHeaderItem(this.currentDate)];
            items.push(...this.buildTimeRanges());
            return items;
        }

        if (element instanceof DateHeaderItem) {
            return [];
        }

        if (element instanceof TimeRangeItem) {
            return element.commits.map(c => {
                const time = new Date(c.timestamp * 1000);
                const iconPath = this.asAbsolutePath(path.join('resources', 'time-icons', element.icon));
                return new CommitItem(c, iconPath);
            });
        }

        if (element instanceof CommitItem) {
            return element.commit.files.map(f => new FileItem(f, element.commit));
        }

        return [];
    }

    private buildTimeRanges(): TreeItem[] {
        const rangeMap = new Map<string, { commits: GitCommit[], icon: string }>();

        // Initialize all time ranges
        for (const range of TIME_RANGES) {
            rangeMap.set(range.name, { commits: [], icon: range.icon });
        }

        // Group commits by time range
        for (const commit of this.commits) {
            const time = new Date(commit.timestamp * 1000);
            const hour = time.getHours();
            const range = getTimeRange(hour);

            const group = rangeMap.get(range.name);
            if (group) {
                group.commits.push(commit);
            }
        }

        // Create tree items only for non-empty ranges
        const result: TreeItem[] = [];
        for (const range of TIME_RANGES) {
            const group = rangeMap.get(range.name);
            if (group && group.commits.length > 0) {
                const iconPath = this.asAbsolutePath(path.join('resources', 'time-icons', group.icon));
                const timeInterval = formatTimeInterval(range);
                result.push(new TimeRangeItem(range.name, group.commits, iconPath, timeInterval));
            }
        }

        return result;
    }

    getCurrentDate(): Date {
        return this.currentDate;
    }
}
