import { Polygon } from "@arcgis/core/geometry";
import SceneView from "@arcgis/core/views/SceneView";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { InvokeCallback } from "node_modules/xstate/dist/declarations/src/actors/callback";
import { ActorRefFrom, type EventObject, assign, fromCallback, fromPromise, setup, stopChild } from "xstate";

interface QueryFeaturesInput {
  view: SceneView;
  selection: Polygon;
}
async function queryFeatures({ input, signal }: { input: QueryFeaturesInput, signal: AbortSignal }) {
  const { view, selection } = input;

  const sceneLayerViews = view.allLayerViews.filter(lv => lv.layer.type === "scene").toArray() as SceneLayerView[];

  const promises: Promise<__esri.FeatureSet>[] = [];
  for (const layerView of sceneLayerViews) {
    const query = layerView.createQuery();
    query.geometry = selection.extent;
    const queryPromise = layerView.queryFeatures(query, { signal });
    promises.push(queryPromise);
  }

  const settled = await Promise.all(promises)

  const entries = Object.entries(settled)
    .map(([index, result]) => ([sceneLayerViews[+index], result] as const));

  const results = new Map(entries);

  return results;
}

const QUERY_FEATURES_ACTOR_ID = 'query';

const watchLayers: FeatureQueryMachineInvokedCallback = ({ input, sendBack }) => {
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

export const FeatureQueryMachine = setup({
  types: {
    context: {} as FeatureQueryMachineContext,
    events: {} as FeatureQueryEvent,
    input: {} as FeatureQueryMachineInput,
  },
  actions: {
    updateSelection: assign({
      selection: (_, selection: Polygon) => selection
    }),
    assignFeatures: assign({
      features: (_, selectedFeatures: Map<SceneLayerView, __esri.FeatureSet>) => selectedFeatures
    }),
    updateActiveQuery: assign({
      activeQuery: ({ context, spawn, self }, selection: Polygon | null) => {
        if (selection == null) return context.activeQuery;

        const actor = spawn('query', { input: { view: context.view, selection }, id: QUERY_FEATURES_ACTOR_ID })
        actor.subscribe(snapshot => {
          if (snapshot.status === "done") {
            self.send({ type: 'featuresChange', features: snapshot.output });
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
    features: new Map()
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
        actions: {
          type: "updateSelection",
          params: ({ event }) => event.selection!
        },
      },
      {
        target: '.idle',
        actions: [
          stopChild(QUERY_FEATURES_ACTOR_ID),
          assign({
            activeQuery: null,
            features: new Map(),
            selection: null,
          })
        ]
      }
    ],
    layersChanged: {
      target: '.querying',
      reenter: true,
    },
    featuresChange: {
      actions: {
        type: 'assignFeatures',
        params: ({ event }) => event.features
      }
    }
  }
});

type FeatureQueryMachineInput = {
  view: SceneView
};

type FeatureQueryMachineContext = {
  view: SceneView,
  selection: Polygon | null
  activeQuery: ActorRefFrom<ReturnType<typeof queryFeatures>> | null,
  features: Map<SceneLayerView, __esri.FeatureSet>
}

type FeatureQueryEvent =
  | { type: 'changeSelection', selection: Polygon | null }
  | { type: 'layersChanged' }
  | { type: 'featuresChange', features: Map<SceneLayerView, __esri.FeatureSet> };

type FeatureQueryMachineInvokedCallback = InvokeCallback<EventObject, FeatureQueryEvent, { view: SceneView }>;

