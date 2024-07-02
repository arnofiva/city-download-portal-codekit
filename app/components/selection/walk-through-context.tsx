

import {
  subclass,
  property,
} from "@arcgis/core/core/accessorSupport/decorators";
import Accessor from "@arcgis/core/core/Accessor";
import { PropsWithChildren, createContext, useContext, useEffect, useId, useRef } from "react";
import useInstance from "~/hooks/useInstance";
import { useAccessorValue } from "~/hooks/reactive";

const StatePositionMap = {
  'not-started': 0,
  'placing-origin': 1,
  'placing-terminal': 2,
  'confirm': 3,
  'downloading': 4,
  'done': 5,
  0: 'not-started',
  1: 'placing-origin',
  2: 'placing-terminal',
  3: 'confirm',
  4: 'downloading',
  5: 'done',
} as const;

type WalkthroughState = Extract<keyof typeof StatePositionMap, string>;
type WalkthroughPosition = Extract<keyof typeof StatePositionMap, number>;

function isWalkthroughPosition(n: number): n is WalkthroughPosition {
  return n >= 0 && n <= 5;
}

type ElementReference = { id: string, placement: HTMLCalcitePopoverElement['placement'] };

@subclass()
class WalkthroughStore extends Accessor {
  #referenceElements = new Map<WalkthroughState, ElementReference>();

  @property()
  get state(): WalkthroughState {
    return StatePositionMap[this._position];
  }

  @property()
  get position() {
    return this._position
  }

  @property()
  private _position: Extract<keyof typeof StatePositionMap, number> = 0;

  @property()
  get referenceElement() {
    return this.#referenceElements.get(this.state);
  }

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      let initialPosition: WalkthroughPosition = 0;

      // @ts-expect-error '+null === 0'
      const storedPosition = +localStorage.getItem('WALKTHROUGH');
      if (isWalkthroughPosition(storedPosition)) {
        initialPosition = storedPosition;
      }

      this._position = initialPosition;
    }
  }

  advance(to: WalkthroughState = this.state) {
    const currentPosition = this._position;
    const requestedPosition = StatePositionMap[to];

    if (requestedPosition > currentPosition) {
      this._position = requestedPosition;
      this.notifyChange('_position')
      this.notifyChange('position')
      this.notifyChange('state')
    }

    if (requestedPosition === 5) {
      localStorage.setItem('WALKTHROUGH', 'TRUE');
    }
  }

  setAsReferenceElement(state: WalkthroughState, reference: ElementReference) {
    this.#referenceElements.set(state, reference);
    this.notifyChange("referenceElement")
  }
}

const WalkthroughContext = createContext<WalkthroughStore>(null!);
export default function WalkthroughStoreProvider({ children }: PropsWithChildren) {
  const walkthrough = useInstance(() => new WalkthroughStore());

  return (
    <WalkthroughContext.Provider value={walkthrough}>
      {children}
    </WalkthroughContext.Provider>
  )
}

export function useWalkthrough() {
  return useContext(WalkthroughContext);
}

export function useWalkthroughSelector<T>(get: (store: WalkthroughStore) => T, options?: __esri.ReactiveWatchOptions) {
  const store = useWalkthrough()

  const currentGetter = useRef(get);
  useEffect(() => {
    currentGetter.current = get;
  });

  return useAccessorValue(() => currentGetter.current(store), options);
}

export function useReferenceElementId(state: WalkthroughState | WalkthroughState[], placement: HTMLCalcitePopoverElement['placement']) {
  const walkthrough = useWalkthrough();
  const id = useId();
  useEffect(() => {
    const states = Array.isArray(state) ? state : [state];

    for (const state of states) {
      walkthrough.setAsReferenceElement(state, { id, placement });
    }
  }, [id, placement, state, walkthrough])

  return id;
}