import { PropsWithChildren, useEffect } from "react";
import { useMapView } from "./map-view-context";
import type SceneView from "@arcgis/core/views/SceneView";
import { createPortal } from "react-dom";
import useInstance from "~/hooks/useInstance";

type Position = NonNullable<
  Exclude<Parameters<SceneView['ui']['add']>[1], string | undefined>['position']
>
interface ViewUIProps {
  position: Position;
  index?: number;
}

export function ViewUI({ position, index, children }: PropsWithChildren<ViewUIProps>) {
  const container = useInstance(() => {
    const div = document.createElement('div');
    div.classList.add('contents');
    return div;
  })

  const view = useMapView();

  useEffect(() => {
    view.ui.add(container, { position, index })

    return () => {
      view.ui.remove(container);
    }
  }, [container, index, position, view]);

  return createPortal(children, container)
}
