import type { TmuxState, Session, Window, Pane, LayoutNode, ParsedCommand, EngineEvent, EngineEventHandler, Direction, PresetLayout } from './types'
import * as Layout from './layout-engine'

const PRESET_LAYOUTS: PresetLayout[] = ['even-horizontal', 'even-vertical', 'main-horizontal', 'main-vertical', 'tiled']

export class TmuxEngine {
  private state: TmuxState
  private listeners: EngineEventHandler[] = []
  private idCounter = 0
  private currentLayoutIndex = 0

  constructor(initialState?: TmuxState) {
    this.state = initialState ?? this.createDefaultState()
  }

  getState(): TmuxState {
    return this.state
  }

  execute(command: ParsedCommand): void {
    const { type, args } = command
    switch (type) {
      case 'new-session': this.createSession(args.name as string | undefined); break
      case 'kill-session': this.killSession(args.target as string); break
      case 'switch-session': this.switchSession(args.target as string); break
      case 'list-sessions': break
      case 'detach': this.detach(); break
      case 'attach': this.attach(args.target as string | undefined); break
      case 'new-window': this.createWindow(args.name as string | undefined); break
      case 'close-window': this.closeWindow(); break
      case 'next-window': this.nextWindow(); break
      case 'previous-window': this.previousWindow(); break
      case 'select-window': this.selectWindow(args.index as number); break
      case 'rename-window': this.renameWindow(args.name as string); break
      case 'split-horizontal': this.splitPane('horizontal'); break
      case 'split-vertical': this.splitPane('vertical'); break
      case 'close-pane':
      case 'exit': this.closePane(); break
      case 'select-pane': this.selectPane(args.direction as Direction); break
      case 'resize-pane': this.resizePane(args.direction as Direction, (args.amount as number) || 5); break
      case 'zoom-pane': this.zoomPane(); break
      case 'swap-pane': this.swapPaneDir(args.direction as 'up' | 'down'); break
      case 'break-pane': this.breakPane(); break
      case 'join-pane': this.joinPane(args.source as string); break
      case 'next-layout': this.nextLayout(); break
      case 'select-layout': this.selectLayout(args.layout as PresetLayout); break
      case 'synchronize-panes': this.synchronizePanes(args.value as boolean); break
      case 'set-option': this.setOption(args.option as string, args.value as string); break
      case 'rename-session': this.renameSession(args.name as string); break
      case 'move-window': this.moveWindow(args.target as string); break
      case 'swap-window':
      case 'link-window':
      case 'set-window-option':
      case 'bind-key':
      case 'unbind-key':
      case 'source-file':
      case 'send-keys':
      case 'enter-copy-mode': this.enterCopyMode(); break
      case 'paste': this.pasteToPane(); break
      case 'copy-selection': this.enterCopyMode(); break
      case 'list-windows':
      case 'list-panes':
        break
    }
    this.emit({ type: 'state-changed' })
    this.emit({ type: 'command-executed', data: command })
  }

  on(handler: EngineEventHandler): () => void {
    this.listeners.push(handler)
    return () => { this.listeners = this.listeners.filter(h => h !== handler) }
  }

  reset(newState?: TmuxState): void {
    this.state = newState ?? this.createDefaultState()
    this.emit({ type: 'state-changed' })
  }

  getActiveSession(): Session | undefined {
    return this.state.sessions.find(s => s.id === this.state.activeSessionId)
  }

  getActiveWindow(): Window | undefined {
    const session = this.getActiveSession()
    if (!session) return undefined
    return session.windows[session.activeWindowIndex]
  }

  getActivePane(): Pane | undefined {
    const win = this.getActiveWindow()
    if (!win) return undefined
    const node = Layout.findPane(win.layoutTree, win.activePaneId)
    return node?.pane ?? undefined
  }

  // ===== Session Operations =====

