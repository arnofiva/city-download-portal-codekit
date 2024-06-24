import { Point, Polygon } from "@arcgis/core/geometry";
import { contains } from "@arcgis/core/geometry/geometryEngine";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SceneView from "@arcgis/core/views/SceneView";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import { ActorRefFrom, assign, enqueueActions, fromCallback, log, sendTo, setup, stopChild } from "xstate";
import { FeatureQueryMachine } from "./feature-query-machine";
import { PlacePointActor } from "./place-point-actor";
import { editPolygonActor } from "./update-polygon-actor";
import { alignPolygonAfterChange } from "./utilities";

const updateOnClickCallback = fromCallback<any, { sketch: SketchViewModel, polygon: Polygon }>(({ input }) => {
  const sketch = input.sketch;
  const view = sketch.view;
  const layer = sketch.layer;
  const polygon = input.polygon;

  const handle = view.on("click", (event) => {
    if (contains(polygon, event.mapPoint)) {
      event.stopPropagation();
      sketch.update(layer.graphics.find(graphic => graphic.geometry.type === "polygon"))
    }
  })

  return handle.remove;
});

type SketchEvent =
  | { type: 'create.start' }
  | { type: 'create.active', point: Point }
  | { type: 'create.complete', point?: Point }
  | { type: 'create.cancel', point?: Point }
  | { type: 'update.start', polygon?: Polygon }
  | { type: 'update.active', polygon: Polygon }
  | { type: 'update.complete', polygon?: Polygon }
  | { type: 'initialize', view: SceneView, layer: GraphicsLayer }

type SketchMachineContext = {
  sketch: SketchViewModel;
  origin: Point | null;
  terminal: Point | null;
  polygon: Polygon | null;
  shouldUpdateAfterCreation: boolean;
  featureQuery: ActorRefFrom<typeof FeatureQueryMachine> | null,
}

type SketchMachineInput = {
  layer: GraphicsLayer;
  view: SceneView;
}

const FEATURE_QUERY_ACTOR_ID = 'feature-query';

