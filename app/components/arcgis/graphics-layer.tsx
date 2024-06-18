import CoreGraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { useScene } from './maps/web-scene/scene-context';
import { useMap } from './maps/map/map-context';

const GraphicsLayerContext = createContext<CoreGraphicsLayer>(null!);

export function useGraphicsLayer() {
  return useContext(GraphicsLayerContext);
}

interface GraphicsLayerProps {
  elevationMode?: CoreGraphicsLayer['elevationInfo']['mode']
}
export default function GraphicsLayer({ children, elevationMode = 'on-the-ground' }: PropsWithChildren<GraphicsLayerProps>) {
  const scene = useScene();
  const map = useMap();

  const [layer] = useState(() => new CoreGraphicsLayer({ elevationInfo: { mode: elevationMode } }));

  useEffect(() => {
    if (map) map.add(layer);
    else scene.add(layer);
    return () => {
      if (map) map.remove(layer);
      else scene.remove(layer)
    };
  }, [layer, map, scene]);

  useEffect(() => {
    layer.elevationInfo.mode = elevationMode;
  }, [elevationMode, layer.elevationInfo])

  return (
    <GraphicsLayerContext.Provider value={layer}>
      {children}
    </GraphicsLayerContext.Provider>
  )
}
