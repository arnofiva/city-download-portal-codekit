import { ForwardedRef, ReactNode, useEffect, useId, useRef } from "react";
import { useGraphicsLayer } from "./graphics-layer";
import CoreGraphic from '@arcgis/core/Graphic';
import { Geometry } from '@arcgis/core/geometry';
import { Symbol as ArcgisSymbol } from '@arcgis/core/symbols';
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import useProvideRef from "~/hooks/useProvideRef";
import useInstance from "~/hooks/useInstance";
import { useSketch } from "./sketch/sketch";

interface GraphicProps<GeometryType extends Geometry = Geometry> {
  geometry: GeometryType;
  symbol: ArcgisSymbol;
  onChange?: (geometry: GeometryType) => void;
  onUpdateStart?: (graphic: CoreGraphic) => void,
  onUpdateComplete?: (graphic: CoreGraphic) => void,
  onDelete?: () => void;
  ref?: ForwardedRef<CoreGraphic>;
}
export default function Graphic<GeometryType extends Geometry = Geometry>({
  geometry,
  symbol,
  onUpdateStart,
  onUpdateComplete,
  onChange,
  onDelete,
  ref
}: GraphicProps<GeometryType>): ReactNode {
  const sketch = useSketch();
  const id = useId();
  const graphic = useInstance(() => new CoreGraphic({
    attributes: {
      __graphicId: id
    }
  }));

  const layer = useGraphicsLayer();

  const currentOnDelete = useRef(onDelete);
  useEffect(() => {
    currentOnDelete.current = onDelete;
  })

  useEffect(() => {
    const handle = layer.graphics.on('change', (event) => {
      if (event.removed.includes(graphic)) {
        currentOnDelete.current?.()
      }
    });

    return handle.remove;
  }, [graphic, layer.graphics]);

  const currentGeometryProp = useRef<GeometryType>(geometry);
  useEffect(() => {
    graphic.geometry = geometry
    currentGeometryProp.current = geometry
  }, [geometry, graphic]);

  useEffect(() => {
    graphic.symbol = symbol
  }, [graphic, symbol]);

  const currentOnChange = useRef(onChange);
  useEffect(() => {
    currentOnChange.current = onChange;
  })

  const getCurrentGeometry = useRef(() => graphic.geometry).current
  useEffect(() => {
    const handle = reactiveUtils.watch(
      () => getCurrentGeometry() as GeometryType,
      (geometry) => {
        if (geometry != currentGeometryProp.current)
          currentOnChange.current?.(geometry)
      });

    return handle.remove;
  }, [getCurrentGeometry]);

  useEffect(() => {
    layer.add(graphic);
    return () => {
      layer.remove(graphic)
    }
  }, [graphic, layer]);

  const currentOnUpdateStart = useRef(onUpdateStart);
  useEffect(() => {
    currentOnUpdateStart.current = onUpdateStart;
  })

  const currentOnUpdateComplete = useRef(onUpdateComplete);
  useEffect(() => {
    currentOnUpdateComplete.current = onUpdateComplete;
  })
  useEffect(() => {
    if (sketch == null) return;

    const handle = sketch.on("update", (event) => {
      if (event.graphics.includes(graphic)) {
        if (event.state === "start") {
          currentOnUpdateStart.current?.(graphic);
        }
        if (event.state === 'complete') {
          currentOnUpdateComplete.current?.(graphic)
        }
      }
    })

    return handle.remove;
  }, [graphic, sketch]);

  useProvideRef(graphic, ref);

  return null;
}