  private createSession(name?: string): void {
    const id = this.nextId('sess')
    const paneId = this.nextId('pane')
    const winId = this.nextId('win')
    const pane = this.makePane(paneId)
    const win = this.makeWindow(winId, 'bash', { type: 'pane', pane }, paneId)
    const session: Session = { id, name: name || String(this.state.sessions.length), windows: [win], activeWindowIndex: 0 }
    this.state = { ...this.state, sessions: [...this.state.sessions, session], activeSessionId: id, isDetached: false }
    this.emit({ type: 'session-created', data: { sessionId: id } })
  }

  private killSession(name: string): void {
    const target = this.state.sessions.find(s => s.name === name)
    if (!target) return
    const newSessions = this.state.sessions.filter(s => s.id !== target.id)
    if (newSessions.length === 0) {
      this.state = this.createDefaultState()
    } else {
      const activeId = this.state.activeSessionId === target.id ? newSessions[0].id : this.state.activeSessionId
      this.state = { ...this.state, sessions: newSessions, activeSessionId: activeId }
    }
    this.emit({ type: 'session-closed' })
  }

  private switchSession(name: string): void {
    const target = this.state.sessions.find(s => s.name === name)
    if (target) this.state = { ...this.state, activeSessionId: target.id }
  }

  private renameSession(name: string): void {
    const session = this.getActiveSession()
    if (!session) return
    this.updateSession(session.id, { name })
  }

  private detach(): void {
    this.state = { ...this.state, isDetached: true }
    this.emit({ type: 'detached' })
  }

  private attach(name?: string): void {
    if (name) {
      const session = this.state.sessions.find(s => s.name === name)
      if (session) this.state = { ...this.state, activeSessionId: session.id, isDetached: false }
    } else {
      this.state = { ...this.state, isDetached: false }
    }
    this.emit({ type: 'attached' })
  }

  // ===== Window Operations =====

  private createWindow(name?: string): void {
    const session = this.getActiveSession()
    if (!session) return
    const paneId = this.nextId('pane')
    const winId = this.nextId('win')
    const pane = this.makePane(paneId)
    const win = this.makeWindow(winId, name || 'bash', { type: 'pane', pane }, paneId)
    this.updateSession(session.id, {
      windows: [...session.windows, win],
      activeWindowIndex: session.windows.length,
    })
    this.emit({ type: 'window-created' })
  }

  private nextWindow(): void {
    const session = this.getActiveSession()
    if (!session || session.windows.length <= 1) return
    const newIndex = (session.activeWindowIndex + 1) % session.windows.length
    this.updateSession(session.id, { activeWindowIndex: newIndex })
  }

  private previousWindow(): void {
    const session = this.getActiveSession()
    if (!session || session.windows.length <= 1) return
    const newIndex = (session.activeWindowIndex - 1 + session.windows.length) % session.windows.length
    this.updateSession(session.id, { activeWindowIndex: newIndex })
  }

  private selectWindow(index: number): void {
    const session = this.getActiveSession()
    if (!session || index < 0 || index >= session.windows.length) return
    this.updateSession(session.id, { activeWindowIndex: index })
  }

  private renameWindow(name: string): void {
    this.updateActiveWindow({ name })
  }

  private closeWindow(): void {
    const session = this.getActiveSession()
    if (!session) return
    const newWindows = session.windows.filter((_, i) => i !== session.activeWindowIndex)
    if (newWindows.length === 0) {
      const newSessions = this.state.sessions.filter(s => s.id !== session.id)
      if (newSessions.length === 0) {
        this.state = this.createDefaultState()
      } else {
        this.state = { ...this.state, sessions: newSessions, activeSessionId: newSessions[0].id }
      }
      this.emit({ type: 'window-closed' })
      return
    }
    const newIndex = Math.min(session.activeWindowIndex, newWindows.length - 1)
    this.updateSession(session.id, { windows: newWindows, activeWindowIndex: newIndex })
    this.emit({ type: 'window-closed' })
  }

  // ===== Pane Operations =====

