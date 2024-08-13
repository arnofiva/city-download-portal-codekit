import {
  CalciteBlock,
  CalciteButton,
  CalciteIcon,
  CalciteInputText,
  CalciteLabel,
  // CalciteOption,
  // CalciteSelect,
} from "@esri/calcite-components-react";
import { useScene } from "../arcgis/maps/web-scene/scene-context";
import { useAccessorValue } from "../../hooks/reactive";
import { Dispatch, useDeferredValue, useEffect, useRef, useState } from "react";
import { useDownloadQuery } from "../../hooks/queries/download/download-query";
import { BlockAction, BlockState } from "./sidebar-state";
import { useSelectionStateSelector } from "~/data/selection-store";
import { useReferenceElementId, useWalkthrough } from "../selection/walk-through-context";
import { useSelectionActor } from "../selection/selection";
import { useToast } from "../toast";

interface ExportSettingsProps {
  state: BlockState['state'];
  dispatch: Dispatch<BlockAction[]>;
}
export default function ExportSettings({ dispatch, state }: ExportSettingsProps) {
  const walkthrough = useWalkthrough();
  const scene = useScene();

  const title = useAccessorValue(() => {
    const title = scene.portalItem.title;
    return title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, "_");
  });
  const [filename, setFilename] = useState("")

  const [s] = useSelectionActor();
  const selection = useSelectionStateSelector((store) => store.selection, { initial: true }) ?? null;

  const downloadQuery = useDownloadQuery(s.matches({ created: 'idle' }));
  const file = downloadQuery.data;

  const deferredSelection = useDeferredValue(selection);

  const isLoadingWithoutFile = downloadQuery.data == null && downloadQuery.status === 'loading';
  const canDownload = downloadQuery.data != null && downloadQuery.status === 'success'

  const fileSize = downloadQuery.data?.size;

  let fileSizeString = 'unknown'
  if (deferredSelection == null) fileSizeString = 'no selection';
  if (fileSize != null) fileSizeString = `${(fileSize * 1e-6).toFixed(2)} mb`;
  if (downloadQuery.status === 'loading' && fileSize == null) fileSizeString = 'loading';

  const ref = useRef<HTMLCalciteBlockElement>(null);
  useEffect(() => {
    if (state === 'open') {
      ref.current?.scrollIntoView();
    }
  }, [ref, state])

  const wasClicked = useRef(false);

  const id = useReferenceElementId('downloading', 'left')

  const toast = useToast();

  useEffect(() => {
    if (downloadQuery.data) {
      toast({
        title: 'Model generation complete',
        message: 'The model is ready for export!',
        severity: 'success',
        code: '1'
      })
    }
    if (downloadQuery.error) {
      toast({
        title: 'Model generation error',
        message: 'There was an error while generating the model',
        severity: 'danger',
        code: '0'
      })
    }
  }, [downloadQuery.data, downloadQuery.error, toast])

  return (
    <CalciteBlock
      id={id}
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
        {/* <li>
          <CalciteLabel scale="s">
            File type
            <CalciteSelect label="File type">
              <CalciteOption value="glb">Binary GLTF (GLB)</CalciteOption>
              <CalciteOption value="obj">OBJ</CalciteOption>
            </CalciteSelect>
          </CalciteLabel>
        </li> */}
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
        disabled={!canDownload}
        loading={isLoadingWithoutFile}
        onClick={() => {
          if (canDownload) {
            const name = filename || title || 'model';
            downloadFile(name, file!);

            walkthrough.advance('done');
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
