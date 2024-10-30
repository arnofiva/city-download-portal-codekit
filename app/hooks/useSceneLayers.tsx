import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context";
import { removeSceneLayerClones } from "~/components/selection/scene-filter-highlights";
import { useAccessorValue } from "./reactive";
import SceneView from "@arcgis/core/views/SceneView";
import Map from "@arcgis/core/Map";

export function getSceneLayers(map: Map) {
  return map.allLayers
    .filter(layer => removeSceneLayerClones(layer))
    .filter(layer => layer.type === "scene" && (layer as SceneLayer).geometryType === 'mesh')
    .filter(layer => (layer as SceneLayer).capabilities.operations.supportsQuery)
    .toArray()
}

export function getSceneLayerViews(view: SceneView) {
  return view.allLayerViews
    .filter(lv => lv.visible)
    .filter(lv => removeSceneLayerClones(lv.layer))
    .filter(lv => lv.layer.type === "scene" && (lv.layer as SceneLayer).geometryType === 'mesh')
    .filter(lv => (lv.layer as SceneLayer).capabilities.operations.supportsQuery)
    .toArray() as SceneLayerView[]
}

export function useSceneLayerViews() {
  const view = useSceneView()

  const sceneLayerViews = useAccessorValue(() => getSceneLayerViews(view))

  return sceneLayerViews;
}