  private splitPane(direction: 'horizontal' | 'vertical'): void {
    const win = this.getActiveWindow()
    if (!win) return
    const { tree, newPaneId } = Layout.splitPane(win.layoutTree, win.activePaneId, direction)
    this.updateActiveWindow({ layoutTree: tree, activePaneId: newPaneId })
    this.emit({ type: 'pane-split' })
  }

  private closePane(): void {
    const win = this.getActiveWindow()
    if (!win) return
    const newTree = Layout.closePane(win.layoutTree, win.activePaneId)
    if (!newTree) {
      this.closeWindow()
      return
    }
    const allPanes = Layout.getAllPanes(newTree)
    const newActive = allPanes.length > 0 ? allPanes[0].id : ''
    this.updateActiveWindow({ layoutTree: newTree, activePaneId: newActive })
    this.emit({ type: 'pane-closed' })
  }

  private selectPane(direction: Direction): void {
    const win = this.getActiveWindow()
    if (!win) return
    const adjacent = Layout.getAdjacentPane(win.layoutTree, win.activePaneId, direction)
    if (adjacent) {
      this.updateActiveWindow({ activePaneId: adjacent })
    }
  }

  private zoomPane(): void {
    const win = this.getActiveWindow()
    if (!win) return
    const tree = this.toggleZoomInTree(win.layoutTree, win.activePaneId)
    this.updateActiveWindow({ layoutTree: tree })
  }

  private toggleZoomInTree(node: LayoutNode, paneId: string): LayoutNode {
    if (node.type === 'pane' && node.pane?.id === paneId) {
      return { ...node, pane: { ...node.pane, isZoomed: !node.pane.isZoomed } }
    }
    if (node.children) {
      return {
        ...node,
        children: [
          this.toggleZoomInTree(node.children[0], paneId),
          this.toggleZoomInTree(node.children[1], paneId),
        ],
      }
    }
    return node
  }

  private resizePane(direction: Direction, amount: number): void {
    const win = this.getActiveWindow()
    if (!win) return
    const newTree = Layout.resizePane(win.layoutTree, win.activePaneId, direction, amount)
    this.updateActiveWindow({ layoutTree: newTree })
  }

  private swapPaneDir(direction: 'up' | 'down'): void {
    const win = this.getActiveWindow()
    if (!win) return
    const allPanes = Layout.getAllPanes(win.layoutTree)
    const currentIndex = allPanes.findIndex(p => p.id === win.activePaneId)
    if (currentIndex < 0) return
    let targetIndex: number
    if (direction === 'up') {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : allPanes.length - 1
    } else {
      targetIndex = currentIndex < allPanes.length - 1 ? currentIndex + 1 : 0
    }
    const newTree = Layout.swapPanes(win.layoutTree, allPanes[currentIndex].id, allPanes[targetIndex].id)
    this.updateActiveWindow({ layoutTree: newTree })
  }

  private breakPane(): void {
    const session = this.getActiveSession()
    const win = this.getActiveWindow()
    if (!session || !win) return
    const pane = this.getActivePane()
    if (!pane) return
    if (Layout.countPanes(win.layoutTree) <= 1) return

    const newTree = Layout.closePane(win.layoutTree, pane.id)
    if (!newTree) return
    const remaining = Layout.getAllPanes(newTree)

    const newWinId = this.nextId('win')
    const newWin = this.makeWindow(newWinId, 'bash', { type: 'pane', pane: { ...pane, isZoomed: false } }, pane.id)

    const updatedWindows = session.windows.map((w, i) => {
      if (i === session.activeWindowIndex) {
        return { ...w, layoutTree: newTree, activePaneId: remaining[0]?.id || '' }
      }
      return w
    })
    updatedWindows.push(newWin)

    this.updateSession(session.id, {
      windows: updatedWindows,
      activeWindowIndex: updatedWindows.length - 1,
    })
  }

