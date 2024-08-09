import { PropsWithChildren, createContext, memo, useContext, useMemo, useRef } from "react";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import { Polygon } from "@arcgis/core/geometry";
import { ActorRefFrom, SnapshotFrom } from "xstate";
import { useActor } from "@xstate/react";
import CoreGraphic from "@arcgis/core/Graphic";
import { SketchLayer } from "../arcgis/sketch/sketch-layer";
import { SelectionEvent, SelectionInput, createSelectionMachine } from "../../hooks/queries/selection-machine";

const SelectionContext = createContext<[
  SnapshotFrom<typeof createSelectionMachine>,
  (event: SelectionEvent) => void,
  ActorRefFrom<typeof createSelectionMachine>
]>(null!);

export function useSelectionActor() {
  return useContext(SelectionContext);
}

interface SelectionProps {
  onChange?: (selection: Polygon | null) => void;
}
function InternalSelection({ children }: PropsWithChildren<SelectionProps>) {
  const sketchRef = useRef<SketchViewModel>(null);

  const input: SelectionInput = useMemo(() => ({
    startCreation: () => sketchRef.current?.create('point'),
    cancelOperation: () => sketchRef.current?.cancel(),
    startUpdate: (graphic: CoreGraphic) => sketchRef.current?.update(graphic),
    completeUpdate: () => sketchRef.current?.complete(),
  }), []);

  const contextValue = useActor(createSelectionMachine, { input });

  return (
    <SelectionContext.Provider value={contextValue}>
      <SketchLayer ref={sketchRef} elevationMode="on-the-ground">
        {children}
      </SketchLayer>
    </SelectionContext.Provider>
  )
}

const Selection = memo(InternalSelection);
export default Selection;