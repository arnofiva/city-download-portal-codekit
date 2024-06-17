import CoreGraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { useScene } from '~/routes/$scene/scene/scene-context';

const GraphicsLayerContext = createContext<CoreGraphicsLayer>(null!);

export function useGraphicsLayer() {
  return useContext(GraphicsLayerContext);
}

interface GraphicsLayerProps {
  elevationMode?: CoreGraphicsLayer['elevationInfo']['mode']
}
export default function GraphicsLayer({ children, elevationMode = 'on-the-ground' }: PropsWithChildren<GraphicsLayerProps>) {
  const scene = useScene();
  const [layer] = useState(() => new CoreGraphicsLayer({ elevationInfo: { mode: elevationMode } }));

  useEffect(() => {
    scene.add(layer);
    return () => { scene.remove(layer) };
  }, [layer, scene]);

  useEffect(() => {
    layer.elevationInfo.mode = elevationMode;
  }, [elevationMode, layer.elevationInfo])

  return (
    <GraphicsLayerContext.Provider value={layer}>
      {children}
    </GraphicsLayerContext.Provider>
  )
}
