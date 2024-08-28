import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context";
import { removeSceneLayerClones } from "~/components/selection/scene-filter-highlights";
import { useAccessorValue } from "./reactive";

export function useSceneLayerViews() {
  const view = useSceneView()

  const sceneLayerViews = useAccessorValue(() => view.allLayerViews
    .filter(lv => lv.visible)
    .filter(lv => removeSceneLayerClones(lv.layer))
    .filter(lv => lv.layer.type === "scene" && (lv.layer as SceneLayer).geometryType === 'mesh').toArray() as SceneLayerView[])

  return sceneLayerViews;
}
