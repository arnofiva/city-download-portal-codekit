import SceneView from "@arcgis/core/views/SceneView";
import Point from '@arcgis/core/geometry/Point';
import { setup, fromPromise, assign } from "xstate";
import invariant from "tiny-invariant";


export type SelectionEvent = | { type: "done" }
  | { type: "addView", view: SceneView }
  | { type: "create.start", point: Point }
  | { type: "create.cancel" }
  | { type: "create.commit", point: Point }
  | { type: "create.update", point: Point }
  | { type: 'update.update', origin: Point, terminal: Point };

const SelectionMachine = setup({
  types: {
    context: {} as {
      view: SceneView | null,
      origin: Point | null,
      terminal: Point | null,
    },
    events: {} as SelectionEvent,
  },
  actions: {
    assignView: assign({
      view: (_, view: SceneView) => view,
    }),
    assignOrigin: assign({
      origin: (_, point: Point) => point,
      terminal: null,
    }),
    assignTerminal: assign({
      terminal: (_, point: Point) => point,
    }),
    updateSelection: assign({
      origin: (_, { origin }: { origin: Point, terminal: Point }) => origin,
      terminal: (_, { terminal }: { origin: Point, terminal: Point }) => terminal,
    }),
    clearSelection: assign({
      origin: null,
      terminal: null,
    }),
  },
  actors: {
    viewWaiter: fromPromise(({ input }: { input: { view: SceneView } }) => input.view.when().then(() => console.log('view whend'))),
  },
}).createMachine({
  context: {
    view: null,
    origin: null,
    terminal: null
  },
  id: "Untitled",
  initial: "uninitialized",
  states: {
    uninitialized: {
      initial: "noView",
      on: {
        done: {
          target: "noSelection",
        },
      },
      states: {
        noView: {
          on: {
            addView: {
              target: "waitingForView",
              actions: {
                type: "assignView",
                params: ({ event }) => event.view
              },
            },
          },
        },
        waitingForView: {
          invoke: {
            input: ({ event }) => {
              invariant(event.type === 'addView');

              return ({ view: event.view })
            },
            onDone: {
              target: "#noSelection",
            },
            onError: {
              target: 'noView',
            },
            src: "viewWaiter",
          },
        },
      },
    },
    noSelection: {
      id: "noSelection",
      on: {
        "create.start": {
          target: "placingOrigin",
        },
      },
    },
    placingOrigin: {
      on: {
        "create.commit": {
          target: "placingTerminal",
          actions: {
            type: "assignOrigin",
            params: ({ event }) => event.point
          },
        },
        "create.cancel": {
          target: "noSelection",
          actions: {
            type: "clearSelection",
          },
        },
      },
    },
    placingTerminal: {
      on: {
        "create.commit": {
          target: "selected",
          actions: {
            type: "assignTerminal",
            params: ({ event }) => event.point
          },
        },
        "create.update": {
          target: "placingTerminal",
          actions: {
            type: "assignTerminal",
            params: ({ event }) => event.point
          }
        },
        "create.cancel": {
          target: "noSelection",
          actions: {
            type: "clearSelection",
          },
        },
      },
    },
    selected: {
      on: {
        "create.start": {
          target: "placingOrigin",
        },
        "update.update": {
          actions: {
            type: 'updateSelection',
            params: ({ event }) => ({ origin: event.origin, terminal: event.terminal })
          }
        }
      },
    },
  },
});

export default SelectionMachine;