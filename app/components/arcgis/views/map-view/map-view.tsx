import { ForwardedRef, PropsWithChildren, memo, useEffect, useMemo } from "react"
import CoreMapView from '@arcgis/core/views/MapView';
import { MapViewContext } from "./map-view-context";
import Color from "@arcgis/core/Color.js";
import { useMap } from "../../maps/map/map-context";
import { Extent, SpatialReference } from "@arcgis/core/geometry";
import useInstance from "~/hooks/useInstance";
import useProvideRef from "~/hooks/useProvideRef";

interface MapViewProps {
  spatialReference?: string;
  extent?: Extent;
  ref?: ForwardedRef<CoreMapView>;
}

function InternalMapView({ ref, children, spatialReference, extent }: PropsWithChildren<MapViewProps>) {
  const map = useMap();

  const sr = useMemo(() => spatialReference == null ?
    SpatialReference.WebMercator :
    new SpatialReference({
      wkid: +spatialReference
    }), [spatialReference])

  const view = useInstance(() => new CoreMapView({
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

  useProvideRef(view, ref)

  return (
    <MapViewContext.Provider value={view}>
      <div
        className="w-full h-full isolate"
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