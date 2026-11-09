import { Plugin } from "@opencode/plugin/tui"
import type { Context } from "@opencode/plugin/tui/context"
import type { Renderable, ScrollBoxRenderable } from "@opentui/core"
import { Show, createEffect, createMemo, createRoot, createSignal } from "solid-js"

const IGNORED_SCROLLBOX_IDS = new Set(["shell-output-scroll"])

type UserRow = {
  readonly id: string
  readonly top: number
  readonly height: number
}

type NavState = {
  readonly topVisible: boolean
  readonly bottomVisible: boolean
  readonly topLabel: string
  readonly bottomLabel: string
  readonly topWidth: number
  readonly bottomWidth: number
  readonly topX: number
  readonly topY: number
  readonly bottomX: number
  readonly bottomY: number
}

function isScrollBox(node: Renderable): node is ScrollBoxRenderable {
  const value = node as unknown as Partial<ScrollBoxRenderable>
  return (
    typeof value.scrollTo === "function" &&
    typeof value.scrollTop === "number" &&
    typeof value.stickyStart === "string" &&
    typeof value.getChildren === "function" &&
    typeof value.viewport === "object" &&
    value.viewport !== null &&
    typeof value.viewport.screenX === "number" &&
    typeof value.viewport.screenY === "number"
  )
}

/**
 * Find the chat transcript scrollbox.
 *
 * The plugin API does not expose a scroll-to-message primitive, so the
 * transcript is located as the largest sticky-bottom scrollbox in the tree.
 * The shell output panel is also sticky-bottom, so it is ignored by id.
 */
function findChatScrollBox(root: Renderable): ScrollBoxRenderable | undefined {
  let best: ScrollBoxRenderable | undefined
  let bestArea = -1
  const seen = new Set<Renderable>()

  const visit = (node: Renderable) => {
    if (seen.has(node) || node.isDestroyed) return
    seen.add(node)

    if (
      isScrollBox(node) &&
      node.stickyStart === "bottom" &&
      !IGNORED_SCROLLBOX_IDS.has(node.id)
    ) {
      const area = Math.max(0, node.viewport.width) * Math.max(0, node.viewport.height)
      if (area > bestArea) {
        best = node
        bestArea = area
      }
    }

    for (const child of node.getChildren()) visit(child)
  }

  visit(root)
  return best
}

/** Screen positions of user-message rows, relative to the transcript viewport. */
function collectUserRows(box: ScrollBoxRenderable, ids: ReadonlySet<string>): UserRow[] {
  const rows = new Map<string, UserRow>()
  const viewportTop = box.viewport.screenY

  const visit = (node: Renderable) => {
    if (node.isDestroyed) return
    const id = node.id
    if (id && ids.has(id) && node.height > 0 && !rows.has(id)) {
      rows.set(id, {
        id,
        top: node.screenY - viewportTop,
        height: node.height,
      })
    }
    for (const child of node.getChildren()) visit(child)
  }

  visit(box)
  return [...rows.values()]
}

function computeNavState(context: Context, sessionID: string | undefined): NavState | undefined {
  if (!sessionID) return
  if (context.keymap.mode.current() === "modal") return
  if (context.ui.panel.current()) return

  const box = findChatScrollBox(context.renderer.root)
  if (!box || box.isDestroyed) return

  const viewport = box.viewport
  if (viewport.width < 12 || viewport.height < 3) return

  const userMessages = context.data.session.message
    .list(sessionID)
    .filter((message) => message.type === "user" && message.text.trim())
  if (userMessages.length === 0) return

  const ids = new Set(userMessages.map((message) => message.id))
  const rows = collectUserRows(box, ids)
  const height = viewport.height
  const indexes = rows
    .map((row) => userMessages.findIndex((message) => message.id === row.id))
    .filter((index) => index >= 0)
  const firstIndex = indexes.length > 0 ? Math.min(...indexes) : undefined
  const lastIndex = indexes.length > 0 ? Math.max(...indexes) : undefined
  const hasEarlier = firstIndex !== undefined && firstIndex > 0
  const hasLater = lastIndex !== undefined && lastIndex < userMessages.length - 1

  // Show each direction when a user message exists outside the visible set.
  // Partially visible messages count as on-screen; the buttons themselves then
  // step relative to the host's current scroll anchor.
  const topVisible =
    rows.some((row) => row.top + row.height <= 0) ||
    hasEarlier ||
    (rows.length === 0 && box.scrollTop > 0)
  const atBottom = box.scrollTop + height >= box.scrollHeight - 1
  const bottomVisible =
    rows.some((row) => row.top >= height) || hasLater || (rows.length === 0 && !atBottom)

  if (!topVisible && !bottomVisible) return

  const compact = viewport.width < 30
  const topLabel = compact ? "↑" : "↑ prev user"
  const bottomLabel = compact ? "↓" : "next user ↓"
  const topWidth = topLabel.length + 2
  const bottomWidth = bottomLabel.length + 2
  const right = viewport.screenX + viewport.width
  const latest = context.renderer.root.findDescendantById("session-jump-to-latest")

  // The row below the transcript owns the host's "Jump to latest" button. Put
  // the bottom button on that row, outside the transcript, and to the left of
  // the host button when it is visible.
  const bottomY = latest?.screenY ?? box.screenY + box.height - 1
  const bottomX =
    latest && latest.height > 0
      ? Math.max(viewport.screenX + 1, latest.screenX - bottomWidth - 2)
      : right - bottomWidth - 2

  return {
    topVisible,
    bottomVisible,
    topLabel,
    bottomLabel,
    topWidth,
    bottomWidth,
    topX: right - topWidth - 2,
    topY: viewport.screenY + 1,
    bottomX,
    bottomY,
  }
}

