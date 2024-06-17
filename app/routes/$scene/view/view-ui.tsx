import { PropsWithChildren, useRef, useEffect } from "react";
import { useView } from "./view-context";
import type SceneView from "@arcgis/core/views/SceneView";

type Position = NonNullable<
  Exclude<Parameters<SceneView['ui']['add']>[1], string | undefined>['position']
>
interface ViewUIProps {
  position: Position;
  index?: number;
}

export function ViewUI({ position, index, children }: PropsWithChildren<ViewUIProps>) {
  const view = useView();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (container) {
      view.ui.add(container, { position, index })

      return () => {
        try {
          view.ui.remove(container);
        } catch (error) {
          console.error(error);
        }
      }
    }
  }, [index, position, view]);

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  )
}
