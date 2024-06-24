import { PropsWithChildren, createContext, useContext, useState } from "react";

const SceneListModalContext = createContext<[
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
]>(null!);

export function SceneListModalProvider({ children }: PropsWithChildren) {
  const state = useState(false);
  return (
    <SceneListModalContext.Provider value={state}>
      {children}
    </SceneListModalContext.Provider>
  )
}

export function useSceneListModal() {
  return useContext(SceneListModalContext);
}