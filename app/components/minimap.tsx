import { Suspense, lazy } from "react";
import { useSelectionStateSelector } from "./selection/selection-context";
import { CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "./arcgis/graphics-layer";
import Graphic from "./arcgis/graphic";
import {
  SimpleFillSymbol
} from "@arcgis/core/symbols";
import { useSceneView } from "./arcgis/views/scene-view/scene-view-context";
import useAccessorValue from "~/hooks/useAccessorValue";

const Map = lazy(() => import('~/components/arcgis/maps/map/map'));
const MapView = lazy(() => import('~/components/arcgis/views/map-view/map-view'));

const PolygonSymbol = new SimpleFillSymbol({
  color: 'red'
})

function SelectionGraphic() {
  const selection = useSelectionStateSelector(state => state.context.selection);

  if (selection == null) return null;

  return (
    <Graphic
      geometry={selection}
      symbol={PolygonSymbol}
    />
  )
}

export default function Minimap() {
  const selection = useSelectionStateSelector(state => state.context.selection != null);

  const sceneView = useSceneView();
  const extent = useAccessorValue({ getValue: () => sceneView.extent, options: { initial: true } })!;
  const sr = useAccessorValue({ getValue: () => sceneView.spatialReference, options: { initial: true } });

  return (
    <div className="w-full aspect-square">
      {selection ? (
        <Suspense fallback={<CalciteScrim loading />}>
          <Map>
            <GraphicsLayer>
              <SelectionGraphic />
            </GraphicsLayer>
            <MapView spatialReference={`${sr?.wkid}`} extent={extent} />
          </Map>
        </Suspense>
      ) : null}
    </div>
  )
}