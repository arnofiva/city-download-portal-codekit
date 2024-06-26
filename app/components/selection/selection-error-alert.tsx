import { CalciteAlert } from "@esri/calcite-components-react";
import { useSelectionActorRef } from "./selection-context";
import { EmittedSelectionErrorEvents } from "./actors/selection-machine";
import { RootShellPortal } from "../root-shell";
import ErrorAlertQueue from "../error-alert-queue";

export default function SelectionErrorAlert() {
  const selectionActor = useSelectionActorRef();

  return (
    <ErrorAlertQueue
      alertComponent={ErrorAlert}
      captureError={capture => {
        const subscription = selectionActor.on("*", capture);
        return subscription.unsubscribe;
      }}
    />
  )
}

interface ErrorAlertProps {
  type: StringHint<EmittedSelectionErrorEvents['type']>;
  onClose: () => void;
}
function ErrorAlert({ type, onClose }: ErrorAlertProps) {
  let title = "Selection failed"
  if (type === "create.error")
    title = "Selection failed";
  if (type === "update.error")
    title = "Update failed";


  let message = "An error occurred"
  if (type === "create.error")
    message = "An error occurred while making your selection";
  if (type === "update.error")
    message = "An error occurred while changing your selection";

  return (
    <RootShellPortal>
      <CalciteAlert icon kind="danger" label="Selection error" open autoClose onCalciteAlertClose={onClose}>
        <p slot="title">{title}</p>
        <p slot="message">{message}</p>
      </CalciteAlert>
    </RootShellPortal>
  )
}