# Blast Radius

Blast Radius holds risky Bash commands and shows what they would change, so you can cancel or proceed before anything runs.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Safety

## What it does

- Catches three kinds of Bash command: recursive `rm`, a force `git push`, and database migration commands (Prisma, Supabase, Drizzle, Knex, Sequelize, Rails, Alembic, TypeORM).
- Holds the command and shows a preview: how many files a delete would remove and their size, which remote commits a force push would lose, or which uncommitted files touch the schema.
- Gives you **Cancel** and **Proceed** buttons. Cancel tells Claude the command was refused and what it would have done.
- Cancels on its own if nobody answers in time, so an unattended session never stalls.
- Refuses the command at once in a session with no screen, such as `claude -p`.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install blast-radius@sandeep-mods
```

## Use

Nothing to start. When Claude tries a matching Bash command, a pane titled **Blast Radius** opens with the command, a one-line summary and a list of affected files or commits. If the window is too narrow for a pane, the same panel appears above the prompt.

- Press **c** or select **Cancel** to refuse the command. This is the default button.
- Press **y** or select **Proceed** to run it exactly as written.
- A countdown shows the time left. When it reaches zero the command is cancelled.

Only one command is held at a time. A second one waits until you answer the first.

What it matches:
- `rm` with a recursive flag (`-r`, `-R`, `-rf`, `--recursive`), also after `sudo`.
- `git push` with `-f`, `--force`, `--force-with-lease` or a `+` refspec.
- `prisma migrate` or `db push`, `supabase db reset` or `push`, `drizzle-kit push` or `migrate`, `knex migrate`, `sequelize db:migrate`, `rails db:migrate`, `db:reset` or `db:drop`, `alembic upgrade` or `downgrade`, and `typeorm migration:run`.

Compound commands joined by `&&`, `||`, `;` or a new line are checked part by part. A `cd` earlier in the line sets the folder used for the preview.

If a path uses a shell variable, command substitution or a quoted `~`, the preview cannot resolve it. It says so and asks you to check by hand. `~` and `$HOME` are expanded when the command has no quotes.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `timeoutSeconds` | `60` | Seconds a held command waits before it is cancelled; `0` waits forever |

Change it in `/plugin` → **Installed** → **blast-radius** → **Configure options**, or run `claude plugin configure blast-radius@sandeep-mods`.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- `bash`, `find`, `du` and `sleep` on your path for the delete preview and the wait loop, so macOS or Linux (or Windows with a bash shell).
- `git` for the force push and migration previews.

## What it can access

- **Hooks:** Claude's Bash tool calls, and the drawing of the Blast Radius pane and the band above the prompt.
- **Gating:** it can cancel a matching Bash command. It never approves a command by itself; **Proceed** only lets the call carry on to Claude Code's normal permission check.
- **Runs programs:** to build the preview it runs `bash -c` with `du` and `find` on the paths being deleted (read-only), `git log` and `git status` in the command's folder, and `sleep` while it waits. It does not run the risky command itself.
- **Reads:** your `HOME` environment variable, and file names and sizes under the paths named in a delete command.
- **Writes files:** none.
- **Network and models:** none. It makes no network requests and calls no model, so it costs no tokens. Force push figures are as of your last `git fetch`.

## Troubleshooting

- **Nothing is held.** The command must match one of the forms above. A script that deletes files inside another program, or `rm` run through another wrapper, is not caught.
- **"Can't preview: a path uses a shell variable."** The preview cannot see what `$VAR` or `` `...` `` expands to. Check the path yourself before you press Proceed.
- **The command was cancelled and I did not press anything.** The timeout ran out. Raise `timeoutSeconds`, or set it to `0` to wait forever.
- **The command was refused in a headless run.** With no screen nobody can answer, so Blast Radius cancels. Run the command yourself.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by hamzafer, MIT.
