import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useAccessorValue } from "~/hooks/reactive";
import { useQuery } from "~/hooks/useQuery";
import { Multipoint } from "@arcgis/core/geometry";

export function useSelectionElevationInfo() {
  const view = useSceneView();
  const ground = useAccessorValue(() => view.map.ground)!;
  const selection = useSelectionStateSelector(store => store.selection) ?? null

  return useQuery({
    key: ['origin', 'elevation', ground?.toJSON(), selection?.rings],
    callback: async ({ signal }) => {
      const multipoint = new Multipoint({
        points: selection!.rings[0],
        spatialReference: selection!.spatialReference
      })

      const result = await ground.queryElevation(multipoint, { signal });
      return result.geometry as Multipoint;
    },
    enabled: ground != null && selection != null
  })
}
