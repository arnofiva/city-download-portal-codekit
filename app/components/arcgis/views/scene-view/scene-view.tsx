import { PropsWithChildren, memo, useEffect } from "react"
import CoreSceneView from '@arcgis/core/views/SceneView';
import { SceneViewContext } from "./scene-view-context";
import { useScene } from "../../maps/web-scene/scene-context";
import useInstance from "~/hooks/useInstance";
import { SymbologyColors } from "~/symbology/symbology";

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

  useEffect(() => {
    view.map = scene;
  }, [view, scene]);

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