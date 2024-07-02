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
  #selection: Polygon | null = null;

  @property()
  get selection(): Polygon | null {
    return this.#selection;
  }

  #origin: Point | null = null;

  @property()
  get origin(): Point | null {
    const selection = this.selection;
    if (selection == null) {
      this.#origin = null;
    } else {
      const [[[x, y]]] = selection.rings;

      if (this.#origin?.x !== x || this.#origin?.y !== y) {
        const point = new Point({
          x,
          y,
          spatialReference: selection.spatialReference
        })
        this.#origin = point;
      }
    }

    return this.#origin
  }

  #terminal: Point | null = null;

  @property()
  get terminal(): Point | null {
    const selection = this.selection;
    if (selection == null) {
      this.#terminal = null;
    } else {
      const [[_oo, _ot, [x, y]]] = selection.rings;

      if (this.#terminal?.x !== x || this.#terminal?.y !== y) {
        const point = new Point({
          x,
          y,
          spatialReference: selection.spatialReference
        })
        this.#terminal = point;
      }
    }

    return this.#terminal
  }

  set selection(selection: Polygon | null) {
    this.#selection = selection;
    // not sure why the property decorators are not working..
    this.notifyChange('selection');
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