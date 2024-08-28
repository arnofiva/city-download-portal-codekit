import GraphicsLayer from "../graphics-layer";
import { ComponentProps, PropsWithChildren } from "react";
import Sketch from "./sketch";

interface SketchLayerProps extends ComponentProps<typeof Sketch>, ComponentProps<typeof GraphicsLayer> { }
export function SketchLayer({ ref, elevationMode, children, disableZ }: PropsWithChildren<SketchLayerProps>) {
  return (
    <GraphicsLayer elevationMode={elevationMode}>
      <Sketch ref={ref} disableZ={disableZ}>
        {children}
      </Sketch>
    </GraphicsLayer>
  )
}