import { useEffect, useState } from "react";
import { useGraphicsLayer } from "./graphics-layer";
import CoreGraphic from '@arcgis/core/Graphic';
import { Geometry } from '@arcgis/core/geometry';
import { Symbol as ArcgisSymbol } from '@arcgis/core/symbols';

interface GraphicProps {
  geometry: Geometry;
  symbol: ArcgisSymbol;
}
export default function Graphic({
  geometry,
  symbol,
}: GraphicProps) {
  const [graphic] = useState(() => new CoreGraphic());

  const layer = useGraphicsLayer();

  useEffect(() => {
    layer.add(graphic);

    return () => { layer.remove(graphic) }
  }, [graphic, layer]);

  useEffect(() => {
    graphic.geometry = geometry
  }, [geometry, graphic]);

  useEffect(() => {
    graphic.symbol = symbol
  }, [graphic, symbol])

  return null;
}