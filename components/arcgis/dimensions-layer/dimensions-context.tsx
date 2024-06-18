import DimensionAnalysis from "@arcgis/core/analysis/DimensionAnalysis";
import DimensionLayer from "@arcgis/core/layers/DimensionLayer";
import { createContext, useContext } from "react";

export const DimensionsContext = createContext<{
  layer: DimensionLayer;
  analyses: DimensionAnalysis;
}>(null!);

export function useDimensions() {
  return useContext(DimensionsContext);
}


