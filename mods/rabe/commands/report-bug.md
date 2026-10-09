---
description: Report a Rabe bug as a GitHub issue in Sandy3122/claude-mods, after you check the draft
argument-hint: "[what went wrong]"
allowed-tools: Bash(claude --version), Bash(uname -sr), Bash(gh auth status)
---

Help the person report a bug in Rabe, the Claude Code mod, as an issue in the public repository `Sandy3122/claude-mods`.

What they said: $ARGUMENTS

Facts gathered for the report:
- Rabe version: read `version` from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.
- Claude Code version: !`claude --version`
- Operating system: !`uname -sr`

Steps:
1. If what happened, what they expected, or how to reproduce it is unclear, ask for the missing parts in one short message. Ask also for any error lines the /rabe pane showed.
2. Write a draft with a short title that starts with `[rabe] ` and these sections: What happened, What you expected, Steps to reproduce, Rabe version, Claude Code version, Operating system, Error lines.
3. Keep private data out: no home paths, user or project names, prompts, transcript text, tokens or email addresses. Replace them with placeholders such as `<project>`. Include such data only if the person asks for it.
4. Show the full draft and ask: "Create this issue in Sandy3122/claude-mods? It will be public." Do nothing more until they say yes. Apply any changes they ask for and show the draft again.
5. After a yes: if `gh auth status` succeeds:
   - Write the body with your file-writing tool (never with a shell command) to a new file in the system temp folder, for example `/tmp/rabe-issue-<random>.md`.
   - Run `gh issue create --repo Sandy3122/claude-mods --title '<title>' --body-file <that file>`, with the title (including the `[rabe] ` prefix) in single quotes and each `'` in it written as `'\''`. No other part of the draft goes on the command line.
   - Delete the file afterwards.
   Claude Code asks the person to allow this command; that is the second confirmation. Then give them the issue link. Otherwise give them this link to open, with every value URL-encoded: `https://github.com/Sandy3122/claude-mods/issues/new?title=<title>&body=<the draft body>`.
