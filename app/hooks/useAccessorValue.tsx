import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { useEffect, useState } from "react";

type WatchOptions = Parameters<typeof reactiveUtils.watch>[2];

function identity<T>(value: T): T {
  return value;
}

export default function useAccessorValue<T, R = T>({
  getValue,
  callback = identity as (value: T, oldValue: T) => R,
  options
}: {
  getValue: () => T,
  callback?: (value: T, oldValue: T) => R,
  options?: WatchOptions,
}) {
  const [value, setValue] = useState<R | null>(null);

  useEffect(() => {
    const handle = reactiveUtils.watch(getValue, (v, o) => {
      const result = callback(v, o);
      setValue(result as R);
    }, options);

    return () => handle.remove();
  }, [getValue, callback, options]);

  return value;
}