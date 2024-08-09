import { createMesh } from "./create-mesh";
import { Mesh } from "@arcgis/core/geometry";
import { useQuery } from "~/hooks/useQuery";
import { useScene } from "../../../components/arcgis/maps/web-scene/scene-context";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useSelectedFeaturesFromLayers } from "../feature-query";

export function useDownloadQuery(enabled = false) {
  const scene = useScene()
  const polygon = useSelectionStateSelector((store) => store.selection);

  const features = useSelectedFeaturesFromLayers(enabled);
  const x = Array.from(features.data?.values() ?? []).flat();
  const ids = x.map(f => f.getObjectId());
  const meshes = x.map(f => f.geometry as Mesh);

  return useQuery({
    key: ['download', ids, polygon?.rings],
    callback: async ({ signal }) => {
      const mesh = await createMesh(scene, polygon!.extent, meshes, signal);
      const file = await mesh.toBinaryGLTF();
      return new Blob([file], { type: 'model/gltf-binary' });
    },
    enabled: enabled && scene != null && polygon != null,
  })
}
