import {
  subclass,
  property,
} from "@arcgis/core/core/accessorSupport/decorators";
import Accessor from "@arcgis/core/core/Accessor";
import { Point, Polygon } from "@arcgis/core/geometry";
import { PropsWithChildren, createContext, useContext, useEffect, useRef } from "react";
import useInstance from "~/hooks/useInstance";
import { useAccessorValue } from "~/hooks/reactive";
import Graphic from "@arcgis/core/Graphic";

@subclass()
class SelectionStore extends Accessor {
  @property()
  editingState: 'idle' | 'creating' | 'updating-selection' | 'updating-origin' = 'idle'

  @property()
  exportState: 'not-exported' | 'exported' = 'not-exported';

  @property()
  get walkthroughState() {
    if (this.selection == null) {
      if (this.editingState === 'idle' && this.selection == null) {
        return 'not-started' as const;
      }
      if (this.editingState === 'creating' && this.selection == null) {
        return 'placing-origin' as const;
      }
    }

    if (this.selection != null) {
      if (this.editingState === 'creating') {
        return 'placing-terminal' as const;
      }
      if (this.editingState === 'updating-selection') {
        return 'confirming' as const;
      }
      if (this.editingState === 'updating-origin') {
        return 'updating-origin' as const;
      }
      if (this.editingState === 'idle') {
        if (this.exportState === 'not-exported') {
          return 'downloading' as const;
        }
        if (this.exportState === 'exported') {
          return 'done' as const;
        }
      }
    }

    return 'not-started'
  }

  @property()
  graphic: Graphic | null = null;

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

  updateSelectionPolygon(polygon: Polygon) {
    if (this.selection) this.selection = alignPolygon(polygon, this.selection);
  }
}

export type WalkthroughState = SelectionStore['walkthroughState']

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

function alignPolygon(next: Polygon, previous: Polygon) {
  const [
    noo,
    not,
    ntt,
    nto,
  ] = next.rings[0];

  const [
    poo,
    pot,
    ptt,
    pto,
  ] = previous.rings[0];

  let oo: number[];
  let tt: number[];
  if (noo[0] !== poo[0] || noo[1] !== poo[1]) {
    oo = noo;
    tt = ptt;
  } else if (not[0] !== pot[0] || not[1] !== pot[1]) {
    oo = [not[0], poo[1]]
    tt = [ptt[0], not[1]]
  } else if (ntt[0] !== ptt[0] || ntt[1] !== ptt[1]) {
    oo = poo;
    tt = ntt;
  } else if (nto[0] !== pto[0] || nto[1] !== pto[1]) {
    tt = [nto[0], ptt[1]]
    oo = [poo[1], nto[1]]
  } else {
    oo = poo;
    tt = ptt;
  }

  const alignedPolygon = next.clone();
  alignedPolygon.rings = [
    [
      oo,
      [oo[0], tt[1]],
      tt,
      [tt[0], oo[1]],
      oo,
    ]
  ];

  return alignedPolygon;
}