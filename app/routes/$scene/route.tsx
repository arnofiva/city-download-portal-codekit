import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Suspense, lazy } from "react";
import { redirect, useLoaderData, useRouteError } from "@remix-run/react";
import Sidebar from "~/components/sidebar/sidebar";
import invariant from "tiny-invariant";
import { ViewUI } from "~/components/arcgis/views/scene-view/scene-view-ui";
import { CalciteAction, CalciteNavigation, CalciteNavigationLogo, CalciteNavigationUser, CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "~/components/arcgis/graphics-layer";
import { useSceneListModal } from "~/components/scene-list-modal/scene-list-modal-context";
import { useAccessorValue } from "~/hooks/reactive";
import PortalItem from "@arcgis/core/portal/PortalItem";
import { useSelectionState } from "~/data/selection-store";
import { FeatureQueryProvider } from "~/components/selection/actors/feature-query-context";
import { ElevationQueryProvider } from "~/components/selection/actors/elevation-query-context";
import SelectionTool from "~/components/selection/selection-tool";
import SelectionGraphic from "~/components/selection/selection-graphic";

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

export default function SceneRoute() {
  const {
    instance
  } = useLoaderData() as Awaited<ReturnType<typeof clientLoader>>;
  const [, setOpen] = useSceneListModal();

  const fullName = useAccessorValue(() => instance.portal.user.fullName);
  const username = useAccessorValue(() => instance.portal.user.username);
  const avatar = useAccessorValue(() => instance.portal.user.thumbnailUrl)

  const title = useAccessorValue(() => instance.title);
  const description = useAccessorValue(() => instance.description);

  const store = useSelectionState();

  return (
    <Suspense fallback={<CalciteScrim />}>
      <Scene portalItem={instance}>
        <CalciteNavigation slot="header">
          <CalciteNavigationLogo slot="logo" heading={title} description={description} />
          <CalciteNavigationUser slot="user" full-name={fullName} username={username} thumbnail={avatar} />
          <CalciteAction slot="navigation-action" text={""} icon="hamburger" onClick={() => setOpen(true)} />
        </CalciteNavigation>
        <GraphicsLayer elevationMode="on-the-ground">
          <View>
            <Selection>
              <FeatureQueryProvider>
                <ElevationQueryProvider>
                  <Search />
                  <Sidebar />
                  <ViewUI position="bottom-left">
                    <SelectionTool onChange={polygon => { store.selection = polygon }} />
                  </ViewUI>
                  <SelectionGraphic />
                </ElevationQueryProvider>
              </FeatureQueryProvider>
            </Selection>
          </View>
        </GraphicsLayer>
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
