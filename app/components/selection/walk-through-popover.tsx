import { CalcitePopover } from "@esri/calcite-components-react";
import { useEffect, useRef, useState } from "react";
import { useWalkthrough, useWalkthroughSelector } from "./walk-through-context";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import { SketchTooltip } from "../arcgis/sketch/sketch";

const WalkthroughContent = [
  `Navigate to an area of interest and select an area for download. You can use the Search widget in the top left corner to navigate to an address or coordinate.\n\nClick here to start making your selection.`,
  `Click on the map to place the origin point.`,
  `Click on the map to complete drawing`,
  `Here you can see precise information about your selection. You can adjust it if necessary on the map, otherwise click the button to confirm.`,
  `Now you can download your selection as a 3D model.`,
  "",
  ""
] as const;

export function completeWalkthrough() {
  window.dispatchEvent(new Event("complete-walkthrough"));
  localStorage.setItem("WALKTHROUGH", "true");
}

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

  const hasDoneWalkthrough = localStorage.getItem('WALKTHROUGH') ?? false;

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
            walkthrough.advance('done');
            localStorage.setItem("WALKTHROUGH", "true")
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