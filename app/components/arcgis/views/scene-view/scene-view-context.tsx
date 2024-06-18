import type SceneView from "@arcgis/core/views/SceneView";
import { createContext, useContext } from "react";

export const SceneViewContext = createContext<SceneView>(null!);

export function useSceneView() {
  return useContext(SceneViewContext);
}