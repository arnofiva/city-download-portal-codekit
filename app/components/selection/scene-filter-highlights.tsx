import { useEffect, memo } from "react";
import { useAccessorValue } from "~/hooks/reactive";
import { useScene } from "../arcgis/maps/web-scene/scene-context";
import Layer from "@arcgis/core/layers/Layer";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import { useSelectionState } from "~/data/selection-store";
import { SymbologyColors } from "~/symbology/symbology";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer.js";
import { FillSymbol3DLayer, MeshSymbol3D } from "@arcgis/core/symbols";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter.js";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { useSceneLayerViews } from "~/hooks/useSceneLayers";

const HighlightRenderer = new SimpleRenderer({
  symbol: new MeshSymbol3D({
    symbolLayers: [
      new FillSymbol3DLayer({
        material: { color: SymbologyColors.selection() }
      })]
  })
});

interface SceneLayerProps {
  layer: SceneLayer
}
const SceneLayerHighlight = memo(
  function SceneLayerHighlight({ layer }: SceneLayerProps) {
    const view = useSceneView()
    const scene = useScene()
    const store = useSelectionState();
    const selection = useAccessorValue(() => store.selection);

    const id = useAccessorValue(() => layer.id);
    const cloneTitle = SCENE_LAYER_CLONE_PREFIX + id;

    const clone = useAccessorValue(
      () => scene
        .allLayers
        .find((layer): layer is SceneLayer => layer.title === cloneTitle)
    ) as SceneLayer | undefined;

    const layerViews =
      useAccessorValue(() => view.allLayerViews
        .filter(lv => lv.layer === layer || lv.layer === clone).toArray() as SceneLayerView[]
      );

    const mainLayerView = layerViews?.find(lv => lv.layer === layer)
    const cloneLayerView = layerViews?.find(lv => lv.layer === clone)

    useEffect(() => {
      return () => {
        if (mainLayerView) mainLayerView.filter = null!
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      if (mainLayerView && cloneLayerView) {
        if (selection != null) {
          mainLayerView.filter = new FeatureFilter({
            geometry: selection,
            spatialRelationship: 'disjoint'
          })

          cloneLayerView.filter = new FeatureFilter({
            geometry: selection,
          });

          setTimeout(() => {
            cloneLayerView.visible = mainLayerView.visible;
          }, 150)
        } else {
          mainLayerView.filter = null!

          cloneLayerView.visible = false;
          cloneLayerView.filter = null!
        }
      }
    }, [cloneLayerView, mainLayerView, selection])


    useEffect(() => {
      const clone = layer.clone();
      clone.title = cloneTitle
      clone.renderer = HighlightRenderer;
      clone.visible = false;
      scene.layers.add(clone);

      return () => {
        scene.layers.remove(clone)
      }
    }, [cloneTitle, layer, scene.layers])

    return null;
  }
)

function InternalFeatureFilterHighlights() {
  const sceneLayersViews = useSceneLayerViews();
  return (sceneLayersViews?.map((lv) => <SceneLayerHighlight key={lv.layer.id} layer={lv.layer} />));
}

const FeatureFilterHighlights = memo(InternalFeatureFilterHighlights);

export default FeatureFilterHighlights;

const SCENE_LAYER_CLONE_PREFIX = 'SCENE-CLONE';
export function removeSceneLayerClones(layer: Layer) {
  return !layer.title?.startsWith(SCENE_LAYER_CLONE_PREFIX);
}