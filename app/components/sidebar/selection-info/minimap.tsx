import { Suspense, lazy, memo, useDeferredValue, useEffect, useRef, useState } from "react";
import { CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "../../arcgis/graphics-layer";
import Graphic from "../../arcgis/graphic";
import {
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol
} from "@arcgis/core/symbols";
import { useSceneView } from "../../arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSelectionState } from "~/data/selection-store";
import CoreMapView from "@arcgis/core/views/MapView";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import * as geometryEngineAsync from "@arcgis/core/geometry/geometryEngineAsync";
import { Point, Polygon, Polyline } from "@arcgis/core/geometry";
import useInstance from "~/hooks/useInstance";
import { SymbologyColors } from "~/symbology";
import { useSelectionFootprints } from "../../../hooks/queries/feature-query";
import { useQuery } from "@tanstack/react-query";

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
  color: SymbologyColors.staleSelection(0.8),
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
        index={2}
        geometry={ooot}
        symbol={LineSymbol}
      />
      <Graphic
        index={2}
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
      symbol={footprintQuery.isFetching ? StaleFootprintSymbol : FootprintSymbol}
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

  const store = useSelectionState();
  const origin = useAccessorValue(() => store.modelOrigin ?? store.selectionOrigin);
  const selection = useAccessorValue(() => store.selection);

  const viewExtent = useAccessorValue(() => sceneView.extent);
  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid);

  const deferredSelection = useDeferredValue(selection);
  const { selection: debouncedSelection, origin: debouncedOrigin } = useDebouncedValue({ selection, origin }, 200);

  const mapRef = useRef<CoreMapView>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.when(() => setReady(true));
    }
  })

  const targetQuery = useQuery({
    queryKey: ['minimap', 'target', debouncedSelection?.toJSON(), debouncedOrigin?.toJSON()],
    queryFn: async () => {
      const selection = debouncedSelection!;
      const origin = debouncedOrigin!;

      const xmax = origin.x > selection.extent.xmax ? origin.x : selection.extent.xmax;
      const xmin = selection.extent.xmin > origin.x ? origin.x : selection.extent.xmin;
      const ymax = origin.y > selection.extent.ymax ? origin.y : selection.extent.ymax;
      const ymin = selection.extent.ymin > origin.y ? origin.y : selection.extent.ymin;

      const polygon = selection.clone();
      polygon.rings = [
        [
          [xmin, ymin],
          [xmin, ymax],
          [xmax, ymax],
          [xmax, ymin],
          [xmin, ymax],
        ]
      ]

      const area = Math.abs(geometryEngine.planarArea(polygon));
      const buffered = await geometryEngineAsync.buffer(polygon!, Math.sqrt(area) * 0.5) as Polygon;

      return buffered
    },
    enabled: viewExtent != null && debouncedSelection != null && debouncedOrigin != null,
  })

  useEffect(() => {
    if (!isOpen || !ready) return;

    const controller = new AbortController();
    if (targetQuery.data) {
      mapRef.current?.goTo({ target: targetQuery.data }, { signal: controller.signal, animate: true }).catch()
      return () => controller.abort()
    }
  }, [isOpen, ready, targetQuery.data])

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
              {debouncedOrigin != null ? <Graphic
                index={1}
                geometry={debouncedOrigin}
                symbol={OriginSymbol}
              />
                : null}
              {
                debouncedOrigin != null && debouncedSelection != null
                  ? <SelectionGraphic origin={debouncedOrigin} selection={debouncedSelection} />
                  : null
              }
              {
                deferredSelection != null
                  ? <Footprint selection={deferredSelection} />
                  : null
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