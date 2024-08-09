import { useEffect, memo } from "react";
import { useSelectedFeaturesFromLayerViews } from "../../hooks/queries/feature-query";

function InternalHighlight() {
  const query = useSelectedFeaturesFromLayerViews();

  useEffect(() => {
    if (query.data) {
      const handles: IHandle[] = [];
      for (const [layerview, features] of query.data) {
        const handle = layerview.highlight(features);
        handles.push(handle);
      }

      return () => {
        for (const handle of handles) handle.remove();
      }
    }
  }, [query.data]);

  return null;
}

const Highlights = memo(InternalHighlight);

export default Highlights;