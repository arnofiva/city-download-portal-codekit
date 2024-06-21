import { CalciteAlert, CalciteButton } from "@esri/calcite-components-react";
import type Mesh from "@arcgis/core/geometry/Mesh";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import type Ground from '@arcgis/core/Ground';
import type SceneLayer from "@arcgis/core/layers/SceneLayer";
import { type Extent, Point } from "@arcgis/core/geometry";
import type WebScene from "@arcgis/core/WebScene";
import { useScene } from "../arcgis/maps/web-scene/scene-context";
import { useState } from "react";
import { useSelectionStateSelector } from "../selection/selection-context";
// import convertGLBToOBJ from "./obj-conversion";

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

async function extractSlice(scene: WebScene, extent: Extent) {
  const ground = scene.ground;

  const layers = scene.allLayers.filter(layer => layer.type === "scene").toArray() as SceneLayer[];
  const features = (await Promise.all(layers.map(layer => extractFeatures(layer, extent)))).flat();
  const elevation = await extractElevation(ground, extent);

  const extractionOrigin = new Point({
    x: elevation.extent.xmin,
    y: elevation.extent.ymin,
    z: elevation.extent.zmin,
    spatialReference: extent.spatialReference
  });

  const slice = await mergeSliceMeshes(elevation, features, extractionOrigin);

  return slice;
}

function downloadFile(buffer: ArrayBuffer) {
  const link = document.createElement("a");
  link.download = "scene.glb";
  const blob = new Blob([buffer], { type: "model/gltf-binary" });
  link.href = window.URL.createObjectURL(blob);
  link.click();
}

export default function DownloadButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false)
  const scene = useScene();
  const extent = useSelectionStateSelector(state => state.context.polygon?.extent);

  const download = async () => {
    if (scene != null && extent != null) {
      setIsLoading(true);
      try {
        const mesh = await extractSlice(scene, extent);
        const file = await mesh.toBinaryGLTF();
        const blob = new Blob([file], { type: 'model/gltf-binary' })
        blob.size
        // const obj = await convertGLBToOBJ(file);

        downloadFile(file);
      } catch (error) {
        setShowError(true);
        console.log(error)
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