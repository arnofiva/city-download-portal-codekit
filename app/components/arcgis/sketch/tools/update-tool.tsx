import Accessor from "@arcgis/core/core/Accessor";
import { subclass, property } from "@arcgis/core/core/accessorSupport/decorators";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Evented from "@arcgis/core/core/Evented";
import { SketchToolManager } from "./create-tool";

export type ShapeEvent = "start" | "active" | "complete" | "cancel"

@subclass()
export class UpdateTool extends Accessor implements Evented {
  readonly id = crypto.randomUUID();
  #listeners = new Map<ShapeEvent, Set<(event: __esri.SketchViewModelUpdateEvent) => void>>();

  protected readonly type!: "move" | "transform" | "reshape";
  protected readonly overwrittenEvents: ShapeEvent[] = []

  @property()
  manager?: SketchToolManager;

  @property()
  get state() {
    if (this.manager?.state == null || this.manager?.state === 'disabled') return 'disabled';
    if (this.manager.activeToolId === this.id) return 'active';
    return this.manager == null ? 'disabled' : 'ready';
  }
  initialize() {
    this.addHandles([
      reactiveUtils.watch(() => this.manager, (vm) => {
        vm?.on('update', (event) => {
          if (vm.activeToolId === this.id) {
            if (!this.overwrittenEvents.includes(event.state) && event.tool === this.type) {
              if (event.state === 'complete' && event.aborted) this.emit("cancel", event);
              else this.emit(event.state, event);
            }
            if (event.state === 'complete')
              vm.activeToolId = null;
          }
        })
      })
    ])
  }

  emit(type: ShapeEvent, event: __esri.SketchViewModelUpdateEvent): boolean {
    if (!this.hasEventListener(type)) return false;
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event);
    }

    return true;
  }

  hasEventListener(type: ShapeEvent): boolean {
    return this.#listeners.has(type);
  }

  on(type: ShapeEvent | ShapeEvent[], listener: (event: __esri.SketchViewModelUpdateEvent) => void): IHandle {
    if (Array.isArray(type)) {
      const handles = type.map(t => this.#on(t, listener))

      return {
        remove: () => {
          for (const handle of handles) handle.remove()
        }
      }
    }
    else return this.#on(type, listener);
  }

  #on(type: ShapeEvent, listener: __esri.EventHandler): IHandle {
    const listeners = this.#listeners.get(type) ?? new Set();
    listeners.add(listener);

    if (!this.hasEventListener(type)) this.#listeners.set(type, listeners)

    return {
      remove: () => {
        listeners.delete(listener);
        if (listeners.size === 0) this.#listeners.delete(type)
      }
    }
  }
}