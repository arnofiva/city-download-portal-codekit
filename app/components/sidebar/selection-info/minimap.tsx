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
import { SymbologyColors } from "~/symbology/symbology";
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
  const deferredSelection = useDeferredValue(selection);
  const footprintQuery = useSelectionFootprints(deferredSelection);
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

// useDeferred is too fast...
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
  const sceneView = useSceneView();

  const store = useSelectionState();
  const origin = useAccessorValue(() => store.modelOrigin ?? store.selectionOrigin);
  const selection = useAccessorValue(() => store.selection);

  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid);

  const mapRef = useRef<CoreMapView>(null);

  useEffect(() => {
    if (mapRef.current && !mapRef.current?.ready) {
      mapRef.current.extent = sceneView.extent;
    }
  })

  const debouncedSelection = useDebouncedValue(selection, 200);
  const debouncedOrigin = useDebouncedValue(origin, 200);

  useQuery({
    queryKey: ['minimap', 'target', debouncedSelection?.toJSON(), debouncedOrigin?.toJSON()],
    queryFn: async ({ signal }) => {
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

      mapRef.current?.goTo({ target: buffered }, { signal, animate: true }).catch()

      return null
    },
    enabled: debouncedSelection != null && debouncedOrigin != null,
  })

  return (
    <div className={"w-full aspect-[1.5/1] pointer-events-none "}>
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
                selection != null
                  ? <Footprint selection={selection} />
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