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
import useIsRoot from "hooks/useIsRoot";
import useAccessorValue from "hooks/useAccessorValue";
import { useCallback } from "react";
import { useSceneListModal } from "./scene-list-modal/scene-list-modal-context";
import { useScene } from "./routes/$scene/scene/scene-context";
import { useView } from "./routes/$scene/view/view-context";

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
  const view = useView();

  return (
    <CalciteBlock id="modelOrigin" heading="Model origin" open={false}>
      <CalciteIcon slot="icon" icon="pin-tear-f"></CalciteIcon>

      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            Spatial reference (SRID)
            <p id="spatial-reference" className="paragraph">
              {view.spatialReference?.wkid ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            Latitude
            <p id="origin-latitude" className="paragraph">
              --
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            Longitude
            <p id="origin-longitude" className="paragraph">
              --
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            Elevation
            <p id="origin-elevation" className="paragraph">
              --
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
  return (
    <CalciteBlock id="measurements" heading="Measurements" collapsible open={false}>
      <CalciteIcon scale="s" slot="icon" icon="cursor-marquee"></CalciteIcon>
      <div
        id="minimap"
        style={{
          paddingBottom: "var(--calcite-spacing-xs)",
        }}
      />
      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            Width
            <p id="width-measurement" className="paragraph">
              --
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            Height
            <p id="height-measurement" className="paragraph">
              --
            </p>
          </CalciteLabel>
        </li>
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
