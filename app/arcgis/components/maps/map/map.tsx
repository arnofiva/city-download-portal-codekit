/* Copyright 2024 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { PropsWithChildren, Suspense, memo, useEffect } from "react";
import CoreMap from '@arcgis/core/Map';
import { CalciteScrim } from "@esri/calcite-components-react";
import { MapContext } from "./map-context";
import { useScene } from "../web-scene/scene-context";
import { useAccessorValue } from "~/arcgis/reactive-hooks";
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