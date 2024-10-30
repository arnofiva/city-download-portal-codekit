import { Polygon } from "@arcgis/core/geometry";
import { CalciteButton } from "@esri/calcite-components-react";
import { useRef } from "react";
import { SketchTooltip } from "~/components/arcgis/sketch/sketch";
import { ReshapeTool } from "~/components/arcgis/sketch/tools/reshape-tool";
import { useSelectionState } from "~/data/selection-store";
import { useAccessorValue, useWatch } from "~/hooks/reactive";

export function UpdateSelectionTool() {
  const store = useSelectionState();

  const toolRef = useRef<any>(null)
  useWatch(() => store.editingState, (next,) => {
    if (next === 'updating-selection' && store.graphic) {
      toolRef.current?.start([store.graphic]);
    } else {
      toolRef.current?.complete()
    }
  }, { initial: false })

  const hasSelection = useAccessorValue(() => store.selection != null)

  const previousSelection = useRef<Polygon | null>(null);

  return (
    <>
      <ReshapeTool
        ref={toolRef}
        onStart={([graphic]) => {
          store.editingState = 'updating-selection';
          previousSelection.current = store.selection;
          store.updateSelectionPolygon(graphic.geometry as Polygon)
        }}
        onActive={([graphic], event) => {
          if (event.toolEventInfo?.type === 'vertex-remove') {
            store.selection = null
            toolRef.current.complete()
          }
          else store.updateSelectionPolygon(graphic.geometry as Polygon)
        }}
        onComplete={([graphic]) => {
          if (store.editingState === 'updating-selection') store.editingState = 'idle';
          store.updateSelectionPolygon(graphic.geometry as Polygon)
        }}
        onCancel={() => {
          if (store.editingState === 'updating-selection') store.editingState = 'idle';
          store.selection = previousSelection.current;
        }}
        onDelete={() => {
          store.selection = null;
        }}
      >{({ start, complete, state }) => (
        <>
          <CalciteButton
            onClick={() => {
              if (store.graphic) {
                if (state === 'active') {
                  complete()
                } else start([store.graphic])
              }
            }}
            disabled={!hasSelection}
            appearance={state === 'active' ? 'solid' : 'outline-fill'}
            scale="l"
            iconStart="check"
          >
            {
              state === 'active'
                ? "Confirm selection"
                : "Update selection"
            }
          </CalciteButton>
          {state === 'active' ? <SketchTooltip
            helpMessage="Press tab to enter or paste a precise coordinate"
            helpMessageIcon="information"
            inputEnabled
          /> : null}
        </>
      )}</ReshapeTool >
    </>
  )
}
