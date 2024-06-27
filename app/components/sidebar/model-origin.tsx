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

  const latitudeString = latitude != null
    ? `${latitude.toFixed(2)}°`
    : null;

  const longitudeString = longitude != null
    ? `${longitude.toFixed(2)}°`
    : null;

  useEffectOnce(() => {
    if (blockElementRef.current && origin) {
      blockElementRef.current.open = true;
      return true;
    }
  })

  return (
    <CalciteBlock ref={blockElementRef} id="modelOrigin" heading="Model origin" collapsible>
      <CalciteIcon slot="icon" icon="pin-tear-f"></CalciteIcon>
      <ul>
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">Spatial reference (WKID)</p>
            <p>
              {sr ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">{latitude != null ? "Latitude" : "x"}</p>
            <p>
              {latitudeString ?? x?.toFixed(2) ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">{longitude != null ? "Longitude" : 'y'}</p>
            <p>
              {longitudeString ?? y?.toFixed(2) ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">Elevation</p>
            <p>
              {origin?.z?.toFixed(2) ?? "--"}
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
        onCalciteSplitButtonPrimaryClick={() => {
          if (origin) {
            const { x, y, latitude, longitude, z } = origin;

            let text = z == null ? `${x},${y}` : `${x},${y},${z}`;
            if (latitude != null && longitude != null)
              text = z == null ? `${latitude},${longitude}` : `${latitude},${longitude},${z}`;

            navigator.clipboard.writeText(text);
          }
        }}
      >
        <CalciteDropdownItem
          onClick={() => {
            if (origin) {
              const { x, y, latitude, longitude, z } = origin;

              let text = z == null ? `${x},${y}` : `${x},${y},${z}`;
              if (latitude != null && longitude != null)
                text = z == null ? `${latitude},${longitude}` : `${latitude},${longitude},${z}`;

              navigator.clipboard.writeText(text);
            }
          }}
        >
          Copy as lat,lng
        </CalciteDropdownItem>
        <CalciteDropdownItem
          onClick={() => {
            if (origin) {
              const { x, y, latitude, longitude, z } = origin;

              let wkt = z == null ? `POINT(${x} ${y})` : `POINTZ(${x} ${y} ${z})`;

              if (latitude != null && longitude != null)
                wkt = z == null ? `POINT(${latitude} ${longitude})` : `POINTZ(${latitude} ${longitude} ${z})`;

              navigator.clipboard.writeText(wkt);
            }
          }}
        >
          Copy as WKT
        </CalciteDropdownItem>
      </CalciteSplitButton>
    </CalciteBlock>
  );
}