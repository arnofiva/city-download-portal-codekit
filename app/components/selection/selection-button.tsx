import { CalciteButton } from "@esri/calcite-components-react";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import { useEffect } from "react";
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
  }, [actor, graphics, isSketchMachineUninitialized, view])

  const state = useSelectionStateSelector((state) => {
    switch (true) {
      default:
      case state.matches('uninitialized'):
        return 'uninitialized';
      case state.matches({ initialized: 'nonExistent' }): {
        return 'idle'
      }
      case state.matches({ initialized: "creating" }): {
        return 'creating'
      }
      case state.matches({ initialized: { created: 'idle' } }): {
        return 'ready'
      }
      case state.matches({ initialized: { created: 'updating' } }): {
        return 'updating'
      }
    }
  });

  let text2 = 'Select area'
  if (state === "idle") {
    text2 = 'Select area'
  }
  if (state === "creating") {
    text2 = 'Cancel selection'
  }
  if (state === "updating") {
    text2 = 'Confirm selection'
  }
  if (state === "ready") {
    text2 = 'New selection'
  }

  let action = () => actor.send({ type: 'create.start' });
  if (state === "idle") {
    action = () => actor.send({ type: 'create.start' });
  }
  if (state === "creating") {
    action = () => actor.send({ type: 'create.cancel' });
  }
  if (state === "updating") {
    action = () => actor.send({ type: 'update.complete' });
  }
  if (state === "ready") {
    action = () => actor.send({ type: 'create.start' });
  }

  return (
    <CalciteButton
      scale="l"
      iconStart="rectangle-plus"
      disabled={!viewReady || state === "uninitialized"}
      onClick={action}
    >
      {text2}
    </CalciteButton>
  )
}
