import { useEffect, memo } from "react";
import { useFeatureQuerySelector2 } from "./actors/feature-query-context";

function InternalHighlight() {
  const featureMap = useFeatureQuerySelector2(state => state?.context.features);

  useEffect(() => {
    if (featureMap) {
      const handles: IHandle[] = [];
      for (const [layerview, { features }] of featureMap) {
        const handle = layerview.highlight(features);
        handles.push(handle);
      }

      return () => {
        for (const handle of handles) handle.remove();
      }
    }
  }, [featureMap]);

  return null;
}

const Highlight = memo(InternalHighlight);

export default Highlight;