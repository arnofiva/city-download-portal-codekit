import { CalciteCard, CalciteCardGroup, CalciteChip, CalciteModal } from "@esri/calcite-components-react";
import { Link, useParams, useRouteLoaderData } from "@remix-run/react";
import useIsRoot from "hooks/useIsRoot";
import type PortalItem from "@arcgis/core/portal/PortalItem";
import type WebScene from "@arcgis/core/WebScene";
import { useId } from "react";
import { clientLoader as RootClientLoader } from "../root";
import { useSceneListModal } from "./scene-list-modal-context";

interface SceneCardProps {
  title: string;
  description: string;
  thumbnail: string;
  viewingMode: 'global' | 'local'
  selected?: boolean;
}
function SceneCard({ title, description, thumbnail, viewingMode, selected }: SceneCardProps) {
  const id = useId();

  const sceneDescription = description?.trim() || "there would be a description here, if the portal item actually had one...";

  // the prop ends up being rendered into a boolean attribute
  // so the string "false" is assigned to cards that are not selected
  // since this is a boolean attribute, the value isn't checked, just being present sets the prop to true
  const selectedProp = selected ? { selected } : undefined;

  return (
    <CalciteCard
      className="max-w-[250px]"
      {...selectedProp}
    >
      <img slot="thumbnail" alt="Two bears getting it on" src={thumbnail} />
      <span slot="heading">{title}</span>
      <span slot="description">{sceneDescription}</span>
      <div slot="footer-start" id="example-slotted-footer">
        <CalciteChip
          id={id}

          value={viewingMode}
          icon={viewingMode === "global" ? 'coordinate-system' : 'urban-model'}
        >{viewingMode === 'global' ? 'Global' : 'Local'}</CalciteChip>
      </div>
    </CalciteCard>
  )
}

export default function SceneListModal() {
  const [open, setOpen] = useSceneListModal();
  const isRoot = useIsRoot();

  const data = useRouteLoaderData<typeof RootClientLoader>("root");
  data?.scenes

  const currentScene = useParams().scene;

  const scenes = data?.scenes as PortalItem[] | undefined;
  const maps = data?.maps as WebScene[] | undefined;

  return (
    <CalciteModal
      slot="modals"
      open={isRoot || open}
      closeButtonDisabled={isRoot}
      escapeDisabled={isRoot}
      outsideCloseDisabled={isRoot}
      onCalciteModalOpen={() => setOpen(true)}
      onCalciteModalClose={() => setOpen(false)}
    >
      <p slot="header">City download portal - Choose a city</p>
      <CalciteCardGroup slot="content" label="City Download Portal" className="p-4">
        {scenes?.map((scene, index) => (
          <Link
            key={scene.id}
            to={`/${scene.id}`}>
            <SceneCard
              title={scene.title}
              description={scene.description}
              thumbnail={scene.thumbnailUrl}
              viewingMode={(maps![index] as any).viewingMode}
              selected={scene.id === currentScene}
            />
          </Link>
        ))}
      </CalciteCardGroup>
    </CalciteModal>
  )
}
