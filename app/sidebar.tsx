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
import useAccessorValue from "~/hooks/useAccessorValue";
import { Suspense, lazy, useCallback } from "react";
import { useSceneListModal } from "./scene-list-modal/scene-list-modal-context";
import { useScene } from "./components/arcgis/maps/web-scene/scene-context";
import { useSceneView } from "./components/arcgis/views/scene-view/scene-view-context";
import { useSelectionStateSelector } from "./components/selection/selection-context";
import * as ge from "@arcgis/core/geometry/geometryEngine";
import { Polyline } from "@arcgis/core/geometry";
import Minimap from "./components/minimap";

export default function Sidebar() {
  const [, setOpen] = useSceneListModal();
  const scene = useScene();
  const isRoot = useIsRoot();

  const getTitle = useCallback(() => scene.portalItem.title, [scene]);

  const title = useAccessorValue({
    getValue: getTitle,
    options: { initial: true }
  });

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

  const origin = useSelectionStateSelector(state => state.context.origin);

  const latitude = origin?.latitude;
  const x = origin?.x;

  const longitude = origin?.longitude;
  const y = origin?.y;

  return (
    <CalciteBlock id="modelOrigin" heading="Model origin" open>
      <CalciteIcon slot="icon" icon="pin-tear-f"></CalciteIcon>

      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            Spatial reference (SRID)
            <p>
              {view.spatialReference?.wkid ?? "--"}
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

function Measurements() {
  const view = useSceneView();

  const origin = useSelectionStateSelector(state => state.context.origin);
  const terminal = useSelectionStateSelector(state => state.context.terminal);
  const selection = useSelectionStateSelector(state => state.context.selection);
  const isGlobal = (selection?.spatialReference.isWGS84 || selection?.spatialReference.isWebMercator) ?? false;

  const calculateArea = isGlobal ? ge.geodesicArea : ge.planarArea;
  const calculateLength = isGlobal ? ge.geodesicLength : ge.planarLength;

  const area = selection ? Math.abs(calculateArea(selection)) : null;

  let width = null, height = null;
  if (origin != null && terminal != null) {

    const wl = new Polyline({
      paths: [[
        [origin.x, origin.y],
        [origin.x, terminal.y]
      ]],
      spatialReference: origin.spatialReference
    });
    width = calculateLength(wl, 'feet');

    const hl = new Polyline({
      paths: [[
        [origin.x, origin.y],
        [terminal.x, origin.y]
      ]],
      spatialReference: origin.spatialReference
    });
    height = calculateLength(hl, 'feet');
  }
  return (
    <CalciteBlock id="measurements" heading="Measurements" collapsible open>
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
  return (
    <CalciteBlock id="exportSettings" heading="Export" collapsible>
      <CalciteIcon scale="s" slot="icon" icon="file-data"></CalciteIcon>
      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            Filename
            <CalciteInputText
              id="filename"
              placeholder="Enter your region"
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
            <p id="file-size">2.1mb</p>
          </CalciteLabel>
        </li>
      </ul>
    </CalciteBlock>
  );
}
