import { PropsWithChildren, Suspense, memo, useState } from "react";
import CoreMap from '@arcgis/core/Map';
import { CalciteScrim } from "@esri/calcite-components-react";
import { MapContext } from "./map-context";

interface MapProps {
}

function InternalMap({ children }: PropsWithChildren<MapProps>) {
  const [scene] = useState(() => new CoreMap({
    basemap: "arcgis/topographic"
  }));

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