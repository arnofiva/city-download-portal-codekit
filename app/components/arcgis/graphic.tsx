import { ForwardedRef, ReactNode, useEffect, useId, useRef } from "react";
import { useGraphicsLayer } from "./graphics-layer";
import CoreGraphic from '@arcgis/core/Graphic';
import { Geometry } from '@arcgis/core/geometry';
import { Symbol as ArcgisSymbol } from '@arcgis/core/symbols';
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import useProvideRef from "~/hooks/useProvideRef";
import useInstance from "~/hooks/useInstance";

interface GraphicProps<GeometryType extends Geometry = Geometry> {
  geometry: GeometryType;
  symbol: ArcgisSymbol;
  onChange?: (geometry: GeometryType) => void;
  onDelete?: () => void;
  ref?: ForwardedRef<CoreGraphic>;
}
export default function Graphic<GeometryType extends Geometry = Geometry>({
  geometry,
  symbol,
  onChange,
  onDelete,
  ref
}: GraphicProps<GeometryType>): ReactNode {
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

  useEffect(() => {
    graphic.geometry = geometry
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

  useEffect(() => {
    if (ref == null) return;

    if (typeof ref === 'object') {
      ref.current = graphic;
    } else {
      ref(graphic);
    }
  });

  useProvideRef(graphic, ref);

  return null;
}
