import { Suspense, lazy, memo, useDeferredValue, useEffect, useRef, useState } from "react";
import { CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "./arcgis/graphics-layer";
import Graphic from "./arcgis/graphic";
import {
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol
} from "@arcgis/core/symbols";
import { useSceneView } from "./arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSelectionStateSelector } from "~/data/selection-store";
import CoreMapView from "@arcgis/core/views/MapView";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import { Geometry, Polygon, Polyline } from "@arcgis/core/geometry";
import useInstance from "~/hooks/useInstance";
import { SymbologyColors } from "~/symbology";
import { useSelectionFootprints } from "../hooks/queries/feature-query";

const Map = lazy(() => import('~/components/arcgis/maps/map/map'));
const MapView = lazy(() => import('~/components/arcgis/views/map-view/map-view'));

const PolygonSymbol = new SimpleFillSymbol({
  color: SymbologyColors.selection(0.25),
  outline: {
    color: SymbologyColors.selection()
  }
})

const FootprintSymbol = new SimpleFillSymbol({
  color: SymbologyColors.selection(),
  outline: {
    width: 0,
  }
})

const StaleFootprintSymbol = new SimpleFillSymbol({
  color: SymbologyColors.staleSelection(),
  outline: {
    width: 0,
  }
})

const LineSymbol = new SimpleLineSymbol({
  width: 3,
  color: SymbologyColors.measurements(),
  cap: 'square',
  marker: {
    color: SymbologyColors.measurements(),
    placement: "end",
    style: "arrow"
  }
})

const OriginSymbol = new SimpleMarkerSymbol({
  color: SymbologyColors.measurements(),
  style: 'diamond',
  outline: null!
})

function SelectionGraphic() {
  const origin = useSelectionStateSelector(store => store.origin);
  const selection = useSelectionStateSelector(store => store.selection);
  if (selection == null || origin == null) return null;

  const [
    oo,
    ot,
    _tt,
    to,
  ] = selection.rings[0];
  const ooot = new Polyline({
    paths: [[
      oo,
      ot
    ]],
    spatialReference: selection.spatialReference
  })

  const ooto = new Polyline({
    paths: [[
      oo,
      to
    ]],
    spatialReference: selection.spatialReference
  })

  return (
    <>
      <Graphic
        index={0}
        geometry={selection}
        symbol={PolygonSymbol}
      />
      <Graphic
        index={1}
        geometry={ooot}
        symbol={LineSymbol}
      />
      <Graphic
        index={1}
        geometry={ooto}
        symbol={LineSymbol}
      />
      <Graphic
        index={1}
        geometry={origin}
        symbol={OriginSymbol}
      />
    </>
  )
}

function Footprint() {
  const footprintQuery = useSelectionFootprints(true);
  const footprints = footprintQuery.data;

  if (footprints == null) return null;

  return (
    <Graphic
      index={0}
      geometry={footprints}
      symbol={footprintQuery.status === 'loading' ? StaleFootprintSymbol : FootprintSymbol}
    />
  )
}

function InternalMinimap() {
  const [isOpen, setIsOpen] = useState(false);


  const observer = useInstance(() => new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target;
      if (target instanceof HTMLElement && target.tagName === 'CALCITE-BLOCK') {
        setIsOpen((target as HTMLCalciteBlockElement).open)
      }
    }
  }))

  const sceneView = useSceneView();
  const selection = useSelectionStateSelector((state) => state.selection);

  const viewExtent = useAccessorValue(() => sceneView.extent);
  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid);

  const deferredSelection = useDeferredValue(selection);

  const mapRef = useRef<CoreMapView>(null);

  useEffect(() => {
    if (mapRef.current == null || !isOpen) return;
    const controller = new AbortController();
    let target: Geometry | undefined = viewExtent;

    if (deferredSelection != null) {
      const area = Math.abs(geometryEngine.planarArea(deferredSelection));
      const buffered = geometryEngine.buffer(deferredSelection, Math.sqrt(area) * 0.5) as Polygon;
      if (buffered) target = buffered
    }

    if (target)
      mapRef.current.goTo({ target }, { signal: controller.signal, animate: false }).catch()

    return () => controller.abort()
  }, [viewExtent, deferredSelection, isOpen]);

  const disableMapInteractions = "[&_.esri-view-surface]:pointer-events-none"
  return (
    <div
      ref={(ref) => {
        observer.disconnect()
        const parent = ref?.closest("calcite-block");
        if (parent) observer.observe(parent, { attributes: true, attributeFilter: ['open'] })
      }}
      className={"w-full aspect-[1.5/1] " + disableMapInteractions}
    >
      {sr != null ? (
        <Suspense fallback={<CalciteScrim loading />}>
          <Map>
            <GraphicsLayer>
              <SelectionGraphic />
              <Footprint />
            </GraphicsLayer>
            <MapView ref={mapRef} spatialReference={`${sr}`} />
          </Map>
        </Suspense>
      ) : null}
    </div>
  )
}

const Minimap = memo(InternalMinimap);

export default Minimap;