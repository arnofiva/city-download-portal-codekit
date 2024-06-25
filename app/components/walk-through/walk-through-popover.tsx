import { CalcitePopover } from "@esri/calcite-components-react";
import { useSelectionStateSelector } from "../selection/selection-context";
import { ComponentProps, useEffect, useRef, useState } from "react";

const WalkthroughContent2 = [
  `Navigate to an area of interest and select an area for download. You use the Search widget in the top left corner to navigate to an address or coordinate.\n\nUse the interactive drawing tool to specify the area`,
  `Place an origin point to begin the selection.\n\nYou can click on the map to place the point, or you can press tab to open the tooltip and enter or paste in precise coordinates.`,
  `Place a terminal point to complete the selection.\n\nYou can click on the map to place the point, or you can press tab to open the tooltip and enter or paste in precise coordinates.`,
  `You can copy the coordinates of your origin point, either as a comma separated pair of latitude, longitude, or as a WKT string.`,
  `Now you can download the selected slice as a 3D model.`,
] as const;

export function completeWalkthrough() {
  window.dispatchEvent(new Event("complete-walkthrough"));
  localStorage.setItem("WALKTHROUGH", "true");
}

export default function WalkthroughPopover() {
  const [completedStep, setCompletedStep] = useState(0);
  const [forceClosed, setForceClose] = useState(false);

  const selectionState = useSelectionStateSelector((state) => {
    if (state.matches("uninitialized") || state.matches({ initialized: 'nonExistent' })) {
      return 0;
    }
    if (state.matches({ initialized: { creating: 'origin' } })) {
      return 1;
    }
    if (state.matches({ initialized: { creating: 'terminal' } })) {
      return 2;
    }
    if (state.matches({ initialized: { created: 'updating' } })) {
      return 3;
    }

    return 4;
  });

  if (selectionState > completedStep) {
    setCompletedStep(step => selectionState > step ? selectionState : step);
  }

  const content = WalkthroughContent2[completedStep];

  let ref = 'select-action'

  type Placement = ComponentProps<typeof CalcitePopover>['placement'];
  let placement: Placement = 'top';
  if (completedStep === 3) {
    ref = 'copy-origin';
    placement = 'left';
  }
  if (completedStep === 4) {
    ref = 'download'
    placement = 'left'
  }

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

  useEffect(() => {
    window.addEventListener("complete-walkthrough", () => {
      setForceClose(true);
    })
  }, [])

  const hasDoneWalkthrough = localStorage.getItem('WALKTHROUGH') ?? false;

  if (hasDoneWalkthrough) return null;

  return (
    <CalcitePopover
      open={!forceClosed}
      label="walk through"
      referenceElement={ref}
      placement={placement}
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
          localStorage.setItem("WALKTHROUGH", "true")
        }
        wasClosedByInteraction.current = false;
      }}
    >
      <div className="max-w-[350px] p-4 whitespace-pre-wrap">
        {content}
      </div>
    </CalcitePopover>
  )
}