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
  const originSpatialReference = origin.spatialReference;
  const featureSpatialReference = features.at(0)?.spatialReference ?? originSpatialReference;

  let projectedOrigin = origin;
  if (originSpatialReference.wkid !== featureSpatialReference.wkid) {
    await projection.load();
    projectedOrigin = projection.project(origin, featureSpatialReference) as Point;
  }

  const VertexSpace = projectedOrigin.spatialReference.isWGS84 || projectedOrigin.spatialReference.isWebMercator
    ? MeshLocalVertexSpace
    : MeshGeoreferencedVertexSpace

  const vertexSpace = new VertexSpace({
    origin: [projectedOrigin.x, projectedOrigin.y, projectedOrigin.z],
  });

  const meshPromises = features
    .map(async (mesh) => {
      await mesh.load();
      return meshUtils.convertVertexSpace(mesh, vertexSpace, { signal });
    })
    .concat(meshUtils.convertVertexSpace(elevation, vertexSpace, { signal }));

  if (includeOriginMarker) {
    const zmax = features.reduce((max, next) => next.extent.zmax > max ? next.extent.zmax : max, elevation.extent.zmax);
    const zmin = features.reduce((min, next) => min > next.extent.zmin ? next.extent.zmin : min, elevation.extent.zmin);
    const height = zmax - zmin;

    const originMesh = await createOriginMarker(projectedOrigin, height);
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
  signal?: AbortSignal,
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

  await slice.load();

  return slice;
}
