import { useActorRef, useSelector } from "@xstate/react";
import { FeatureQueryMachine } from "./feature-query-machine";
import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context";
import { PropsWithChildren, createContext, useContext, useEffect } from "react";
import { ActorRefFrom } from "xstate";
import { useSelectionStateSelector } from "~/data/selection-store";

const FeatureQueryContext = createContext<ActorRefFrom<typeof FeatureQueryMachine>>(null!);
export function FeatureQueryProvider({ children }: PropsWithChildren) {
  const view = useSceneView();

  const ref = useActorRef(FeatureQueryMachine, { input: { view } });

  const selection = useSelectionStateSelector((store) => store.selection) ?? null;

  useEffect(() => {
    ref.send({ type: 'changeSelection', selection })
  }, [ref, selection])

  return (
    <FeatureQueryContext.Provider value={ref}>
      {children}
    </FeatureQueryContext.Provider>
  )
}

type FeatureQueryActorRef = ActorRefFrom<typeof FeatureQueryMachine>;
type ActorSnapshot<Actor> = Actor extends {
  getSnapshot(): infer TSnapshot;
} ? TSnapshot : undefined;

export function useFeatureQuerySelector2<T>(
  selector: (state: ActorSnapshot<FeatureQueryActorRef> | undefined) => T,
  compare?: (a: T, b: T) => boolean
) {
  const featureQueryActor = useContext(FeatureQueryContext);
  return useSelector(featureQueryActor, selector, compare)
}