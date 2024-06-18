import Graphic from "components/arcgis/graphic";
import { useSelectionStateSelector } from "./selection-context";
import { ExtrudeSymbol3DLayer, FillSymbol3DLayer, IconSymbol3DLayer, PointSymbol3D, PolygonSymbol3D, TextSymbol3DLayer } from "@arcgis/core/symbols";
import LineCallout3D from "@arcgis/core/symbols/callouts/LineCallout3D.js";
import GraphicsLayer from "components/arcgis/graphics-layer";
import pinTearIcon from './pin-tear-f.svg?url';
import StylePattern3D from "@arcgis/core/symbols/patterns/StylePattern3D.js";
import DimensionsLayer from "components/arcgis/dimensions-layer/dimensions-layer";
import LengthDimension from "components/arcgis/dimensions-layer/length-dimension";

const PolygonSymbol = new PolygonSymbol3D({
  symbolLayers: [
    new ExtrudeSymbol3DLayer({
      size: 100,
      material: { color: [255, 0, 0, 0.1] },
      castShadows: false,
    }),
    new FillSymbol3DLayer({
      material: { color: "red" },
      outline: { color: "red" },
      pattern: new StylePattern3D({ style: 'cross' })
    })
  ]
});

const Callout = new PointSymbol3D({
  symbolLayers: [
    new TextSymbol3DLayer({
      text: 'origin',
      size: 24
    }),
    new IconSymbol3DLayer({
      resource: {
        href: pinTearIcon
      },
      size: 35,
      material: { color: 'blue' }
    })
  ],
  verticalOffset: {
    screenLength: 100,
    maxWorldLength: 100,
    minWorldLength: 50
  },
  callout: new LineCallout3D({
    color: 'white',
    size: 2,
  })
})

export default function SelectionExtent() {
  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);
  const polygon = useSelectionStateSelector(state => state.context.selection);

  if (polygon == null) return;

  const offset = 600;

  const widthStart = origin!.clone();
  widthStart.z = offset;
  const widthEnd = widthStart!.clone();
  widthEnd.z = offset;
  widthEnd.y = terminal!.y;

  const heightStart = origin!.clone();
  heightStart.z = offset;
  const heightEnd = heightStart!.clone();
  heightEnd.z = offset;
  heightEnd.x = terminal!.x

  return (
    <>
      <GraphicsLayer elevationMode="relative-to-ground">
        <Graphic
          geometry={origin!}
          symbol={Callout}
        />
      </GraphicsLayer>
      <DimensionsLayer>
        <LengthDimension measureType="direct" startPoint={widthStart} endPoint={widthEnd} offset={100} />
        <LengthDimension measureType="direct" startPoint={heightStart} endPoint={heightEnd} offset={100} />
      </DimensionsLayer>
      <Graphic
        geometry={polygon}
        symbol={PolygonSymbol}
      />
    </>
  )
}