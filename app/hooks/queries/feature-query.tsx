import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context";
import { useSelectionState } from "~/data/selection-store";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { useDeferredValue } from "react";
import { Polygon } from "@arcgis/core/geometry";
import * as geometryEngineAsync from "@arcgis/core/geometry/geometryEngineAsync";
import { useSceneLayerViews } from "../useSceneLayers";
import { useQuery } from '@tanstack/react-query';
import { useAccessorValue } from "../reactive";

export function useSelectedFeaturesFromLayerViews(key?: string) {
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);
  const deferredPolygon = useDeferredValue(selection)
  const sceneLayerViews = useSceneLayerViews();

  const query = useQuery({
    queryKey: ['selected-features', 'layerviews', sceneLayerViews?.map(lv => lv.layer.id), deferredPolygon?.rings, key],
    queryFn: async ({ signal }) => {
      const featureMap = new Map<SceneLayerView, __esri.FeatureSet['features']>();
      const promises: Promise<unknown>[] = [];
      for (const layerView of sceneLayerViews!) {
        const query = layerView.createQuery();
        query.geometry = deferredPolygon!.extent;
        query.spatialRelationship = 'intersects'
        const queryPromise = layerView.queryFeatures(query, { signal })
          .then((featureSet) => featureMap.set(layerView, featureSet.features));
        promises.push(queryPromise);
      }

      await Promise.all(promises)

      return featureMap;
    },
    enabled: deferredPolygon != null && sceneLayerViews != null,
  })

  return query;
}

export function useSelectedFeaturesCount() {
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);
  const sceneLayerViews = useSceneLayerViews();

  const queryKey = useDeferredValue(
    ['selected-features', 'layerviews', sceneLayerViews?.map(lv => lv.layer.id), selection?.rings]
  )

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const promises: Promise<unknown>[] = [];

      let count = 0;
      for (const layerView of sceneLayerViews!) {
        const query = layerView.createQuery();
        query.geometry = selection!.extent;
        query.spatialRelationship = 'intersects'

        const queryPromise = layerView.queryExtent(query, { signal }).then(result => {
          count += result.count;
        });
        promises.push(queryPromise);
      }
      await Promise.all(promises)

      return count;
    },
    enabled: selection != null && sceneLayerViews != null,
  })

  return query;
}

export function useSelectedFeaturesFromLayers(enabled = false) {
  const sceneLayerViews = useSceneLayerViews();
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);
  const deferredPolygon = useDeferredValue(selection)

  const query = useQuery({
    queryKey: ['selected-features', 'layers', sceneLayerViews?.map(lv => lv.layer.id), deferredPolygon?.rings],
    queryFn: async ({ signal }) => {
      const featureMap = new Map<SceneLayer, __esri.FeatureSet['features']>();
      const promises: Promise<unknown>[] = [];
      for (const { layer } of sceneLayerViews!) {
        const query = layer.createQuery();
        query.geometry = deferredPolygon!.extent;
        query.spatialRelationship = 'intersects'
        const queryPromise = layer.queryFeatures(query, { signal })
          .then((featureSet) => {
            featureMap.set(layer, featureSet.features)
          });
        promises.push(queryPromise);
      }
      await Promise.all(promises)

      return featureMap;
    },
    enabled: enabled && deferredPolygon != null && sceneLayerViews != null,
  })

  return query;
}

export function useSelectionFootprints(selection: Polygon | null) {
  const view = useSceneView()
  const sceneLayerViews = useSceneLayerViews();

  const deferredPolygon = useDeferredValue(selection)

  const query = useQuery({
    queryKey: ['selecion-footprints', 'layers', sceneLayerViews?.map(lv => lv.layer.id), deferredPolygon?.rings],
    queryFn: async ({ signal }) => {
      const sceneLayers = sceneLayerViews!.map(lv => lv.layer);

      const footprints: Polygon[] = []

      for (const layer of sceneLayers) {
        const footprintQuery = layer.createQuery()
        footprintQuery.multipatchOption = "xyFootprint";
        footprintQuery.returnGeometry = true;
        footprintQuery.geometry = deferredPolygon!;
        footprintQuery.outSpatialReference = view.spatialReference;
        footprintQuery.spatialRelationship = "intersects";

        const results = await layer.queryFeatures(footprintQuery, { signal });
        const layerFootprints = await Promise.all(results.features
          .map(f => f.geometry as Polygon)
          .filter(Boolean)
          // the footprints are often quite sharp directly from the query,
          // so we add a little bit of a buffer to smooth them out
          .map(f => geometryEngineAsync.buffer(f, 0.5, 'meters') as Promise<Polygon>)
        )
        footprints.push(...layerFootprints)
      }

      const fpUnion = await geometryEngineAsync.union(footprints) as Polygon
      if (fpUnion != null) return fpUnion
      else throw new Error('failed to combine footprints');
    },
    enabled: deferredPolygon != null && sceneLayerViews != null,
  })

  return query;
}

