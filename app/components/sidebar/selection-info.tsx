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
import { useSelectionElevationInfo } from "../../hooks/queries/elevation-query";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useReferenceElementId, useWalkthrough } from "../selection/walk-through-context";
import * as intl from "@arcgis/core/intl";
import { geodesicArea, planarArea } from "@arcgis/core/geometry/geometryEngine";
import { useSelectionActor } from "../selection/selection";
import { useSelectedFeaturesFromLayerViews } from "../../hooks/queries/feature-query";

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

    northToSouthLength = intl.formatNumber(
      deferredSelection.extent.height,
      { maximumFractionDigits: 2, style: 'unit', unit: 'meter', unitDisplay: 'short' },
    );
    eastToWestLength = intl.formatNumber(
      deferredSelection.extent.width,
      { maximumFractionDigits: 2, style: 'unit', unit: 'meter', unitDisplay: 'short' }
    )
  }

  const { data } = useSelectedFeaturesFromLayerViews();
  const featureCount = (data ? Array.from(data.values()) : []).reduce((total, f) => total + f.length, 0)

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
              <MeasurementValue icon="arrow-double-vertical" label="North to south length" value={northToSouthLength} />
            </li>
            <li>
              <MeasurementValue icon="arrow-double-horizontal" label="East to west length" value={eastToWestLength} />
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
  const positionOrigin = useSelectionStateSelector((store) => store.selectionOrigin);
  const terminal = useSelectionStateSelector((store) => store.selectionTerminal);
  const elevationQuery = useSelectionElevationInfo()

  if (positionOrigin == null || terminal == null || elevationQuery.data == null) return null;

  const otz = elevationQuery.data.selectionPoints.ot.z;
  const toz = elevationQuery.data.selectionPoints.to.z;

  // the elevation origin is updated async, so the dimensions will look choppy if we use that directly
  // instead we take the last available elevation, but use the x and y from the synchronously updating origin
  // this leads to some jumping around if the elevation changes a lot, but that isn't super concerning
  const origin = positionOrigin.clone();
  origin.x = positionOrigin.x;
  origin.y = positionOrigin.y;
  origin.z = elevationQuery.data.selectionPoints.oo.z

  const widthStart = origin.clone();
  const widthEnd = widthStart.clone();
  widthEnd.y = terminal?.y;
  widthEnd.z = Math.min(otz ?? widthEnd.z, widthEnd.z);

  const heightStart = origin.clone();
  const heightEnd = heightStart.clone();
  heightEnd.x = terminal?.x;
  heightEnd.z = Math.min(toz ?? heightEnd.z, heightEnd.z);

  return (
    <DimensionsLayer fontSize={12}>
      <LengthDimension
        measureType="horizontal"
        startPoint={widthEnd}
        endPoint={origin}
      />
      <LengthDimension
        measureType="horizontal"
        startPoint={heightEnd}
        endPoint={origin}
      />
    </DimensionsLayer>
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
