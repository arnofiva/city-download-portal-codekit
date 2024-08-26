import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Point, Polygon, Polyline } from "@arcgis/core/geometry";
import Graphic from "~/components/arcgis/graphic";
import { ExtrudeSymbol3DLayer, FillSymbol3DLayer, LineSymbol3D, LineSymbol3DLayer, PolygonSymbol3D } from "@arcgis/core/symbols";
import CoreGraphic from "@arcgis/core/Graphic";
import WalkthroughPopover from "~/components/selection/walk-through-popover";
import { RootShellPortal } from "~/components/root-shell";
import FeatureFilterHighlights from "./scene-filter-highlights";
import { useSelectionActor } from "./selection";
import GraphicsLayer from "../arcgis/graphics-layer";
import { SymbologyColors } from "~/symbology";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useOriginElevationInfo, useSelectionElevationInfo } from "../../hooks/queries/elevation-query";
import SolidEdges3D from "@arcgis/core/symbols/edges/SolidEdges3D.js";

interface SelectionProps {
  onChange?: (selection: Polygon | null) => void;
}
function InternalSelectionGraphic({
  onChange
}: SelectionProps) {
  const [state, send] = useSelectionActor();

  const isActive = state.matches('creating') || state.matches({ created: 'updating' })

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
  }, [send])

  return (
    <>
      {polygon != null ? (
        // when we're in the `created` state allow the selection graphic to be edited
        <Graphic
          ref={handleClickOnGraphic}
          geometry={polygon}
          symbol={FootprintSymbol}
          onUpdateStart={() => send({ type: 'update.start' })}
          onUpdateComplete={() => send({ type: 'update.complete' })}
          onChange={(polygon) => send({ type: 'update.active', polygon })}
          onDelete={() => send({ type: 'delete' })}
        />
      ) : null}
      <GraphicsLayer elevationMode="absolute-height">
        {!isActive ? <Volume /> : null}
        <Origin />
      </GraphicsLayer>
      <RootShellPortal>
        <WalkthroughPopover />
      </RootShellPortal>
      <FeatureFilterHighlights />
      {/* <Highlights /> */}
    </>
  )
}

function Origin() {
  const origin = useOriginElevationInfo().data;
  const spatialReference = origin?.spatialReference;

  const zmin = origin?.z ?? 0
  const zmax = origin?.z ?? 0

  const bufferedZmin = zmin - 100;
  const height = (zmax - bufferedZmin) + 200;

  const { x, y } = origin ?? {}

  const originLine = useMemo(() => {
    if (x == null || y == null) return null;

    const line = new Polyline({
      paths: [
        [
          [x, y, bufferedZmin],
          [x, y, bufferedZmin + height],
        ],
      ],
      spatialReference,
    })
    return line;
  }, [bufferedZmin, height, spatialReference, x, y])

  return (
    originLine ? (
      <Graphic geometry={originLine} symbol={OriginSymbol} />
    ) : null
  )
}

function Volume() {
  const polygon = useSelectionStateSelector((store) => store.selection);
  const elevationQuery = useSelectionElevationInfo()

  const zmin = elevationQuery.data?.minElevation ?? 0;
  const zmax = elevationQuery.data?.maxElevation ?? 0;

  const bufferedZmin = zmin - 100;
  const height = (zmax - bufferedZmin) + 200;

  const VolumeSymbol = useMemo(() => new PolygonSymbol3D({
    symbolLayers: [
      new ExtrudeSymbol3DLayer({
        size: height,
        castShadows: false,
        edges: new SolidEdges3D({
          color: SymbologyColors.selection(0.85),
          size: 1
        })
      })
    ]
  }), [height])

  const elevatedPolygon = useMemo(() => {
    if (polygon == null) return null;

    const ring = polygon.rings[0]
    const elevatedRing = ring.map(([x, y]) => [x, y, bufferedZmin])

    return new Polygon({
      rings: [elevatedRing],
      spatialReference: polygon.spatialReference
    })
  }, [bufferedZmin, polygon])

  return (
    elevatedPolygon ? (
      <Graphic
        geometry={elevatedPolygon}
        symbol={VolumeSymbol}
      />
    ) : null
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

const FootprintSymbol = new PolygonSymbol3D({
  symbolLayers: [
    new FillSymbol3DLayer({
      material: { color: SymbologyColors.selection(0.25) },
      outline: { color: SymbologyColors.selection() },
    })
  ]
});

const OriginSymbol = new LineSymbol3D({
  symbolLayers: [
    new LineSymbol3DLayer({
      size: 3,  // points
      material: { color: "red" },
      cap: "round",
      join: "round",

      marker: {  // autocasts as new LineStyleMarker3D()
        type: "style",
        style: "diamond",
        placement: "end",
        color: "red"  // black line with red arrows
      }
    })]
})



const SelectionGraphic = memo(InternalSelectionGraphic);
export default SelectionGraphic;