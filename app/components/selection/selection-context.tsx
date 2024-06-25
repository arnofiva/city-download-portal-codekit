import { createActorContext, useSelector } from "@xstate/react";
import { SelectionMachine } from "./actors/selection-machine";
import { ActorRefFrom } from "xstate";
import { FeatureQueryMachine } from "./actors/feature-query-machine";

const context = createActorContext(SelectionMachine);

export const SelectionContext = context.Provider;

export const useSelectionActorRef = context.useActorRef;

export const useSelectionStateSelector = context.useSelector;

type FeatureQueryActorRef = ActorRefFrom<typeof FeatureQueryMachine>;
type ActorSnapshot<Actor> = Actor extends {
  getSnapshot(): infer TSnapshot;
} ? TSnapshot : undefined;

export function useFeatureQuerySelector<T>(selector: (state: ActorSnapshot<FeatureQueryActorRef> | undefined) => T, compare?: (a: T, b: T) => boolean) {
  const featureQueryActor = useSelectionStateSelector(state => state.children['feature-query'] as ActorRefFrom<typeof FeatureQueryMachine>);
  return useSelector(featureQueryActor, selector, compare)
}