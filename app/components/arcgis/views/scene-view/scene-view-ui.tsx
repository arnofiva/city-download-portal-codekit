import { PropsWithChildren, useEffect, useState } from "react";
import { useSceneView } from "./scene-view-context";
import type SceneView from "@arcgis/core/views/SceneView";
import { createPortal } from "react-dom";

type Position = NonNullable<
  Exclude<Parameters<SceneView['ui']['add']>[1], string | undefined>['position']
>
interface ViewUIProps {
  position: Position;
  index?: number;
}

export function ViewUI({ position, index, children }: PropsWithChildren<ViewUIProps>) {
  const [container] = useState(() => {
    const div = document.createElement('div');
    div.classList.add('contents');
    return div;
  })
  const view = useSceneView();
  useEffect(() => {
    view.ui.add(container, { position, index })

    return () => {
      try {
        view.ui.remove(container);
      } catch (error) {
        console.error(error);
      }
    }
  }, [container, index, position, view]);

  return createPortal(children, container)
}
