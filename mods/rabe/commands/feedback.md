---
description: Send feedback or an idea for Rabe as a GitHub issue in Sandy3122/claude-mods, after you check the draft
argument-hint: "[your idea or comment]"
allowed-tools: Bash(gh auth status)
---

Help the person send feedback about Rabe, the Claude Code mod, as an issue in the public repository `Sandy3122/claude-mods`.

What they said: $ARGUMENTS

Steps:
1. If the feedback is empty or unclear, ask what they would like and why it would help them, in one short message.
2. Write a draft with a short title that starts with `[rabe] ` and two sections: Your feedback, and Example (a situation where it would have helped, if they gave one).
3. Keep private data out: no home paths, user or project names, prompts, tokens or email addresses, unless the person asks for them.
4. Show the full draft and ask: "Create this issue in Sandy3122/claude-mods? It will be public." Do nothing more until they say yes. Apply any changes they ask for and show the draft again.
5. After a yes: if `gh auth status` succeeds:
   - Write the body with your file-writing tool (never with a shell command) to a new file in the system temp folder, for example `/tmp/rabe-issue-<random>.md`.
   - Run `gh issue create --repo Sandy3122/claude-mods --title '<title>' --body-file <that file>`, with the title (including the `[rabe] ` prefix) in single quotes and each `'` in it written as `'\''`. No other part of the draft goes on the command line.
   - Delete the file afterwards.
   Claude Code asks the person to allow this command; that is the second confirmation. Then give them the issue link. Otherwise give them this link to open, with every value URL-encoded: `https://github.com/Sandy3122/claude-mods/issues/new?title=<title>&body=<the draft body>`.
