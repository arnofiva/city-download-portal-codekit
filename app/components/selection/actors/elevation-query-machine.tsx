import Ground from "@arcgis/core/Ground";
import { Point } from "@arcgis/core/geometry";
import { ActorRefFrom, assign, fromPromise, setup, stopChild } from "xstate";

interface QueryFeaturesInput {
  ground: Ground
  position: Point | null
}
async function queryElevation({ input, signal }: { input: QueryFeaturesInput, signal: AbortSignal }) {
  const { ground, position } = input;

  if (position == null) return null;

  try {
    const result = await ground.queryElevation(position, { signal });
    return result.geometry as Point;
  } catch (error) {
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
      position: (_, point: Point) => point
    }),
    assignResult: assign({
      result: (_, result: Point | null) => result,
    }),
    updateActiveQuery: assign({
      activeQuery: ({ context, spawn, self }, params: { position: Point | null, ground: Ground } | null) => {
        if (params == null) return context.activeQuery;

        const { position, ground } = params;
        const actor = spawn('query', { input: { ground, position }, id: QUERY_ELEVATION_ACTOR_ID })
        actor.subscribe(snapshot => {
          if (snapshot.status === "done") {
            self.send({ type: 'changeElevation', result: snapshot.output });
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
    hasPosition: ({ event }) => event.type === 'changePosition' && event.position != null,
  }
}).createMachine({
  context: ({ input }) => ({
    ground: input.ground,
    position: null,
    activeQuery: null,
    result: null,
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
            if (event.type === 'changePosition') return { position: event.position, ground: event.ground };
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
          params: ({ event }) => event.position!
        },
      },
      {
        target: '.idle',
      }
    ],
    changeElevation: {
      actions: {
        type: 'assignResult',
        params: ({ event }) => event.result
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
  activeQuery: ActorRefFrom<ReturnType<typeof queryElevation>> | null,
  result: Point | null;
}

type ElevationQueryEvent =
  | { type: 'changePosition', position: Point | null, ground: Ground }
  | { type: 'changeElevation', result: Point | null };


