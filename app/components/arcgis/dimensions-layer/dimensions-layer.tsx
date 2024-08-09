import { PropsWithChildren, useEffect, useMemo } from "react";
import DimensionLayer from "@arcgis/core/layers/DimensionLayer.js";
import DimensionAnalysis from "@arcgis/core/analysis/DimensionAnalysis.js";
import DimensionSimpleStyle from "@arcgis/core/analysis/DimensionSimpleStyle.js";
import { DimensionsContext } from "./dimensions-context";
import { useSceneView } from "../views/scene-view/scene-view-context";
import useInstance from "~/hooks/useInstance";
import { SymbologyColors } from "~/symbology";

interface DimensionLayerProps {
  fontSize?: number
}
export default function DimensionsLayer({ fontSize = 0, children }: PropsWithChildren<DimensionLayerProps>) {
  const view = useSceneView();

  const analyses = useInstance(() => new DimensionAnalysis({
    style: new DimensionSimpleStyle({
      color: SymbologyColors.measurements(),
      fontSize,
      textColor: 'white',
      textBackgroundColor: 'black'
    })
  }));

  const layer = useInstance(() => new DimensionLayer({
    source: analyses,
  }));

  useEffect(() => {
    analyses.style.fontSize = fontSize
  }, [analyses.style, fontSize])

  useEffect(() => {
    view.analyses.add(analyses);
    view.map.add(layer);

    return () => {
      view.map.remove(layer)
      view.analyses.remove(analyses)
    };
  }, [analyses, layer, view.analyses, view.map]);

  const value = useMemo(() => ({ analyses, layer }), [analyses, layer])

  return (
    <DimensionsContext.Provider value={value}>
      {children}
    </DimensionsContext.Provider>
  )
}