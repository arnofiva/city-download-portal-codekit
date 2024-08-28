import { Point } from "@arcgis/core/geometry";
import { CalciteDropdownGroup, CalciteDropdownItem, CalciteSplitButton } from "@esri/calcite-components-react";
import { useRef } from "react";
import { SketchTooltip } from "~/components/arcgis/sketch/sketch";
import CreatePointTool from "~/components/arcgis/sketch/tools/create-point-tool";
import { useSelectionState } from "~/data/selection-store";
import { OriginSymbol } from "~/symbology";

export function UpdateOriginTool() {
  const store = useSelectionState();
  const previousSelection = useRef<Point | null>(null);

  const previousEditingState = useRef(store.editingState);

  return (
    <CreatePointTool
      onStart={() => {
        previousEditingState.current = store.editingState;
        previousSelection.current = store.modelOrigin;
        store.editingState = 'updating-origin';
      }}
      onActive={(point) => {
        store.modelOrigin = point;
      }}
      onComplete={() => {
        store.editingState = previousEditingState.current;
      }}
      onCancel={() => {
        store.editingState = previousEditingState.current;
        store.modelOrigin = previousSelection.current;
      }}
      createSymbol={OriginSymbol}
    >
      {({ start, cancel, state }) => (
        <>
          <CalciteSplitButton
            onCalciteSplitButtonPrimaryClick={() => {
              if (state === 'active') cancel()
              else start()
            }}
            appearance="outline-fill"
            width="full"
            primaryText={state === 'active' ? "Cancel" : "Set model origin"}
          >
            <CalciteDropdownGroup selectionMode="none">
              <CalciteDropdownItem onClick={() => {
                store.modelOrigin = null;
              }}>
                Clear custom reference point
              </CalciteDropdownItem>
            </CalciteDropdownGroup>
          </CalciteSplitButton>
          {state === 'active' ? (
            <SketchTooltip
              helpMessage="Press tab to enter or paste a precise coordinate"
              helpMessageIcon="information"
              inputEnabled
            />
          ) : null}
        </>
      )}
    </CreatePointTool>
  )
}
