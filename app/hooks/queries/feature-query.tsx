/* Copyright 2024 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useSceneView } from "~/arcgis/components/views/scene-view/scene-view-context";
import { useSelectionState } from "~/routes/_root.$scene/selection/selection-store";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";
import { useDeferredValue } from "react";
import { Polygon } from "@arcgis/core/geometry";
import * as geometryEngineAsync from "@arcgis/core/geometry/geometryEngineAsync";
import { useSceneLayerViews } from "../useSceneLayers";
import { useQuery } from '@tanstack/react-query';
import { useAccessorValue } from "../../arcgis/reactive-hooks";
import { useDebouncedValue } from "../useDebouncedValue";
import { filterMeshGraphicsFromFeatureSet, type MeshGraphic } from "./download/export-query";

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

export const MAX_FEATURES = 100;

export function useHasTooManyFeatures() {
  const { data: featureCount = 0 } = useSelectedFeaturesCount();
  const hasTooManyFeatures = featureCount > MAX_FEATURES

  return hasTooManyFeatures;
}

export function useSelectedFeaturesFromLayers(enabled = false) {
  const sceneLayerViews = useSceneLayerViews();
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);
  const deferredPolygon = useDeferredValue(selection)

  const query = useQuery({
    queryKey: ['selected-features', 'layers', sceneLayerViews?.map(lv => lv.layer.id), deferredPolygon?.rings],
    queryFn: async ({ signal }) => {
      const featureMap = new Map<SceneLayer, MeshGraphic[]>();
      const promises: Promise<unknown>[] = [];
      for (const { layer } of sceneLayerViews!) {
        const query = layer.createQuery();
        query.geometry = deferredPolygon!.extent;
        query.spatialRelationship = 'intersects'
        const queryPromise = layer.queryFeatures(query, { signal })
          .then((featureSet) => {
            featureMap.set(layer, filterMeshGraphicsFromFeatureSet(featureSet))
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
  const hasTooManyFeatures = useHasTooManyFeatures();

  const deferredPolygon = useDebouncedValue(selection)

  const query = useQuery({
    queryKey: [
      'selecion-footprints',
      'layers',
      sceneLayerViews?.map(lv => lv.layer.id), deferredPolygon?.rings
    ],
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
    enabled: !hasTooManyFeatures && deferredPolygon != null && sceneLayerViews != null,
  })

  return query;
}
