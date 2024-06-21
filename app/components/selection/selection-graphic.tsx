import Graphic from "~/components/arcgis/graphic";
import { FillSymbol3DLayer, IconSymbol3DLayer, PointSymbol3D, PolygonSymbol3D, TextSymbol3DLayer } from "@arcgis/core/symbols";
import LineCallout3D from "@arcgis/core/symbols/callouts/LineCallout3D.js";
import GraphicsLayer from "~/components/arcgis/graphics-layer";
import pinTearIcon from './pin-tear-f.svg?url';
import StylePattern3D from "@arcgis/core/symbols/patterns/StylePattern3D.js";
import DimensionsLayer from "~/components/arcgis/dimensions-layer/dimensions-layer";
import LengthDimension from "~/components/arcgis/dimensions-layer/length-dimension";
import { useSelector } from "@xstate/react";
import { ActorRefFrom } from "xstate";
import { FeatureQueryMachine } from "./actors/feature-query-machine";
import { memo, useEffect } from "react";
import { useSelectionStateSelector } from "./selection-context";

const TransparentSymbol = new PolygonSymbol3D({
  symbolLayers: [
    new FillSymbol3DLayer({
      material: { color: [255, 0, 0, 0.0] },
      outline: { color: [255, 0, 0, 0] },
      pattern: new StylePattern3D({ style: 'diagonal-cross' })
    })
  ]
});

const PolygonSymbol = new PolygonSymbol3D({
  symbolLayers: [
    new FillSymbol3DLayer({
      material: { color: [255, 0, 0, 0.25] },
      outline: { color: [255, 0, 0, 1] },
      pattern: new StylePattern3D({ style: 'diagonal-cross' })
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
    screenLength: 150,
    maxWorldLength: 150,
    minWorldLength: 150
  },
  callout: new LineCallout3D({
    color: 'white',
    size: 2,
  })
})

interface HighlightProps {
  queryActor: ActorRefFrom<typeof FeatureQueryMachine>;
}
function InternalHighlight({ queryActor }: HighlightProps) {
  const featureMap = useSelector(queryActor, (snap) => snap.context.features);

  useEffect(() => {
    const handles: IHandle[] = [];
    for (const [layerview, { features }] of featureMap) {
      const handle = layerview.highlight(features);
      handles.push(handle);
    }

    return () => {
      for (const handle of handles) handle.remove();
    }
  }, [featureMap]);

  return null;
}
const Highlight = memo(InternalHighlight);

export default function SelectionExtent() {
  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);
  const polygon = useSelectionStateSelector(state => state.context.polygon);

  const query = useSelectionStateSelector(state => state.context.featureQuery);

  if (polygon == null) return;

  const widthStart = origin!;
  const widthEnd = widthStart!.clone();
  widthEnd.y = terminal!.y;

  const heightStart = origin!;
  const heightEnd = heightStart!.clone();
  heightEnd.x = terminal!.x;

  const borderStart = origin!.clone();
  borderStart.x = terminal!.x;
  borderStart.y = terminal!.y;

  return (
    <>
      {query ? <Highlight queryActor={query} /> : null}
      <GraphicsLayer elevationMode="relative-to-ground">
        <Graphic
          geometry={origin!}
          symbol={Callout}
        />
      </GraphicsLayer>
      <DimensionsLayer fontSize={12}>
        <LengthDimension measureType="horizontal" startPoint={widthStart} endPoint={widthEnd} offset={150} />
        <LengthDimension measureType="horizontal" startPoint={heightStart} endPoint={heightEnd} offset={150} />
      </DimensionsLayer>
      <DimensionsLayer>
        <LengthDimension measureType="horizontal" startPoint={borderStart} endPoint={widthEnd} offset={150} />
        <LengthDimension measureType="horizontal" startPoint={borderStart} endPoint={heightEnd} offset={150} />
      </DimensionsLayer>
      <GraphicsLayer>
        <Graphic
          geometry={polygon}
          symbol={PolygonSymbol}
        />
      </GraphicsLayer>
      <Graphic
        geometry={polygon}
        symbol={TransparentSymbol}
      />
    </>
  )
}