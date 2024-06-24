import {
  CalciteBlock,
  CalciteDropdownItem,
  CalciteIcon,
  CalciteLabel,
  CalciteSplitButton,
} from "@esri/calcite-components-react";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "../../hooks/reactive";
import { RefObject, useDeferredValue } from "react";
import { useSelectionStateSelector } from "../selection/selection-context";
import useEffectOnce from "~/hooks/useEffectOnce";

interface ModelOriginProps {
  blockElementRef: RefObject<HTMLCalciteBlockElement>;
}
export default function ModelOrigin({
  blockElementRef
}: ModelOriginProps) {
  const view = useSceneView();
  const sr = useAccessorValue(() => view.spatialReference?.wkid, { initial: true });
  const origin = useDeferredValue(useSelectionStateSelector(state => state.context.origin));

  const latitude = origin?.latitude;
  const x = origin?.x;

  const longitude = origin?.longitude;
  const y = origin?.y;

  useEffectOnce(() => {
    if (blockElementRef.current && origin) {
      blockElementRef.current.open = true;
      return true;
    }
  })

  return (
    <CalciteBlock ref={blockElementRef} id="modelOrigin" heading="Model origin" collapsible>
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
        id="copy-origin"
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