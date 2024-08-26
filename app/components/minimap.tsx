import { Suspense, lazy, memo, useEffect, useRef, useState } from "react";
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
import { Geometry, Point, Polygon, Polyline } from "@arcgis/core/geometry";
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

interface SelectionGraphicProps {
  origin: Point
  selection: Polygon
}
function SelectionGraphic({ origin, selection }: SelectionGraphicProps) {
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
    </>
  )
}

interface FootprintGraphicProps {
  selection: Polygon
}
function Footprint({ selection }: FootprintGraphicProps) {
  const footprintQuery = useSelectionFootprints(selection);
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

// useDeferred is "too fast"...
function useDebouncedValue<T>(value: T, delay = 500) {
  const [current, setCurrent] = useState(value);
  const [shouldUpdate, setShouldUpdate] = useState(false);

  useEffect(() => {
    if (current !== value) {
      const timeout = setTimeout(() => setShouldUpdate(true), delay)
      return () => clearTimeout(timeout);
    }
  }, [current, delay, value])

  if (current !== value && shouldUpdate) {
    setCurrent(value)
    setShouldUpdate(false)
  }

  return current;
}

function InternalMinimap() {
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);

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
  const origin = useSelectionStateSelector((state) => state.modelOrigin ?? state.selectionOrigin);

  const viewExtent = useAccessorValue(() => sceneView.extent);
  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid);

  const deferredOrigin = useDebouncedValue(origin, 200);
  const deferredSelection = useDebouncedValue(selection, 200);


  const mapRef = useRef<CoreMapView>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.when(() => setReady(true));
    }
  })

  useEffect(() => {
    if (mapRef.current == null || !isOpen || !ready) return;

    const controller = new AbortController();
    let target: Geometry | undefined = viewExtent;

    if (deferredSelection != null) {
      const area = Math.abs(geometryEngine.planarArea(deferredSelection));
      const buffered = geometryEngine.buffer(deferredSelection, Math.sqrt(area) * 0.5) as Polygon;
      if (buffered) target = buffered
    }

    if (target)
      mapRef.current.goTo({ target }, { signal: controller.signal, animate: true }).catch()

    return () => controller.abort()
  }, [viewExtent, deferredSelection, isOpen, ready]);

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
              {deferredOrigin != null ? <Graphic
                index={1}
                geometry={deferredOrigin}
                symbol={OriginSymbol}
              />
                : null}
              {
                deferredOrigin != null && deferredSelection != null ?
                  (
                    <>
                      <SelectionGraphic origin={deferredOrigin} selection={deferredSelection} />
                      <Footprint selection={deferredSelection} />
                    </>
                  ) : null
              }
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