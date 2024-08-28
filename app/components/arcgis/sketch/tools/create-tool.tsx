import Accessor from "@arcgis/core/core/Accessor";
import { subclass, property } from "@arcgis/core/core/accessorSupport/decorators";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import Evented from "@arcgis/core/core/Evented";
import { Symbol } from "@arcgis/core/symbols";

export type ToolEvent = "start" | "active" | "complete" | "cancel"

@subclass()
export class SketchToolManager extends SketchViewModel {
  @property()
  activeToolId: string | null = null;
}

@subclass()
export class CreateTool extends Accessor implements Evented {
  readonly id = crypto.randomUUID();
  #listeners = new Map<ToolEvent, Set<(event: __esri.SketchViewModelCreateEvent) => void>>();

  protected readonly overwrittenEvents: ToolEvent[] = []

  @property()
  manager?: SketchToolManager;

  @property()
  // eslint-disable-next-line @typescript-eslint/ban-types
  createSymbol?: Symbol;

  @property()
  get state() {
    if (this.manager?.state == null || this.manager?.state === 'disabled') return 'disabled';
    if (this.manager.activeToolId === this.id) return 'active';
    return this.manager == null ? 'disabled' : 'ready';
  }

  initialize() {
    this.addHandles([
      reactiveUtils.watch(() => this.manager, (vm) => {
        vm?.on("create", (event) => {
          if (vm.activeToolId === this.id) {
            if (!this.overwrittenEvents.includes(event.state)) {
              this.emit(event.state, event);

              if (event.state === 'complete' || event.state === 'cancel')
                vm.activeToolId = null;
            }
          }
        })
      })
    ])
  }

  emit(type: ToolEvent, event: __esri.SketchViewModelCreateEvent): boolean {
    if (!this.hasEventListener(type)) return false;
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event);
    }

    return true;
  }

  hasEventListener(type: ToolEvent): boolean {
    return this.#listeners.has(type);
  }

  on(type: ToolEvent | ToolEvent[], listener: (event: __esri.SketchViewModelCreateEvent) => void): IHandle {
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

  #on(type: ToolEvent, listener: __esri.EventHandler): IHandle {
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