  private joinPane(source: string): void {
    const session = this.getActiveSession()
    if (!session) return
    const sourceMatch = source.match(/:?(\d+)/)
    if (!sourceMatch) return
    const sourceIdx = parseInt(sourceMatch[1])
    if (sourceIdx < 0 || sourceIdx >= session.windows.length) return
    if (sourceIdx === session.activeWindowIndex) return

    const sourceWin = session.windows[sourceIdx]
    const sourcePanes = Layout.getAllPanes(sourceWin.layoutTree)
    if (sourcePanes.length === 0) return

    const win = this.getActiveWindow()
    if (!win) return

    const firstPane = sourcePanes[0]
    const { tree: newTree } = Layout.splitPane(win.layoutTree, win.activePaneId, 'horizontal')
    const allNew = Layout.getAllPanes(newTree)
    const addedPane = allNew.find(p => !Layout.findPane(win.layoutTree, p.id))

    let resultTree = newTree
    if (addedPane) {
      resultTree = this.replacePaneInTree(newTree, addedPane.id, firstPane)
    }

    const newWindows = session.windows.filter((_, i) => i !== sourceIdx).map((w, i) => {
      if (w.id === win.id) return { ...w, layoutTree: resultTree }
      return w
    })

    const newActiveIdx = Math.min(session.activeWindowIndex, newWindows.length - 1)
    this.updateSession(session.id, { windows: newWindows, activeWindowIndex: newActiveIdx })
  }

  private replacePaneInTree(tree: LayoutNode, targetId: string, newPane: Pane): LayoutNode {
    if (tree.type === 'pane' && tree.pane?.id === targetId) {
      return { ...tree, pane: { ...newPane } }
    }
    if (tree.children) {
      return {
        ...tree,
        children: [
          this.replacePaneInTree(tree.children[0], targetId, newPane),
          this.replacePaneInTree(tree.children[1], targetId, newPane),
        ],
      }
    }
    return tree
  }

  // ===== Layout =====

  private nextLayout(): void {
    const win = this.getActiveWindow()
    if (!win) return
    const allPanes = Layout.getAllPanes(win.layoutTree)
    if (allPanes.length <= 1) return
    this.currentLayoutIndex = (this.currentLayoutIndex + 1) % PRESET_LAYOUTS.length
    const newTree = Layout.applyPresetLayout(allPanes.map(p => p.id), PRESET_LAYOUTS[this.currentLayoutIndex])
    this.updateActiveWindow({ layoutTree: this.restorePaneData(newTree, allPanes) })
  }

  private selectLayout(layout: PresetLayout): void {
    const win = this.getActiveWindow()
    if (!win) return
    const allPanes = Layout.getAllPanes(win.layoutTree)
    if (allPanes.length <= 1) return
    const newTree = Layout.applyPresetLayout(allPanes.map(p => p.id), layout)
    this.updateActiveWindow({ layoutTree: this.restorePaneData(newTree, allPanes) })
  }

  private restorePaneData(tree: LayoutNode, originalPanes: Pane[]): LayoutNode {
    if (tree.type === 'pane' && tree.pane) {
      const orig = originalPanes.find(p => p.id === tree.pane!.id)
      if (orig) return { ...tree, pane: { ...orig } }
    }
    if (tree.children) {
      return {
        ...tree,
        children: [
          this.restorePaneData(tree.children[0], originalPanes),
          this.restorePaneData(tree.children[1], originalPanes),
        ],
      }
    }
    return tree
  }

  // ===== Advanced =====

  private synchronizePanes(on: boolean): void {
    this.updateActiveWindow({ synchronizePanes: on })
  }

