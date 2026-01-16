---
name: Add Development Section to README
overview: Add a new "# Development" section to README.md documenting the extension's architecture, codebase structure, key components, and potential troubleshooting information for developers.
todos:
  - id: add-dev-section
    content: Add '# Development' section to README.md with architecture overview, key components, git implementation details, troubleshooting, and development setup information
    status: pending
---

# Add Development Section to README

Add a new "# Development" section to [README.md](README.md) that documents the extension's architecture and codebase structure.

## Implementation Details

### Files to Modify

- [README.md](README.md) - Add new "# Development" section before the "Release Notes" section

### Content to Add

The Development section should include:

1. **Architecture Overview**

- Description of the three tree providers (CommitTreeProvider, FileTreeProvider, TimeTreeProvider)
- GitHelper class responsibilities
- Extension activation flow

2. **Key Components**

- `src/extension.ts` - Main activation and command registration
- `src/gitHelper.ts` - Git command execution and commit analysis
- `src/commitTreeProvider.ts` - Commit-based tree view
- `src/fileTreeProvider.ts` - File-based tree view
- `src/timeTreeProvider.ts` - Time-range-based tree view
- `src/timeHelper.ts` - Time range utilities and icon paths

3. **Git Command Implementation**

- Details about how commits are retrieved using `git log`
- Date filtering mechanism
- File change detection using `git show`

4. **Troubleshooting**

- View visibility requirements (git.enabled && gitOpenRepositoryCount != 0)
- Common issues and solutions
- How to check Developer Console for errors

5. **Development Setup**

- Build process (webpack)
- TypeScript configuration
- Testing considerations

The section should be informative for developers who want to understand, modify, or debug the extension.