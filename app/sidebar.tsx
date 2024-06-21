import {
  CalciteAction,
  CalciteBlock,
  CalciteDropdownItem,
  CalciteIcon,
  CalciteInputText,
  CalciteLabel,
  CalciteOption,
  CalcitePanel,
  CalciteSelect,
  CalciteShellPanel,
  CalciteSplitButton,
} from "@esri/calcite-components-react";
import useIsRoot from "~/hooks/useIsRoot";
import { useSceneListModal } from "./scene-list-modal/scene-list-modal-context";
import { useScene } from "./components/arcgis/maps/web-scene/scene-context";
import { useSceneView } from "./components/arcgis/views/scene-view/scene-view-context";
import * as ge from "@arcgis/core/geometry/geometryEngine";
import { Point, Polyline } from "@arcgis/core/geometry";
import Minimap from "./components/minimap";
import DownloadButton from "./components/download/download-button";
import FileSize from "./components/download/file-size";
import { useAccessorValue } from "./hooks/reactive";
import { useDeferredValue, useMemo, useState } from "react";
import { useSelectionStateSelector } from "./components/selection/selection-context";

export default function Sidebar() {
  const [, setOpen] = useSceneListModal();
  const scene = useScene();
  const isRoot = useIsRoot();

  const title = useAccessorValue(() => scene.portalItem.title, { initial: true });

  return (
    <CalciteShellPanel slot="panel-end" collapsed={isRoot}>
      <CalcitePanel heading={title ?? ""}>
        <CalciteAction
          icon="hamburger"
          text="Cities"
          slot="header-actions-end"
          onClick={() => setOpen(true)}
        />
        <ModelOrigin />
        <Measurements />
        <ExportSettings />
      </CalcitePanel>
    </CalciteShellPanel>
  );
}

function ModelOrigin() {
  const view = useSceneView();

  const sr = useAccessorValue(() => view.spatialReference?.wkid, { initial: true });
  const origin = useDeferredValue(useSelectionStateSelector(state => state.context.origin));

  const latitude = origin?.latitude;
  const x = origin?.x;

  const longitude = origin?.longitude;
  const y = origin?.y;

  const isOpen = origin != null;

  return (
    <CalciteBlock id="modelOrigin" heading="Model origin" collapsible open={origin != null}>
      <CalciteIcon slot="icon" icon="pin-tear-f"></CalciteIcon>
      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            Spatial reference (SRID)
            <p>
              {sr ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            {latitude != null ? "Latitude" : "x"}
            <p>
              {latitude ?? x ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            {longitude != null ? "Longitude" : 'y'}
            <p>
              {longitude ?? y ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            Elevation
            <p>
              {origin?.z ?? "--"}
            </p>
          </CalciteLabel>
        </li>
      </ul>
      <CalciteSplitButton
        primaryText="Copy to clipboard"
        width="full"
        primaryIconStart="copy-to-clipboard"
        appearance="outline-fill"
      >
        <CalciteDropdownItem>Copy as lat,lng</CalciteDropdownItem>
        <CalciteDropdownItem>Copy as WKT</CalciteDropdownItem>
      </CalciteSplitButton>
    </CalciteBlock>
  );
}

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

function Measurements() {
  const hasSelected = useSelectionStateSelector(state => state.matches({ initialized: 'created' }));
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

  return (
    <CalciteBlock id="measurements" heading="Measurements" collapsible open={hasSelected}>
      <CalciteIcon scale="s" slot="icon" icon="cursor-marquee"></CalciteIcon>
      <Minimap />
      <ul className="h-full">
        <li>
          <CalciteLabel scale="s">
            North to south length
            <p id="width-measurement" className="paragraph">
              {width ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            East to west length
            <p id="height-measurement" className="paragraph">
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
            Buildings
            <p id="number-of-buildings" className="paragraph">
              --
            </p>
          </CalciteLabel>
        </li>
      </ul>
    </CalciteBlock>
  );
}

function ExportSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const scene = useScene();

  const title = useAccessorValue(() => {
    const title = scene.portalItem.title;
    return title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, "_");
  }, { initial: true });

  const selection = useSelectionStateSelector(state => state.context.polygon);

  return (
    <CalciteBlock
      id="exportSettings"
      heading="Export"
      collapsible
      onCalciteBlockBeforeOpen={() => setIsOpen(true)}
      onCalciteBlockClose={() => setIsOpen(false)}
    >
      <CalciteIcon scale="s" slot="icon" icon="file-data"></CalciteIcon>
      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            Filename
            <CalciteInputText
              id="filename"
              placeholder={title}
            ></CalciteInputText>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            File type
            <CalciteSelect label="File type">
              <CalciteOption value="glb">Binary GLTF (GLB)</CalciteOption>
              <CalciteOption value="obj">OBJ</CalciteOption>
            </CalciteSelect>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            File size
            {selection != null ? <FileSize selection={selection} /> : "--"}
          </CalciteLabel>
        </li>
      </ul>
      {isOpen ? <DownloadButton /> : null}
    </CalciteBlock>
  );
}