  private moveWindow(targetSessionName: string): void {
    const sourceSession = this.getActiveSession()
    if (!sourceSession) return
    const targetSession = this.state.sessions.find(s => s.name === targetSessionName)
    if (!targetSession || targetSession.id === sourceSession.id) return

    const win = sourceSession.windows[sourceSession.activeWindowIndex]
    const isLastWindow = sourceSession.windows.length === 1

    if (isLastWindow) {
      // Move window and remove empty source session, switch to target
      this.state = {
        ...this.state,
        activeSessionId: targetSession.id,
        sessions: [
          ...this.state.sessions.filter(s => s.id !== sourceSession.id).map(s => {
            if (s.id === targetSession.id) {
              return { ...s, windows: [...s.windows, win] }
            }
            return s
          }),
        ],
      }
    } else {
      const newSourceWindows = sourceSession.windows.filter((_, i) => i !== sourceSession.activeWindowIndex)
      const newActiveIndex = Math.min(sourceSession.activeWindowIndex, newSourceWindows.length - 1)
      this.state = {
        ...this.state,
        sessions: this.state.sessions.map(s => {
          if (s.id === sourceSession.id) {
            return { ...s, windows: newSourceWindows, activeWindowIndex: newActiveIndex }
          }
          if (s.id === targetSession.id) {
            return { ...s, windows: [...s.windows, win] }
          }
          return s
        }),
      }
    }
  }

  private enterCopyMode(): void {
    const win = this.getActiveWindow()
    if (!win) return
    const pane = Layout.getAllPanes(win.layoutTree).find(p => p.id === win.activePaneId)
    if (pane && pane.content.length > 0) {
      this.state = { ...this.state, clipboard: pane.content[0] }
    }
  }

  private pasteToPane(): void {
    if (!this.state.clipboard) return
    const win = this.getActiveWindow()
    if (!win) return
    const newTree = this.updatePaneInTree(win.layoutTree, win.activePaneId, (pane) => ({
      ...pane,
      content: [...pane.content, this.state.clipboard],
    }))
    this.updateActiveWindow({ layoutTree: newTree })
  }

  private updatePaneInTree(node: LayoutNode, paneId: string, updater: (pane: Pane) => Pane): LayoutNode {
    if (node.type === 'pane' && node.pane?.id === paneId) {
      return { ...node, pane: updater(node.pane) }
    }
    if (node.children) {
      return {
        ...node,
        children: [
          this.updatePaneInTree(node.children[0], paneId, updater),
          this.updatePaneInTree(node.children[1], paneId, updater),
        ],
      }
    }
    return node
  }

  private setOption(option: string, value: string): void {
    if (option === 'prefix') {
      // handled by keybinding-handler, not engine state
    }
    if (option === 'mouse') {
      // UI-level setting
    }
  }

  // ===== Helpers =====

  private createDefaultState(): TmuxState {
    const paneId = this.nextId('pane')
    const pane = this.makePane(paneId)
    const winId = this.nextId('win')
    const win = this.makeWindow(winId, 'bash', { type: 'pane', pane }, paneId)
    const sessId = this.nextId('sess')
    const session: Session = { id: sessId, name: '0', windows: [win], activeWindowIndex: 0 }
    return { sessions: [session], activeSessionId: sessId, clipboard: '', isDetached: false }
  }

  private makePane(id: string): Pane {
    return { id, content: [], cursorPosition: { row: 0, col: 0 }, isZoomed: false, cwd: '~' }
  }

  private makeWindow(id: string, name: string, layoutTree: LayoutNode, activePaneId: string): Window {
    return { id, name, layoutTree, activePaneId, synchronizePanes: false }
  }

  private nextId(prefix: string): string {
    return `${prefix}-${++this.idCounter}`
  }

  private emit(event: EngineEvent): void {
    for (const handler of this.listeners) {
      handler(event)
    }
  }

  private updateSession(sessionId: string, updates: Partial<Session>): void {
    this.state = {
      ...this.state,
      sessions: this.state.sessions.map(s =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    }
  }

  private updateActiveWindow(updates: Partial<Window>): void {
    const session = this.getActiveSession()
    if (!session) return
    const newWindows = [...session.windows]
    newWindows[session.activeWindowIndex] = { ...newWindows[session.activeWindowIndex], ...updates }
    this.updateSession(session.id, { windows: newWindows })
  }
}
