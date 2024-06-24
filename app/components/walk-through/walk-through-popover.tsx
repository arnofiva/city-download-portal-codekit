import { CalcitePopover } from "@esri/calcite-components-react";
import { useSelectionStateSelector } from "../selection/selection-context";
import { useRef, useState } from "react";

type WalkthroughState = keyof typeof WalkthroughContent

const WalkthroughContent = {
  uninitialized: `Navigate to an area of interest and select an area for download. You use the Search widget in the top left corner to navigate to an address or coordinate.\n\nUse the interactive drawing tool to specify the area`,
  'creating.origin': `Place an origin point to begin the selection.\n\nYou can click on the map to place the point, or you can press tab to open the tooltip and enter or paste in precise coordinates.`,
  'creating.terminal': `Place a terminal point to complete the selection.\n\nYou can click on the map to place the point, or you can press tab to open the tooltip and enter or paste in precise coordinates.`,
  'created.updating': `You can copy the coordinates of your origin point, either as a comma separated pair of latitude, longitude, or as a WKT string.`,
  'created.finished': `Now you can download the selected slice as a 3D model.`,
} as const;

export default function WalkthroughPopover() {
  const [forceClosed, setForceClose] = useState(false);

  const selectionState: WalkthroughState = useSelectionStateSelector((state) => {
    if (state.matches("uninitialized") || state.matches({ initialized: 'nonExistent' })) {
      return 'uninitialized';
    }
    if (state.matches({ initialized: { creating: 'origin' } })) {
      return 'creating.origin';
    }
    if (state.matches({ initialized: { creating: 'terminal' } })) {
      return 'creating.terminal';
    }
    if (state.matches({ initialized: { created: 'updating' } })) {
      return 'created.updating';
    }

    return 'created.finished';
  });

  let ref = 'select-action'
  if (selectionState === "created.updating") {
    ref = 'copy-origin';
  }
  if (selectionState === 'created.finished') {
    ref = 'download'
  }

  const referenceElement =
    selectionState === "uninitialized" || selectionState === 'creating.origin' || selectionState === "creating.terminal" ? "select-action" : "copy-origin"

  const placement = referenceElement === "select-action" ? 'top' : 'left';

  const content = WalkthroughContent[selectionState];

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
          setForceClose(true)
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