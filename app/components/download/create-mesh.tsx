import type Mesh from "@arcgis/core/geometry/Mesh";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import MeshGeoreferencedVertexSpace from "@arcgis/core/geometry/support/MeshGeoreferencedVertexSpace";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import type Ground from '@arcgis/core/Ground';
import type SceneLayer from "@arcgis/core/layers/SceneLayer";
import { type Extent, Point } from "@arcgis/core/geometry";
import type WebScene from "@arcgis/core/WebScene";
// import convertGLBToOBJ from "./obj-conversion";
import * as projection from "@arcgis/core/geometry/projection";

async function extractElevation(ground: Ground, extent: __esri.Extent) {
  return await meshUtils.createFromElevation(ground, extent, {
    demResolution: "finest-contiguous"
  });
}

async function extractFeatures(sceneLayer: SceneLayer, extent: __esri.Geometry, signal?: AbortSignal) {
  const supportsQuery = sceneLayer.capabilities.operations.supportsQuery;
  const supportsGeometry = sceneLayer.capabilities.query.supportsQueryGeometry;

  if (!supportsQuery || !supportsGeometry) {
    return []
  }
  // get the buildings
  const query = sceneLayer.createQuery();
  query.geometry = extent;
  query.distance = 0;
  query.returnGeometry = true;
  const results = await sceneLayer.queryFeatures(query, { signal });
  const meshes = results.features
    .map((feature) => feature.geometry)
    .filter((geometry): geometry is __esri.Mesh => geometry.type === "mesh");

  return meshes;
}

async function mergeSliceMeshes(elevation: Mesh, features: Mesh[], sceneOrigin: Point, signal?: AbortSignal) {
  const VertexSpace = sceneOrigin.spatialReference.isWGS84 || sceneOrigin.spatialReference.isWebMercator
    ? MeshLocalVertexSpace
    : MeshGeoreferencedVertexSpace

  const vertexSpace = new VertexSpace({
    origin: [sceneOrigin.x, sceneOrigin.y, sceneOrigin.z],
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

export default async function createMesh(scene: WebScene, extent: Extent, signal?: AbortSignal) {
  const ground = scene.ground;

  const layers = scene.allLayers
    .toArray()
    .filter((layer): layer is SceneLayer => layer.type === "scene")
    .filter(isQueryable)
    .filter(layer => layer.geometryType === "mesh")

  const sr = layers.at(0)?.spatialReference ?? extent.spatialReference;

  const features = (await Promise.all(layers.map(layer => extractFeatures(layer, extent, signal)))).flat();

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

function isQueryable(sceneLayer: SceneLayer) {
  const supportsQuery = sceneLayer.capabilities.operations.supportsQuery;
  const supportsGeometry = sceneLayer.capabilities.query.supportsQueryGeometry;

  return supportsQuery && supportsGeometry
}