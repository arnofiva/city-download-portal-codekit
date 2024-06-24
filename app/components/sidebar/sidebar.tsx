import {
  CalciteAction,
  CalcitePanel,
  CalciteShellPanel,
} from "@esri/calcite-components-react";
import useIsRoot from "~/hooks/useIsRoot";
import { useSceneListModal } from "../scene-list-modal/scene-list-modal-context";
import { useScene } from "../arcgis/maps/web-scene/scene-context";
import { useAccessorValue } from "../../hooks/reactive";
import ModelOrigin from "./model-origin";
import Measurements from "./measurements";
import ExportSettings from "./export-settings";
import { useEffect, useRef, useState } from "react";
import { useSelectionStateSelector } from "../selection/selection-context";

export default function Sidebar() {
  const [, setOpen] = useSceneListModal();
  const scene = useScene();
  const isRoot = useIsRoot();

  const title = useAccessorValue(() => scene.portalItem.title, { initial: true });

  const modelOriginRef = useRef<HTMLCalciteBlockElement>(null);
  const [modelOriginShouldOpen, setModelOriginShouldOpen] = useState(true);

  const measurementsRef = useRef<HTMLCalciteBlockElement>(null);
  const [measuremntsShouldOpen, setMeasuremntsShouldOpen] = useState(true);

  const exportSettingsRef = useRef<HTMLCalciteBlockElement>(null);
  const [exportSettingsShouldOpen, setExportSettingsShouldOpen] = useState(true);

  const state = useSelectionStateSelector(state => {
    if (state.matches({ initialized: { creating: 'terminal' } })) return 'terminal';
    if (state.matches({ initialized: { created: 'updating' } })) return 'confirming';
    if (state.matches({ initialized: { created: 'idle' } })) return 'finished';

    return 'waiting';
  })

  useEffect(() => {
    switch (state) {
      case 'waiting': break;
      case 'terminal': {
        if (modelOriginRef.current && modelOriginShouldOpen) {
          modelOriginRef.current.open = true;
          setModelOriginShouldOpen(false);
        }
        break;
      }
      case 'confirming': {
        if (measurementsRef.current && measuremntsShouldOpen) {
          measurementsRef.current.open = true;
          setMeasuremntsShouldOpen(false);
        }
        break;
      }
      case 'finished': {
        if (exportSettingsRef.current && exportSettingsShouldOpen) {
          exportSettingsRef.current.open = true;
          exportSettingsRef.current.scrollIntoView()
          setExportSettingsShouldOpen(false);

          if (measurementsRef.current) measurementsRef.current.open = false;
        }
        break;
      }
    }
  }, [exportSettingsShouldOpen, measuremntsShouldOpen, modelOriginShouldOpen, state])

  return (
    <CalciteShellPanel slot="panel-end" collapsed={isRoot}>
      <CalcitePanel heading={title ?? ""}>
        <CalciteAction
          icon="hamburger"
          text="Cities"
          slot="header-actions-end"
          onClick={() => setOpen(true)}
        />
        <ModelOrigin blockElementRef={modelOriginRef} />
        <Measurements blockElementRef={measurementsRef} />
        <ExportSettings blockElementRef={exportSettingsRef} />
      </CalcitePanel>
    </CalciteShellPanel>
  );
}