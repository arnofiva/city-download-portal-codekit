import { PropsWithChildren, memo, useEffect, useMemo, useState } from "react"
import CoreMapView from '@arcgis/core/views/MapView';
import { MapViewContext } from "./map-view-context";
import Color from "@arcgis/core/Color.js";
import { useMap } from "../../maps/map/map-context";
import { Extent, SpatialReference } from "@arcgis/core/geometry";

interface MapViewProps {
  spatialReference?: string;
  extent?: Extent;
}

function InternalMapView({ children, spatialReference, extent }: PropsWithChildren<MapViewProps>) {
  const map = useMap();

  const sr = useMemo(() => spatialReference == null ?
    SpatialReference.WebMercator :
    new SpatialReference({
      wkid: +spatialReference
    }), [spatialReference])

  const [view] = useState(() => new CoreMapView({
    map,
    extent,
    spatialReference: sr,
    constraints: {
      snapToZoom: false,
    },
    highlightOptions: {
      color: new Color([255, 255, 0, 0.25])
    },
    ui: {
      components: []
    }
  }));

  useEffect(() => {
    view.extent = extent!
  }, [extent, view])

  useEffect(() => {
    view.spatialReference = sr
  }, [sr, view])

  useEffect(() => {
    view.map = map;
  }, [view, map]);

  return (
    <MapViewContext.Provider value={view}>
      <div
        className="w-full h-full"
        ref={(node) => {
          if (node && view.container !== node) {
            view.container = node;
          }
        }}
      />
      {children}
    </MapViewContext.Provider>
  )
}

const MapView = memo(InternalMapView)

export default MapView;