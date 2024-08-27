import { Polygon } from "@arcgis/core/geometry";
import { CalciteButton } from "@esri/calcite-components-react";
import { useRef, useState } from "react";
import { SketchTooltip } from "~/components/arcgis/sketch/sketch";
import { ReshapeTool } from "~/components/arcgis/sketch/tools/reshape-tool";
import { useSelectionState } from "~/data/selection-store";
import { useAccessorValue, useWatch } from "~/hooks/reactive";

export function UpdateSelectionTool() {
  const [isActive, setIsActive] = useState(false);
  const store = useSelectionState();

  const isStoreEditing = useAccessorValue(() => store.editingState !== 'idle');

  const toolRef = useRef<any>(null)
  useWatch(() => store.editingState, (next, previous) => {
    if (next === 'updating-selection' && previous === 'creating' && store.graphic)
      toolRef.current?.start([store.graphic]);
  })

  const previousSelection = useRef<Polygon | null>(null);

  return (
    <>
      <ReshapeTool
        ref={toolRef}
        onStart={([graphic]) => {
          setIsActive(true);
          store.editingState = 'updating-selection';
          previousSelection.current = store.selection;
          store.updateSelectionPolygon(graphic.geometry as Polygon)
        }}
        onActive={([graphic]) => { store.updateSelectionPolygon(graphic.geometry as Polygon) }}
        onComplete={([graphic]) => {
          setIsActive(false);
          store.editingState = 'idle';
          store.updateSelectionPolygon(graphic.geometry as Polygon)
        }}
        onCancel={() => {
          setIsActive(false);
          store.editingState = 'idle';
          store.selection = previousSelection.current;
        }}
      >{({ start, complete }) => (
        <CalciteButton
          onClick={() => {
            if (store.graphic) {
              if (!isActive) start([store.graphic])
              else complete()
            }
          }}
          disabled={!isActive && isStoreEditing}
          appearance={isActive ? 'solid' : 'outline-fill'}
          scale="l"
          iconStart="check"
        >
          {isActive ? "Confirm selection" : "Update selection"}
        </CalciteButton>
      )
        }</ReshapeTool >
      {isActive ? <SketchTooltip
        helpMessage="Press tab to enter or paste a precise coordinate"
        helpMessageIcon="information"
        inputEnabled
      /> : null}
    </>
  )
}
