import { PropsWithChildren, memo, useEffect } from "react"
import CoreSceneView from '@arcgis/core/views/SceneView';
import { SceneViewContext } from "./scene-view-context";
import { useScene } from "../../maps/web-scene/scene-context";
import Color from "@arcgis/core/Color.js";
import useInstance from "~/hooks/useInstance";
import { SymbologyColors } from "~/symbology";

function InternalView({ children }: PropsWithChildren) {
  const scene = useScene();

  const view = useInstance(() => new CoreSceneView({
    map: scene,
    highlightOptions: {
      color: SymbologyColors.selection(),
      fillOpacity: 0.8,
      shadowOpacity: 0,
      haloColor: 'white',
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
        className="w-full h-full"
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