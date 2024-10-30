import { useRef, useCallback, useSyncExternalStore, useEffect } from "react";
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

  const value = useRef<Value | undefined>(getValue());

  const subscribe = useCallback(
    (update: () => void) => {
      const handle = ru.watch(
        () => currentGetter.current(),
        (nextValue) => {
          value.current = nextValue;
          update();
        },
        {
          initial: options?.initial ?? true,
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
  callback: (next: Value, previous?: Value | null) => void,
  options?: __esri.ReactiveWatchOptions,
) {
  // this allows us to keep the `getValue` callback out of the `subscribe` methods dependency array
  // this way, the handle will not be removed any time getValue changes,
  // so users can worry less about memoizing the getter
  const currentGetter = useRef<typeof getValue>(getValue);
  const currentCallback = useRef<typeof callback>(getValue);
  useEffect(() => {
    currentGetter.current = getValue;
    currentCallback.current = callback;
  });

  useEffect(() => {
    const handle = ru.when(
      () => currentGetter.current(),
      (...args) => currentCallback.current(...args),
      {
        initial: options?.initial,
        equals: options?.equals,
        once: options?.once,
        sync: options?.sync,
      },
    );

    return handle.remove;
  }, [options?.initial, options?.equals, options?.once, options?.sync]);
}

export function useWatch<Value>(
  getValue: () => Value,
  callback: (next: Value, previous?: Value | null) => void,
  options?: __esri.ReactiveWatchOptions,
) {
  // this allows us to keep the `getValue` callback out of the `subscribe` methods dependency array
  // this way, the handle will not be removed any time getValue changes,
  // so users can worry less about memoizing the getter
  const currentGetter = useRef<typeof getValue>(getValue);
  const currentCallback = useRef<typeof callback>(getValue);
  useEffect(() => {
    currentGetter.current = getValue;
    currentCallback.current = callback;
  });

  useEffect(() => {
    const handle = ru.watch(
      () => currentGetter.current(),
      (...args) => currentCallback.current(...args),
      {
        initial: options?.initial,
        equals: options?.equals,
        once: options?.once,
        sync: options?.sync,
      },
    );

    return handle.remove;
  }, [options?.initial, options?.equals, options?.once, options?.sync]);
}
