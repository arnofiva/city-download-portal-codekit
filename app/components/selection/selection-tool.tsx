import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CalciteButton } from "@esri/calcite-components-react";
import PointTool from "~/components/arcgis/sketch/tools/point-tool";
import { Point, Polygon } from "@arcgis/core/geometry";
import { useReferenceElementId, useWalkthrough } from "~/components/selection/walk-through-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import WalkthroughPopover from "~/components/selection/walk-through-popover";
import { RootShellPortal } from "~/components/root-shell";
import { useSelectionActor } from "./selection";

interface SelectionProps {
  onChange?: (selection: Polygon | null) => void;
}
function InternalSelectionTool({
  onChange
}: SelectionProps) {
  const view = useSceneView();
  const viewReady = useAccessorValue(() => view.ready);

  const walkthrough = useWalkthrough();
  const id = useReferenceElementId([
    'not-started',
    'placing-origin',
    'placing-terminal',
  ],
    'top');

  const [state, send] = useSelectionActor();

  const origin = state.context.origin;
  const terminal = state.context.terminal;

  const polygon = useMemo(() => (
    origin != null && terminal != null
      ? createSelectionPolygon(origin, terminal)
      : null
  ), [origin, terminal]);

  const currentOnChange = useRef(onChange);
  useEffect(() => {
    currentOnChange.current = onChange;
  })

  useEffect(() => {
    currentOnChange.current?.(polygon)
  }, [onChange, polygon]);

  const isIdle =
    state.matches('notStarted') ||
    state.matches('created');

  const [hasBeenActive, setState] = useState(false);

  if (!hasBeenActive && !isIdle) {
    setState(true);
  }

  let text = 'Select area';
  if (hasBeenActive) text = 'New selection'
  if (state.matches('creating') || state.matches('maybeRecreating')) text = 'Cancel selection'

  const appearance: HTMLCalciteButtonElement['appearance'] =
    hasBeenActive
      ? 'outline-fill'
      : 'solid';

  return (
    <>
      <PointTool
        onStart={() => {
          send({ type: 'create.start' });
          if (state.matches({ creating: 'placingOrigin' }))
            walkthrough.advance('placing-origin');
          if (state.matches({ creating: 'placingTerminal' }))
            walkthrough.advance('placing-terminal');
        }}
        onActive={(point) => send({ type: 'create.active', point })}
        onComplete={(point) => {
          send({ type: 'create.complete', point });

          if (state.matches({ creating: 'placingTerminal' }))
            walkthrough.advance('confirm');
        }}
        onCancel={() => send({ type: 'cancel' })}
      >
        {() => (
          <CalciteButton
            id={id}
            scale="l"
            iconStart="rectangle-plus"
            disabled={!viewReady}
            kind="brand"
            appearance={appearance}
            onClick={() => {
              if (isIdle) send({ type: 'create.start' })
              else send({ type: 'cancel' })
            }}
          >
            {text}
          </CalciteButton>
        )}
      </PointTool>
      <RootShellPortal>
        <WalkthroughPopover />
      </RootShellPortal>
    </>
  )
}

function createSelectionPolygon(origin: Point, terminal: Point) {
  return new Polygon({
    rings: [[
      [origin.x, origin.y],
      [origin.x, terminal.y],
      [terminal.x, terminal.y],
      [terminal.x, origin.y],
      [origin.x, origin.y],
    ]],
    spatialReference: origin.spatialReference,
  })
}

const SelectionTool = memo(InternalSelectionTool);
export default SelectionTool;