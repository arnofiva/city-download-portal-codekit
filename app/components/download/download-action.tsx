import { CalciteAlert, CalciteButton } from "@esri/calcite-components-react";
import { useSelectionStateSelector } from "../selection/selection-context";
import type Mesh from "@arcgis/core/geometry/Mesh";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import type Ground from '@arcgis/core/Ground';
import * as projection from "@arcgis/core/geometry/projection";
import type SceneLayer from "@arcgis/core/layers/SceneLayer";
import { type Extent, Point } from "@arcgis/core/geometry";
import type WebScene from "@arcgis/core/WebScene";
import { useScene } from "../arcgis/maps/web-scene/scene-context";
import { useState } from "react";

async function extractElevation(ground: Ground, extent: __esri.Extent) {
  return await meshUtils.createFromElevation(ground, extent, {
    demResolution: "finest-contiguous"
  });
}

async function extractFeatures(sceneLayer: SceneLayer, extent: __esri.Geometry) {
  // get the buildings
  const query = sceneLayer.createQuery();
  query.geometry = extent;
  query.distance = 0;
  query.returnGeometry = true;
  const results = await sceneLayer.queryFeatures(query);
  const meshes = results.features
    .map((feature) => feature.geometry)
    .filter((geometry): geometry is __esri.Mesh => geometry.type === "mesh");

  return meshes;
}

async function mergeSliceMeshes(elevation: Mesh, features: Mesh[], sceneOrigin: Point) {
  const vertexSpace = new MeshLocalVertexSpace({
    origin: [sceneOrigin.x, sceneOrigin.y, sceneOrigin.z],
  });

  const meshes = await Promise.all(
    features
      .map(async (mesh) => {
        await mesh.load();
        return meshUtils.convertVertexSpace(mesh, vertexSpace);
      })
      .concat(meshUtils.convertVertexSpace(elevation, vertexSpace))
  );

  const slice = meshUtils.merge(meshes.filter((mesh): mesh is Mesh => mesh != null));

  return slice;
}

function downloadFile(buffer: ArrayBuffer) {
  const link = document.createElement("a");
  link.download = "scene.glb";
  const blob = new Blob([buffer], { type: "model/gltf-binary" });
  link.href = window.URL.createObjectURL(blob);
  link.click();
}

async function extractSlice(scene: WebScene, extent: Extent) {
  const ground = scene.ground;

  console.log(extent.toJSON());

  const layers = scene.allLayers.filter(layer => layer.type === "scene").toArray() as SceneLayer[];
  const features = (await Promise.all(layers.map(layer => extractFeatures(layer, extent)))).flat();
  /*
    we assume all features have the same SR
    a more robust solution will need to project the meshes into a consistent SR
    (ideally this is handled by the server which may very well be the case already)
    */
  const featureSpatialReference = features[0]?.spatialReference;
  /* 
    When we query the features we always get them back in the same SR,
    regardless of what the SR of the querying geometry is.
    However, the elevation is returned with the SR of the extent used to query for it.

    To merge the meshes they must all be in the same SR.
  */
  const projectedExtent = projection.project(extent, featureSpatialReference) as __esri.Extent;
  const elevation = await extractElevation(ground, projectedExtent);
  const extractionOrigin = new Point({
    x: projectedExtent.xmin,
    y: projectedExtent.ymin,
    z: elevation.extent.zmin,
    spatialReference: projectedExtent.spatialReference
  });

  const slice = await mergeSliceMeshes(elevation, features, extractionOrigin);

  return slice.offset(0, 0, -projectedExtent.zmin);
}

export default function DownloadButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false)
  const scene = useScene();
  const extent = useSelectionStateSelector(state => state.context.selection?.extent);

  const download = async () => {
    if (scene != null && extent != null) {
      setIsLoading(true);
      try {
        const mesh = await extractSlice(scene, extent);
        const file = await mesh.toBinaryGLTF();
        downloadFile(file);
      } catch (error) {
        setShowError(true);
        console.log('error')
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <>
      <CalciteAlert
        open={showError}
        label="An error occurred"
        icon
        kind="danger"
        autoClose
        autoCloseDuration="slow"
        onCalciteAlertClose={() => setShowError(false)}
      >
        <div slot="title">An error occurred</div>
        <div slot="message">The model failed to export</div>
      </CalciteAlert>
      <CalciteButton
        scale="l"
        iconStart="download"
        width="full"
        onClick={download}
        disabled={isLoading}
        loading={isLoading}
      >
        Export model
      </CalciteButton>
    </>
  )
}