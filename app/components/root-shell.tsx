import { CalciteShell } from "@esri/calcite-components-react";
import { PropsWithChildren, createContext, useContext, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "./toast";

const RootShellIdContext = createContext<string>(null!);

function useRootShellId() {
  return useContext(RootShellIdContext);
}

export default function RootShell({ children }: PropsWithChildren) {
  const id = useId()
  return (
    <CalciteShell id={id}>
      <RootShellIdContext.Provider value={id}>
        <Toaster>
          {children}
        </Toaster>
      </RootShellIdContext.Provider>
    </CalciteShell>
  )
}

export function RootShellPortal({ children }: PropsWithChildren) {
  const rootShellId = useRootShellId();

  const domNode = useMemo(() => document.getElementById(rootShellId), [rootShellId]);

  if (domNode) return createPortal(children, domNode);
  else return null;
}