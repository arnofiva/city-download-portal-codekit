import Mesh from "@arcgis/core/geometry/Mesh";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import MeshGeoreferencedVertexSpace from "@arcgis/core/geometry/support/MeshGeoreferencedVertexSpace";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import type Ground from '@arcgis/core/Ground';
import { type Extent, Point } from "@arcgis/core/geometry";
import type WebScene from "@arcgis/core/WebScene";
// import convertGLBToOBJ from "./obj-conversion";
import * as projection from "@arcgis/core/geometry/projection";
import { createOriginMarker } from "~/symbology/symbology";

async function extractElevation(ground: Ground, extent: __esri.Extent) {
  return await meshUtils.createFromElevation(ground, extent, {
    demResolution: "finest-contiguous"
  });
}

async function mergeSliceMeshes(
  {
    elevation,
    features,
    origin,
    includeOriginMarker = true,
    signal,
  }: {
    elevation: Mesh,
    features: Mesh[],
    origin: Point,
    includeOriginMarker?: boolean,
    signal?: AbortSignal
  }) {
  const VertexSpace = origin.spatialReference.isWGS84 || origin.spatialReference.isWebMercator
    ? MeshLocalVertexSpace
    : MeshGeoreferencedVertexSpace

  const vertexSpace = new VertexSpace({
    origin: [origin.x, origin.y, origin.z],
  });


  const meshPromises = features
    .map(async (mesh) => {
      await mesh.load();
      return meshUtils.convertVertexSpace(mesh, vertexSpace, { signal });
    })
    .concat(meshUtils.convertVertexSpace(elevation, vertexSpace, { signal }));

  if (includeOriginMarker) {
    const originMesh = await createOriginMarker(origin);
    meshPromises.push(meshUtils.convertVertexSpace(originMesh, vertexSpace, { signal }))
  }

  const meshes = await Promise.all(meshPromises)
  const slice = meshUtils.merge(meshes.filter((mesh): mesh is Mesh => mesh != null));

  return slice;
}

export async function createMesh({
  scene,
  extent,
  features,
  origin,
  includeOriginMarker = true,
  signal,
}: {
  scene: WebScene,
  extent: Extent,
  features: Mesh[],
  signal: AbortSignal,
  origin: Point,
  includeOriginMarker?: boolean
}) {
  const ground = scene.ground;
  const sr = features.at(0)?.spatialReference ?? extent.spatialReference;
  const projectedExtent = projection.project(extent, sr) as Extent;
  const elevation = await extractElevation(ground, projectedExtent);

  const slice = await mergeSliceMeshes({
    elevation,
    features,
    origin,
    includeOriginMarker,
    signal,
  });

  return slice;
}
