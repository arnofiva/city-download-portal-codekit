import {
  CalciteBlock,
  CalciteDropdownItem,
  CalciteIcon,
  CalciteLabel,
  CalciteSplitButton,
} from "@esri/calcite-components-react";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "../../hooks/reactive";
import { Dispatch, useDeferredValue, useEffect, useRef, useState } from "react";
import { BlockAction, BlockState } from "./sidebar-state";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useElevationQuerySelector } from "../selection/actors/elevation-query-context";
import * as intl from "@arcgis/core/intl.js";
import * as coordinateFormatter from "@arcgis/core/geometry/coordinateFormatter.js";

function useSpatialMetadata(wkid: number) {
  const [state, setState] = useState<'idle' | 'fetching'>('idle');
  const [data, setData] = useState<undefined | any>();
  const [error, setError] = useState<null | any>(null);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    setState('fetching');
    fetch(`https://spatialreference.org/ref/epsg/${wkid}/projjson.json`, {
      cache: 'force-cache',
      signal: abortController.signal,
    })
      .then(result => result.json())
      .then((data) => {
        if (mounted) setData(data);
      })
      .catch((reason) => {
        if (mounted) setError(reason)
      })
      .finally(() => {
        if (mounted) setState("idle")
      });

    return () => {
      abortController.abort();
      mounted = false;
    }
  }, [wkid]);

  return {
    state, data, error
  };
}

interface ModelOriginProps {
  state: BlockState['state'];
  dispatch: Dispatch<BlockAction[]>;
}
export default function ModelOrigin({
  state,
  dispatch,
}: ModelOriginProps) {
  const view = useSceneView();
  const sr = useAccessorValue(() => (view.spatialReference as any)?.latestWkid ?? view.spatialReference?.wkid, { initial: true });

  const metadataQuery = useSpatialMetadata(sr);

  let srName = metadataQuery.data?.name
    ? `${metadataQuery.data?.name ?? ""} (${sr ?? "--"})`
    : sr ?? "--";

  if (sr === 3857) {
    srName = "Web Mercator (3857)"
  }

  if (sr === 3395) {
    srName = "World Mercator (3395)"
  }

  const elevationPoint = useElevationQuerySelector(state => state?.context.elevationInfo?.getPoint(0)) ?? null;

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
    ? `${latitude.toFixed(2)}°`
    : null;

  const longitudeString = longitude != null
    ? `${longitude.toFixed(2)}°`
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
      <CalciteIcon slot="icon" icon="pin-tear-f" scale="s"></CalciteIcon>
      <ul className="grid grid-cols-2 grid-rows-2">
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">{latitude != null ? "Latitude" : "x"}</p>
            <p>
              {latitudeString ?? x?.toFixed(2) ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li className="row-start-2">
          <CalciteLabel scale="s">
            <p className="font-medium">{longitude != null ? "Longitude" : 'y'}</p>
            <p>
              {longitudeString ?? y?.toFixed(2) ?? "--"}
            </p>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">Spatial reference (WKID)</p>
            <p>
              {srName}
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
        disabled={origin == null}
        onCalciteSplitButtonPrimaryClick={() => {
          if (origin) {
            try {
              navigator.clipboard.writeText(coordinateFormatter.toLatitudeLongitude(origin, 'dms', 3))
            } catch (_) {
              const { x, y, z } = origin;

              // let text = z == null ? `${x},${y}` : `${x},${y},${z}`;
              // tooltips don't support pasting values with z when the layer is on-the-ground...
              const text = z == null ? `${x},${y}` : `${x},${y}`;
              navigator.clipboard.writeText(text);
            }
          }
        }}
      >
        <CalciteDropdownItem
          onClick={() => {
            if (origin) {
              try {
                navigator.clipboard.writeText(coordinateFormatter.toLatitudeLongitude(origin, 'dms', 3))
              } catch (_) {
                const { x, y, z } = origin;

                // let text = z == null ? `${x},${y}` : `${x},${y},${z}`;
                // tooltips don't support pasting values with z when the layer is on-the-ground...
                const text = z == null ? `${x},${y}` : `${x},${y}`;
                navigator.clipboard.writeText(text);
              }
            }
          }}
        >
          Copy as a latitude, longitude pair
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