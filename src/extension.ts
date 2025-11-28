import * as vscode from 'vscode';
import * as path from 'path';
import { GitHelper } from './gitHelper';
import { CommitTreeProvider } from './commitTreeProvider';
import { FileTreeProvider } from './fileTreeProvider';
import { TimeTreeProvider } from './timeTreeProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('[Daily Git Progress] Activate function called');

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        console.error('[Daily Git Progress] No workspace folder');
        vscode.window.showWarningMessage('Daily Git Progress: No workspace folder open');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    console.log('[Daily Git Progress] Workspace root:', workspaceRoot);
    const gitHelper = new GitHelper(workspaceRoot);

    const commitTreeProvider = new CommitTreeProvider(gitHelper, context.asAbsolutePath);
    const fileTreeProvider = new FileTreeProvider(gitHelper, context.asAbsolutePath);
    const timeTreeProvider = new TimeTreeProvider(gitHelper, context.asAbsolutePath);

    vscode.window.createTreeView('dailyGitCommits', {
        treeDataProvider: commitTreeProvider
    });

    vscode.window.createTreeView('dailyGitFiles', {
        treeDataProvider: fileTreeProvider
    });

    vscode.window.createTreeView('dailyGitTime', {
        treeDataProvider: timeTreeProvider
    });

    console.log('[Daily Git Progress] Extension activated, workspace:', workspaceRoot);

    // Initialize with last commit date or today
    (async () => {
        const lastCommitDate = await gitHelper.getLastCommitDate();
        const initialDate = lastCommitDate || new Date();

        await commitTreeProvider.setDate(initialDate);
        await fileTreeProvider.setDate(initialDate);
        await timeTreeProvider.setDate(initialDate);
        updateStatusBar(initialDate);

        console.log('[Daily Git Progress] Initialized with date:', initialDate.toISOString());
    })().catch(err => {
        console.error('[Daily Git Progress] Init error:', err);
        vscode.window.showErrorMessage('Daily Git Progress: ' + err.message);
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('dailyGitProgress.changeDate', async () => {
            const result = await showDatePicker(gitHelper, commitTreeProvider.getCurrentDate());
            if (result) {
                await commitTreeProvider.setDate(result);
                await fileTreeProvider.setDate(result);
                await timeTreeProvider.setDate(result);
                updateStatusBar(result);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dailyGitProgress.refresh', async () => {
            const currentDate = commitTreeProvider.getCurrentDate();
            await commitTreeProvider.setDate(currentDate);
            await fileTreeProvider.setDate(currentDate);
            await timeTreeProvider.setDate(currentDate);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dailyGitProgress.openDiff', async (filePath: string, commitHash: string) => {
            await openDiff(gitHelper, workspaceRoot, filePath, commitHash);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dailyGitProgress.openFile', async (filePath: string) => {
            const uri = vscode.Uri.file(filePath);
            await vscode.window.showTextDocument(uri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dailyGitProgress.openFileAtCommit', async (filePath: string, commitHash: string) => {
            const fullPath = path.join(workspaceRoot, filePath);
            const uri = vscode.Uri.parse(`git:/${fullPath}?${JSON.stringify({ path: fullPath, ref: commitHash })}`);
            await vscode.window.showTextDocument(uri, { preview: true });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dailyGitProgress.viewAsList', () => {
            commitTreeProvider.setViewAsTree(false);
            fileTreeProvider.setViewAsTree(false);
            vscode.commands.executeCommand('setContext', 'dailyGitProgress.viewAsTree', false);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dailyGitProgress.viewAsTree', () => {
            commitTreeProvider.setViewAsTree(true);
            fileTreeProvider.setViewAsTree(true);
            vscode.commands.executeCommand('setContext', 'dailyGitProgress.viewAsTree', true);
        })
    );

    vscode.commands.executeCommand('setContext', 'dailyGitProgress.viewAsTree', false);

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBarItem);
    updateStatusBar(new Date());

    function updateStatusBar(date: Date) {
        const dateStr = formatDateLocal(date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[date.getDay()];
        statusBarItem.text = `$(calendar) ${dayOfWeek}, ${dateStr}`;
        statusBarItem.tooltip = 'Daily Git Progress - Click to change date';
        statusBarItem.command = 'dailyGitProgress.changeDate';
        statusBarItem.show();
    }
}

function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function showDatePicker(gitHelper: GitHelper, currentDate: Date): Promise<Date | undefined> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = 'Select Date';
    quickPick.placeholder = 'Choose a date or enter custom date (YYYY-MM-DD)';

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const formatDate = formatDateLocal;

    const items: any[] = [];

    // Add last commit date as first option
    const lastCommitDate = await gitHelper.getLastCommitDate();
    if (lastCommitDate) {
        items.push({ label: 'Last Committed Date', description: formatDate(lastCommitDate), date: lastCommitDate });
    }

    items.push(
        { label: 'Today', description: formatDate(today), date: today },
        { label: 'Yesterday', description: formatDate(yesterday), date: yesterday },
        { label: '2 days ago', description: formatDate(twoDaysAgo), date: twoDaysAgo },
        { label: '$(calendar) Custom date...', description: 'Enter YYYY-MM-DD', date: null }
    );

    quickPick.items = items;

    return new Promise((resolve) => {
        let isResolved = false;

        quickPick.onDidAccept(async () => {
            if (isResolved) {
                return;
            }

            const selected = quickPick.selectedItems[0] as any;
            console.log('[Daily Git Progress] Date picker selected:', selected);

            if (selected.date) {
                console.log('[Daily Git Progress] Using preset date:', selected.date);
                isResolved = true; // Set BEFORE hide to prevent race condition
                quickPick.hide();
                quickPick.dispose();
                resolve(selected.date);
            } else {
                console.log('[Daily Git Progress] Showing custom date input');
                isResolved = true; // Set BEFORE hide to prevent race condition
                quickPick.hide();

                const input = await vscode.window.showInputBox({
                    prompt: 'Enter date (YYYY-MM-DD)',
                    value: formatDate(currentDate),
                    validateInput: (value) => {
                        const regex = /^\d{4}-\d{2}-\d{2}$/;
                        if (!regex.test(value)) {
                            return 'Invalid format. Use YYYY-MM-DD';
                        }
                        const [year, month, day] = value.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        if (isNaN(date.getTime())) {
                            return 'Invalid date';
                        }
                        return null;
                    }
                });

                console.log('[Daily Git Progress] Custom date input:', input);
                quickPick.dispose();

                if (input) {
                    // Parse as local date (not UTC)
                    const [year, month, day] = input.split('-').map(Number);
                    const customDate = new Date(year, month - 1, day);
                    console.log('[Daily Git Progress] Resolved custom date:', customDate);
                    resolve(customDate);
                } else {
                    console.log('[Daily Git Progress] Custom date canceled');
                    resolve(undefined);
                }
            }
        });

        quickPick.onDidHide(() => {
            console.log('[Daily Git Progress] Quick pick hidden, isResolved:', isResolved);
            if (!isResolved) {
                quickPick.dispose();
                isResolved = true;
                resolve(undefined);
            }
        });

        quickPick.show();
    });
}

async function openDiff(gitHelper: GitHelper, workspaceRoot: string, filePath: string, commitHash: string) {
    const previousHash = await gitHelper.getPreviousCommitHash(commitHash);

    const fullPath = path.join(workspaceRoot, filePath);

    // Check if this is initial commit or file was newly added
    const isNewFile = !previousHash || !(await gitHelper.fileExistsInCommit(previousHash, filePath));

    if (isNewFile) {
        // New file - show as diff against empty (all lines green = added)
        const emptyUri = vscode.Uri.parse(`untitled:${path.basename(filePath)}`).with({ scheme: 'untitled' });
        const rightUri = vscode.Uri.parse(`git:/${fullPath}?${JSON.stringify({ path: fullPath, ref: commitHash })}`);
        const title = `${filePath} (New File ${commitHash.substring(0, 7)})`;
        await vscode.commands.executeCommand('vscode.diff', emptyUri, rightUri, title);
        return;
    }

    const leftUri = vscode.Uri.parse(`git:/${fullPath}?${JSON.stringify({ path: fullPath, ref: previousHash })}`);
    const rightUri = vscode.Uri.parse(`git:/${fullPath}?${JSON.stringify({ path: fullPath, ref: commitHash })}`);

    const title = `${filePath} (${commitHash.substring(0, 7)} vs ${previousHash.substring(0, 7)})`;

    await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
}

export function deactivate() {}
