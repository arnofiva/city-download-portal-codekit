import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Suspense, lazy } from "react";
import { redirect, useLoaderData, useRouteError } from "@remix-run/react";
import Sidebar from "~/components/sidebar/sidebar";
import invariant from "tiny-invariant";
import { ViewUI } from "~/components/arcgis/views/scene-view/scene-view-ui";
import { CalciteAction, CalciteButton, CalciteNavigation, CalciteNavigationLogo, CalciteNavigationUser, CalciteScrim } from "@esri/calcite-components-react";
import { useSceneListModal } from "~/components/scene-list-modal/scene-list-modal-context";
import { useAccessorValue } from "~/hooks/reactive";
import PortalItem from "@arcgis/core/portal/PortalItem";
import { useSelectionState } from "~/data/selection-store";
import SelectionTool from "~/components/selection/selection-tool";
import SelectionGraphic from "~/components/selection/selection-graphic";
import PointTool from "~/components/arcgis/sketch/tools/point-tool";
import { SketchTooltip } from "~/components/arcgis/sketch/sketch";
import { SketchLayer } from "~/components/arcgis/sketch/sketch-layer";
import { Point } from "@arcgis/core/geometry";

const Selection = lazy(() => import("~/components/selection/selection"));
const View = lazy(() => import('~/components/arcgis/views/scene-view/scene-view'));
const Scene = lazy(() => import('~/components/arcgis/maps/web-scene/scene'));
const Search = lazy(() => import('~/components/arcgis/search/search'));

export const meta: MetaFunction<typeof clientLoader> = ({ data }) => {
  return [
    { title: data?.title },
    { name: "description", content: data?.description },
  ];
};

export async function clientLoader({ params }: LoaderFunctionArgs) {
  invariant(params.scene, "Expected params.scene");

  const scene = new PortalItem({
    id: params.scene,
  });


  if (scene == null) {
    throw redirect("/");
  }

  await scene.load();

  return {
    instance: scene,
    title: scene.title,
    description: scene.description,
    thumbnailUrl: scene.thumbnailUrl,
  };
}

function Header({ portalItem }: { portalItem: PortalItem }) {
  const [, setOpen] = useSceneListModal();

  const fullName = useAccessorValue(() => portalItem.portal.user.fullName);
  const username = useAccessorValue(() => portalItem.portal.user.username);
  const avatar = useAccessorValue(() => portalItem.portal.user.thumbnailUrl)

  const title = useAccessorValue(() => portalItem.title);
  const description = useAccessorValue(() => portalItem.description);

  return (
    <CalciteNavigation slot="header">
      <CalciteNavigationLogo slot="logo" heading={title} description={description} />
      <CalciteNavigationUser slot="user" full-name={fullName} username={username} thumbnail={avatar} />
      <CalciteAction slot="navigation-action" text={""} icon="hamburger" onClick={() => setOpen(true)} />
    </CalciteNavigation>
  )
}

function OriginTool({ onComplete }: { onComplete: (point: Point) => void }) {

  return (
    <SketchLayer hasZ elevationMode="absolute-height">
      <PointTool onComplete={onComplete}>
        {({ start }) => (
          <>
            <CalciteButton onClick={start} appearance="outline-fill" scale="l">Set model origin</CalciteButton>
          </>
        )}
      </PointTool>
      <SketchTooltip
        inputEnabled
      />
    </SketchLayer>
  )
}

export default function SceneRoute() {
  const {
    instance
  } = useLoaderData() as Awaited<ReturnType<typeof clientLoader>>;

  const store = useSelectionState();

  return (
    <Suspense fallback={<CalciteScrim />}>
      <Scene portalItem={instance}>
        <Header portalItem={instance} />
        <View>
          <Selection>
            <Search />
            <Sidebar />
            <ViewUI position="bottom-left">
              <div className="flex gap-4">
                <SelectionTool onChange={polygon => { store.selection = polygon }} />
                <OriginTool onComplete={(point) => { store.modelOrigin = point }} />
              </div>
              <SelectionGraphic />
            </ViewUI>
          </Selection>
        </View>
      </Scene>
    </Suspense>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}
