import { Suspense, lazy, memo, useDeferredValue } from "react";
import { CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "./arcgis/graphics-layer";
import Graphic from "./arcgis/graphic";
import {
  SimpleFillSymbol
} from "@arcgis/core/symbols";
import { useSceneView } from "./arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSelectionStateSelector } from "~/data/selection-store";

const Map = lazy(() => import('~/components/arcgis/maps/map/map'));
const MapView = lazy(() => import('~/components/arcgis/views/map-view/map-view'));

const PolygonSymbol = new SimpleFillSymbol({
  color: 'red',
  style: "diagonal-cross",
  outline: {
    color: 'red'
  }
})

function SelectionGraphic() {
  const selection = useSelectionStateSelector(store => store.selection);
  if (selection == null) return null;


  return (
    <Graphic
      geometry={selection}
      symbol={PolygonSymbol}
    />
  )
}

function InternalMinimap() {
  const sceneView = useSceneView();
  const extent = useAccessorValue(() => sceneView.extent);
  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid);

  const deferredExtent = useDeferredValue(extent);

  return (
    <div className="w-full aspect-[1.5/1]">
      {sr != null ? (
        <Suspense fallback={<CalciteScrim loading />}>
          <Map>
            <GraphicsLayer>
              <SelectionGraphic />
            </GraphicsLayer>
            <MapView spatialReference={`${sr}`} extent={deferredExtent} />
          </Map>
        </Suspense>
      ) : null}
    </div>
  )
}

const Minimap = memo(InternalMinimap);

export default Minimap;