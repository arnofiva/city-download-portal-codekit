import { ForwardedRef, useEffect } from "react";

export default function useProvideRef<T>(item: T, ref?: ForwardedRef<T>) {
  useEffect(() => {
    if (ref == null) return;

    if (typeof ref === 'object') {
      ref.current = item;
    } else {
      ref(item);
    }
  }, [item, ref]);
}