import { PropsWithChildren, Suspense, memo, useEffect } from "react";
import CoreMap from '@arcgis/core/Map';
import { CalciteScrim } from "@esri/calcite-components-react";
import { MapContext } from "./map-context";
import { useScene } from "../web-scene/scene-context";
import { useAccessorValue } from "~/hooks/reactive";
import useInstance from "~/hooks/useInstance";

interface MapProps {
}

function InternalMap({ children }: PropsWithChildren<MapProps>) {
  const parentScene = useScene();
  const basemap = useAccessorValue(() => parentScene.basemap) ?? 'arcgis/topographic';

  const scene = useInstance(() => new CoreMap());

  useEffect(() => {
    scene.basemap = basemap as any;
  }, [basemap, scene])

  return (
    <Suspense fallback={<CalciteScrim loading />}>
      <MapContext.Provider value={scene}>
        {children}
      </MapContext.Provider>
    </Suspense>
  );
}

const Map = memo(InternalMap)

export default Map;