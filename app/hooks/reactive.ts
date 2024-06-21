import {
  useRef,
  useCallback,
  useSyncExternalStore,
  useEffect,
  useLayoutEffect,
} from "react";
import * as ru from "@arcgis/core/core/reactiveUtils";

export function useAccessorValue<Value>(
  getValue: () => Value,
  options?: __esri.ReactiveWatchOptions & {
    getServerValue?: () => Value | undefined;
  },
): Value | undefined {
  // this allows us to keep the `getValue` callback out of the `subscribe` methods dependency array
  // this way, the handle will not be removed any time getValue changes,
  // so users can worry less about memoizing the getter
  const currentGetter = useRef<typeof getValue>(getValue);
  useEffect(() => {
    currentGetter.current = getValue;
  }, [getValue]);

  const value = useRef<Value | undefined>();

  const subscribe = useCallback(
    (update: () => void) => {
      const handle = ru.watch(
        () => currentGetter.current(),
        (nextValue) => {
          value.current = nextValue;
          update();
        },
        {
          initial: options?.initial,
          equals: options?.equals,
          once: options?.once,
          sync: options?.sync,
        },
      );
      return handle.remove;
    },
    [options?.initial, options?.equals, options?.once, options?.sync],
  );

  const getSnapshot = useCallback(() => value.current, []);
  const getServerSnapshot = options?.getServerValue ?? (() => undefined);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return snapshot;
}

export function useEffectWhen<Value>(
  getValue: () => Value,
  callback: (next?: Value, previous?: Value | null) => void,
  options?: __esri.ReactiveWatchOptions,
) {
  const previousValue = useRef<Value | undefined>(undefined);
  // this allows us to keep the `getValue` callback out of the `subscribe` methods dependency array
  // this way, the handle will not be removed any time getValue changes,
  // so users can worry less about memoizing the getter
  const currentGetter = useRef<typeof getValue>(getValue);
  useEffect(() => {
    currentGetter.current = getValue;
  }, [getValue]);

  const value = useRef<Value | undefined>();

  const subscribe = useCallback(
    (update: () => void) => {
      const handle = ru.when(
        () => currentGetter.current(),
        (nextValue) => {
          value.current = nextValue;
          update();
        },
        {
          initial: options?.initial,
          equals: options?.equals,
          once: options?.once,
          sync: options?.sync,
        },
      );
      return handle.remove;
    },
    [options?.initial, options?.equals, options?.once, options?.sync],
  );

  const getSnapshot = useCallback(() => value.current, []);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => undefined,
  );

  useEffect(() => {
    callback(snapshot, previousValue.current);
    previousValue.current = snapshot;
  }, [callback, snapshot]);
}

export function useLayoutEffectWhen<Value>(
  getValue: () => Value,
  callback: (next?: Value, previous?: Value | null) => void,
  options?: __esri.ReactiveWatchOptions,
) {
  const previousValue = useRef<Value | undefined>(undefined);
  // this allows us to keep the `getValue` callback out of the `subscribe` methods dependency array
  // this way, the handle will not be removed any time getValue changes,
  // so users can worry less about memoizing the getter
  const currentGetter = useRef<typeof getValue>(getValue);
  useEffect(() => {
    currentGetter.current = getValue;
  }, [getValue]);

  const value = useRef<Value | undefined>();

  const subscribe = useCallback(
    (update: () => void) => {
      const handle = ru.when(
        () => currentGetter.current(),
        (nextValue) => {
          value.current = nextValue;
          update();
        },
        {
          initial: options?.initial,
          equals: options?.equals,
          once: options?.once,
          sync: options?.sync,
        },
      );
      return handle.remove;
    },
    [options?.initial, options?.equals, options?.once, options?.sync],
  );

  const getSnapshot = useCallback(() => value.current, []);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => undefined,
  );

  useLayoutEffect(() => {
    callback(snapshot, previousValue.current);
    previousValue.current = snapshot;
  }, [callback, previousValue, snapshot]);
}
