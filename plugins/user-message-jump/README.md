# User message jump

A TUI plugin that adds two floating buttons to the session transcript:

- **↑ prev user** at the top-right of the chat when a previous user message is
  above the viewport.
- **next user ↓** at the bottom-right of the chat when a following user message
  is below the viewport. It sits next to the built-in **Jump to latest** row.

The buttons follow the host's current scroll anchor. If the message at the
anchor is already visible, **prev** steps to the previous user message (so when
the last message is in view, it goes to the previous-last message) and **next**
steps to the following user message.

Clicking a button uses the built-in
`session.message.user.previous` / `session.message.user.next` navigation.

## Loading

The repository-level `opencode.json` loads the plugin for this project:

```jsonc
{
  "plugins": ["./plugins/user-message-jump"]
}
```

To load it for every project, add the absolute path to the global config at
`~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/home/snow/oc_tools/plugins/user-message-jump"]
}
```

The package has a no-op server part so project-scoped and global config entries
are loaded by the server, and its TUI part is then loaded by the TUI. To use it
on another machine, copy this directory and update the global path.

## Notes

- The plugin locates the transcript scrollbox and message rows at runtime. If
  the host layout changes, it stops rendering the buttons rather than throwing.
- Narrow terminals use the compact labels `↑` and `↓`.
- Buttons are hidden while a dialog or a plugin panel is open.
