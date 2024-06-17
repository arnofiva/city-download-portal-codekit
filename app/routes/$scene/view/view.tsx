import { PropsWithChildren, memo, useEffect, useState } from "react"
import SceneView from '@arcgis/core/views/SceneView';
import { ViewContext } from "./view-context";
import { useScene } from "../scene/scene-context";

function InternalView({ children }: PropsWithChildren) {
  const scene = useScene();

  const [view] = useState(() => new SceneView({
    map: scene
  }));

  useEffect(() => {
    view.map = scene;
  }, [view, scene]);

  return (
    <ViewContext.Provider value={view}>
      <div
        className="w-full h-full"
        ref={(node) => {
          if (node && view.container !== node) {
            view.container = node
          }
        }}
      />
      {children}
    </ViewContext.Provider>
  )
}

const View = memo(InternalView)

export default View;