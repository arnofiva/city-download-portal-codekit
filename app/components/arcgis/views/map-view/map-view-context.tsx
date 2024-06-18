import type CoreMapView from '@arcgis/core/views/MapView';
import { createContext, useContext } from "react";

export const MapViewContext = createContext<CoreMapView>(null!);

export function useMapView() {
  return useContext(MapViewContext);
}