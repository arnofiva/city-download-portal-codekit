import { ForwardedRef, ReactNode, useEffect, useId, useRef } from "react";
import { useGraphicsLayer } from "./graphics-layer";
import CoreGraphic from '@arcgis/core/Graphic';
import { Geometry } from '@arcgis/core/geometry';
import { Symbol as ArcgisSymbol } from '@arcgis/core/symbols';
import useProvideRef from "~/hooks/useProvideRef";
import useInstance from "~/hooks/useInstance";

interface GraphicProps<GeometryType extends Geometry = Geometry> {
  geometry: GeometryType;
  symbol: ArcgisSymbol;
  ref?: ForwardedRef<CoreGraphic>;
  index?: number
}
export default function Graphic<GeometryType extends Geometry = Geometry>({
  geometry,
  symbol,
  ref,
  index
}: GraphicProps<GeometryType>): ReactNode {
  const id = useId();
  const graphic = useInstance(() => new CoreGraphic({
    attributes: {
      __graphicId: id
    }
  }));

  const layer = useGraphicsLayer();

  const currentGeometryProp = useRef<GeometryType>(geometry);
  useEffect(() => {
    graphic.geometry = geometry
    currentGeometryProp.current = geometry
  }, [geometry, graphic]);

  useEffect(() => {
    graphic.symbol = symbol
  }, [graphic, symbol]);

  useEffect(() => {
    layer.graphics.add(graphic, index);
    return () => {
      layer.remove(graphic)
    }
  }, [graphic, index, layer]);

  useProvideRef(graphic, ref);

  return null;
}
