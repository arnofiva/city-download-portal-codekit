import SceneView from "@arcgis/core/views/SceneView";
import Point from '@arcgis/core/geometry/Point';
import { setup, fromPromise, assign, sendTo, ActorRefFrom, log, stopChild } from "xstate";
import invariant from "tiny-invariant";
import { Polygon } from "@arcgis/core/geometry";
import { HighlightMachine } from "./highlight-machine";


export type SelectionEvent =
  | { type: "done" }
  | { type: 'reset' }
  | { type: "addView", view: SceneView }
  | { type: "create.start", point: Point }
  | { type: "create.cancel" }
  | { type: "create.commit", point: Point }
  | { type: "create.update", point: Point }
  | { type: 'update.update', origin: Point, terminal: Point };

function createSelectionPolygon(origin: Point, terminal: Point) {
  const { x: ox, y: oy } = origin;
  const { x: tx, y: ty } = terminal;
  const ring: Polygon['rings'][number] = [
    [ox, oy],
    [ox, ty],
    [tx, ty],
    [tx, oy],
    [ox, oy],
  ]

  return new Polygon({
    rings: [ring],
    spatialReference: origin.spatialReference
  });
}

const SelectionMachine = setup({
  types: {
    context: {} as {
      view: SceneView | null,
      origin: Point | null,
      terminal: Point | null,
      selection: Polygon | null,
      highlights: ActorRefFrom<typeof HighlightMachine> | null
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
      selection: null,
    }),
    assignTerminal: assign({
      terminal: (_, point: Point) => point,
      selection: ({ context }, point: Point) => createSelectionPolygon(context.origin!, point)
    }),
    updateSelection: assign({
      origin: (_, { origin }: { origin: Point, terminal: Point }) => origin,
      terminal: (_, { terminal }: { origin: Point, terminal: Point }) => terminal,
      selection: (_, { origin, terminal }: { origin: Point, terminal: Point }) => createSelectionPolygon(origin, terminal)
    }),
    clearSelection: assign({
      origin: null,
      terminal: null,
      selection: null,
    }),
    killHighlights: stopChild("highlights"),
    startHighlights: assign({
      highlights: ({ spawn, context }) => spawn('highlights', { id: 'highlights', input: { view: context.view! } })
    }),
    updateHighlights: sendTo(({ context }) => context.highlights!, ({ context }) => ({ type: 'changeSelection', selection: context.selection }))
  },
  actors: {
    viewWaiter: fromPromise(({ input }: { input: { view: SceneView } }) => input.view.when()),
    highlights: HighlightMachine
  },
}).createMachine({
  context: {
    view: null,
    origin: null,
    terminal: null,
    selection: null,
    highlights: null,
  },
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
      // entry: ['killHighlights', 'startHighlights'],
      on: {
        "create.start": {
          target: "placingOrigin",
        },
      },
    },
    placingOrigin: {
      entry: ['clearSelection', 'killHighlights', 'startHighlights', log('entered')],
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
          actions: [{
            type: "assignTerminal",
            params: ({ event }) => event.point
          },
            'updateHighlights'
          ],
        },
        "create.update": {
          target: "placingTerminal",
          actions: [
            {
              type: "assignTerminal",
              params: ({ event }) => event.point
            },
            'updateHighlights'
          ]
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
          actions: log("placing origin")
        },
        "update.update": {
          actions: [
            {
              type: 'updateSelection',
              params: ({ event }) => ({ origin: event.origin, terminal: event.terminal })
            },
            'updateHighlights'
          ]
        }
      },
    },
  },
  on: {
    reset: {
      target: '#noSelection',
      guard: ({ context }) => {
        return context.view != null;
      },
      actions: [
        'clearSelection',
        log('resetting')
      ]
    }
  }
});

export default SelectionMachine;