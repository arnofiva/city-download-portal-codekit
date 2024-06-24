import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Suspense, lazy } from "react";
import { redirect, useLoaderData, useRouteError } from "@remix-run/react";
import Sidebar from "~/components/sidebar/sidebar";
import invariant from "tiny-invariant";
import SCENES from "~/data/scenes";
import { ViewUI } from "../../components/arcgis/views/scene-view/scene-view-ui";
import { CalciteScrim } from "@esri/calcite-components-react";
import { SelectionAction } from "../../components/selection/selection-button";
import GraphicsLayer from "~/components/arcgis/graphics-layer";
import SelectionExtent from "../../components/selection/selection-graphic";
import WalkthroughPopover from "~/components/walk-through/walk-through-popover";
import { load as loadProjectionEngine } from "@arcgis/core/geometry/projection";

const View = lazy(() => import('../../components/arcgis/views/scene-view/scene-view'));
const Scene = lazy(() => import('../../components/arcgis/maps/web-scene/scene'));
const Search = lazy(() => import('../../components/arcgis/search/search'));

export const meta: MetaFunction<typeof clientLoader> = ({ data }) => {
  return [
    { title: data?.title },
    { name: "description", content: data?.description },
  ];
};

export async function clientLoader({ params }: LoaderFunctionArgs) {
  invariant(params.scene, "Expected params.scene");

  const scene = SCENES.get(params.scene);

  if (scene == null) {
    throw redirect("/");
  }

  const instance = scene.item;
  await scene.item.load();
  await loadProjectionEngine();

  return {
    instance,
    title: instance.title,
    description: instance.description,
    thumbnailUrl: instance.thumbnailUrl,
  };
}

function SceneActions() {

  return (
    <span id="select-action">
      <SelectionAction />
    </span>
  )
}

export default function SceneRoute() {
  const {
    instance
  } = useLoaderData<typeof clientLoader>();

  return (
    <Suspense fallback={<CalciteScrim />}>
      <Scene portalItem={instance}>
        <GraphicsLayer elevationMode="on-the-ground">
          <View>
            <Search />
            <ViewUI position="bottom-left">
              <SceneActions />
            </ViewUI>
            <Sidebar />
            <WalkthroughPopover />
            <SelectionExtent />
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
