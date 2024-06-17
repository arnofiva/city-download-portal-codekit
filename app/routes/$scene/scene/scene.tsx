import { PropsWithChildren, Suspense, memo, useEffect, useMemo, useState } from "react";
import WebScene from '@arcgis/core/WebScene';
import PortalItem from '@arcgis/core/portal/PortalItem';
import { CalciteScrim } from "@esri/calcite-components-react";
import { useSceneListModal } from "~/scene-list-modal/scene-list-modal-context";
import useAccessorValue from "hooks/useAccessorValue";
import { SceneContext } from "./scene-context";

interface SceneProps {
  portalItem: string | PortalItem;
}

function InternalScene({ portalItem, children }: PropsWithChildren<SceneProps>) {
  const item = useMemo(() => {
    return typeof portalItem === "string" ? new PortalItem({
      id: portalItem
    }) : portalItem
  }, [portalItem])

  const [scene, setScene] = useState(() => new WebScene({
    portalItem: item
  }));

  const loaded = useAccessorValue({
    getValue: () => scene.loaded,
    options: { initial: true }
  })

  useEffect(() => {
    const isSamePortalItem =
      typeof portalItem === "string" ? item.id === portalItem : item.id === portalItem.id

    if (isSamePortalItem) {
      setScene(new WebScene({
        portalItem: item
      }));
    }
  }, [item, portalItem]);

  const [, setOpen] = useSceneListModal();

  useEffect(() => {
    if (loaded) setOpen(false);
  }, [loaded, setOpen]);

  return (
    <Suspense fallback={<CalciteScrim loading />}>
      <SceneContext.Provider value={scene}>
        {children}
      </SceneContext.Provider>
    </Suspense>
  );
}

const Scene = memo(InternalScene)

export default Scene;