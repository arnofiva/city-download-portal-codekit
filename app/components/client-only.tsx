import { PropsWithChildren, useSyncExternalStore } from "react";

export default function ClientOnly({ children }: PropsWithChildren) {
  const isClient = useSyncExternalStore(() => () => void 0, () => true, () => false);

  if (isClient) return children;
  else return null;
}