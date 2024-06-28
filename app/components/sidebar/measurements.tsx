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
  useRef,
  useState
} from "react";
import { useFeatureQuerySelector, useSelectionActorRef, useSelectionStateSelector } from "../selection/selection-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import AreaMeasurement3DViewModel from "@arcgis/core/widgets/AreaMeasurement3D/AreaMeasurement3DViewModel.js";
import DimensionsLayer from "../arcgis/dimensions-layer/dimensions-layer";
import LengthDimension from "../arcgis/dimensions-layer/length-dimension";
import { BlockAction, BlockState } from "./sidebar-state";

interface MeasurementsProps {
  state: BlockState['state'];
  dispatch: Dispatch<BlockAction[]>;
}
export default function Measurements({ state, dispatch }: MeasurementsProps) {
  const actor = useSelectionActorRef();

  const view = useSceneView();
  const [areaVm] = useState(() => new AreaMeasurement3DViewModel({ view }));

  const [northToSouth, setNorthToSouth] = useState<__esri.Length | undefined>();
  const [eastToWest, setEastToWest] = useState<__esri.Length | undefined>();

  const selection = useSelectionStateSelector(state => state.context.polygon);

  const deferredSelection = useDeferredValue(selection);

  useEffect(() => {
    if (deferredSelection == null) {
      areaVm.analysis.geometry = deferredSelection!;
    } else {
      view.whenAnalysisView(areaVm.analysis).then(analysisView => { analysisView.visible = false });
      areaVm.analysis.geometry = deferredSelection!;
    }
  }, [areaVm.analysis, deferredSelection, view]);

  const area = useAccessorValue(() => areaVm.measurement?.area.text);

  const nsUnit = shortUnit(northToSouth?.unit);
  const ewUnit = shortUnit(eastToWest?.unit);

  const northToSouthLength = northToSouth ? `${northToSouth.value.toFixed(2)} ${nsUnit}` : '--';
  const eastToWestLength = eastToWest ? `${eastToWest.value.toFixed(2)} ${ewUnit}` : '--';

  const featureCount = useFeatureQuerySelector(state => {
    if (state == null) return 0;

    const featureResultMap = state.context.features;
    const count = Array.from(featureResultMap.values())
      .reduce((total, { features }) => features.length + total, 0);

    return count;
  });

  const hasSelected = useSelectionStateSelector(state => state.matches({ initialized: 'created' }));

  const wasClicked = useRef(false);

  return (
    <>
      <CalciteBlock
        id="measurements"
        heading="Measurements"
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
              block: 'measurements'
            }])
          }
        }}
        onCalciteBlockBeforeOpen={() => {
          if (wasClicked.current) {
            dispatch([{
              type: 'open',
              mode: 'manual',
              block: 'measurements'
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
          <CalciteButton
            scale="l"
            iconStart="check"
            disabled={!hasSelected}
            onClick={() => actor.send({ type: 'update.complete' })}
          >
            Confirm selection
          </CalciteButton>
        </div>
      </CalciteBlock>
      <Dimensions onEasetToWestResult={setEastToWest} onNorthToSouthResult={setNorthToSouth} />
    </>
  );
}

interface DimensionsProps {
  onNorthToSouthResult: (result?: __esri.Length) => void
  onEasetToWestResult: (result?: __esri.Length) => void
}
function Dimensions({ onEasetToWestResult, onNorthToSouthResult }: DimensionsProps) {
  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);

  if (origin == null || terminal == null) return null;

  const widthStart = origin;
  const widthEnd = widthStart.clone();
  widthEnd.y = terminal?.y;

  const heightStart = origin;
  const heightEnd = heightStart.clone();
  heightEnd.x = terminal?.x;

  const borderStart = origin.clone();
  borderStart.x = terminal.x;
  borderStart.y = terminal.y;

  return (
    <>
      <DimensionsLayer fontSize={12}>
        <LengthDimension
          measureType="horizontal"
          startPoint={widthStart}
          endPoint={widthEnd}
          offset={150}
          onMeasurementResult={onEasetToWestResult}
        />
        <LengthDimension
          measureType="horizontal"
          startPoint={heightStart}
          endPoint={heightEnd}
          offset={150}
          onMeasurementResult={onNorthToSouthResult}
        />
      </DimensionsLayer>
      <DimensionsLayer>
        <LengthDimension measureType="horizontal" startPoint={borderStart} endPoint={widthEnd} offset={150} />
        <LengthDimension measureType="horizontal" startPoint={borderStart} endPoint={heightEnd} offset={150} />
      </DimensionsLayer>
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

function shortUnit(unit?: __esri.LengthUnit) {
  let short = 'm';
  if (unit === "millimeters") short = "mm";
  if (unit === "centimeters") short = "cm";
  if (unit === "decimeters") short = "dm";
  if (unit === "meters") short = "m";
  if (unit === "kilometers") short = "km";

  if (unit === "inches") short = "in";
  if (unit === "feet") short = "ft";
  if (unit === "us-feet") short = "ft";
  if (unit === "yards") short = "yr";
  if (unit === "miles") short = "mi";
  if (unit === "nautical-miles") short = "mi";

  return short;
}