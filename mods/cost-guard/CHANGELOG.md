# Changelog

All notable changes to cost-guard are listed here. Versions follow [semantic versioning](https://semver.org).

## 0.1.2 (2026-10-09)

- Removed the mod's own .gitignore; the repository's covers it. No behaviour change.

## 0.1.1 (2026-10-09)

- Standardized: README, ARCHITECTURE, manifest metadata. No behaviour change.

## 0.1.0 (2026-10-09)

First public release.

- Cost meter above the prompt: this chat, last reply, today, context size and plan usage.
- Status line entry with the chat's cost and context size.
- Yellow and red levels for long or expensive chats, with a Handoff button and an optional hold-once.
- Warnings for long pastes, attached documents, many images and large `@`-mentioned files.
- PDF, Word, PowerPoint, Excel, OpenDocument, RTF and EPUB files converted to markdown before Claude reads them.
- `/spend` report for the chat, today and the last 7 days.
- Optional local currency figure.
