import {
  CalciteBlock,
  CalciteButton,
  CalciteIcon,
  CalciteLabel,
} from "@esri/calcite-components-react";
import Minimap from "../minimap";
import {
  Dispatch,
  useDeferredValue,
  useEffect,
  useRef
} from "react";
import DimensionsLayer from "../arcgis/dimensions-layer/dimensions-layer";
import LengthDimension from "../arcgis/dimensions-layer/length-dimension";
import { BlockAction, BlockState } from "./sidebar-state";
import { useFeatureQuerySelector2 } from "../selection/actors/feature-query-context";
import { useElevationQuerySelector2 } from "../selection/actors/elevation-query-context";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useReferenceElementId, useWalkthrough } from "../selection/walk-through-context";
import * as intl from "@arcgis/core/intl";
import { Point, Polyline, SpatialReference } from "@arcgis/core/geometry";
import { distance, geodesicArea, geodesicLength, planarArea } from "@arcgis/core/geometry/geometryEngine";
import { useSelectionActor } from "../selection/selection";

interface MeasurementsProps {
  state: BlockState['state'];
  dispatch: Dispatch<BlockAction[]>;
}
export default function SelectionInfo({ state, dispatch }: MeasurementsProps) {
  const walkthrough = useWalkthrough();

  const id = useReferenceElementId('confirm', 'left');

  const selection = useSelectionStateSelector((store) => store.selection);

  const deferredSelection = useDeferredValue(selection);

  let area = null;
  let northToSouthLength = null;
  let eastToWestLength = null;

  if (deferredSelection) {
    const calculateArea =
      deferredSelection.spatialReference.isWGS84 || deferredSelection.spatialReference.isWebMercator
        ? geodesicArea
        : planarArea;

    area = intl.formatNumber(
      Math.abs(calculateArea(deferredSelection)),
      // intl does not support area units see list of supported units:
      //  https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#table-sanctioned-simple-unit-identifiers
      { maximumFractionDigits: 2, style: 'unit', unit: 'meter', unitDisplay: 'short' }
    ) + '²';

    const oo = deferredSelection.rings[0][0];
    const ot = deferredSelection.rings[0][1];
    const to = deferredSelection.rings[0][3];

    northToSouthLength = intl.formatNumber(
      calculateDistance(oo, ot, deferredSelection!.spatialReference),
      { maximumFractionDigits: 2, style: 'unit', unit: 'meter', unitDisplay: 'short' },
    );
    eastToWestLength = intl.formatNumber(
      calculateDistance(oo, to, deferredSelection!.spatialReference),
      { maximumFractionDigits: 2, style: 'unit', unit: 'meter', unitDisplay: 'short' }
    )
  }

  const featureCount = useFeatureQuerySelector2(state => {
    if (state == null) return 0;

    const featureResultMap = state.context.features;
    const count = Array.from(featureResultMap.values())
      .reduce((total, { features }) => features.length + total, 0);

    return count;
  });

  const ref = useRef<HTMLCalciteBlockElement>(null);
  useEffect(() => {
    if (state === 'open') {
      setTimeout(() => ref.current?.scrollIntoView(), 150);
    }
  }, [ref, state])

  const wasClicked = useRef(false);

  const [selectionActorState, send] = useSelectionActor();

  return (
    <>
      <CalciteBlock
        ref={ref}
        id={id}
        heading="Selection"
        collapsible
        open={state === 'open'}
        onClick={() => {
          wasClicked.current = true
          setTimeout(() => {
            wasClicked.current = false;
          }, 150)
        }}
        onCalciteBlockClose={() => {
          if (wasClicked.current) {
            dispatch([{
              type: 'close',
              mode: 'manual',
              block: 'selection'
            }])
          }
        }}
        onCalciteBlockBeforeOpen={() => {
          if (wasClicked.current) {
            dispatch([{
              type: 'open',
              mode: 'manual',
              block: 'selection'
            }])
          }
        }}
      >
        <CalciteIcon scale="s" slot="icon" icon="cursor-marquee"></CalciteIcon>
        <div className="flex flex-col gap-2">
          <Minimap />
          <ul className="h-full grid grid-cols-2 grid-rows-2 gap-2">
            <li>
              <MeasurementValue icon="arrow-up" label="North to south length" value={northToSouthLength} />
            </li>
            <li>
              <MeasurementValue icon="arrow-right" label="East to west length" value={eastToWestLength} />
            </li>
            <li>
              <MeasurementValue icon="grid-diamond" label="Area" value={area} />
            </li>
            <li>
              <MeasurementValue icon="urban-model" label="Selected features" value={featureCount} />
            </li>
          </ul>
          {selectionActorState.matches({ created: 'idle' })
            ? (
              <CalciteButton
                scale="l"
                iconStart="check"
                disabled={deferredSelection == null}
                appearance="outline-fill"
                onClick={() => {
                  send({ type: 'update.start' });
                }}
              >
                Update selection
              </CalciteButton>
            )
            : (
              <CalciteButton
                scale="l"
                iconStart="check"
                disabled={deferredSelection == null}
                onClick={() => {
                  send({ type: 'update.complete' });
                  walkthrough.advance('downloading');
                }}
              >
                Confirm selection
              </CalciteButton>
            )
          }
        </div>
      </CalciteBlock>
      <Dimensions />
    </>
  );
}

