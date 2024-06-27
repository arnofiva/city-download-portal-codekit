import Graphic from "~/components/arcgis/graphic";
import { FillSymbol3DLayer, IconSymbol3DLayer, PointSymbol3D, PolygonSymbol3D, TextSymbol3DLayer } from "@arcgis/core/symbols";
import LineCallout3D from "@arcgis/core/symbols/callouts/LineCallout3D.js";
import GraphicsLayer from "~/components/arcgis/graphics-layer";
import pinTearIcon from './pin-tear-f.svg?url';
import StylePattern3D from "@arcgis/core/symbols/patterns/StylePattern3D.js";
import { ActorRefFrom } from "xstate";
import { FeatureQueryMachine } from "./actors/feature-query-machine";
import { memo, useEffect } from "react";
import { useFeatureQuerySelector, useSelectionStateSelector } from "./selection-context";

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

function InternalHighlight() {
  const featureMap = useFeatureQuerySelector(state => state?.context.features);

  useEffect(() => {
    if (featureMap) {
      const handles: IHandle[] = [];
      for (const [layerview, { features }] of featureMap) {
        const handle = layerview.highlight(features);
        handles.push(handle);
      }

      return () => {
        for (const handle of handles) handle.remove();
      }
    }
  }, [featureMap]);

  return null;
}
const Highlight = memo(InternalHighlight);

export default function SelectionExtent() {
  const origin = useSelectionStateSelector(state => state.context.origin);
  const polygon = useSelectionStateSelector(state => state.context.polygon);

  const query = useSelectionStateSelector(state => state.children['feature-query'] as ActorRefFrom<typeof FeatureQueryMachine>);

  if (polygon == null) return;

  return (
    <>
      {query ? <Highlight /> : null}
      <GraphicsLayer elevationMode="relative-to-ground">
        <Graphic
          geometry={origin!}
          symbol={Callout}
        />
      </GraphicsLayer>
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