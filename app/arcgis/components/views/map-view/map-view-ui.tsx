/* Copyright 2024 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