const updateOptions = {
  tool: 'reshape',
  reshapeOptions: {
    edgeOperation: 'offset',
    shapeOperation: 'none',
    vertexOperation: 'move-xy'
  },
  enableRotation: false,
  enableScaling: false,
  enableZ: false,
  multipleSelectionEnabled: false,
  toggleToolOnClick: false,
} as const;
export const SelectionMachine = setup({
  types: {
    context: {} as SketchMachineContext,
    events: {} as SketchEvent,
    input: {} as SketchMachineInput
  },
  actions: {
    assignOrigin: enqueueActions(({ enqueue }, point: Point | null = null) => {
      enqueue(({ context }) => context.sketch.layer.removeAll());

      enqueue.assign({ origin: point, terminal: null, polygon: null });
    }),
    assignTerminal: assign({
      terminal: (_, { terminal, }: { terminal: Point, origin: Point }) => terminal,
      polygon: (_, { terminal, origin }) => {
        const polygon = new Polygon({
          rings: [[
            [origin.x, origin.y],
            [origin.x, terminal.y],
            [terminal.x, terminal.y],
            [terminal.x, origin.y],
            [origin.x, origin.y]
          ]],
          spatialReference: origin.spatialReference
        })
        return polygon;
      }
    }),
    assignPolygon: assign(({ context }, { next, previous }: { next: Polygon, previous: Polygon | null }) => {
      if (previous == null) return ({
        ...context,
        polygon: next,
      })

      const { origin, terminal } = context;

      const alignedPolygon = alignPolygonAfterChange(next, previous)
      const alignedRing = alignedPolygon.rings[0];

      const nextOrigin = origin!.clone() as Point;
      nextOrigin.x = alignedRing[0][0];
      nextOrigin.y = alignedRing[0][1];

      const nextTerminal = terminal!.clone() as Point;
      nextTerminal.x = alignedRing[2][0];
      nextTerminal.y = alignedRing[2][1];

      return ({
        ...context,
        origin: nextOrigin,
        terminal: nextTerminal,
        polygon: alignedPolygon,
      })
    }),
    cancel: enqueueActions(({ enqueue }) => {
      enqueue(({ context }) => context.sketch.layer.removeAll())
      enqueue.assign({ origin: null, terminal: null, polygon: null });
    }),
    stopFeatureQuery: stopChild(FEATURE_QUERY_ACTOR_ID),
    startFeatureQuery: assign({
      featureQuery: ({ spawn }, view: SceneView) => spawn(
        "featureQueryMachine",
        {
          input: { view },
          id: FEATURE_QUERY_ACTOR_ID
        })
    }),
    updateFeatureQueryGeometry: sendTo(({ context }) => context.featureQuery!, ({ context }) => ({ type: 'changeSelection', selection: context.polygon })),
  },
  actors: {
    updateOnClickCallback,
    featureQueryMachine: FeatureQueryMachine,
    placePoint: PlacePointActor,
    updatePolygon: editPolygonActor
  },
})
  .createMachine({
    context: ({
      sketch: null!,
      origin: null,
      terminal: null,
      polygon: null,
      shouldUpdateAfterCreation: true,
      featureQuery: null
    }),
    initial: 'uninitialized',
    states: {
      uninitialized: {
        on: {
          initialize: {
            target: 'initialized',
            actions: assign({
              sketch: ({ context, event }) => {
                const layer = event.layer;
                const view = event.view;
                console.log('wtf?')
                if (context.sketch) context.sketch.destroy();

                return new SketchViewModel({
                  view,
                  layer,
                  defaultUpdateOptions: updateOptions
                })
              }
            })
          }
        }
      },
      initialized: {
        initial: 'nonExistent',
        invoke: {
          src: fromCallback<any, SketchViewModel>(({ input, sendBack }) => {
            const handle = input.on("update", (event) => {
              if (event.state === 'start') sendBack({ type: `update.${event.state}` })
            })

            return handle.remove
          }),
          input: ({ context }) => context.sketch
        },
        states: {
          nonExistent: {
            entry: ['stopFeatureQuery'],
            on: {
              "create.start": {
                target: 'creating'
              }
            }
          },
          creating: {
            initial: "origin",
            entry: [
              'stopFeatureQuery',
              {
                type: 'startFeatureQuery',
                params: ({ context }) => context.sketch.view as SceneView,
              }
            ],
            states: {
              origin: {
                invoke: {
                  src: 'placePoint',
                  input: ({ context }) => ({ sketch: context.sketch }),
                  onDone: [
                    {
                      target: "terminal",
                      actions: {
                        type: 'assignOrigin',
                        params: ({ event }) => event.output,
                      },
                    },
                    {
                      target: "#(machine).initialized.nonExistent",
                      actions: ['cancel'],
                    },
                  ],
                  onError: {
                    target: "#(machine).initialized.nonExistent",
                    actions: 'cancel',
                  },
                },
              },
              terminal: {
                invoke: {
                  src: "placePoint",
                  input: ({ context, self }) => ({
                    sketch: context.sketch,
                    onUpdate: (point) => self.send({ type: "create.active", point })
                  }),
                  onDone: [
                    {
                      target: "#(machine).initialized.created.updating",
                      guard: ({ context }) => context.shouldUpdateAfterCreation,
                      actions: [
                        {
                          type: 'assignTerminal',
                          params: ({ event, context }) => ({ terminal: event.output, origin: context.origin! })
                        },
                      ],
                    },
                    {
                      target: "#(machine).initialized.created",
                      actions: [
                        {
                          type: 'assignTerminal',
                          params: ({ event, context }) => ({ terminal: event.output, origin: context.origin! })
                        },
                      ],
                    },
                    {
                      target: "#(machine).initialized.nonExistent",
                      actions: 'cancel',
                    },
                  ],
                  onError: {
                    target: "#(machine).initialized.nonExistent",
                    actions: ['cancel', log(({ event }) => event)],
                  },
                },
                on: {
                  "create.active": {
                    actions: [
                      {
                        type: 'assignTerminal',
                        params: ({ event, context }) => ({ terminal: event.point, origin: context.origin! })
                      },
                      'updateFeatureQueryGeometry'
                    ],
                  }
                }
              },
            },
          },
          created: {
            initial: 'idle',
            states: {
              idle: {
                entry: log('entering idle'),
                exit: log('leaving leaving'),
                invoke: {
                  src: "updateOnClickCallback",
                  input: ({ context }) => ({ sketch: context.sketch, polygon: context.polygon! })
                },
                on: {
                  'create.start': {
                    target: 'maybeCreating'
                  },
                  "update.start": {
                    target: "updating",
                  },
                }
              },
              maybeCreating: {
                entry: log('maybeCreating entry'),
                exit: log('maybeCreating exit'),
                invoke: {
                  src: 'placePoint',
                  input: ({ context }) => ({ sketch: context.sketch }),
                  onDone: [
                    {
                      target: "#(machine).initialized.creating.terminal",
                      actions: {
                        type: 'assignOrigin',
                        params: ({ event }) => event.output
                      }
                    },
                  ],
                  onError: {
                    target: "idle",
                  },
                },
              },
              updating: {
                entry: log('entering updating'),
                exit: log('leaving updating'),
                invoke: {
                  input: ({ context, self }) => ({
                    sketch: context.sketch,
                    onUpdate: (polygon) => self.send({ type: "update.active", polygon })
                  }),
                  onDone: { target: "idle" },
                  onError: { target: "idle" },
                  src: "updatePolygon",
                },
                on: {
                  "update.active": {
                    actions: [
                      {
                        type: 'assignPolygon',
                        params: ({ context, event }) => ({ next: event.polygon, previous: context.polygon })
                      },
                      'updateFeatureQueryGeometry'
                    ]
                  },
                  "update.complete": {
                    actions: ({ context }) => context.sketch.complete()
                  }
                }
              },
            }
          },
        }
      },
    }
  })


// function updateNeighboringVertices(ring: Ring, index: number, vertical: number, horizontal: number) {
//   const path = ring.slice(0, -1);

//   const [x, y] = path[index];

//   path[vertical][0] = x;
//   path[horizontal][1] = y;

//   path.push(path[0]);

//   return path
// }

// type Ring = Polygon['rings'][number];

// function alignPolygonAfterChange(nextPolygon: Polygon, previousPolygon: Polygon) {
//   const previous: Ring = previousPolygon.rings[0];
//   const next: Ring = nextPolygon.rings[0];

//   console.log(
//     {
//       previous,
//       next
//     }
//   )

//   const corner = next.findIndex(([x, y], index) => x !== previous[index][0] || y !== previous[index][1]);

//   console.log({ corner })

//   let alignedRing: Ring;
//   switch (corner) {
//     case 0:
//       alignedRing = updateNeighboringVertices(next, corner, 1, 3)
//       break;
//     case 1:
//       alignedRing = updateNeighboringVertices(next, corner, 0, 2)
//       break;
//     case 2:
//       alignedRing = updateNeighboringVertices(next, corner, 3, 1)
//       break;
//     case 3:
//       alignedRing = updateNeighboringVertices(next, corner, 2, 0)
//       break;
//     default:
//       alignedRing = next;
//   }

//   const alignedPolygon = nextPolygon.clone();
//   alignedPolygon.rings = [alignedRing];

//   return alignedPolygon;
// }

