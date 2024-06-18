import CoreMap from '@arcgis/core/Map';
import { createContext, useContext } from "react";

export const MapContext = createContext<CoreMap>(null!);

export function useMap() {
  return useContext(MapContext);
}