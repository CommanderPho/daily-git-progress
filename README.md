# Daily Git Progress

View your git commits organized by date with both commit-based and file-based views. Review what you did today or check changes from any specific date.

Perfect for daily standup prep, reviewing your work, or tracking progress over time. See exactly what files changed and when throughout the day.

<img src="screenshots/by_commit.png" alt="By Commit - Check what commited today" width="300" />

<img src="screenshots/by_file.png" alt="By File - Check each file progression throughout the day" width="300" />

<img src="screenshots/by_time.png" alt="By Time - Review each timeframe status" width="300" />

## Features

- **Three Views**: Switch between "By Commit" (chronological), "By File" (grouped by file), and "By Time" (grouped by time ranges)
- **Time Visualization**: Time-of-day icons show when commits were made (sunrise, noon, sunset, moon, etc.)
- **Date Selection**: Quickly jump to Today, Yesterday, or pick any custom date
- **Local Timezone**: All timestamps shown in your local time for easy reading
- **Tree/List Toggle**: View files as flat list or folder hierarchy in both panels
- **Click to View**: Click files to view content at specific commit, click commits to see diff
- **File Icons**: Proper file icons displayed instead of folder icons
- **Separate Panels**: All views visible simultaneously, each collapsible

## Usage

1. Open the "Daily Git Progress" panel from the activity bar
2. Default shows today's commits in three views:
   - **By Commit**: Commits in chronological order with time icons, expand to see files
   - **By File**: Files grouped together, expand to see all commits that touched them
   - **By Time**: Commits grouped by time ranges (morning, afternoon, evening, night)
3. Click the calendar icon in title bar to change date
4. Click any file to view content at that commit
5. Click any commit item to view diff against previous commit
6. Toggle tree/list view using the icon button
7. Click refresh to update

## Location

Located in its own activity bar container. Can be moved to other locations like Source Control or Explorer by dragging.

## Commands

- **Change Date...**: Pick a different date to review
- **Refresh**: Update the current view
- **View as Tree/List**: Toggle between flat list and folder hierarchy (applies to both panels)
- **Open Diff**: View file changes from a specific commit
- **Open File**: Open the file directly

## Timeline

- sunrise - 7am-9am
- morning - 9am-11am
- noon - 11am-1pm
- lunch - 1pm-2pm
- afternoon - 2pm-4pm
- evening - 4pm-6pm
- sunset - 6pm-8pm
- night - 8pm-7am

## Development

### Architecture Overview

The extension is built around three tree data providers that display git commits in different organizational views:

- **CommitTreeProvider** - Displays commits in chronological order, with each commit expandable to show the files it modified
- **FileTreeProvider** - Groups commits by file, showing all commits that touched each file
- **TimeTreeProvider** - Organizes commits by time ranges (Early Morning, Morning, Noon, Lunch, Afternoon, Evening, Sunset, Night)

All three providers share a common `GitHelper` class that handles git command execution and commit analysis. The extension activates when a workspace folder is opened, initializes all three providers, and sets them to display commits for the current date (or the last commit date if available).

### Key Components

- **`src/extension.ts`** - Main entry point that handles extension activation, registers commands, and creates the three tree views. Also manages the status bar item and date picker functionality.

- **`src/gitHelper.ts`** - Core git interaction layer. Executes git commands via child processes and provides methods for:
  - `getCommitsForDate()` - Retrieves all commits for a specific date using `git log` with date filtering
  - `getFileCommitsForDate()` - Groups commits by file for a given date
  - `getFileContent()` - Retrieves file content at a specific commit
  - `getPreviousCommitHash()` - Gets the parent commit hash for diff operations
  - `fileExistsInCommit()` - Checks if a file existed in a specific commit

- **`src/commitTreeProvider.ts`** - Implements the "By Commit" view. Shows commits as tree items with time icons, expandable to reveal modified files. Supports both flat list and folder hierarchy views.

- **`src/fileTreeProvider.ts`** - Implements the "By File" view. Groups commits by file path, allowing users to see the progression of changes to each file throughout the day.

- **`src/timeTreeProvider.ts`** - Implements the "By Time" view. Groups commits into time ranges based on commit timestamps, using icons to visualize different times of day.

- **`src/timeHelper.ts`** - Utility functions for time range calculations and icon path resolution. Defines the 8 time ranges (Early Morning through Night) and maps commit hours to appropriate time ranges and icons.

### Git Command Implementation

The extension uses native git commands executed via Node.js `child_process.exec()`:

- **Commit Retrieval**: Uses `git log --pretty=format:'%H|%s|%an|%at' --since=<timestamp> --until=<timestamp> --all` to get commits within a date range. The custom format provides hash, message, author, and timestamp in a pipe-delimited format.

- **Date Filtering**: Converts the selected date to Unix timestamps (start and end of day) and passes them to git log's `--since` and `--until` flags. This ensures accurate date-based filtering regardless of timezone.

- **File Change Detection**: For each commit, uses `git show --name-only --pretty=format: <hash>` to retrieve the list of files modified in that commit. This works for both regular commits and initial commits.

- **Diff Support**: When viewing file diffs, retrieves the previous commit hash using `git rev-parse <hash>^` and uses VSCode's built-in git URI scheme to display the diff.

### Troubleshooting

**Views Not Appearing**

The extension views have a visibility condition: `config.git.enabled && gitOpenRepositoryCount != 0`. This means:
- Git must be enabled in VSCode settings
- At least one git repository must be open in the workspace
- If views don't appear, check that your workspace is a git repository and that git is enabled

**No Data Showing**

If views appear but show no commits:
1. Check the Developer Console (Help → Toggle Developer Tools → Console tab) for error messages
2. Verify the workspace root is a valid git repository
3. Ensure git is available in your system PATH
4. Check that there are actually commits for the selected date
5. Look for console.log output from the extension (prefixed with `[Daily Git Progress]`)

**Common Issues**

- **Git commands failing silently**: Check the Developer Console for error details. The extension catches and logs errors but may not always show user-facing error messages.
- **File paths incorrect**: Git returns relative paths from the repository root. The extension handles this by joining paths with the workspace root when needed.
- **Initialization errors**: The extension initializes asynchronously. If initialization fails, check the console for the error message.

### Development Setup

**Build Process**

The extension uses webpack to bundle TypeScript code:
- Production build: `npm run vscode:prepublish` (runs `webpack --mode production`)
- Development build: `npm run compile` (runs `webpack --mode none`)
- Watch mode: `npm run watch` (runs webpack in watch mode)
- Type checking: `npm run test-compile` (runs `tsc` without emitting files)

**TypeScript Configuration**

- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Source maps generated for debugging
- Output directory: `dist/`

**Testing**

To test the extension:
1. Open the project in VSCode
2. Press F5 to launch a new Extension Development Host window
3. In the new window, open a git repository
4. Navigate to the "Daily Git Progress" activity bar icon
5. Verify all three views appear and display data correctly

**Project Structure**

```
src/
  extension.ts          # Main activation and command registration
  gitHelper.ts          # Git command execution
  commitTreeProvider.ts # Commit-based tree view
  fileTreeProvider.ts   # File-based tree view
  timeTreeProvider.ts   # Time-range-based tree view
  timeHelper.ts         # Time range utilities

resources/
  time-icons/           # SVG icons for time ranges
  logo-colour.png       # Extension icon
  logo-onlyg.svg        # Activity bar icon

dist/                   # Compiled output (generated)
```

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release history.
