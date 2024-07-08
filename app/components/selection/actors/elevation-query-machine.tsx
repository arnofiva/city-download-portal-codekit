import Ground from "@arcgis/core/Ground";
import { Multipoint, Point, Polygon } from "@arcgis/core/geometry";
import { ActorRefFrom, assign, fromPromise, setup, stopChild } from "xstate";

interface QueryElevationInput {
  ground: Ground
  selection: Polygon | null
}
async function queryElevation({ input, signal }: { input: QueryElevationInput, signal: AbortSignal }) {
  const { ground, selection } = input;

  if (selection != null) {
    const multipoint = new Multipoint({
      points: selection.rings[0],
      spatialReference: selection.spatialReference
    })
    try {
      const result = await ground.queryElevation(multipoint, { signal });
      return result.geometry as Multipoint;
    } catch (_error) {
      return null;
    }
  } else {
    return null;
  }
}

const QUERY_ELEVATION_ACTOR_ID = 'query';

export const ElevationQueryMachine = setup({
  types: {
    context: {} as ElevationQueryMachineContext,
    events: {} as ElevationQueryEvent,
    input: {} as ElevationQueryMachineInput,
  },
  actions: {
    updatePosition: assign({
      selection: (_, selection: Polygon) => selection,
    }),
    assignResult: assign({
      elevationInfo: (_, result: { corners: Multipoint | null }) => result.corners,
    }),
    updateActiveQuery: assign({
      activeQuery: (
        { context, spawn, self },
        params: { selection: Polygon | null, ground: Ground } | null
      ) => {
        if (params == null) return context.activeQuery;

        const { ground, selection } = params;
        const actor = spawn('query', { input: { ground, selection }, id: QUERY_ELEVATION_ACTOR_ID })
        actor.subscribe(snapshot => {
          if (snapshot.status === "done") {
            self.send({ type: 'changeElevation', elevationInfo: snapshot.output });
          }
        });

        return actor;
      }
    })
  },
  actors: {
    query: fromPromise(queryElevation),
  },
  guards: {
    hasPosition: ({ event }) => event.type === 'changePosition' && event.selection != null,
  }
}).createMachine({
  context: ({ input }) => ({
    ground: input.ground,
    position: null,
    selection: null,
    activeQuery: null,
    elevationInfo: null,
  }),
  initial: 'idle',
  states: {
    idle: {},
    querying: {
      entry: [
        stopChild(QUERY_ELEVATION_ACTOR_ID),
        {
          type: 'updateActiveQuery',
          params: ({ event }) => {
            if (event.type === 'changePosition')
              return { selection: event.selection, ground: event.ground };
            else return null;
          }
        }
      ],
    },
  },
  on: {
    changePosition: [
      {
        target: '.querying',
        guard: 'hasPosition',
        actions: {
          type: "updatePosition",
          params: ({ event }) => event.selection!,
        },
      },
      {
        target: '.idle',
        actions: [
          stopChild(QUERY_ELEVATION_ACTOR_ID),
          assign({
            activeQuery: null,
            position: null,
          })
        ]
      }
    ],
    changeElevation: {
      actions: {
        type: 'assignResult',
        params: ({ event }) => ({
          corners: event.elevationInfo,
        })
      }
    }
  }
});

type ElevationQueryMachineInput = {
  ground: Ground
};

type ElevationQueryMachineContext = {
  ground: Ground
  position: Point | null
  selection: Polygon | null
  activeQuery: ActorRefFrom<ReturnType<typeof queryElevation>> | null,
  elevationInfo: Multipoint | null;
}

type ElevationQueryEvent =
  | { type: 'changePosition', selection: Polygon | null, ground: Ground }
  | { type: 'changeElevation', elevationInfo: Multipoint | null };


