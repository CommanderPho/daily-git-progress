import * as vscode from 'vscode';
import * as path from 'path';
import { GitHelper, FileCommits, GitCommit } from './gitHelper';
import { getTimeIconPath } from './timeHelper';

function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

type TreeItem = DateHeaderItem | FileGroupItem | FolderItem | CommitItem;

class DateHeaderItem {
    constructor(public date: Date) {}
}

class FileGroupItem {
    constructor(public fileCommits: FileCommits) {}
}

class FolderItem {
    constructor(public folderPath: string, public children: FileCommits[]) {}
}

class CommitItem {
    constructor(public file: string, public commit: GitCommit) {}
}

export class FileTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private currentDate: Date = new Date();
    private fileCommits: FileCommits[] = [];
    private viewAsTree: boolean = false;

    constructor(private gitHelper: GitHelper, private asAbsolutePath: (relativePath: string) => string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    async setDate(date: Date): Promise<void> {
        this.currentDate = date;
        this.fileCommits = await this.gitHelper.getFileCommitsForDate(date);
        this.refresh();
    }

    async initialize(): Promise<void> {
        await this.setDate(this.currentDate);
    }

    setViewAsTree(asTree: boolean): void {
        this.viewAsTree = asTree;
        this.refresh();
    }

    getViewAsTree(): boolean {
        return this.viewAsTree;
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
        } else if (element instanceof FolderItem) {
            const folderName = element.folderPath === '' ? '/' : path.basename(element.folderPath);
            const item = new vscode.TreeItem(folderName, vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = element.folderPath || 'Root';
            item.contextValue = 'folder';
            item.iconPath = new vscode.ThemeIcon('folder');
            return item;
        } else if (element instanceof FileGroupItem) {
            const fc = element.fileCommits;
            const label = path.basename(fc.file);
            const commitCount = fc.commits.length;

            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
            item.description = this.viewAsTree ? `(${commitCount} commit${commitCount > 1 ? 's' : ''})` : `${path.dirname(fc.file)} (${commitCount} commit${commitCount > 1 ? 's' : ''})`;
            item.tooltip = fc.file;
            item.contextValue = 'fileGroup';
            item.resourceUri = vscode.Uri.file(fc.file);
            item.iconPath = vscode.ThemeIcon.File;
            item.command = {
                command: 'dailyGitProgress.openFileAtCommit',
                title: 'Open File',
                arguments: [fc.file, fc.commits[0].hash]
            };
            return item;
        } else {
            const commitItem = element as CommitItem;
            const commit = commitItem.commit;
            const time = new Date(commit.timestamp * 1000);
            const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
            const label = `[${timeStr}] ${commit.message} (${commit.hash.substring(0, 7)})`;

            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            item.tooltip = `${commit.message}\n\nAuthor: ${commit.author}\nHash: ${commit.hash}`;
            item.contextValue = 'file';
            item.iconPath = getTimeIconPath(time.getHours(), this.asAbsolutePath);
            item.command = {
                command: 'dailyGitProgress.openDiff',
                title: 'Open Diff',
                arguments: [commitItem.file, commit.hash]
            };
            return item;
        }
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            const items: TreeItem[] = [new DateHeaderItem(this.currentDate)];
            if (this.viewAsTree) {
                items.push(...await this.buildTree());
            } else {
                items.push(...this.fileCommits.map(fc => new FileGroupItem(fc)));
            }
            return items;
        }

        if (element instanceof DateHeaderItem) {
            return [];
        }

        if (element instanceof FolderItem) {
            const folders = new Map<string, FileCommits[]>();
            const files: FileCommits[] = [];

            for (const fc of element.children) {
                const relativePath = fc.file.startsWith(element.folderPath)
                    ? fc.file.substring(element.folderPath.length).replace(/^\//, '')
                    : fc.file;

                const parts = relativePath.split('/');
                if (parts.length > 1) {
                    const nextFolder = parts[0];
                    const fullPath = element.folderPath ? `${element.folderPath}/${nextFolder}` : nextFolder;
                    if (!folders.has(fullPath)) {
                        folders.set(fullPath, []);
                    }
                    folders.get(fullPath)!.push(fc);
                } else {
                    files.push(fc);
                }
            }

            const result: TreeItem[] = [];
            for (const [folderPath, children] of folders.entries()) {
                result.push(new FolderItem(folderPath, children));
            }
            result.push(...files.map(fc => new FileGroupItem(fc)));
            return result;
        }

        if (element instanceof FileGroupItem) {
            return element.fileCommits.commits.map(c => new CommitItem(element.fileCommits.file, c));
        }

        return [];
    }

    private buildTree(): TreeItem[] {
        const folders = new Map<string, FileCommits[]>();
        const rootFiles: FileCommits[] = [];

        for (const fc of this.fileCommits) {
            const parts = fc.file.split('/');
            if (parts.length > 1) {
                const topFolder = parts[0];
                if (!folders.has(topFolder)) {
                    folders.set(topFolder, []);
                }
                folders.get(topFolder)!.push(fc);
            } else {
                rootFiles.push(fc);
            }
        }

        const result: TreeItem[] = [];
        for (const [folderPath, children] of folders.entries()) {
            result.push(new FolderItem(folderPath, children));
        }
        result.push(...rootFiles.map(fc => new FileGroupItem(fc)));
        return result;
    }

    getCurrentDate(): Date {
        return this.currentDate;
    }
}
