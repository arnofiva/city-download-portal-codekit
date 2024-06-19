import { Polygon } from "@arcgis/core/geometry";
import SceneView from "@arcgis/core/views/SceneView";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { InvokeCallback } from "node_modules/xstate/dist/declarations/src/actors/callback";
import { ActorRefFrom, type EventObject, assign, fromCallback, fromPromise, setup, stopChild } from "xstate";

type HighlightApplicationArray = Array<(() => __esri.Handle)>;
interface QueryFeaturesInput {
  view: SceneView;
  selection: Polygon;
}
async function queryFeatures({ input, signal }: { input: QueryFeaturesInput, signal: AbortSignal }) {
  const { view, selection } = input;

  const sceneLayerViews = view.allLayerViews.filter(lv => lv.layer.type === "scene").toArray() as SceneLayerView[];

  const promises: Promise<__esri.FeatureSet>[] = [];
  const addHighlight: HighlightApplicationArray = [];
  for (const layerView of sceneLayerViews) {
    const layer = layerView.layer;
    const query = layer.createQuery();
    query.geometry = selection.extent;
    const queryPromise = layer.queryFeatures(query, { signal });
    promises.push(queryPromise);
  }

  const settled = await Promise.allSettled(promises)

  for (const [index, result] of settled.entries()) {
    if (result.status === 'fulfilled') {
      const layerView = sceneLayerViews[index];
      const features = result.value.features;
      const highlight = () => layerView.highlight(features);
      addHighlight.push(highlight);
    }
  }

  return addHighlight
}

const QUERY_FEATURES_ACTOR_ID = 'query';

const watchLayers: HighlightMachineInvokedCallback = ({ input, sendBack }) => {
  const map = input.view.map;

  const layers = map.allLayers.on("change", () => {
    sendBack({ type: 'layersChanged' })
  });

  const views = input.view.allLayerViews.on("change", () => {
    sendBack({ type: 'layersChanged' })
  });

  return () => {
    layers.remove();
    views.remove();
  }
};

export const HighlightMachine = setup({
  types: {
    context: {} as HighlightMachineContext,
    events: {} as HighlightEvent,
    input: {} as HighlightMachineInput,
  },
  actions: {
    updateSelection: assign({
      selection: (_, selection: Polygon) => selection
    }),
    applyHighlights: assign({
      highlights: ({ context }, nextHighlights: HighlightApplicationArray) => {
        for (const handle of context.highlights) handle.remove();

        return nextHighlights.map(highlight => highlight());
      }
    }),
    clear: ({ context }) => {
      for (const handle of context.highlights) handle.remove();
    },
    updateActiveQuery: assign({
      activeQuery: ({ context, spawn, self }, selection: Polygon | null) => {
        if (selection == null) return context.activeQuery;

        const actor = spawn('query', { input: { view: context.view, selection }, id: QUERY_FEATURES_ACTOR_ID })
        actor.subscribe(snapshot => {
          if (snapshot.status === "done") {
            self.send({ type: 'highlight', highlights: snapshot.output });
          }
        });

        return actor;
      }
    })
  },
  actors: {
    query: fromPromise(queryFeatures),
    watchLayers: fromCallback<EventObject, { view: SceneView }>(watchLayers)
  },
  guards: {
    hasSelection: ({ event }) => event.type === 'changeSelection' && event.selection != null,
  }
}).createMachine({
  context: ({ input }) => ({
    view: input.view,
    selection: null,
    activeQuery: null,
    highlights: []
  }),
  initial: 'idle',
  invoke: {
    src: 'watchLayers',
    input: ({ context }) => ({ view: context.view })
  },
  states: {
    idle: {},
    querying: {
      entry: [
        stopChild(QUERY_FEATURES_ACTOR_ID),
        {
          type: 'updateActiveQuery',
          params: ({ context, event }) => {
            if (event.type === "changeSelection") return event.selection;
            else return context.selection;
          },
        }
      ],
    },
  },
  on: {
    changeSelection: [
      {
        target: '.querying',
        guard: 'hasSelection',
        actions: [{
          type: "updateSelection",
          params: ({ event }) => event.selection!
        }],
      },
      {
        target: '.idle',
        actions: 'clear',
      }
    ],
    layersChanged: {
      target: '.querying',
      reenter: true,
    },
    highlight: {
      actions: {
        type: 'applyHighlights',
        params: ({ event }) => event.highlights
      }
    }
  }
});

type HighlightMachineInput = {
  view: SceneView
};

type HighlightMachineContext = {
  view: SceneView,
  selection: Polygon | null
  activeQuery: ActorRefFrom<ReturnType<typeof queryFeatures>> | null,
  highlights: __esri.Handle[]
}

type HighlightEvent =
  | { type: 'changeSelection', selection: Polygon | null }
  | { type: 'layersChanged' }
  | { type: 'highlight', highlights: HighlightApplicationArray };

type HighlightMachineInvokedCallback = InvokeCallback<EventObject, HighlightEvent, { view: SceneView }>;

