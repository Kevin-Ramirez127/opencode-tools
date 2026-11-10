# opencode-tools

A collection of plugins and tools for [OpenCode](https://opencode.ai).

## Plugins

### [opencode-telegram](https://github.com/Kevin-Ramirez127/opencode-telegram)

Controls the `opencode-telegram` notification daemon from inside OpenCode.

- `/telegram` (or the palette command **OpenCode Telegram notifications**)
  opens a settings picker.
- Turn notifications on/off (off by default) and choose which events are
  delivered: session finished/failed/interrupted, questions, permissions, and
  retries.
- Security switches for **custom question answers** and **new messages**, both
  off by default.

The plugin is maintained in its own repository. Use
[https://github.com/Kevin-Ramirez127/opencode-telegram](https://github.com/Kevin-Ramirez127/opencode-telegram)
for installation and configuration.

### [user-message-jump](plugins/user-message-jump)

Adds floating navigation buttons to the session transcript:

- **↑ prev user** — step back to the previous user message.
- **next user ↓** — step forward to the next user message.

The buttons follow OpenCode's current scroll anchor, so if the current user
message is already visible, they move one message past it instead of re-focusing
the same message. See the [plugin README](plugins/user-message-jump/README.md)
for details.

## Loading

Load a plugin in a project's `opencode.json` or `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./plugins/user-message-jump"]
}
```

Or load it globally from `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-tools/plugins/user-message-jump"]
}
```

Use `/reload` in the TUI after changing plugin configuration.

## Development

Plugins under `plugins/<name>/` follow the OpenCode plugin package layout. A
plugin can expose a `./tui` part, a server part, or both. OpenCode resolves
`@opencode/plugin`, `@opentui/core`, and `solid-js` at runtime, so local plugin
development does not require installing those packages into the repository.

## License

MIT. See [LICENSE](LICENSE).
