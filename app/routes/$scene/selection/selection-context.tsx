import { createActorContext } from "@xstate/react";
import SelectionMachine from "./selection-machine";

const context = createActorContext(SelectionMachine);

export const SelectionContext = context.Provider;

export const useSelectionActorRef = context.useActorRef;

export const useSelectionStateSelector = context.useSelector;