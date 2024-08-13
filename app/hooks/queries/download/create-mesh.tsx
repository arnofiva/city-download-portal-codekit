import type Mesh from "@arcgis/core/geometry/Mesh";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import MeshGeoreferencedVertexSpace from "@arcgis/core/geometry/support/MeshGeoreferencedVertexSpace";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import type Ground from '@arcgis/core/Ground';
import { type Extent, Point } from "@arcgis/core/geometry";
import type WebScene from "@arcgis/core/WebScene";
// import convertGLBToOBJ from "./obj-conversion";
import * as projection from "@arcgis/core/geometry/projection";

async function extractElevation(ground: Ground, extent: __esri.Extent) {
  return await meshUtils.createFromElevation(ground, extent, {
    demResolution: "finest-contiguous"
  });
}

async function mergeSliceMeshes(elevation: Mesh, features: Mesh[], origin: Point, signal?: AbortSignal) {
  const VertexSpace = origin.spatialReference.isWGS84 || origin.spatialReference.isWebMercator
    ? MeshLocalVertexSpace
    : MeshGeoreferencedVertexSpace

  const vertexSpace = new VertexSpace({
    origin: [origin.x, origin.y, origin.z],
  });

  const meshes = await Promise.all(
    features
      .map(async (mesh) => {
        await mesh.load();
        return meshUtils.convertVertexSpace(mesh, vertexSpace, { signal });
      })
      .concat(meshUtils.convertVertexSpace(elevation, vertexSpace, { signal }))
  );

  const slice = meshUtils.merge(meshes.filter((mesh): mesh is Mesh => mesh != null));

  return slice;
}

export async function createMesh(scene: WebScene, extent: Extent, features: Mesh[], signal: AbortSignal) {
  const ground = scene.ground;
  const sr = extent.spatialReference;

  const projectedExtent = projection.project(extent, sr) as Extent;
  const elevation = await extractElevation(ground, projectedExtent);

  const extractionOrigin = new Point({
    x: elevation.extent.xmin,
    y: elevation.extent.ymin,
    z: elevation.extent.zmin,
    spatialReference: extent.spatialReference
  });

  const slice = await mergeSliceMeshes(elevation, features, extractionOrigin, signal);

  return slice;
}
