import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

import { Suspense, lazy } from "react";
import ClientOnly from "components/client-only";
import { redirect, useLoaderData, useRouteError } from "@remix-run/react";
import Sidebar from "~/sidebar";
import invariant from "tiny-invariant";
import SCENES from "data/scenes";
import { ViewUI } from "./view/view-ui";
import { CalciteAction, CalciteActionBar } from "@esri/calcite-components-react";
import { SelectionAction } from "./selection/selection-action";
import GraphicsLayer from "components/arcgis/graphics-layer";
import { SelectionContext } from "./selection/selection-context";
import SelectionExtent from "./selection/selection-extent";

const View = lazy(() => import('./view/view'));
const Scene = lazy(() => import('./scene/scene'));

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

  return {
    instance,
    title: instance.title,
    description: instance.description,
    thumbnailUrl: instance.thumbnailUrl,
  };
}

function SceneActions() {

  return (
    <CalciteActionBar layout="vertical" expandDisabled expanded>
      <SelectionAction />
      <CalciteAction scale="l" icon="download" text="Export model" />
    </CalciteActionBar>
  )
}

export default function SceneRoute() {
  const {
    instance
  } = useLoaderData<typeof clientLoader>();

  return (
    <>
      <ClientOnly>
        <Suspense fallback={<div>fallbacking</div>}>
          <Scene portalItem={instance}>
            <SelectionContext>
              <GraphicsLayer>
                <View>
                  <ViewUI position="bottom-left">
                    <SceneActions />
                  </ViewUI>
                  <Sidebar />
                </View>
                <SelectionExtent />
              </GraphicsLayer>
            </SelectionContext>
          </Scene>
        </Suspense>
      </ClientOnly>
    </>
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
