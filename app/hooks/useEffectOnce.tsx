import { useEffect, useState } from "react";

export default function useEffectOnce(effect: () => boolean | void) {
  const [shouldRun, setShouldRun] = useState(true);
  useEffect(() => {
    const didRun = effect();
    if (didRun) {
      setShouldRun(false);
    }
  }, [effect, shouldRun])
}