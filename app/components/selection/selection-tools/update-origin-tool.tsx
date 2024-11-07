import { Point } from "@arcgis/core/geometry";
import { CalciteDropdownGroup, CalciteDropdownItem, CalciteSplitButton } from "@esri/calcite-components-react";
import { useRef, useMemo, useDeferredValue } from "react";
import { SketchTooltip } from "~/components/arcgis/sketch/sketch";
import CreatePointTool from "~/components/arcgis/sketch/tools/create-point-tool";
import { useSelectionState } from "~/data/selection-store";
import { createOriginSymbol } from "~/symbology/symbology";
import { useSelectionVolumeExtent } from "~/hooks/queries/elevation-query";
import { useAccessorValue } from "~/hooks/reactive";

export function UpdateOriginTool() {
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);
  const hasSelection = selection != null;

  const previousOrigin = useRef<Point | null>(null);
  const previousEditingState = useRef(store.editingState);

  const { data } = useSelectionVolumeExtent();
  // Get elevation info for dynamic symbol height

  const volumeExtent = useDeferredValue(data ?? selection?.extent)
  const height = (volumeExtent?.zmax ?? 0) - (volumeExtent?.zmin ?? 0);
  // Create symbol with dynamic height
  const symbol = useMemo(() => createOriginSymbol(height), [height]);

  return (
    <CreatePointTool
      onStart={() => {
        console.log(store.editingState);
        previousEditingState.current = store.editingState;
        previousOrigin.current = store.modelOrigin;
        store.editingState = 'updating-origin';
      }}
      onActive={(point) => {
        store.modelOrigin = point;
      }}
      onComplete={() => {
        store.editingState = hasSelection
          ? 'updating-selection'
          : 'creating'
      }}
      onCancel={() => {
        store.editingState = previousEditingState.current;
        store.modelOrigin = previousOrigin.current;
      }}
      createSymbol={symbol}
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
