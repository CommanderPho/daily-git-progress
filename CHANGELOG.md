# Change Log

## [0.1.12] - 2025-11-27

### Fixed
- Custom date input now works correctly when pressing Enter
- Date display now uses local timezone instead of UTC (fixes date showing as previous day in Asia/Australia timezones)
- Added debug logging to date picker for troubleshooting

### Technical
- Fixed race condition where onDidHide was resolving promise before custom date input completed
- Added isResolved flag to prevent double resolution of date picker promise
- Replaced toISOString() with local date formatting to prevent timezone conversion bugs

## [0.1.11] - 2025-11-27

### Added
- **Date header in all tree views**: Each panel now shows current viewing date with day of week at the top
- **Day of week in status bar**: Status bar displays day name alongside date (e.g., "Monday, 2025-11-27")

### Changed
- Improved visual clarity of current date context across all panels
- Date information now consistently visible without requiring additional UI interaction

## [0.1.10] - 2025-11-27

### Added
- **Last Committed Date option**: New date picker option showing most recent commit date
- Default view now shows last committed date instead of today

### Fixed
- Custom date input now correctly parses dates in local timezone instead of UTC
- Date filtering works properly for all custom dates entered

## [0.1.9] - 2025-11-27

### Added
- Webpack bundling for production builds, reducing package size from 35MB to 253KB
- Keywords for better marketplace discoverability
- Homepage and bugs URLs in package metadata
- Auto-publish workflow for tagged releases

### Changed
- Extension now uses bundled dist/extension.js instead of individual compiled files
- Updated CI to use @vscode/vsce instead of deprecated vsce package
- README screenshots now use relative paths for marketplace display

## [0.1.8] - 2025-11-27

### Added
- **Lunch interval**: New time range 1pm-2pm for lunch break commits
- **Time intervals displayed**: "By Time" panel now shows time ranges (e.g., "Morning (9am-11am) - 2 commits")

### Changed
- Updated from 7 to 8 time ranges with dedicated lunch period
- Time range labels now include hour intervals for clarity

## [0.1.7] - 2025-11-26

### Added
- **New "By Time" panel**: Groups commits by time ranges (7am-9am, 9am-11am, 11am-1pm, 2pm-4pm, 4pm-6pm, 6pm-8pm, 8pm-7am)
- **Time icons**: Each commit now shows a time-of-day icon (sunrise, morning sun, noon, afternoon, evening, sunset, moon)
- Time icon system with 7 time ranges to visualize when commits were made

### Note
- Download time icons (including new lunch.svg) from resources/time-icons/README.md and place in that folder for icons to appear

## [0.1.6] - 2025-11-26

### Added
- Tree/List toggle now applies to both "By Commit" and "By File" panels
- Folder icons in tree view mode for better visual organization

### Changed
- Initial commit files now show as diff against empty file (all lines green) for clear visual indication
- Synced view mode between both panels - toggling affects both simultaneously

### Fixed
- Files added in middle commits (not initial commit) now show properly as diff against empty

## [0.1.5] - 2025-11-26

### Fixed
- Initial commit files now show content instead of error message when clicked

## [0.1.4] - 2025-11-26

### Added
- Custom logo for extension and activity bar
- File tree view mode for "By File" panel (toggle between flat list and folder hierarchy)
- File icon display for files (instead of folder icons)
- Click file to view content at specific commit
- Click commit item to view diff against previous commit

### Fixed
- Git URI format for opening files at specific commits

## [0.1.3] - 2025-11-26

### Added
- View folder as file functionality
- Tree view mode toggle

## [0.1.2] - 2025-11-26

### Fixed
- Initial commit file detection (now shows files for first commit)
- File retrieval method in GitHelper to support initial commits
- Enhanced accuracy of file tracking in commit history

## [0.1.1] - 2025-11-26

### Added
- Enhanced logging for debugging
- Detailed logs for Git command execution and tree initialization

### Fixed
- Error handling for workspace initialization
- Timezone handling for local time filtering
- Git command format with proper shell escaping

## [0.1.0] - 2025-11-26

### Initial Release
- View git commits by date with two separate panels
- "By Commit" view: Shows commits chronologically with expandable file lists
- "By File" view: Shows files grouped by name with all commits that touched them
- Date picker with Today/Yesterday/Custom date options
- Local timezone support for commit filtering
- Status bar showing current selected date
- Refresh functionality to update views
