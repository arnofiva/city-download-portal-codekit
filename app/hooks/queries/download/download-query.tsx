import { createMesh } from "./create-mesh";
import { Mesh } from "@arcgis/core/geometry";
import { useScene } from "../../../components/arcgis/maps/web-scene/scene-context";
import { useSelectionState } from "~/data/selection-store";
import { useSelectedFeaturesFromLayers } from "../feature-query";
import { useEffect } from "react";
import { useOriginElevationInfo } from "../elevation-query";
import { useQuery } from '@tanstack/react-query';
import { useAccessorValue } from "~/hooks/reactive";

export function useDownloadQuery(enabled = false) {
  const scene = useScene()
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);
  const featureQuery = useSelectedFeaturesFromLayers(enabled);
  const retry = featureQuery.refetch;
  const featureQueryError = featureQuery.error;
  const features = Array.from(featureQuery.data?.values() ?? []).flat();
  const ids = features.map(f => f.getObjectId());
  const meshes = features.map(f => f.geometry as Mesh);

  const modelOrigin = useOriginElevationInfo().data

  useEffect(() => {
    if (enabled) {
      retry()
    }
  }, [enabled, retry])

  const query = useQuery({
    queryKey: ['download', ids, selection?.rings, modelOrigin],
    queryFn: async ({ signal }) => {
      if (featureQueryError) {
        throw featureQueryError;
      }

      const mesh = await createMesh({
        scene,
        extent: selection!.extent,
        features: meshes,
        signal,
        origin: modelOrigin!
      });

      const file = await mesh.toBinaryGLTF();

      return new Blob([file], { type: 'model/gltf-binary' });
    },
    enabled: enabled && scene != null && selection != null && featureQueryError == null && modelOrigin != null,
  })

  return query;
}
