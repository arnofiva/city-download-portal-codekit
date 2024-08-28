import { Polygon } from "@arcgis/core/geometry"
import { CalciteButton } from "@esri/calcite-components-react"
import { useRef } from "react"
import { SketchTooltip } from "~/components/arcgis/sketch/sketch"
import CreateExtentTool from "~/components/arcgis/sketch/tools/create-extent-tool"
import { useSceneView } from "~/components/arcgis/views/scene-view/scene-view-context"
import { useSelectionState } from "~/data/selection-store"
import { useAccessorValue } from "~/hooks/reactive"
import { useReferenceElementId } from "../walk-through-context"

export function CreateSelectionTool() {
  const view = useSceneView();
  const viewReady = useAccessorValue(() => view.ready);
  const id = useReferenceElementId([
    'not-started',
    'placing-origin',
    'placing-terminal',
  ],
    'top');

  const store = useSelectionState();

  const previousSelection = useRef<Polygon | null>(null);

  return (
    <>
      <CreateExtentTool
        onStart={() => {
          store.editingState = 'creating'
          previousSelection.current = store.selection;
        }}
        onActive={(polygon) => {
          if (polygon) store.selection = polygon
        }}
        onComplete={(polygon) => {
          store.editingState = 'updating-selection'
          store.selection = polygon;
        }}
        onCancel={() => {
          store.editingState = 'idle'
          store.selection = previousSelection.current;
        }}
      >
        {({ start, cancel, state }) => (
          <>
            <CalciteButton
              id={id}
              scale="l"
              iconStart="rectangle-plus"
              disabled={!viewReady}
              kind="brand"
              appearance={state === 'active' ? "outline-fill" : "solid"}
              onClick={() => {
                if (state === 'active') cancel()
                else start()
              }}
            >
              {state === 'active' ? "Cancel selection" : "Select area"}
            </CalciteButton>
            {state === 'active' ? (
              <SketchTooltip
                helpMessage="Press tab to enter or paste a precise coordinate"
                helpMessageIcon="information"
                inputEnabled
              />
            ) : null}
          </>
        )}
      </CreateExtentTool>
    </>
  )
}