function Dimensions() {
  const positionOrigin = useSelectionStateSelector((store) => store.origin);
  const terminal = useSelectionStateSelector((store) => store.terminal);
  const elevationOrigin = useElevationQuerySelector2(state => state?.context.result) ?? null;

  if (positionOrigin == null || terminal == null || elevationOrigin == null) return null;

  // the elevation origin is updated async, so the dimensions will look choppy if we use that directly
  // instead we take the last available elevation, but use the x and y from the synchronously updating origin
  // this leads to some jumping around if the elevation changes a lot, but that isn't super concerning
  const origin = elevationOrigin?.clone() ?? positionOrigin;
  origin.x = positionOrigin.x;
  origin.y = positionOrigin.y;

  const widthStart = origin;
  const widthEnd = widthStart.clone();
  widthEnd.y = terminal?.y;

  const heightStart = origin;
  const heightEnd = heightStart.clone();
  heightEnd.x = terminal?.x;

  // const borderStart = origin.clone();
  // borderStart.x = terminal.x;
  // borderStart.y = terminal.y;

  return (
    <>
      <DimensionsLayer fontSize={12}>
        <LengthDimension
          measureType="horizontal"
          startPoint={widthStart}
          endPoint={widthEnd}
          offset={150}
        />
        <LengthDimension
          measureType="horizontal"
          startPoint={heightStart}
          endPoint={heightEnd}
          offset={150}
        />
      </DimensionsLayer>
      {/* <DimensionsLayer>
        <LengthDimension measureType="horizontal" startPoint={borderStart} endPoint={widthEnd} offset={150} />
        <LengthDimension measureType="horizontal" startPoint={borderStart} endPoint={heightEnd} offset={150} />
      </DimensionsLayer> */}
    </>
  )
}

interface MeasurementValueProps {
  icon: string;
  label: string;
  value?: string | number | null;
}
function MeasurementValue({ icon, label, value }: MeasurementValueProps) {
  return (
    <CalciteLabel scale="s">
      <span className="grid grid-rows-2 grid-cols-[min-content_1fr] gap-x-2">
        <CalciteIcon icon={icon} className="row-span-full place-self-center" />
        <p className="font-medium">{label}</p>
        <p>{value ?? "--"}</p>
      </span>
    </CalciteLabel>
  )
}

function calculateDistance(a: number[], b: number[], sr: SpatialReference) {
  if (sr.isWGS84 || sr.isWebMercator) {
    const line = new Polyline({
      paths: [[
        a,
        b
      ]],
      spatialReference: sr
    });

    return geodesicLength(line);
  } else {
    const aPoint = new Point({
      x: a[0],
      y: a[1],
      spatialReference: sr,
    });
    const bPoint = new Point({
      x: b[0],
      y: b[1],
      spatialReference: sr,
    });

    return distance(aPoint, bPoint);
  }

}