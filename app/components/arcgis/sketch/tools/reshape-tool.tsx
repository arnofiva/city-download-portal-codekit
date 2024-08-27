import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import { UpdateTool } from "./update-tool";
import { useSketch } from "../sketch";
import { forwardRef, ReactNode, useEffect } from "react";
import useInstance from "~/hooks/useInstance";
import Graphic from "@arcgis/core/Graphic";
import useProvideRef from "~/hooks/useProvideRef";

interface ReshapeToolProps {
  onStart?: (graphics: Graphic[]) => void;
  onActive?: (graphics: Graphic[]) => void;
  onComplete?: (graphics: Graphic[]) => void;
  onCancel?: (graphics: Graphic[]) => void;
  children: ({ start }: {
    start: (graphics: Graphic[]) => void
    complete: () => void
    cancel: () => void
  }) => ReactNode;
}

export const ReshapeTool = forwardRef<ReshapeToolManager, ReshapeToolProps>(function ReshapeTool({
  onStart,
  onActive,
  onComplete,
  onCancel,
  children
}: ReshapeToolProps, ref) {
  const sketch = useSketch();
  const manager = useInstance(() => new ReshapeToolManager())

  useEffect(() => {
    manager.manager = sketch;
  }, [sketch, manager]);

  useEffect(() => {
    return manager.on(["start", "active", "complete", "cancel"], (event) => {
      switch (event.state) {
        case 'start': return onStart?.(event.graphics)
        case 'active': return onActive?.(event.graphics)
        case 'complete': return onComplete?.(event.graphics)
        case 'cancel': return onCancel?.(event.graphics)
      }
    }).remove
  }, [onActive, onCancel, onComplete, onStart, manager])

  useProvideRef(manager, ref);

  return children({
    start: (graphics: Graphic[]) => manager.start(graphics),
    complete: () => manager.complete(),
    cancel: () => manager.cancel()
  });
})

@subclass()
class ReshapeToolManager extends UpdateTool {
  protected readonly type = 'reshape';

  start = (graphics: Graphic[]) => {
    if (this.manager?.activeToolId == null) {
      this.manager!.defaultUpdateOptions = {
        enableRotation: false,
        enableScaling: false,
        enableZ: false,
        multipleSelectionEnabled: false,
        toggleToolOnClick: false,
        tool: 'reshape',
        reshapeOptions: {
          edgeOperation: 'offset',
          shapeOperation: 'none',
          vertexOperation: 'move'
        },
      }
      this.manager!.activeToolId = this.id;
      this.manager!.update(graphics)
    }
  }

  complete = () => {
    if (this.manager?.activeToolId === this.id) {
      this.manager!.complete()
    }
  }

  cancel = () => {
    if (this.manager?.activeToolId === this.id) {
      this.manager!.cancel()
    }
  }
}