import { Point, Polygon } from "@arcgis/core/geometry";
import { assign, enqueueActions, setup } from "xstate";
import CoreGraphic from "@arcgis/core/Graphic";

export type SelectionEvent =
  | { type: 'create.start' }
  | { type: 'create.active', point: Point }
  | { type: 'create.complete', point: Point }
  | { type: 'graphic-change', graphic: CoreGraphic }
  | { type: 'cancel' }
  | { type: 'delete' }
  | { type: 'update.start' }
  | { type: 'update.active', polygon: Polygon }
  | { type: 'update.complete' }

export type SelectionContext = {
  origin: Point | null;
  terminal: Point | null;
  graphic: CoreGraphic | null;
  hasCreated: boolean;
  startCreation: () => void;
  cancel: () => void;
  startUpdate: (graphic: CoreGraphic) => void;
  completeUpdate: () => void;
};

export type SelectionInput = {
  startCreation: () => void;
  cancelOperation: () => void;
  startUpdate: (graphic: CoreGraphic) => void;
  completeUpdate: () => void;
};

export const createSelectionMachine = setup({
  types: {
    context: {} as SelectionContext,
    events: {} as SelectionEvent,
    input: {} as SelectionInput
  },
  actions: {
    startDrawing: ({ context }) => context.startCreation(),
    startUpdate: ({ context }, graphic: CoreGraphic) => context.startUpdate(graphic),
    completeUpdate: ({ context }) => context.completeUpdate(),
    updateOrigin: assign({
      origin: (_, point: Point) => point,
      terminal: null
    }),
    updateTerminal: assign({
      terminal: (_, point: Point) => point
    }),
    updatePolygon: assign((_, { origin, terminal }: { origin: Point, terminal: Point }) => ({
      origin, terminal
    })),
    clear: enqueueActions(({ enqueue, context }) => {
      context.cancel()
      enqueue.assign({
        origin: null,
        terminal: null,
      })
    })
  }
})
  .createMachine({
    context: ({ input }) => ({
      origin: null,
      terminal: null,
      graphic: null,
      hasCreated: false,
      startCreation: input.startCreation,
      cancel: input.cancelOperation,
      startUpdate: input.startUpdate,
      completeUpdate: input.completeUpdate,
    }),
    initial: 'notStarted',
    states: {
      notStarted: {
        on: {
          'create.start': {
            target: 'creating'
          }
        }
      },
      creating: {
        initial: 'placingOrigin',
        states: {
          placingOrigin: {
            entry: ['clear', 'startDrawing'],
            on: {
              'create.complete': {
                target: 'placingTerminal',
                actions: {
                  type: 'updateOrigin',
                  params: ({ event }) => event.point
                }
              },
              cancel: {
                actions: 'clear',
                target: '#(machine).notStarted',
              }
            }
          },
          placingTerminal: {
            entry: ['startDrawing', assign({ hasCreated: false })],
            on: {
              'create.active': {
                actions: {
                  type: 'updateTerminal',
                  params: ({ event }) => event.point
                }
              },
              'create.complete': {
                target: '#(machine).created',
                actions: {
                  type: 'updateTerminal',
                  params: ({ event }) => event.point
                }
              },
              cancel: {
                // if there was already a selection, it should probably be restored
                target: '#(machine).notStarted',
                actions: 'clear',
              }
            }
          },
        }
      },
      created: {
        initial: 'idle',
        entry: assign({ hasCreated: true }),
        states: {
          idle: {
            on: {
              'update.start': {
                target: 'updating',
                actions: {
                  type: 'startUpdate',
                  params: ({ context }) => context.graphic!
                }
              },
            }
          },
          updating: {
            on: {
              'update.active': {
                actions: {
                  type: 'updatePolygon',
                  params: ({ context, event }) => {
                    const [
                      oo,
                      ot,
                      tt,
                      to,
                    ] = event.polygon.rings[0];

                    const currentOrigin = context.origin!;
                    const currentTerminal = context.terminal!;

                    if (oo[0] !== currentOrigin.x || oo[1] !== currentOrigin.y) {
                      const origin = currentOrigin.clone();
                      origin.x = oo[0];
                      origin.y = oo[1];

                      return { origin, terminal: currentTerminal }
                    }

                    if (ot[0] !== currentOrigin.x || ot[1] !== currentTerminal.y) {
                      const origin = currentOrigin.clone();
                      origin.x = ot[0];

                      const terminal = currentTerminal.clone();
                      terminal.y = ot[1];

                      return { origin, terminal }
                    }

                    if (tt[0] !== currentTerminal.x || tt[1] !== currentTerminal.y) {
                      const terminal = currentTerminal.clone();
                      terminal.x = tt[0];
                      terminal.y = tt[1];

                      return { terminal, origin: currentOrigin }
                    }

                    if (to[0] !== currentTerminal.x || to[1] !== currentOrigin.y) {
                      const terminal = currentTerminal.clone();
                      terminal.x = to[0];

                      const origin = currentOrigin.clone();
                      origin.y = to[1];

                      return { origin, terminal }
                    }

                    return { origin: currentOrigin, terminal: currentTerminal }
                  }
                }
              },
              'update.complete': {
                target: 'idle',
                actions: 'completeUpdate',
              },
            }
          },
        },
        on: {
          'create.start': {
            target: 'maybeRecreating',
          },
          'create.complete': {
            target: '.idle',
          },
          'cancel': {
            target: '.idle',
          }
        }
      },
      maybeRecreating: {
        entry: 'startDrawing',
        on: {
          'create.complete': {
            target: '#(machine).creating.placingTerminal',
            actions: {
              type: 'updateOrigin',
              params: ({ event }) => event.point
            }
          },
          cancel: {
            target: 'created.idle',
          }
        }
      }
    },
    on: {
      delete: {
        target: '.notStarted',
        actions: 'clear'
      },
      "graphic-change": {
        actions: assign({
          graphic: ({ event }) => event.graphic,
        })
      }
    }
  });