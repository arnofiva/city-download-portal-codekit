import { useEffect, memo } from "react";
import { useSelectedFeaturesFromLayerViews } from "../../hooks/queries/feature-query";
import Graphic from "@arcgis/core/Graphic";
import SceneLayerView from "@arcgis/core/views/layers/SceneLayerView";

interface HighlightProps {
  data?: Map<SceneLayerView, Graphic[]>
}
function InternalHighlight({ data }: HighlightProps) {
  useEffect(() => {
    if (data) {
      const handles: IHandle[] = [];
      for (const [layerview, features] of data) {
        console.log(layerview, features)
        const handle = layerview.highlight(features);
        handles.push(handle);
      }

      return () => {
        for (const handle of handles) handle.remove();
      }
    }
  }, [data]);

  return null;
}

const Highlights = memo(InternalHighlight);

export default Highlights;