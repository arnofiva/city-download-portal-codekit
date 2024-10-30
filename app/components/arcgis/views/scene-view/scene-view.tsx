import { PropsWithChildren, memo, useEffect } from "react"
import CoreSceneView from '@arcgis/core/views/SceneView';
import { SceneViewContext } from "./scene-view-context";
import { useScene } from "../../maps/web-scene/scene-context";
import useInstance from "~/hooks/useInstance";
import { SymbologyColors } from "~/symbology/symbology";
import { useToast } from "~/components/toast";
import { getSceneLayers } from "~/hooks/useSceneLayers";

function InternalView({ children }: PropsWithChildren) {
  const scene = useScene();

  const view = useInstance(() => new CoreSceneView({
    map: scene,
    highlightOptions: {
      color: SymbologyColors.selection(),
      fillOpacity: 0.8,
      shadowOpacity: 0,
      haloOpacity: 0
    },
    popupEnabled: false,
  }));

  const toast = useToast();

  useEffect(() => {
    view.map = scene;
  }, [view, scene, toast]);

  useEffect(() => {
    const controller = new AbortController();

    view.when(async () => {
      await Promise.all(view.map.allLayers.map(layer => layer.load()).toArray())
      const queryableSceneLayers = getSceneLayers(view.map);
      if (queryableSceneLayers.length === 0) {
        toast({
          message: 'Exported meshes will only include terrain.',
          key: 'no-queryable-scene-layers',
          severity: 'warning',
          title: 'Scene has no queryable scene layers'
        })
      }
    })

    return () => controller.abort();
  }, [toast, view])

  return (
    <SceneViewContext.Provider value={view}>
      <div
        className="w-full h-full isolate"
        ref={(node) => {
          if (node && view.container !== node) {
            view.container = node;
          }
        }}
      />
      {children}
    </SceneViewContext.Provider>
  )
}

const SceneView = memo(InternalView)

export default SceneView;