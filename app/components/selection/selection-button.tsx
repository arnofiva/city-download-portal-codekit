import { CalciteButton } from "@esri/calcite-components-react";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import { useEffect, useState } from "react";
import { useGraphicsLayer } from "~/components/arcgis/graphics-layer";
import { useAccessorValue } from "~/hooks/reactive";
import { useSelectionActorRef, useSelectionStateSelector } from "./selection-context";

export function SelectionAction() {
  const actor = useSelectionActorRef();

  const view = useSceneView();
  const graphics = useGraphicsLayer();

  const viewReady = useAccessorValue(() => view.ready ?? false, { initial: true });

  const isSketchMachineUninitialized = useSelectionStateSelector(state => state.matches("uninitialized"));
  useEffect(() => {
    actor.send({ type: 'initialize', view, layer: graphics });
  }, [actor, graphics, isSketchMachineUninitialized, view]);

  const isIdle = useSelectionStateSelector(state =>
    state.matches('uninitialized') ||
    state.matches({ initialized: 'nonExistent' }) ||
    state.matches({ initialized: { created: 'idle' } })
  )

  const [hasBeenActive, setState] = useState(false);

  if (!hasBeenActive && !isIdle) {
    setState(true);
  }

  const text = !hasBeenActive ? 'Select area' : 'New selection';

  const appearance: HTMLCalciteButtonElement['appearance'] =
    hasBeenActive
      ? 'outline-fill'
      : 'solid';

  const action = () => actor.send({ type: 'create.start' });

  return (
    <CalciteButton
      scale="l"
      iconStart="rectangle-plus"
      disabled={!viewReady || !isIdle}
      onClick={action}
      kind="brand"
      appearance={appearance}
      id="select-action"
    >
      {text}
    </CalciteButton>
  )
}
