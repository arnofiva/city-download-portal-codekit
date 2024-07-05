import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Point, Polygon } from "@arcgis/core/geometry";
import Graphic from "~/components/arcgis/graphic";
import { FillSymbol3DLayer, PolygonSymbol3D } from "@arcgis/core/symbols";
import StylePattern3D from "@arcgis/core/symbols/patterns/StylePattern3D";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import CoreGraphic from "@arcgis/core/Graphic";
import WalkthroughPopover from "~/components/selection/walk-through-popover";
import { RootShellPortal } from "~/components/root-shell";
import { contains } from "@arcgis/core/geometry/geometryEngine";
import Highlight from "./highlight";
import { useSelectionActor } from "./selection";

interface SelectionProps {
  onChange?: (selection: Polygon | null) => void;
}
function InternalSelectionGraphic({
  onChange
}: SelectionProps) {
  const view = useSceneView();

  const [state, send] = useSelectionActor();

  const origin = state.context.origin;
  const terminal = state.context.terminal;

  const polygon = useMemo(() => (
    origin != null && terminal != null
      ? createSelectionPolygon(origin, terminal)
      : null
  ), [origin, terminal]);


  const currentOnChange = useRef(onChange);
  useEffect(() => {
    currentOnChange.current = onChange;
  })

  useEffect(() => {
    currentOnChange.current?.(polygon)
  }, [onChange, polygon]);

  const isIdle =
    state.matches('notStarted') ||
    state.matches('created');

  const [hasBeenActive, setState] = useState(false);

  if (!hasBeenActive && !isIdle) {
    setState(true);
  }

  useEffect(() => {
    if (state.context.hasCreated && state.context.graphic)
      send({ type: 'update.start' });
  }, [send, state.context.graphic, state.context.hasCreated]);

  const handleClickOnGraphic = useCallback((graphic: CoreGraphic | null) => {
    if (graphic == null) return;

    send({ type: 'graphic-change', graphic });
    const handle = view.on("click", (event) => {
      if (contains(graphic.geometry, event.mapPoint)) {
        event.stopPropagation();
        send({ type: 'update.start' })
      }
    });

    return handle.remove;
  }, [send, view]);

  return (
    <>
      {polygon != null ? (
        // when we're in the `created` state allow the selection graphic to be edited
        <Graphic
          ref={handleClickOnGraphic}
          geometry={polygon}
          symbol={PolygonSymbol}
          onUpdateStart={() => send({ type: 'update.start' })}
          onUpdateComplete={() => send({ type: 'update.complete' })}
          onChange={(polygon) => send({ type: 'update.active', polygon })}
          onDelete={() => send({ type: 'delete' })}
        />
      ) : null}
      <RootShellPortal>
        <WalkthroughPopover />
      </RootShellPortal>
      <Highlight />
    </>
  )
}

function createSelectionPolygon(origin: Point, terminal: Point) {
  return new Polygon({
    rings: [[
      [origin.x, origin.y],
      [origin.x, terminal.y],
      [terminal.x, terminal.y],
      [terminal.x, origin.y],
      [origin.x, origin.y],
    ]],
    spatialReference: origin.spatialReference,
  })
}

const PolygonSymbol = new PolygonSymbol3D({
  symbolLayers: [
    new FillSymbol3DLayer({
      material: { color: [255, 0, 0, 0.25] },
      outline: { color: [255, 0, 0, 1] },
      pattern: new StylePattern3D({ style: 'diagonal-cross' })
    })
  ]
});

const SelectionGraphic = memo(InternalSelectionGraphic);
export default SelectionGraphic;