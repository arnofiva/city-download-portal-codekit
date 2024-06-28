import { PropsWithChildren, useSyncExternalStore } from "react";

export default function ClientOnly({ children }: PropsWithChildren) {
  const env = useSyncExternalStore(() => () => { }, () => 'client', () => 'server');

  if (env === 'server') return null;
  return children;
}