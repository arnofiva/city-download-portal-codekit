import type SceneView from "@arcgis/core/views/SceneView";
import { createContext, useContext } from "react";

export const ViewContext = createContext<SceneView>(null!);

export function useView() {
  return useContext(ViewContext);
}