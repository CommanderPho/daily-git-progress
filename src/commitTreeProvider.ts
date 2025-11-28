import * as vscode from 'vscode';
import * as path from 'path';
import { GitHelper, GitCommit } from './gitHelper';
import { getTimeIconPath } from './timeHelper';

function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

type TreeItem = DateHeaderItem | CommitItem | FolderItem | FileItem;

class DateHeaderItem {
    constructor(public date: Date) {}
}

class CommitItem {
    constructor(public commit: GitCommit) {}
}

class FolderItem {
    constructor(public folderPath: string, public files: string[], public commit: GitCommit) {}
}

class FileItem {
    constructor(public file: string, public commit: GitCommit) {}
}

export class CommitTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private currentDate: Date = new Date();
    private commits: GitCommit[] = [];
    private viewAsTree: boolean = false;

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
        } else if (element instanceof CommitItem) {
            const commit = element.commit;
            const time = new Date(commit.timestamp * 1000);
            const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
            const label = `[${timeStr}] ${commit.message} (${commit.hash.substring(0, 7)})`;

            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = `${commit.message}\n\nAuthor: ${commit.author}\nHash: ${commit.hash}`;
            item.contextValue = 'commit';
            item.iconPath = getTimeIconPath(time.getHours(), this.asAbsolutePath);
            return item;
        } else if (element instanceof FolderItem) {
            const folderName = element.folderPath === '' ? '/' : path.basename(element.folderPath);
            const item = new vscode.TreeItem(folderName, vscode.TreeItemCollapsibleState.Collapsed);
            item.tooltip = element.folderPath || 'Root';
            item.contextValue = 'folder';
            item.iconPath = new vscode.ThemeIcon('folder');
            return item;
        } else {
            const fileItem = element as FileItem;
            const item = new vscode.TreeItem(path.basename(fileItem.file), vscode.TreeItemCollapsibleState.None);
            item.description = this.viewAsTree ? '' : path.dirname(fileItem.file);
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
            items.push(...this.commits.map(c => new CommitItem(c)));
            return items;
        }

        if (element instanceof DateHeaderItem) {
            return [];
        }

        if (element instanceof CommitItem) {
            if (this.viewAsTree) {
                return this.buildTreeForCommit(element.commit);
            } else {
                return element.commit.files.map(f => new FileItem(f, element.commit));
            }
        }

        if (element instanceof FolderItem) {
            const folders = new Map<string, string[]>();
            const files: string[] = [];

            for (const file of element.files) {
                const relativePath = file.startsWith(element.folderPath)
                    ? file.substring(element.folderPath.length).replace(/^\//, '')
                    : file;

                const parts = relativePath.split('/');
                if (parts.length > 1) {
                    const nextFolder = parts[0];
                    const fullPath = element.folderPath ? `${element.folderPath}/${nextFolder}` : nextFolder;
                    if (!folders.has(fullPath)) {
                        folders.set(fullPath, []);
                    }
                    folders.get(fullPath)!.push(file);
                } else {
                    files.push(file);
                }
            }

            const result: TreeItem[] = [];
            for (const [folderPath, folderFiles] of folders.entries()) {
                result.push(new FolderItem(folderPath, folderFiles, element.commit));
            }
            result.push(...files.map(f => new FileItem(f, element.commit)));
            return result;
        }

        return [];
    }

    private buildTreeForCommit(commit: GitCommit): TreeItem[] {
        const folders = new Map<string, string[]>();
        const rootFiles: string[] = [];

        for (const file of commit.files) {
            const parts = file.split('/');
            if (parts.length > 1) {
                const topFolder = parts[0];
                if (!folders.has(topFolder)) {
                    folders.set(topFolder, []);
                }
                folders.get(topFolder)!.push(file);
            } else {
                rootFiles.push(file);
            }
        }

        const result: TreeItem[] = [];
        for (const [folderPath, files] of folders.entries()) {
            result.push(new FolderItem(folderPath, files, commit));
        }
        result.push(...rootFiles.map(f => new FileItem(f, commit)));
        return result;
    }

    getCurrentDate(): Date {
        return this.currentDate;
    }
}
