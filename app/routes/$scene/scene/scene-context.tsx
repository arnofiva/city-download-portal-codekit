import type WebScene from "@arcgis/core/WebScene";
import { createContext, useContext } from "react";

export const SceneContext = createContext<WebScene>(null!);

export function useScene() {
  return useContext(SceneContext);
}