import { useEffect } from "react";
import { useSceneView } from "../views/scene-view/scene-view-context";
import SearchWidget from "@arcgis/core/widgets/Search.js";
import { useScene } from "../maps/web-scene/scene-context";
import { Extent } from "@arcgis/core/geometry";
import { project } from "@arcgis/core/geometry/projection";
import { useAccessorValue } from "~/hooks/reactive";
import useInstance from "~/hooks/useInstance";
import { removeSceneLayerClones } from "~/components/selection/scene-filter-highlights";


export default function Search() {
  const view = useSceneView();
  const scene = useScene();
  const widget = useInstance(() => new SearchWidget({ view }));

  const extent = useAccessorValue(
    () => {
      const extents = scene.allLayers
        .filter(removeSceneLayerClones)
        .filter(layer => layer.type === 'scene' && layer.fullExtent != null)
        .map(layer => layer.fullExtent)

      const sr = extents.getItemAt(0)?.spatialReference ?? view.spatialReference;

      // construct an extent that contains all of the scene layer extents
      let xmax = -Infinity, xmin = Infinity, ymax = -Infinity, ymin = Infinity;
      for (const extent of extents) {
        let projectedExtent = extent;
        if (extent.spatialReference.wkid !== sr.wkid) {
          projectedExtent = project(extent, sr) as Extent;
        }

        if (projectedExtent != null) {
          xmax = xmax < extent.xmax ? extent.xmax : xmax;
          xmin = xmin > extent.xmin ? extent.xmin : xmin;
          ymax = ymax < extent.ymax ? extent.ymax : ymax;
          ymin = ymin > extent.ymin ? extent.ymin : ymin;
        }
      }

      const extent = new Extent({
        xmax,
        xmin,
        ymax,
        ymin,
        spatialReference: sr
      });

      return extent;
    },
  );

  // this is a little hacky, we access source.initialized just to access something on the source object
  // then we get a reaction any time a new source is added to the list of sources
  const sources = useAccessorValue(() => widget.allSources.map(source => (source.initialized, source)), { initial: true });

  useEffect(() => {
    if (extent && sources) {
      for (const source of sources) {
        source.filter = {
          geometry: extent
        }
      }
    }
  }, [extent, sources])

  useEffect(() => {
    widget.view = view;

    view.ui.add(widget, { position: 'top-left', index: 0 });

    return () => {
      view.ui.remove(widget);
    }
  }, [scene.allLayers, view, widget])

  return null;
}