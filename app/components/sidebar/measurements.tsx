import {
  CalciteBlock,
  CalciteIcon,
  CalciteLabel,
} from "@esri/calcite-components-react";
// import * as ge from "@arcgis/core/geometry/geometryEngine";
// import { Point, Polyline } from "@arcgis/core/geometry";
import Minimap from "../minimap";
import {
  // ReactNode,
  RefObject,
  useDeferredValue,
  useEffect,
  // useMemo,
  useState
} from "react";
import { useFeatureQuerySelector, useSelectionStateSelector } from "../selection/selection-context";
import useEffectOnce from "~/hooks/useEffectOnce";
import DirectLineMeasurement3DViewModel from "@arcgis/core/widgets/DirectLineMeasurement3D/DirectLineMeasurement3DViewModel.js";
import { useAccessorValue } from "~/hooks/reactive";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import AreaMeasurement3DViewModel from "@arcgis/core/widgets/AreaMeasurement3D/AreaMeasurement3DViewModel.js";

// function createWidthLine(origin: Point, terminal: Point) {
//   const wl = new Polyline({
//     paths: [[
//       [origin.x, origin.y],
//       [origin.x, terminal.y]
//     ]],
//     spatialReference: origin.spatialReference
//   });
//   return wl;
// }

// function createHeightLine(origin: Point, terminal: Point) {
//   const hl = new Polyline({
//     paths: [[
//       [origin.x, origin.y],
//       [terminal.x, origin.y]
//     ]],
//     spatialReference: origin.spatialReference
//   });
//   return hl;
// }

interface MeasurementsProps {
  blockElementRef: RefObject<HTMLCalciteBlockElement>;
}
export default function Measurements({ blockElementRef }: MeasurementsProps) {
  const view = useSceneView();
  const [northToSouth] = useState(() => new DirectLineMeasurement3DViewModel({ view }));
  const [eastToWest] = useState(() => new DirectLineMeasurement3DViewModel({ view }));
  const [areaVm] = useState(() => new AreaMeasurement3DViewModel({ view }))

  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);
  const selection = useSelectionStateSelector(state => state.context.polygon);

  const deferredOrigin = useDeferredValue(origin);
  const deferredTerminal = useDeferredValue(terminal);
  const deferredSelection = useDeferredValue(selection);

  useEffect(() => {
    if (deferredOrigin == null || deferredTerminal == null || deferredSelection == null) {
      northToSouth.analysis.startPoint = null!;
      northToSouth.analysis.endPoint = null!;
      eastToWest.analysis.startPoint = null!;
      eastToWest.analysis.endPoint = null!;
      areaVm.analysis.geometry = deferredSelection!;
    } else {
      view.whenAnalysisView(northToSouth.analysis).then(analysisView => { analysisView.visible = false });
      view.whenAnalysisView(eastToWest.analysis).then(analysisView => { analysisView.visible = false });
      view.whenAnalysisView(areaVm.analysis).then(analysisView => { analysisView.visible = false });

      const nsEnd = deferredOrigin?.clone();
      nsEnd.y = deferredTerminal.y;
      northToSouth.analysis.startPoint = deferredOrigin!;
      northToSouth.analysis.endPoint = nsEnd!;

      const ewEnd = deferredOrigin.clone();
      ewEnd.x = deferredTerminal.x;
      eastToWest.analysis.startPoint = deferredOrigin!;
      eastToWest.analysis.endPoint = ewEnd!;

      areaVm.analysis.geometry = deferredSelection!;
    }
  }, [areaVm.analysis, deferredOrigin, deferredSelection, deferredTerminal, eastToWest.analysis, northToSouth.analysis, view]);

  const northToSouthLength = useAccessorValue(() => northToSouth.measurement?.directDistance.text);
  const eastToWestLength = useAccessorValue(() => eastToWest.measurement?.directDistance.text);
  const area = useAccessorValue(() => areaVm.measurement?.area.text);

  // const isGlobal = (selection?.spatialReference.isWGS84 || selection?.spatialReference.isWebMercator) ?? false;

  // const calculateArea = isGlobal ? ge.geodesicArea : ge.planarArea;
  // const calculateLength = isGlobal ? ge.geodesicLength : ge.planarLength;

  // const area = useMemo(() => deferredSelection ? Math.abs(calculateArea(deferredSelection)) : null, [
  //   calculateArea, deferredSelection
  // ]);

  // const northToSouthLength = useMemo(() => {
  //   if (deferredOrigin == null || deferredTerminal == null) return null;

  //   const wl = createWidthLine(deferredOrigin, deferredTerminal);
  //   return calculateLength(wl, 'feet');
  // }, [calculateLength, deferredOrigin, deferredTerminal]);

  // const eastToWestLength = useMemo(() => {
  //   if (deferredOrigin == null || deferredTerminal == null) return null;

  //   const hl = createHeightLine(deferredOrigin, deferredTerminal);
  //   return calculateLength(hl, 'feet');
  // }, [calculateLength, deferredOrigin, deferredTerminal]);

  const featureCount = useFeatureQuerySelector(state => {
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
    </CalciteBlock>
  );
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