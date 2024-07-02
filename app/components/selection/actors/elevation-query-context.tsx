import { useActorRef, useSelector } from "@xstate/react";
import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context";
import { PropsWithChildren, createContext, useContext, useEffect } from "react";
import { ActorRefFrom } from "xstate";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useAccessorValue } from "~/hooks/reactive";
import { ElevationQueryMachine } from "./elevation-query-machine";

const ElevationQueryContext = createContext<ActorRefFrom<typeof ElevationQueryMachine>>(null!);
export function ElevationQueryProvider({ children }: PropsWithChildren) {
  const view = useSceneView();
  const ground = useAccessorValue(() => view.map.ground)!;

  const ref = useActorRef(ElevationQueryMachine, { input: { ground } });

  const origin = useSelectionStateSelector((store) => store.origin) ?? null

  useEffect(() => {
    ref.send({ type: 'changePosition', position: origin, ground })
  }, [ref, ground, origin])

  return (
    <ElevationQueryContext.Provider value={ref}>
      {children}
    </ElevationQueryContext.Provider>
  )
}

type ElevationQueryActorRef = ActorRefFrom<typeof ElevationQueryMachine>;
type ActorSnapshot<Actor> = Actor extends {
  getSnapshot(): infer TSnapshot;
} ? TSnapshot : undefined;

export function useElevationQuerySelector2<T>(
  selector: (state: ActorSnapshot<ElevationQueryActorRef> | undefined) => T,
  compare?: (a: T, b: T) => boolean
) {
  const featureQueryActor = useContext(ElevationQueryContext);
  return useSelector(featureQueryActor, selector, compare)
}