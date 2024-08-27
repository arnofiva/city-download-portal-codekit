import { memo, useMemo } from "react";
import { Polygon } from "@arcgis/core/geometry";
import Graphic from "~/components/arcgis/graphic";
import { ExtrudeSymbol3DLayer, FillSymbol3DLayer, PolygonSymbol3D } from "@arcgis/core/symbols";
import WalkthroughPopover from "~/components/selection/walk-through-popover";
import { RootShellPortal } from "~/components/root-shell";
import FeatureFilterHighlights from "./scene-filter-highlights";
import GraphicsLayer from "../arcgis/graphics-layer";
import { OriginSymbol, SymbologyColors } from "~/symbology";
import { useSelectionState, useSelectionStateSelector } from "~/data/selection-store";
import { useOriginElevationInfo, useSelectionElevationInfo } from "../../hooks/queries/elevation-query";
import SolidEdges3D from "@arcgis/core/symbols/edges/SolidEdges3D.js";
import { useAccessorValue } from "~/hooks/reactive";

function InternalSelectionGraphic() {
  const store = useSelectionState();
  const isIdle = useAccessorValue(() => store.editingState === 'idle');
  const isUpdatingOrigin = useAccessorValue(() => store.editingState === 'updating-origin');
  const selection = useAccessorValue(() => store.selection)

  return (
    <>
      {selection != null ? (
        <Graphic
          ref={(graphic) => {
            store.graphic = graphic
          }}
          geometry={selection}
          symbol={FootprintSymbol}
        />
      ) : null}
      <GraphicsLayer elevationMode="absolute-height">
        {isIdle ? <Volume /> : null}
        {!isUpdatingOrigin ? <Origin /> : null}
      </GraphicsLayer>
      <RootShellPortal>
        <WalkthroughPopover />
      </RootShellPortal>
      <FeatureFilterHighlights />
    </>
  )
}

function Origin() {
  const store = useSelectionState();
  const origin = useAccessorValue(() => store.modelOrigin ?? store.selectionOrigin);
  const originElevationInfo = useOriginElevationInfo().data;

  const elevatedOrigin = origin?.clone();
  if (originElevationInfo && elevatedOrigin) elevatedOrigin.z = originElevationInfo.z

  return (
    elevatedOrigin ? (
      <Graphic geometry={elevatedOrigin} symbol={OriginSymbol} />
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

const FootprintSymbol = new PolygonSymbol3D({
  symbolLayers: [
    new FillSymbol3DLayer({
      material: { color: SymbologyColors.selection(0.25) },
      outline: { color: SymbologyColors.selection() },
    })
  ]
});

// const OriginSymbol = new LineSymbol3D({
//   symbolLayers: [
//     new LineSymbol3DLayer({
//       size: 3,  // points
//       material: { color: SymbologyColors.measurements() },
//       cap: "round",
//       join: "round",

//       marker: {  // autocasts as new LineStyleMarker3D()
//         type: "style",
//         style: "diamond",
//         placement: "end",
//         color: "red"  // black line with red arrows
//       }
//     })]
// })

const SelectionGraphic = memo(InternalSelectionGraphic);
export default SelectionGraphic;