'use client'
import { WakmenuEngine, type WakmenuSnapshot } from '@stream/wakmenu'
import { loadGame, saveGame } from './db'
export class WakmenuStore {
  readonly engine = new WakmenuEngine(); private snapshot = this.engine.getSnapshot(); private listeners = new Set<() => void>()
  constructor() { this.engine.onChange((snapshot) => { this.snapshot = snapshot; void saveGame(snapshot); for (const listener of this.listeners) listener() }); void loadGame().then((snapshot) => snapshot && this.engine.loadSnapshot(snapshot)) }
  getSnapshot = (): WakmenuSnapshot => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
}
let singleton: WakmenuStore | undefined
export const getWakmenuStore = () => (singleton ??= new WakmenuStore())
