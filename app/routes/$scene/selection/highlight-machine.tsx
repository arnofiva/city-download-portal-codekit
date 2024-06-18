import { Polygon } from "@arcgis/core/geometry";
import SceneView from "@arcgis/core/views/SceneView";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import invariant from "tiny-invariant";
import { ActorRefFrom, assign, fromPromise, log, setup, stopChild } from "xstate";

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
    } else {
      console.log('it failed...', result.reason)
    }
  }

  return addHighlight
}

export const HighlightMachine = setup({
  types: {
    context: {} as {
      view: SceneView,
      selection: Polygon | null
      features: __esri.FeatureSet[],
      activeQuery: ActorRefFrom<ReturnType<typeof queryFeatures>> | null,
      highlights: __esri.Handle[]
    },
    events: {} as | { type: 'changeSelection', selection: Polygon | null } | { type: 'highlight', highlights: HighlightApplicationArray },
    input: {} as {
      view: SceneView
    }
  },
  actions: {
    updateSelection: () => { },
    applyHighlights: assign({
      highlights: ({ context }, nextHighlights: HighlightApplicationArray) => {
        for (const handle of context.highlights) handle.remove();

        return nextHighlights.map(highlight => highlight());
      }
    }),
    clear: ({ context }) => {
      for (const handle of context.highlights) handle.remove();
    },
  },
  actors: {
    query: fromPromise(queryFeatures),
  },
  guards: {
    hasSelection: ({ event }) => event.type === 'changeSelection' && event.selection != null,
  }
}).createMachine({
  context: ({ input }) => ({
    view: input.view,
    selection: null,
    features: [],
    activeQuery: null,
    highlights: []
  }),
  exit: ['clear', log("exiting...")],
  initial: 'idle',
  states: {
    idle: {
      on: {
        changeSelection: [
          {
            target: 'querying',
            guard: 'hasSelection',
            actions: "updateSelection",
          },
          {
            actions: 'clear',
          }
        ]
      }
    },
    querying: {
      entry: [
        stopChild('query'),
        assign({
          activeQuery: ({ context, event, spawn, self }) => {
            invariant(event.type === 'changeSelection');

            const actor = spawn('query', { input: { view: context.view, selection: event.selection! }, id: 'query' })
            actor.subscribe(snapshot => {
              if (snapshot.status === "done") {
                self.send({ type: 'highlight', highlights: snapshot.output });
              }
            });

            return actor;
          }
        })
      ],
      on: {
        changeSelection: [
          {
            target: 'querying',
            guard: 'hasSelection',
            actions: "updateSelection",
            reenter: true,
          },
          {
            target: 'idle',
            actions: 'clear',
          }
        ]
      }
    },
  },
  on: {
    highlight: {
      actions: {
        type: 'applyHighlights',
        params: ({ event }) => event.highlights
      }
    }
  }
});
