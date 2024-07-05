import { Suspense, lazy, memo, useDeferredValue, useEffect, useRef } from "react";
import { CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "./arcgis/graphics-layer";
import Graphic from "./arcgis/graphic";
import {
  SimpleFillSymbol,
  SimpleLineSymbol
} from "@arcgis/core/symbols";
import { useSceneView } from "./arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSelectionStateSelector } from "~/data/selection-store";
import CoreMapView from "@arcgis/core/views/MapView";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import { Polyline } from "@arcgis/core/geometry";

const Map = lazy(() => import('~/components/arcgis/maps/map/map'));
const MapView = lazy(() => import('~/components/arcgis/views/map-view/map-view'));

const PolygonSymbol = new SimpleFillSymbol({
  color: 'red',
  style: "diagonal-cross",
  outline: {
    color: 'red'
  }
})

const LineSymbol = new SimpleLineSymbol({
  width: 3,
  cap: 'square'
})

function SelectionGraphic() {
  const selection = useSelectionStateSelector(store => store.selection);
  if (selection == null) return null;

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
        geometry={selection}
        symbol={PolygonSymbol}
      />
      <Graphic
        geometry={ooot}
        symbol={LineSymbol}
      />
      <Graphic
        geometry={ooto}
        symbol={LineSymbol}
      />
    </>
  )
}

function InternalMinimap() {
  const sceneView = useSceneView();
  const selection = useSelectionStateSelector((state) => state.selection);

  const viewExtent = useAccessorValue(() => sceneView.extent);
  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid);

  const deferredExtent = useDeferredValue(viewExtent);
  const deferredViewTarget = useDeferredValue(selection);

  const mapRef = useRef<CoreMapView>(null);

  useEffect(() => {
    if (mapRef.current == null) return;

    if (deferredViewTarget != null) {
      const area = Math.abs(geometryEngine.planarArea(deferredViewTarget));
      const buffered = geometryEngine.buffer(deferredViewTarget, Math.sqrt(area) * 0.5);
      if (buffered) mapRef.current.goTo(buffered).catch();
    } else {
      mapRef.current.goTo({ target: deferredExtent })
    }
  }, [deferredExtent, deferredViewTarget]);

  const disableMapInteractions = "[&_.esri-view-surface]:pointer-events-none"
  return (
    <div
      className={"w-full aspect-[1.5/1] " + disableMapInteractions}
    >
      {sr != null ? (
        <Suspense fallback={<CalciteScrim loading />}>
          <Map>
            <GraphicsLayer>
              <SelectionGraphic />
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