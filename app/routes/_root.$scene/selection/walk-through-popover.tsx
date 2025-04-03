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
import '@esri/calcite-components/dist/components/calcite-popover';
import { CalcitePopover } from "@esri/calcite-components-react";
import { useEffect, useRef, useState } from "react";
import { useWalkthrough, useWalkthroughSelector } from "./walk-through-context";
import { useSceneView } from "~/arcgis/components/views/scene-view/scene-view-context";
import { SketchTooltip } from "~/arcgis/components/sketch/sketch";

const WalkthroughContent = [
  `Navigate to an area of interest and select an area for download. You can use the Search widget in the top left corner to navigate to an address or coordinate.\n\nClick here to start making your selection.`,
  `Click on the map to place the origin point.`,
  `Click on the map to complete drawing`,
  `In the sidebar you can see precise information about your selection. You can adjust the selection as necessary on the map, and change the models origin point by clicking the "Set model origin" button.
  
  If you're happy with your selection you can click confirm.`,
  `Now you can download your selection as a 3D model.`,
  "",
  ""
] as const;

export default function WalkthroughPopover() {
  const view = useSceneView();

  const walkthrough = useWalkthrough();
  const popoverRef = useRef<HTMLCalcitePopoverElement>(null);
  const pos = useWalkthroughSelector(store => store.position) ?? 0;
  const elementReference = useWalkthroughSelector(store => store.referenceElement);

  const [forceClosed, setForceClose] = useState(false);
  const [openState, setOpen] = useState<boolean | null>(null);
  const open = !!openState && !forceClosed;

  useEffect(() => {
    if (!forceClosed && openState == null) {
      let timeout = -1;
      let mounted = true;

      view.when(() => {
        if (mounted) {
          timeout = setTimeout(() => setOpen(true), 2000) as any as number;
        }
      });

      return () => {
        mounted = false;
        clearTimeout(timeout)
      }
    }
  }, [forceClosed, openState, view])

  const content = WalkthroughContent[pos];

  /**
   * calcite dispatches a `calcitePopoverClose` event any time the open property changes
   * this makes it impossible to tell whether the popover was closed programatically, or dismissed by user interaction
   * this is a problem since changing the reference element causes a open -> closed -> open cycle, 
   * meaning we can't trivially detect whether the popover was dismissed forcefully by the user (so it should stay closed),
   * or whether it has just moved the next stage
   * 
   * to work around this, we detect whether the popover was clicked, and if it was we keep it closed.
   * otherwise, we let it proceed as originally planned.
   */
  const wasClosedByInteraction = useRef(false);

  const hasDoneWalkthrough = pos === 5;

  if (hasDoneWalkthrough) return (
    <SketchTooltip
      helpMessage="Press tab to enter or paste a precise coordinate"
      helpMessageIcon="information"
      inputEnabled
    />
  );
  if (elementReference == null) return (
    <SketchTooltip
      helpMessage="Press tab to enter or paste a precise coordinate"
      helpMessageIcon="information"
      inputEnabled
    />
  );

  return (
    <>
      <CalcitePopover
        ref={popoverRef}
        open={open}
        label="walk through"
        referenceElement={elementReference.id}
        placement={elementReference.placement}
        closable
        triggerDisabled
        className="z-[1000]"
        onClick={() => {
          wasClosedByInteraction.current = true;

          setTimeout(() => {
            wasClosedByInteraction.current = false
          }, 200)
        }}
        onCalcitePopoverClose={() => {
          if (wasClosedByInteraction.current) {
            setForceClose(true);
            walkthrough.state = 'done';
          }
          wasClosedByInteraction.current = false;
        }}
      >
        <div className="max-w-[350px] p-4 whitespace-pre-wrap">
          {content}
        </div>
      </CalcitePopover>
      <SketchTooltip
        helpMessage="Press tab to enter or paste a precise coordinate"
        helpMessageIcon="information"
        inputEnabled
      />
    </>
  )
}