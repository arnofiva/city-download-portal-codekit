import { Suspense, lazy, useDeferredValue } from "react";
import { CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "./arcgis/graphics-layer";
import Graphic from "./arcgis/graphic";
import {
  SimpleFillSymbol
} from "@arcgis/core/symbols";
import { useSceneView } from "./arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSelectionStateSelector } from "./selection/selection-context";

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
  const selection = useSelectionStateSelector(state => state.context.polygon);

  if (selection == null) return null;

  return (
    <Graphic
      geometry={selection}
      symbol={PolygonSymbol}
    />
  )
}

export default function Minimap() {
  const sceneView = useSceneView();
  const extent = useAccessorValue(() => sceneView.extent, { initial: true });
  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid, { initial: true });

  const deferredExtent = useDeferredValue(extent);

  return (
    <div className="w-full aspect-square">
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