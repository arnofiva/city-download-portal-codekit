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
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { useSceneView } from "~/arcgis/components/views/scene-view/scene-view-context";
import { useAccessorValue } from "../arcgis/reactive-hooks";
import SceneView from "@arcgis/core/views/SceneView";
import Map from "@arcgis/core/Map";

export function getSceneLayers(map: Map) {
  return map.allLayers
    .filter(layer => layer.type === "scene" && (layer as SceneLayer).geometryType === 'mesh')
    .filter(layer => (layer as SceneLayer).capabilities.operations.supportsQuery)
    .toArray()
}

export function getSceneLayerViews(view: SceneView) {
  return view.allLayerViews
    .filter(lv => lv.visible)
    .filter(lv => lv.layer.type === "scene" && (lv.layer as SceneLayer).geometryType === 'mesh')
    .filter(lv => (lv.layer as SceneLayer).capabilities.operations.supportsQuery)
    .toArray() as SceneLayerView[]
}

export function useSceneLayerViews() {
  const view = useSceneView()

  const sceneLayerViews = useAccessorValue(() => getSceneLayerViews(view))

  return sceneLayerViews;
}
