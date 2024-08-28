import { Point } from "@arcgis/core/geometry";
import { useSketch } from "../sketch";
import { ReactNode, useEffect } from "react";
import { property, subclass } from "@arcgis/core/core/accessorSupport/decorators";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import useInstance from "~/hooks/useInstance";
import { CreateTool, ToolEvent } from "./create-tool";
import { PointSymbol3D } from "@arcgis/core/symbols";
import { useAccessorValue } from "~/hooks/reactive";

interface PointToolProps {
  onStart?: (point: Point) => void;
  onActive?: (point: Point) => void;
  onComplete?: (point: Point) => void;
  onCancel?: (point: Point) => void;
  createSymbol?: PointSymbol3D;
  children: ({ start }: { start: () => void, cancel: () => void, state: CreatePointToolManager['state'] }) => ReactNode;
}

export default function CreatePointTool({
  children,
  createSymbol,
  onStart,
  onActive,
  onComplete,
  onCancel,
}: PointToolProps) {
  const t = useInstance(() => new CreatePointToolManager());
  const sketch = useSketch();

  useEffect(() => {
    t.manager = sketch;
  }, [t, sketch])

  useEffect(() => {
    return t.on(["start", "active", "complete", "cancel"], (event) => {
      switch (event.state) {
        case 'start': return onStart?.(event.graphic.geometry as Point)
        case 'active': return onActive?.(event.graphic.geometry as Point)
        case 'complete': return onComplete?.(event.graphic.geometry as Point)
        case 'cancel': return onCancel?.(event.graphic?.geometry as Point)
      }
    }).remove
  }, [onActive, onCancel, onComplete, onStart, t])

  useEffect(() => {
    t.createSymbol = createSymbol
  }, [createSymbol, t])

  const state = useAccessorValue(() => t.state) ?? 'disabled';

  return children({
    start: () => t.start(),
    cancel: () => t.cancel(),
    state
  });
}

@subclass()
class CreatePointToolManager extends CreateTool {
  protected readonly overwrittenEvents: ToolEvent[] = ['start', 'active']

  @property()
  createSymbol?: PointSymbol3D;

  initialize() {
    this.addHandles([
      reactiveUtils.watch(() => this.manager?.createGraphic?.geometry,
        (geometry, previous) => {
          if (this.manager?.activeToolId !== this.id) return;

          if (geometry != null && previous == null)
            this.emit(
              "start",
              { tool: "point", state: 'start', graphic: this.manager!.createGraphic!, toolEventInfo: null!, type: 'create' }
            )
          if (geometry != null && previous != null)
            this.emit(
              "active",
              { tool: "point", state: 'active', graphic: this.manager!.createGraphic!, toolEventInfo: null!, type: 'create' }
            )
        }),
    ])
  }

  start = (options?: __esri.SketchViewModelCreateCreateOptions) => {
    if (this.state === 'ready') {
      this.manager!.pointSymbol = this.createSymbol!;
      this.manager!.activeToolId = this.id;
      this.manager!.create("point", options)
    }
  }

  cancel = () => {
    if (this.state === 'active') {
      if (this.manager?.state === 'ready') {
        this.manager!.activeToolId = null!;
        this.emit(
          "cancel",
          { tool: "point", state: 'cancel', graphic: this.manager?.createGraphic, toolEventInfo: null!, type: 'create' }
        )
      }
      this.manager!.pointSymbol = null!;
      this.manager!.cancel()
    }
  }
}
