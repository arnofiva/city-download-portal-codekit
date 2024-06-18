import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useView } from "~/routes/$scene/view/view-context";
import DimensionLayer from "@arcgis/core/layers/DimensionLayer.js";
import DimensionAnalysis from "@arcgis/core/analysis/DimensionAnalysis.js";
import DimensionSimpleStyle from "@arcgis/core/analysis/DimensionSimpleStyle.js";
import { DimensionsContext } from "./dimensions-context";

export default function DimensionsLayer({ children }: PropsWithChildren) {
  const view = useView();

  const [analyses] = useState(() => new DimensionAnalysis({
    style: new DimensionSimpleStyle({
      color: "black",
    })
  }))
  const [layer] = useState(() => new DimensionLayer({
    source: analyses,
  }))

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