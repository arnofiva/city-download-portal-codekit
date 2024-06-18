import { PropsWithChildren, memo, useEffect, useState } from "react"
import CoreSceneView from '@arcgis/core/views/SceneView';
import { SceneViewContext } from "./scene-view-context";
import { useScene } from "../../maps/web-scene/scene-context";
import Color from "@arcgis/core/Color.js";

function InternalView({ children }: PropsWithChildren) {
  const scene = useScene();

  const [view] = useState(() => new CoreSceneView({
    map: scene,
    highlightOptions: {
      color: new Color([255, 255, 0, 0.25])
    }
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