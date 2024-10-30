import {
  CalciteBlock,
  CalciteButton,
  CalciteCheckbox,
  CalciteIcon,
  CalciteInputText,
  CalciteLabel,
} from "@esri/calcite-components-react";
import { useScene } from "../arcgis/maps/web-scene/scene-context";
import { useAccessorValue } from "../../hooks/reactive";
import { Dispatch, useDeferredValue, useEffect, useRef, useState } from "react";
import { useDownloadExportMutation, useExportQuery } from "../../hooks/queries/download/export-query";
import { BlockAction, BlockState } from "./sidebar-state";
import { useSelectionState } from "~/data/selection-store";
import { useReferenceElementId } from "../selection/walk-through-context";
import { useSelectedFeaturesFromLayers } from "~/hooks/queries/feature-query";
import { useOriginElevationInfo } from "~/hooks/queries/elevation-query";
import { Mesh } from "@arcgis/core/geometry";

interface ExportSettingsProps {
  state: BlockState['state'];
  dispatch: Dispatch<BlockAction[]>;
}
export default function ExportSettings({ dispatch, state }: ExportSettingsProps) {
  const scene = useScene();

  const title = useAccessorValue(() => {
    const title = scene.portalItem.title;
    return title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, "_");
  });
  const [filename, setFilename] = useState("")
  const [includeOriginMarker, setIncludeOriginMarker] = useState(true);

  const store = useSelectionState();
  const editingState = useAccessorValue(() => store.editingState);
  const selection = useAccessorValue(() => store.selection)
  const deferredSelection = useDeferredValue(selection);

  const featureQuery = useSelectedFeaturesFromLayers(editingState === 'idle');
  const features = Array.from(featureQuery.data?.values() ?? []).flat();
  const modelOrigin = useOriginElevationInfo().data

  const downloadQuery = useExportQuery({
    includeOriginMarker,
    enabled: editingState === 'idle'
  });

  const mutation = useDownloadExportMutation();

  const canDownload = editingState === 'idle'

  const fileSize = downloadQuery.data?.size;

  let fileSizeString = 'unknown'
  if (deferredSelection == null) fileSizeString = 'no selection';
  if (fileSize != null) fileSizeString = `${(fileSize * 1e-6).toFixed(2)} mb`;
  if (downloadQuery.isFetching && fileSize == null) fileSizeString = 'loading';

  const ref = useRef<HTMLCalciteBlockElement>(null);
  useEffect(() => {
    if (state === 'open') {
      ref.current?.scrollIntoView();
    }
  }, [ref, state])

  const wasClicked = useRef(false);

  const blockElementId = useReferenceElementId('downloading', 'left')
  return (
    <CalciteBlock
      id={blockElementId}
      heading="Export"
      collapsible
      ref={ref}
      open={state === 'open'}
      onClick={() => {
        wasClicked.current = true
        setTimeout(() => {
          wasClicked.current = false;
        }, 150)
      }}
      onCalciteBlockClose={() => {
        if (wasClicked) {
          dispatch([{
            type: 'close',
            mode: 'manual',
            block: 'exportSettings'
          }])
        }
      }}
      onCalciteBlockOpen={() => {
        if (wasClicked) {
          dispatch([{
            type: 'open',
            mode: 'manual',
            block: 'exportSettings'
          }])
        }
      }}
    >
      <CalciteIcon scale="s" slot="icon" icon="file-data"></CalciteIcon>
      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">Filename</p>
            <CalciteInputText
              placeholder={title}
              value={filename}
              onCalciteInputTextInput={(event) => {
                setFilename(event.target.value)
              }}
              suffixText=".glb"
            ></CalciteInputText>
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s" layout="inline">
            <CalciteCheckbox checked={includeOriginMarker} onCalciteCheckboxChange={() => setIncludeOriginMarker(!includeOriginMarker)} />
            Include origin marker
          </CalciteLabel>
        </li>
        <li>
          <CalciteLabel scale="s">
            <p className="font-medium">File size</p>
            <p className={!canDownload ? "opacity-50" : ""}>{fileSizeString}</p>
          </CalciteLabel>
        </li>
      </ul>
      <CalciteButton
        scale="l"
        width="full"
        iconStart="download"
        disabled={!canDownload || mutation.isPending}
        loading={mutation.isPending}
        onClick={() => {
          if (canDownload) {
            mutation.mutateAsync({
              scene,
              extent: selection!.extent,
              meshes: features.map(f => f.geometry as Mesh),
              origin: modelOrigin!,
              includeOriginMarker,
              filename,
            })
              .then(blob => {
                const name = filename || title || 'model';
                downloadFile(name, blob);
                store.exportState = 'exported'
              })
          }
        }}
      >
        Export model
      </CalciteButton>
    </CalciteBlock>
  );
}

function downloadFile(name: string, blob: Blob) {
  const link = document.createElement("a");
  link.download = `${name}.glb`;
  link.href = window.URL.createObjectURL(blob);
  link.click();
}

