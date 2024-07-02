import {
  CalciteBlock,
  CalciteDropdownItem,
  CalciteIcon,
  CalciteLabel,
  CalciteSplitButton,
} from "@esri/calcite-components-react";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "../../hooks/reactive";
import { Dispatch, useDeferredValue, useRef } from "react";
import { BlockAction, BlockState } from "./sidebar-state";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useElevationQuerySelector2 } from "../selection/actors/elevation-query-context";
import * as intl from "@arcgis/core/intl.js";

interface ModelOriginProps {
  state: BlockState['state'];
  dispatch: Dispatch<BlockAction[]>;
}
export default function ModelOrigin({
  state,
  dispatch,
}: ModelOriginProps) {
  const view = useSceneView();
  const sr = useAccessorValue(() => view.spatialReference?.wkid, { initial: true });

  const elevationPoint = useElevationQuerySelector2(state => state?.context.result) ?? null;

  const positionOrigin = useSelectionStateSelector((store) => store.origin, { initial: true }) ?? null;
  const adjustedOrigin = elevationPoint?.clone() ?? positionOrigin;
  if (positionOrigin) {
    adjustedOrigin!.x = positionOrigin.x;
    adjustedOrigin!.y = positionOrigin.y;
  }

  const origin = useDeferredValue(adjustedOrigin);
  const elevation =
    origin?.z != null
      ? intl.formatNumber(
        origin.z,
        { maximumFractionDigits: 2, style: 'unit', unit: 'meter', unitDisplay: 'short' }
      )
      : null;

  const latitude = origin?.latitude;
  const x = origin?.x;

  const longitude = origin?.longitude;
  const y = origin?.y;

  const latitudeString = latitude != null
    ? intl.formatNumber(
      latitude,
      { maximumFractionDigits: 2, style: 'unit', unit: 'angle-degree', unitDisplay: 'short' }
    )
    : null;

  const longitudeString = longitude != null
    ? intl.formatNumber(
      longitude,
      { maximumFractionDigits: 2, style: 'unit', unit: 'angle-degree', unitDisplay: 'short' }
    )
    : null;

  const wasClicked = useRef(false);

  return (
    <CalciteBlock
      id="modelOrigin"
      heading="Model origin"
      collapsible
      open={state === 'open'}
      onClick={() => {
        wasClicked.current = true;

        setTimeout(() => {
          wasClicked.current = false;
        }, 150)
      }}
      onCalciteBlockBeforeClose={() => {
        if (wasClicked.current) {
          dispatch([{
            type: 'close',
            mode: 'manual',
            block: 'modelOrigin'
          }])
        }
      }}
      onCalciteBlockBeforeOpen={() => {
        if (wasClicked.current) {
          dispatch([{
            type: 'open',
            mode: 'manual',
            block: 'modelOrigin'
          }])
        }
      }}
    >
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
              {elevation != null ? elevation : "--"}
            </p>
          </CalciteLabel>
        </li>
      </ul>
      <CalciteSplitButton
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