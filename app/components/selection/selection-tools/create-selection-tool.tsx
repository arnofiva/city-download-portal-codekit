import { Polygon } from "@arcgis/core/geometry"
import { CalciteButton } from "@esri/calcite-components-react"
import { useRef, useState } from "react"
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

  const [isActive, setIsActive] = useState(false);
  const store = useSelectionState();

  const editingState = useAccessorValue(() => store.editingState);
  const isIdle = editingState == 'idle';
  const isCreating = editingState === 'creating';

  const previousSelection = useRef<Polygon | null>(null);

  return (
    <>
      <CreateExtentTool
        onStart={() => {
          setIsActive(true);
          store.editingState = 'creating'
          previousSelection.current = store.selection;
        }}
        onActive={(polygon) => {
          if (polygon) store.selection = polygon
        }}
        onComplete={(polygon) => {
          setIsActive(false)
          store.editingState = 'updating-selection'
          store.selection = polygon;
        }}
        onCancel={() => {
          setIsActive(false)
          store.editingState = 'idle'
          store.selection = previousSelection.current;
        }}
      >
        {({ start, cancel }) => (
          <>
            <CalciteButton
              id={id}
              scale="l"
              iconStart="rectangle-plus"
              disabled={!viewReady || !isIdle && !isActive}
              kind="brand"
              appearance={isCreating ? "outline-fill" : "solid"}
              onClick={() => {
                if (isCreating) cancel()
                else start()
              }}
            >
              {isCreating ? "Cancel selection" : "Select area"}
            </CalciteButton>
          </>
        )}
      </CreateExtentTool>
      {isActive ? (
        <SketchTooltip
          helpMessage="Press tab to enter or paste a precise coordinate"
          helpMessageIcon="information"
          inputEnabled
        />
      ) : false}
    </>
  )
}
