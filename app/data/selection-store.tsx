import {
  subclass,
  property,
} from "@arcgis/core/core/accessorSupport/decorators";
import Accessor from "@arcgis/core/core/Accessor";
import { Point, Polygon } from "@arcgis/core/geometry";
import { PropsWithChildren, createContext, useContext, useEffect, useRef } from "react";
import useInstance from "~/hooks/useInstance";
import { useAccessorValue } from "~/hooks/reactive";

@subclass()
class SelectionStore extends Accessor {
  @property()
  selection: Polygon | null = null;

  @property()
  modelOrigin: Point | null = null;

  @property()
  get selectionOrigin(): Point | null {
    const selection = this.selection;
    if (selection != null) {
      const [[[x, y]]] = selection.rings;

      return new Point({
        x,
        y,
        spatialReference: selection.spatialReference
      })
    } else {
      return null
    }
  }

  @property()
  get selectionTerminal(): Point | null {
    const selection = this.selection;
    if (selection != null) {
      const [[_oo, _ot, [x, y]]] = selection.rings;
      return new Point({
        x,
        y,
        spatialReference: selection.spatialReference
      })
    } else {
      return null;
    }
  }
}

const SelectionContext = createContext<SelectionStore>(null!);
export default function StoreProvider({ children }: PropsWithChildren) {
  const store = useInstance(() => new SelectionStore());

  return (
    <SelectionContext.Provider value={store}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelectionState() {
  return useContext(SelectionContext);
}

export function useSelectionStateSelector<T>(get: (store: SelectionStore) => T, options?: __esri.ReactiveWatchOptions) {
  const store = useSelectionState()

  const currentGetter = useRef(get);
  useEffect(() => {
    currentGetter.current = get;
  });

  return useAccessorValue(() => currentGetter.current(store), options);
}