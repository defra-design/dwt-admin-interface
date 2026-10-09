# Cursor rules for this project

Not a rule itself — `.md`, not `.mdc`, so Cursor won't load it as one. This is the human-readable index.

## How to install

The three subfolders (`general/`, `defra/`, `project/`) live in `.cursor/rules/` at the root of this repo (the Waste Management Admin Portal prototype), so the layout is:

```
.cursor/rules/
├── general/   (6 files)
├── defra/     (3 files)
└── project/   (8 files)
```

Cursor picks up every `.mdc` file under `.cursor/rules/`, including in subfolders. Each file's frontmatter decides when it loads — see the table below.

## Why 17 small files instead of 3 large ones

The previous version of these rules (flat `01/02/03` files) grouped content by *scope* — general vs Defra vs this project. Cursor's rule system instead loads rules by *when they're relevant*: always, or only when a matching file is open. Splitting by topic and adding `globs` means, for example, the accessibility checklist only loads while an `.html`/`.njk` file is open, and the routes conventions only load while `app/routes.js` is open — rather than every rule loading on every request regardless of relevance. That's both more accurate and more token-efficient in Cursor itself.

## Rule types used here

- **Always Apply** (`alwaysApply: true`) — loads in every session regardless of what's open. Used for core rules, project identity, folder structure, and working practices — things the AI needs to know even before touching a specific file.
- **Apply to Specific Files** (`alwaysApply: false`, `globs` set) — auto-attaches only when a matching file is open. Used for content design, accessibility, templates, routes, and data handling — things tied to a particular file type.

None of these files use Apply Intelligently (description-only, agent decides) or Apply Manually (`@`-mention required) — everything here is either foundational enough to always load, or clearly tied to a file type, so those two modes weren't needed. Worth reconsidering if a future rule doesn't fit either pattern.

## Files

| File | Type | Loads when | Last reviewed | Next review |
| --- | --- | --- | --- | --- |
| `general/core-rules.mdc` | Always | Every session | 2026-10-05 | 2027-04-05 |
| `general/file-structure-and-versioning.mdc` | Always | Every session | 2026-10-05 | 2027-04-05 |
| `general/content-design.mdc` | Specific files | `**/*.html`, `**/*.njk` | 2026-08-19 | 2027-02-19 |
| `general/accessibility.mdc` | Specific files | `**/*.html`, `**/*.njk` | 2026-08-19 | 2027-02-19 |
| `general/code-style-and-templates.mdc` | Specific files | `**/*.html`, `**/*.njk`, `**/*.js` | 2026-10-05 | 2027-04-05 |
| `general/design-system-references.mdc` | Always | Every session | 2026-08-19 | 2027-02-19 |
| `defra/defra-design-and-patterns.mdc` | Always | Every session | 2026-08-19 | 2027-02-19 |
| `defra/defra-content.mdc` | Specific files | `**/*.html`, `**/*.njk` | 2026-08-19 | 2027-02-19 |
| `defra/defra-accessibility.mdc` | Specific files | `**/*.html`, `**/*.njk` | 2026-08-19 | 2027-02-19 |
| `project/dwt-project-context.mdc` | Always | Every session | 2026-10-05 | 2027-04-05 |
| `project/dwt-working-practices.mdc` | Always | Every session | 2026-10-05 | 2027-04-05 |
| `project/dwt-folder-structure.mdc` | Always | Every session | 2026-10-05 | 2027-04-05 |
| `project/dwt-routes.mdc` | Specific files | `app/routes.js` | 2026-10-05 | 2027-04-05 |
| `project/dwt-templates.mdc` | Specific files | `**/*.html`, `**/*.njk` | 2026-10-05 | 2027-04-05 |
| `project/dwt-content.mdc` | Specific files | `**/*.html`, `**/*.njk` | 2026-10-05 | 2027-04-05 |
| `project/dwt-data-handling.mdc` | Specific files | `**/*.html`, `**/*.njk`, `app/routes.js` | 2026-10-05 | 2027-04-05 |
| `project/dwt-quality-checklist.mdc` | Always | Every session | 2026-10-05 | 2027-04-05 |

Review dates live here, not in each file's frontmatter — Cursor's schema only recognises `description`, `globs`, and `alwaysApply`; adding other keys risks the parser rejecting or ignoring the file, so metadata is centralised here instead. Review every 6 months (treat `project/` as needing more frequent ad hoc updates than that — see the notes in those files).

## What's still marked as unresolved

`project/dwt-project-context.mdc` still flags: hosting/preview URL and access; product owner or delivery lead and team contact/Slack channel; who the users are and the problem the service solves (`about-this-service.html` still has placeholder text). Not guessed — worth filling in when known.

Also check: `app/config.json` has `rebrand: false`, and the v2–v4 layouts hard-code the service name rather than reading `serviceName`. The rules record both as they are, and don't say whether they're intended.

## Relationship to the older flat files

`00-index-and-how-to-use.md` and `01/02/03-*.md` in the parent folder are the earlier draft of this same content, organised as 3 broad files rather than 17 focused ones. They're superseded by this folder. They haven't been deleted, in case anything here needs cross-checking against them — safe to remove once this structure is confirmed working in Cursor.
