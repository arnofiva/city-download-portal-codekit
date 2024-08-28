import { subclass, property } from "@arcgis/core/core/accessorSupport/decorators";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import { Point, Polygon } from "@arcgis/core/geometry";
import CoreGraphic from "@arcgis/core/Graphic";
import { CreateTool, ToolEvent } from "./create-tool";
import { ReactNode, useEffect } from "react";
import useInstance from "~/hooks/useInstance";
import { useSketch } from "../sketch";
import { useAccessorValue } from "~/hooks/reactive";

interface ExtentToolProps {
  onStart?: (point?: Polygon) => void;
  onActive?: (point?: Polygon) => void;
  onComplete?: (point: Polygon) => void;
  onCancel?: (point?: Polygon) => void;
  children: ({ start }: { start: () => void; cancel: () => void, state: CreateExtentToolManager['state'] }) => ReactNode;
}

export default function CreateExtentTool({
  children,
  onStart,
  onActive,
  onComplete,
  onCancel,
}: ExtentToolProps) {
  const sketch = useSketch();
  const manager = useInstance(() => new CreateExtentToolManager());

  useEffect(() => {
    manager.manager = sketch;
  }, [manager, sketch]);

  useEffect(() => {
    return manager.on(["start", "active", "complete", "cancel"], (event) => {
      switch (event.state) {
        case 'start': return onStart?.(event.graphic.geometry as Polygon)
        case 'active': return onActive?.(event.graphic.geometry as Polygon)
        case 'complete': return onComplete?.(event.graphic.geometry as Polygon)
        case 'cancel': return onCancel?.(event.graphic.geometry as Polygon)
      }
    }).remove
  }, [onActive, onCancel, onComplete, onStart, manager])

  const state = useAccessorValue(() => manager.state) ?? 'disabled'

  return (
    children({
      start: () => manager.start(),
      cancel: () => manager.cancel(),
      state
    })
  );
}

@subclass()
class CreateExtentToolManager extends CreateTool {
  protected readonly overwrittenEvents: ToolEvent[] = ['start', 'active', 'complete', 'cancel']

  @property()
  private creationState: 'not-started' | 'placing-origin' | 'placing-terminal' = 'not-started';

  @property()
  private origin: Point | null = null

  @property()
  private terminal: Point | null = null

  @property()
  private graphic: CoreGraphic | null = null;

  @property()
  get geometry() {
    return this.graphic?.geometry as Polygon | null
  }

  initialize(): void {
    this.addHandles([
      reactiveUtils.watch(() => {
        if (this.origin == null || this.terminal == null) return null;

        const { x: ox, y: oy } = this.origin;
        const { x: tx, y: ty } = this.terminal;

        const polygon = new Polygon({
          rings: [[
            [ox, oy],
            [ox, ty],
            [tx, ty],
            [tx, oy],
            [ox, oy]
          ]],
          spatialReference: this.origin.spatialReference
        })

        return polygon;
      }, (polygon) => {
        this.graphic!.geometry = polygon!;
      }, { sync: true }),
      reactiveUtils.watch(() => this.manager?.createGraphic?.geometry as Point | null,
        (geometry: Point | null, previous: Point | null) => {
          if (this.manager?.activeToolId !== this.id) return;

          if (geometry != null && previous == null) { // here we are starting to place a new point
            if (this.origin == null) {
              this.creationState = 'placing-origin'
              this.origin = geometry;
              this.graphic = new CoreGraphic();
              this.emit(
                "start",
                { tool: "polygon", state: 'start', graphic: this.graphic!, toolEventInfo: null!, type: 'create', }
              )
            } else {
              this.creationState = 'placing-terminal'
              this.terminal = geometry
              this.emit(
                "active",
                { tool: "polygon", state: 'active', graphic: this.graphic!, toolEventInfo: null!, type: 'create' }
              )
            }
          }

          else if (geometry != null && previous != null) { // here we are modifying the position of the point we are placing
            if (this.creationState === 'placing-origin') {
              this.origin = geometry;
              this.emit(
                "active",
                { tool: "polygon", state: 'active', graphic: this.graphic!, toolEventInfo: null!, type: 'create' }
              )
            }
            if (this.creationState === 'placing-terminal') {
              this.terminal = geometry
              this.emit(
                "active",
                { tool: "polygon", state: 'active', graphic: this.graphic!, toolEventInfo: null!, type: 'create' }
              )
            }
          }
        }),
      reactiveUtils.watch(() => this.manager, (vm) => {
        vm?.on("create", (event) => {
          if (vm.activeToolId === this.id) {
            if (event.state === 'complete' && this.creationState === 'placing-origin') vm.create("point")
            else if (event.state === 'complete' && this.creationState === 'placing-terminal') {
              this.emit(
                'complete',
                { tool: "polygon", state: 'complete', graphic: this.graphic!, toolEventInfo: null!, type: 'create' }
              )

              this.origin = null;
              this.terminal = null;
              this.graphic = null;
              this.creationState = 'not-started';
              vm.activeToolId = null
            } else if (event.state === 'cancel') {
              this.emit(
                'cancel',
                { tool: "polygon", state: 'cancel', graphic: this.graphic!, toolEventInfo: null!, type: 'create' }
              )

              this.origin = null;
              this.terminal = null;
              this.graphic = null;
              this.creationState = 'not-started';
              vm.activeToolId = null
            }
          }
        })
      }),
    ])
  }

  start = (options?: __esri.SketchViewModelCreateCreateOptions) => {
    if (this.state === 'ready') {
      this.manager!.activeToolId = this.id;
      this.manager!.create("point", options)
    }
  }

  cancel = () => {
    if (this.state === 'active') {
      this.manager!.cancel()
    }
  }
}
