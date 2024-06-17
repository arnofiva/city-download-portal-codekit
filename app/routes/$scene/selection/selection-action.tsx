import { CalciteAction } from "@esri/calcite-components-react";
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';
import { useView } from "../view/view-context";
import { useEffect, useState } from "react";
import { useGraphicsLayer } from "components/arcgis/graphics-layer";
import { useSelectionActorRef, useSelectionStateSelector } from "./selection-context";
import Point from "@arcgis/core/geometry/Point";
import { watch } from "@arcgis/core/core/reactiveUtils";
import { Polygon } from "@arcgis/core/geometry";

export function SelectionAction() {
  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);
  const selectionActor = useSelectionActorRef();
  const hasSelected = useSelectionStateSelector(state => state.matches('selected'));

  const view = useView();
  const graphics = useGraphicsLayer();

  const [sketch] = useState(() => new SketchViewModel({
    defaultUpdateOptions: {
      enableRotation: false,
      enableScaling: false,
      enableZ: false,
      multipleSelectionEnabled: false,
      toggleToolOnClick: false,
      tool: 'reshape',
      reshapeOptions: {
        edgeOperation: 'offset',
        shapeOperation: 'none',
        vertexOperation: 'move-xy'
      }
    }
  }));

  useEffect(() => {
    if (sketch.view !== view) sketch.view = view;
  }, [sketch, view]);

  useEffect(() => {
    if (sketch.layer !== graphics) sketch.layer = graphics
  }, [graphics, sketch]);

  useEffect(() => {
    selectionActor.send({ type: 'addView', view });
  });

  useEffect(() => {
    if (!hasSelected) {
      const handle = sketch.on("create", (event) => {
        if (event.graphic.geometry.type !== 'point') return;

        if (event.state === "start") {
          selectionActor.send({ type: 'create.start', point: event.graphic.geometry as Point });
        }

        if (event.state === "complete") {
          selectionActor.send({ type: 'create.commit', point: event.graphic.geometry as Point });
        }

        if (event.state === "cancel") {
          selectionActor.send({ type: 'create.cancel' })
        }
      });

      const createGraphicHandle = watch(() => sketch.createGraphic?.geometry as Point | null, (point) => {
        if (point) {
          selectionActor.send({ type: 'create.update', point: point })
        }
      });

      return () => {
        handle.remove();
        createGraphicHandle.remove();
      }
    } else {
      const handle = sketch.on("update", (event) => {
        const [graphic] = event.graphics;
        const polygon = graphic.geometry as Polygon;

        if (polygon.type !== 'polygon') return;

        const { origin, terminal } = selectionActor.getSnapshot().context;
        const { x: ox, y: oy } = origin!;
        const { x: tx, y: ty } = terminal!;

        const current: Polygon['rings'][number] = [
          [ox, oy],
          [ox, ty],
          [tx, ty],
          [tx, oy],
          [ox, oy],
        ];

        const next: Ring = polygon.rings[0];
        const corner = next.findIndex(([x, y], index) => x !== current[index][0] || y !== current[index][1]);

        let adjustedRing: Ring;
        switch (corner) {
          case 0:
            adjustedRing = updateNeighboringVertices(next, corner, 1, 3)
            break;
          case 1:
            adjustedRing = updateNeighboringVertices(next, corner, 0, 2)
            break;
          case 2:
            adjustedRing = updateNeighboringVertices(next, corner, 3, 1)
            break;
          case 3:
            adjustedRing = updateNeighboringVertices(next, corner, 2, 0)
            break;
          default:
            adjustedRing = next;
        }

        const nextOrigin = origin!.clone();
        nextOrigin.x = adjustedRing[0][0];
        nextOrigin.y = adjustedRing[0][1];

        const nextTerminal = terminal!.clone();
        nextTerminal.x = adjustedRing[2][0];
        nextTerminal.y = adjustedRing[2][1];

        selectionActor.send({ type: 'update.update', origin: nextOrigin, terminal: nextTerminal });
      })

      return handle.remove;
    }
  }, [hasSelected, selectionActor, sketch]);

  useEffect(() => {
    if (origin != null && terminal == null) {
      sketch.create('point')
    }
  }, [origin, sketch, terminal]);

  return (
    <>
      <CalciteAction
        scale="l"
        text="Select area"
        icon="rectangle-plus"
        onClick={() => {
          sketch.create('point');
        }}
      />
    </>
  )
}

function updateNeighboringVertices(ring: Ring, index: number, vertical: number, horizontal: number) {
  const path = ring.slice(0, -1);

  const [x, y] = path[index];

  path[vertical][0] = x;
  path[horizontal][1] = y;

  path.push(path[0]);

  return path
}

type Ring = Polygon['rings'][number];