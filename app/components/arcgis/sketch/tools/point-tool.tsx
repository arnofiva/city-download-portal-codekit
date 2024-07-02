import { Point } from "@arcgis/core/geometry";
import { useSketch } from "../sketch";
import { PropsWithChildren, useEffect } from "react";
import { useEffectWhen } from "~/hooks/reactive";

interface PointToolProps {
  onStart?: (point: Point) => void;
  onActive?: (point: Point) => void;
  onComplete?: (point: Point) => void;
  onCancel?: (point: Point) => void;
}

export default function PointTool({
  children,
  onStart,
  onActive,
  onComplete,
  onCancel,
}: PropsWithChildren<PointToolProps>) {
  const sketch = useSketch();

  useEffectWhen(
    () => sketch?.createGraphic?.geometry,
    (geometry, old) => {
      if (geometry.type === 'point') {
        if (old == null) {
          onStart?.(geometry as Point);
        } else {
          onActive?.(geometry as Point)
        }
      }
    }
  );

  useEffect(() => {
    const handle = sketch.on('create', (event) => {
      if (event.state === 'complete' && event.graphic?.geometry?.type === 'point') {
        onComplete?.(event.graphic.geometry as Point)
      }

      if (event.state === 'cancel' && event.graphic?.geometry?.type === 'point') {
        onCancel?.(event.graphic.geometry as Point)
      }
    });

    return handle.remove
  });

  return children;
}