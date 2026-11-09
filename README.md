# opencode-tools

A collection of plugins and tools for [OpenCode](https://opencode.ai).

## Plugins

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
