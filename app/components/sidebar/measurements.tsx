import {
  CalciteBlock,
  CalciteIcon,
  CalciteLabel,
} from "@esri/calcite-components-react";
import * as ge from "@arcgis/core/geometry/geometryEngine";
import { Point, Polyline } from "@arcgis/core/geometry";
import Minimap from "../minimap";
import { RefObject, useDeferredValue, useMemo } from "react";
import { useFeatureQuerySelector, useSelectionStateSelector } from "../selection/selection-context";
import useEffectOnce from "~/hooks/useEffectOnce";

function createWidthLine(origin: Point, terminal: Point) {
  const wl = new Polyline({
    paths: [[
      [origin.x, origin.y],
      [origin.x, terminal.y]
    ]],
    spatialReference: origin.spatialReference
  });
  return wl;
}

function createHeightLine(origin: Point, terminal: Point) {
  const hl = new Polyline({
    paths: [[
      [origin.x, origin.y],
      [terminal.x, origin.y]
    ]],
    spatialReference: origin.spatialReference
  });
  return hl;
}

interface MeasurementsProps {
  blockElementRef: RefObject<HTMLCalciteBlockElement>;
}
export default function Measurements({ blockElementRef }: MeasurementsProps) {
  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);
  const selection = useSelectionStateSelector(state => state.context.polygon);

  const deferredOrigin = useDeferredValue(origin);
  const deferredTerminal = useDeferredValue(terminal);
  const deferredSelection = useDeferredValue(selection)

  const isGlobal = (selection?.spatialReference.isWGS84 || selection?.spatialReference.isWebMercator) ?? false;

  const calculateArea = isGlobal ? ge.geodesicArea : ge.planarArea;
  const calculateLength = isGlobal ? ge.geodesicLength : ge.planarLength;

  const area = useMemo(() => deferredSelection ? Math.abs(calculateArea(deferredSelection)) : null, [
    calculateArea, deferredSelection
  ]);

  const width = useMemo(() => {
    if (deferredOrigin == null || deferredTerminal == null) return null;

    const wl = createWidthLine(deferredOrigin, deferredTerminal);
    return calculateLength(wl, 'feet');
  }, [calculateLength, deferredOrigin, deferredTerminal]);

  const height = useMemo(() => {
    if (deferredOrigin == null || deferredTerminal == null) return null;

    const hl = createHeightLine(deferredOrigin, deferredTerminal);
    return calculateLength(hl, 'feet');
  }, [calculateLength, deferredOrigin, deferredTerminal]);

  const featureCount = useFeatureQuerySelector(state => {
    console.log({ state })
    if (state == null) return 0;

    const featureResultMap = state.context.features;
    const count = Array.from(featureResultMap.values())
      .reduce((total, { features }) => features.length + total, 0);

    return count;
  });


  const hasSelected = useSelectionStateSelector(state => state.matches({ initialized: 'created' }));
  useEffectOnce(() => {
    if (hasSelected && blockElementRef.current) {
      blockElementRef.current.open = true;
      return true;
    }
  })

  return (
    <CalciteBlock
      id="measurements"
      heading="Measurements"
      collapsible
      ref={blockElementRef}
    >
      <CalciteIcon scale="s" slot="icon" icon="cursor-marquee"></CalciteIcon>
      <Minimap />
      <ul className="h-full">
        <li>
          <CalciteLabel scale="s">
            North to south length
            <p>
              {width ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            East to west length
            <p>
              {height ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        {area != null ? (
          <li>
            <CalciteLabel scale="s">
              Area
              <p>{area}</p>
            </CalciteLabel>
          </li>
        ) : null}
        <li>
          <CalciteLabel scale="s">
            Selected features
            <p>
              {featureCount}
            </p>
          </CalciteLabel>
        </li>
      </ul>
    </CalciteBlock>
  );
}