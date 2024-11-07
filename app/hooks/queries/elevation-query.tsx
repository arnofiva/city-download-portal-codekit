import { useSelectionState } from "~/data/selection-store";
import { useAccessorValue } from "~/hooks/reactive";
import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context";
import { Extent, Multipoint, Point } from "@arcgis/core/geometry";
import { useQuery } from '@tanstack/react-query';
import { useSceneLayerViews } from "../useSceneLayers";

export function useSelectionVolumeExtent() {
  const view = useSceneView();
  const ground = useAccessorValue(() => view.groundView.elevationSampler)!;
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection) ?? null

  const lvs = useSceneLayerViews() ?? [];

  const query = useQuery({
    queryKey: ['selection', 'elevation', selection?.toJSON()],
    queryFn: async ({ signal }) => {
      let extent: Extent | null = null;
      for (const lv of lvs) {
        const query = lv.createQuery();
        query.spatialRelationship = 'intersects'
        query.geometry = selection!.extent;

        const results = await lv.queryExtent(query, { signal });
        if (results.count > 0) {
          extent ??= results.extent;
          extent!.union(results.extent);
        }
      }

      return extent;
    },
    enabled: ground != null && selection != null,
  });

  return query;
}

export function useSelectionElevationInfo() {
  const view = useSceneView();

  const ground = useAccessorValue(() => view.map.ground)!;
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection) ?? null

  const query = useQuery({
    queryKey: ['selection', 'elevation', ground?.toJSON(), selection?.toJSON()],
    queryFn: async ({ signal }) => {
      const multipoint = new Multipoint({
        points: selection!.rings[0],
        spatialReference: selection!.spatialReference
      })

      const result = await ground.queryElevation(multipoint, { signal });

      const elevationInfo = result.geometry as Multipoint;
      const selectionPoints = {
        oo: elevationInfo.getPoint(0),
        ot: elevationInfo.getPoint(1),
        tt: elevationInfo.getPoint(2),
        to: elevationInfo.getPoint(3),
      } as const;

      return {
        selectionPoints,
        maxElevation: elevationInfo.points.reduce((max, [_x, _y, z]) => z > max ? z : max, -Infinity),
        minElevation: elevationInfo.points.reduce((min, [_x, _y, z]) => min > z ? z : min, Infinity)
      }
    },
    enabled: ground != null && selection != null,
  });

  return query;
}

export function useOriginElevationInfo() {
  const view = useSceneView();
  const ground = useAccessorValue(() => view.map.ground)!;
  const store = useSelectionState();
  const origin = useAccessorValue(() => store.modelOrigin ?? store.selectionOrigin);

  return useQuery({
    queryKey: ['origin', 'elevation', ground?.toJSON(), origin?.toJSON()],
    queryFn: async ({ signal }) => {
      const result = await ground.queryElevation(origin!, { signal });
      const elevationInfo = result.geometry as Point;

      return elevationInfo;
    },
    enabled: ground != null && origin != null,
    placeholderData: (prev) => origin != null ? prev : undefined,
  })
}