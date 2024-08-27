import { Point } from "@arcgis/core/geometry";
import { PointSymbol3D, ObjectSymbol3DLayer } from "@arcgis/core/symbols";
import { CalciteButton } from "@esri/calcite-components-react";
import { useState, useRef } from "react";
import { SketchTooltip } from "~/components/arcgis/sketch/sketch";
import { SketchLayer } from "~/components/arcgis/sketch/sketch-layer";
import CreatePointTool from "~/components/arcgis/sketch/tools/create-point-tool";
import { useSelectionState } from "~/data/selection-store";
import { useAccessorValue } from "~/hooks/reactive";
import { OriginSymbol } from "~/symbology";

export function UpdateOriginTool() {
  const [isActive, setIsActive] = useState(false);
  const store = useSelectionState();
  const previousSelection = useRef<Point | null>(null);
  const isStoreEditing = useAccessorValue(() => store.editingState !== 'idle');

  return (
    <SketchLayer hasZ elevationMode="absolute-height">
      <CreatePointTool
        onStart={() => {
          setIsActive(true);
          store.editingState = 'updating-origin';
          previousSelection.current = store.modelOrigin;
        }}
        onActive={(point) => {
          store.modelOrigin = point;
        }}
        onComplete={() => {
          setIsActive(false);
          store.editingState = 'idle';
        }}
        onCancel={() => {
          setIsActive(false);
          store.editingState = 'idle';
          store.modelOrigin = previousSelection.current
        }}
        createSymbol={OriginSymbol}
      >
        {({ start, cancel }) => (
          <>
            <CalciteButton
              onClick={() => {
                if (isActive) cancel()
                else start()
              }}
              appearance="outline-fill"
              disabled={isStoreEditing && !isActive}>
              {isActive ? "Cancel" : "Set model origin"}
            </CalciteButton>
          </>
        )}
      </CreatePointTool>
      {isActive ? (
        <SketchTooltip
          helpMessage="Press tab to enter or paste a precise coordinate"
          helpMessageIcon="information"
          inputEnabled
        />
      ) : null}
    </SketchLayer>
  )
}
