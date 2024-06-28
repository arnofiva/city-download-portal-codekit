import { createActorContext, useSelector } from "@xstate/react";
import { ELEVATION_QUERY_ACTOR_ID, FEATURE_QUERY_ACTOR_ID, SelectionMachine } from "./actors/selection-machine";
import { ActorRefFrom } from "xstate";
import { FeatureQueryMachine } from "./actors/feature-query-machine";
import { ElevationQueryMachine } from "./actors/elevation-query-machine";

const context = createActorContext(SelectionMachine);

export const SelectionContext = context.Provider;

export const useSelectionActorRef = context.useActorRef;

export const useSelectionStateSelector = context.useSelector;

type FeatureQueryActorRef = ActorRefFrom<typeof FeatureQueryMachine>;
type ActorSnapshot<Actor> = Actor extends {
  getSnapshot(): infer TSnapshot;
} ? TSnapshot : undefined;

export function useFeatureQuerySelector<T>(
  selector: (state: ActorSnapshot<FeatureQueryActorRef> | undefined) => T,
  compare?: (a: T, b: T) => boolean
) {
  const featureQueryActor = useSelectionStateSelector(state => state.children[FEATURE_QUERY_ACTOR_ID] as FeatureQueryActorRef);
  return useSelector(featureQueryActor, selector, compare)
}

type ElevationQueryActorRef = ActorRefFrom<typeof ElevationQueryMachine>;
export function useElevationQuerySelector<T>(
  selector: (state: ActorSnapshot<ElevationQueryActorRef> | undefined) => T,
  compare?: (a: T, b: T) => boolean
) {
  const featureQueryActor = useSelectionStateSelector(state => state.children[ELEVATION_QUERY_ACTOR_ID] as ElevationQueryActorRef);
  return useSelector(featureQueryActor, selector, compare)
}