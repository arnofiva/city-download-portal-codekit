import {
  CalciteBlock,
  CalciteButton,
  CalciteIcon,
  CalciteInputText,
  CalciteLabel,
  CalciteOption,
  CalciteSelect,
} from "@esri/calcite-components-react";
import { useScene } from "../arcgis/maps/web-scene/scene-context";
import { useAccessorValue } from "../../hooks/reactive";
import { RefObject, useDeferredValue, useEffect, useState } from "react";
import { useSelectionStateSelector } from "../selection/selection-context";
import { DownloadMachine } from "../download/download-machine";
import { useActor } from "@xstate/react";
import useEffectOnce from "~/hooks/useEffectOnce";
import { completeWalkthrough } from "../walk-through/walk-through-popover";

interface ExportSettingsProps {
  blockElementRef: RefObject<HTMLCalciteBlockElement>;
}
export default function ExportSettings({ blockElementRef }: ExportSettingsProps) {
  const scene = useScene();

  const title = useAccessorValue(() => {
    const title = scene.portalItem.title;
    return title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, "_");
  }, { initial: true });
  const [filename, setFilename] = useState("")

  const selection = useSelectionStateSelector(state => state.context.polygon);
  const [actor, send] = useActor(DownloadMachine, { input: { scene } });
  const deferredSelection = useDeferredValue(selection);

  useEffect(() => {
    if (deferredSelection) {
      send({ type: 'change', selection: deferredSelection });
    }
    else send({ type: 'clear' })
  }, [deferredSelection, send])

  const isLoading = actor.context.loading;
  const canDownload = actor.context.file != null && !actor.context.loading;

  const fileSize = actor.context.file?.size;

  const fileSizeString = fileSize != null
    ? `${(fileSize * 1e-6).toFixed(2)} mb`
    : actor.context.loading
      ? 'loading'
      : 'unknown'

  const hasFinished = useSelectionStateSelector(state => state.matches({ initialized: { created: 'idle' } }));
  useEffectOnce(
    () => {
      if (blockElementRef.current != null && hasFinished) {
        blockElementRef.current!.open = true;
        blockElementRef.current!.scrollIntoView()
        return true;
      }
    });

  return (
    <CalciteBlock
      id="exportSettings"
      heading="Export"
      collapsible
      ref={blockElementRef}
    >
      <CalciteIcon scale="s" slot="icon" icon="file-data"></CalciteIcon>
      <ul className="mesurement-list">
        <li>
          <CalciteLabel scale="s">
            Filename
            <CalciteInputText
              id="filename"
              placeholder={title}
              value={filename}
              onCalciteInputTextInput={(event) => {
                setFilename(event.target.value)
              }}
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
            <p className={isLoading ? "opacity-50" : ""}>{fileSizeString}</p>
          </CalciteLabel>
        </li>
      </ul>
      <span id="download">
        <CalciteButton
          scale="l"
          width="full"
          iconStart="download"
          disabled={!canDownload}
          loading={isLoading}
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
    </CalciteBlock>
  );
}

function downloadFile(name: string, blob: Blob) {
  const link = document.createElement("a");
  link.download = `${name}.glb`;
  link.href = window.URL.createObjectURL(blob);
  link.click();
}