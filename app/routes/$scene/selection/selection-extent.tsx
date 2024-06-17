import { Polygon } from "@arcgis/core/geometry";
import Graphic from "components/arcgis/graphic";
import { useMemo } from "react";
import { useSelectionStateSelector } from "./selection-context";
import { FillSymbol3DLayer, PolygonSymbol3D } from "@arcgis/core/symbols";

const PolygonSymbol = new PolygonSymbol3D({
  symbolLayers: [new FillSymbol3DLayer({
    material: { color: 'red' }
  })]
});

export default function SelectionExtent() {
  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);

  const polygon = useMemo(() => {
    if (origin == null || terminal == null) return null;
    const { x: ox, y: oy } = origin;
    const { x: tx, y: ty } = terminal;
    const ring: Polygon['rings'][number] = [
      [ox, oy],
      [ox, ty],
      [tx, ty],
      [tx, oy],
      [ox, oy],
    ]
    return new Polygon({
      rings: [ring],
      spatialReference: origin.spatialReference
    });
  }, [origin, terminal]);

  if (polygon == null) return;

  return (
    <Graphic
      geometry={polygon}
      symbol={PolygonSymbol}
    />
  )
}