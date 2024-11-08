import { memo, useDeferredValue, useMemo } from "react";
import { Polygon } from "@arcgis/core/geometry";
import Graphic from "~/components/arcgis/graphic";
import { ExtrudeSymbol3DLayer, FillSymbol3DLayer, PolygonSymbol3D } from "@arcgis/core/symbols";
import FeatureFilterHighlights from "./scene-filter-highlights";
import GraphicsLayer from "../arcgis/graphics-layer";
import { createOriginSymbol, SymbologyColors } from "~/symbology/symbology";
import { useSelectionState } from "~/data/selection-store";
import { usePreciseOriginElevationInfo, useSelectionVolumeExtent } from "../../hooks/queries/elevation-query";
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
      <FeatureFilterHighlights />
    </>
  )
}

function Origin() {
  const store = useSelectionState();
  const origin = useAccessorValue(() => store.modelOrigin ?? store.selectionOrigin);
  const selection = useAccessorValue(() => store.selection);
  const originElevationInfo = usePreciseOriginElevationInfo().data;

  /* since the elevation calculations are async they can be quite slow, so using the z enriched origin directly would look choppy. Instead, we just use the current origin, and add the most current elevation info we have to that point */
  const elevatedOrigin = origin?.clone();
  if (originElevationInfo && elevatedOrigin) elevatedOrigin.z = originElevationInfo.z;

  const { data } = useSelectionVolumeExtent();

  const volumeExtent = useDeferredValue(data ?? selection?.extent)
  const height = (volumeExtent?.zmax ?? 0) - (volumeExtent?.zmin ?? 0);
  const symbol = useMemo(() => createOriginSymbol(height), [height])

  return (
    elevatedOrigin ? (
      <Graphic
        geometry={elevatedOrigin}
        symbol={symbol}
      />
    ) : null
  )
}

function Volume() {
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);

  const { data } = useSelectionVolumeExtent();

  const zmin = data?.zmin ?? 0
  const zmax = data?.zmax ?? 0

  const bufferedZmin = zmin - 100;
  const bufferedZmax = zmax + 5;
  const height = (bufferedZmax - bufferedZmin);

  const volumeSymbol = useMemo(() => new PolygonSymbol3D({
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
    if (selection == null) return null;

    const ring = selection.rings[0]
    const elevatedRing = ring.map(([x, y]) => [x, y, bufferedZmin])

    return new Polygon({
      rings: [elevatedRing],
      spatialReference: selection.spatialReference
    })
  }, [bufferedZmin, selection])

  return (
    elevatedPolygon ? (
      <Graphic
        geometry={elevatedPolygon}
        symbol={volumeSymbol}
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

const SelectionGraphic = memo(InternalSelectionGraphic);
export default SelectionGraphic;