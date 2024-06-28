import {
  CalciteAlert,
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
import { useSelectionStateSelector } from "../selection/selection-context";
import { DownloadMachine } from "../download/download-machine";
import { useActor } from "@xstate/react";
import { completeWalkthrough } from "../walk-through/walk-through-popover";
import { RootShellPortal } from "../root-shell";
import ErrorAlertQueue from "../error-alert-queue";
import { BlockAction, BlockState } from "./sidebar-state";

function ExportErrorAlert({ onClose }: { type: string; onClose: () => void }) {
  return (
    <CalciteAlert icon kind="danger" label="Export error" open autoClose onCalciteAlertClose={onClose}>
      <p slot='title'>Failed to export</p>
      <p slot="message">An error occurred during export.</p>
    </CalciteAlert>
  )
}

interface ExportSettingsProps {
  state: BlockState['state'];
  dispatch: Dispatch<BlockAction[]>;
}
export default function ExportSettings({ dispatch, state }: ExportSettingsProps) {
  const scene = useScene();

  const title = useAccessorValue(() => {
    const title = scene.portalItem.title;
    return title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, "_");
  }, { initial: true });
  const [filename, setFilename] = useState("")

  const selection = useSelectionStateSelector(state => state.context.polygon);
  const [actor, send, actorRef] = useActor(DownloadMachine, { input: { scene } });
  const deferredSelection = useDeferredValue(selection);

  useEffect(() => {
    if (deferredSelection) {
      send({ type: 'change', selection: deferredSelection });
    }
    else send({ type: 'clear' })
  }, [deferredSelection, send])

  useEffect(() => {
    const subscription = actorRef.on("error", console.log);

    return subscription.unsubscribe
  }, [actorRef])

  const isLoadingWithoutFile = actor.context.file == null && actor.context.loading;
  const canDownload = actor.context.file != null && !actor.context.loading;

  const fileSize = actor.context.file?.size;

  let fileSizeString = 'unknown'
  if (deferredSelection == null) fileSizeString = 'no selection';
  if (fileSize != null) fileSizeString = `${(fileSize * 1e-6).toFixed(2)} mb`;
  if (actor.context.loading && fileSize == null) fileSizeString = 'loading';

  const ref = useRef<HTMLCalciteBlockElement>(null);
  useEffect(() => {
    if (state === 'open') {
      ref.current?.scrollIntoView();
    }
  }, [ref, state])

  const wasClicked = useRef(false);

  return (
    <CalciteBlock
      id="exportSettings"
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
              id="filename"
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
      <span id="download">
        <CalciteButton
          scale="l"
          width="full"
          iconStart="download"
          disabled={!canDownload}
          loading={isLoadingWithoutFile}
          onClick={() => {
            if (canDownload) {
              const name = filename || title || 'model';
              downloadFile(name, actor.context.file!);

              completeWalkthrough();
            }
          }}
        >
          Export model
        </CalciteButton>
      </span>
      <RootShellPortal>
        <ErrorAlertQueue
          alertComponent={ExportErrorAlert}
          captureError={capture => actorRef.on("error", capture).unsubscribe}
        />
      </RootShellPortal>
    </CalciteBlock>
  );
}

function downloadFile(name: string, blob: Blob) {
  const link = document.createElement("a");
  link.download = `${name}.glb`;
  link.href = window.URL.createObjectURL(blob);
  link.click();
}
