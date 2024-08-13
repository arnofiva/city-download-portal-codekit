import { createMesh } from "./create-mesh";
import { Mesh } from "@arcgis/core/geometry";
import { useQuery } from "~/hooks/useQuery";
import { useScene } from "../../../components/arcgis/maps/web-scene/scene-context";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useSelectedFeaturesFromLayers } from "../feature-query";
import { useEffect } from "react";

export function useDownloadQuery(enabled = false) {
  const scene = useScene()
  const polygon = useSelectionStateSelector((store) => store.selection);

  const featureQuery = useSelectedFeaturesFromLayers(enabled);
  const retry = featureQuery.retry;
  const featureQueryError = featureQuery.error;
  const features = Array.from(featureQuery.data?.values() ?? []).flat();
  const ids = features.map(f => f.getObjectId());
  const meshes = features.map(f => f.geometry as Mesh);

  useEffect(() => {
    if (enabled) {
      retry()
    }
  }, [enabled, retry])

  const query = useQuery({
    key: ['download', ids, polygon?.rings],
    callback: async ({ signal }) => {
      if (featureQueryError) {
        throw featureQueryError;
      }

      const mesh = await createMesh(scene, polygon!.extent, meshes, signal);
      const file = await mesh.toBinaryGLTF();
      return new Blob([file], { type: 'model/gltf-binary' });
    },
    enabled: enabled && scene != null && polygon != null && featureQueryError == null,
  })

  return query;
}