type AbsoluteButtonProps = {
  readonly context: Context
  readonly revision: () => number
  readonly visible: () => boolean
  readonly label: () => string
  readonly width: () => number
  readonly screenX: () => number
  readonly screenY: () => number
  readonly onPress: () => void
}

function AbsoluteButton(props: AbsoluteButtonProps) {
  const [hovered, setHovered] = createSignal(false)
  const [origin, setOrigin] = createSignal({ x: 0, y: 0 })
  let element: Renderable | undefined

  const syncOrigin = () => {
    const parent = element?.parent
    if (!parent || parent.isDestroyed) return
    const previous = origin()
    if (previous.x !== parent.screenX || previous.y !== parent.screenY) {
      setOrigin({ x: parent.screenX, y: parent.screenY })
    }
  }

  createEffect(() => {
    props.revision()
    props.visible()
    syncOrigin()
  })

  const press = () => {
    if (props.context.renderer.getSelection()?.getSelectedText()) return
    props.onPress()
  }

  const stop = (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event.preventDefault?.()
    event.stopPropagation?.()
  }

  const background = () =>
    hovered()
      ? props.context.theme.background.action.secondary.hovered
      : props.context.theme.background.action.secondary.base
  const foreground = () =>
    hovered()
      ? props.context.theme.text.action.secondary.hovered
      : props.context.theme.text.action.secondary.base

  return (
    <Show when={props.visible()}>
      <box
        ref={(node) => {
          element = node as Renderable
          syncOrigin()
        }}
        position="absolute"
        left={props.screenX() - origin().x}
        top={props.screenY() - origin().y}
        width={props.width()}
        height={1}
        zIndex={50}
        paddingLeft={1}
        backgroundColor={background()}
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
        onMouseDown={stop}
        onMouseUp={(event) => {
          stop(event)
          press()
        }}
      >
        <text fg={foreground()} wrapMode="none" selectable={false}>
          {props.label()}
        </text>
      </box>
    </Show>
  )
}

function createJumpController(context: Context) {
  const [revision, setRevision] = createSignal(0)

  const sessionID = createMemo(() => {
    const route = context.ui.router.current()
    return route.type === "session" ? route.sessionID : undefined
  })

  const nav = createMemo(() => {
    revision()
    return computeNavState(context, sessionID())
  })

  const jump = (target: "previous" | "next") => {
    // Let the host navigate relative to its current scroll anchor. This is what
    // makes the buttons step to the previous/next user message even when the
    // current one is already visible.
    context.keymap.dispatch(
      target === "previous" ? "session.message.user.previous" : "session.message.user.next",
    )
  }

  const sample = () => {
    const route = context.ui.router.current()
    const mode = context.keymap.mode.current()
    const panel = context.ui.panel.current()?.name ?? ""
    const prefix = `${route.type}:${route.type === "session" ? route.sessionID : ""}:${mode}:${panel}`
    const box = findChatScrollBox(context.renderer.root)
    if (!box) return `${prefix}:none`
    const viewport = box.viewport
    const latest = context.renderer.root.findDescendantById("session-jump-to-latest")
    return [
      prefix,
      box.scrollTop,
      box.scrollHeight,
      box.screenX,
      box.screenY,
      viewport.screenX,
      viewport.screenY,
      viewport.width,
      viewport.height,
      latest?.screenX,
      latest?.screenY,
      latest?.height,
    ].join(":")
  }

  let signature = ""
  const tick = () => {
    const next = sample()
    if (next === signature) return
    signature = next
    setRevision((value) => value + 1)
  }

  context.renderer.on("frame", tick)
  const initial = setTimeout(tick, 50)

  const stop = () => {
    context.renderer.off("frame", tick)
    clearTimeout(initial)
  }

  return { revision, nav, jump, stop }
}

export default Plugin.define({
  id: "user-message-jump",
  setup(context) {
    const root = createRoot((dispose) => {
      const controller = createJumpController(context)
      return { ...controller, dispose }
    })

    context.ui.slot({
      append: "app",
      render: () => (
        <>
          <AbsoluteButton
            context={context}
            revision={root.revision}
            visible={() => root.nav()?.topVisible ?? false}
            label={() => root.nav()?.topLabel ?? "↑"}
            width={() => root.nav()?.topWidth ?? 3}
            screenX={() => root.nav()?.topX ?? 0}
            screenY={() => root.nav()?.topY ?? 0}
            onPress={() => root.jump("previous")}
          />
          <AbsoluteButton
            context={context}
            revision={root.revision}
            visible={() => root.nav()?.bottomVisible ?? false}
            label={() => root.nav()?.bottomLabel ?? "↓"}
            width={() => root.nav()?.bottomWidth ?? 3}
            screenX={() => root.nav()?.bottomX ?? 0}
            screenY={() => root.nav()?.bottomY ?? 0}
            onPress={() => root.jump("next")}
          />
        </>
      ),
    })

    return () => {
      root.stop()
      root.dispose()
    }
  },
})
