/* Copyright 2024 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  ClientLoaderFunctionArgs,
  Links,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useParams,
} from "@remix-run/react";
import { setAssetPath } from "@esri/calcite-components/dist/components";

import tailwindStyles from "./tailwind.css?url";
import calciteStyles from "@esri/calcite-components/dist/calcite/calcite.css?url";
import arcgisStyles from '@arcgis/core/assets/esri/themes/light/main.css?url'
import globalStyles from "./global.css?url";

import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import config from "@arcgis/core/config";
import { CalciteScrim } from "@esri/calcite-components-react";
import { PropsWithChildren, Suspense, lazy, useEffect, useState } from "react";
import SceneListModal from "./components/scene-list-modal/scene-list-modal";
import { SceneListModalProvider } from "./components/scene-list-modal/scene-list-modal-context";
import SCENES from "~/data/scenes";

import { LinksFunction } from "@remix-run/node";
import RootShell from "./components/root-shell";
import { Toast, ToastableError, ToasterProvider, useToast } from "./components/toast";
import { keepPreviousData, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useInstance from "./hooks/useInstance";

const StoreProvider = lazy(() => import('./data/selection-store'))
const WalkthroughStoreProvider = lazy(() => import('./components/selection/walk-through-context'))

export const meta: MetaFunction = () => {
  return [
    { title: "City download portal" },
  ];
};

const styles = [
  tailwindStyles,
  calciteStyles,
  arcgisStyles,
  globalStyles,
]

export const links: LinksFunction = () => [
  ...styles.map(stylesheet => ({ rel: 'stylesheet', href: stylesheet }))
]

async function loadModules() {
  const [IdentityManager, OAuthInfo] = await Promise.all([
    import("@arcgis/core/identity/IdentityManager").then(module => module.default),
    import("@arcgis/core/identity/OAuthInfo").then(module => module.default)
  ]);

  return {
    IdentityManager,
    OAuthInfo,
  }
}

let hasSetup = false;
function setup() {
  if (hasSetup) return;

  setAssetPath(import.meta.url);
  defineCustomElements(window);
  document.body.classList.toggle('setup')
  hasSetup = true;
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  setup();
  const { OAuthInfo, IdentityManager } = await loadModules();
  const params = new URL(request.url).searchParams;

  const portalUrl = params.get("portal-url") ?? "https://zurich.maps.arcgis.com/";
  config.portalUrl = portalUrl;

  const info = new OAuthInfo({
    appId: "KojZjH6glligLidj",
    popup: false,
    popupCallbackUrl: `${document.location.origin}${import.meta.env.BASE_URL}oauth-callback-api.html`,
  });

  IdentityManager.registerOAuthInfos([info]);

  const scenes = await Promise.all(
    Array.from(SCENES.values())
      .map(async scene => {
        await scene.item.load();
        return scene.item;
      })
  );

  const maps = await Promise.all(scenes.map(async scene => {
    const WebScene = await import('@arcgis/core/WebScene').then(mod => mod.default);

    const ws = new WebScene({
      portalItem: scene
    });

    await ws.load();

    return ws;
  }));

  return { scenes, maps, };
}

export function Layout({ children }: PropsWithChildren) {
  useEffect(() => {
    setAssetPath(import.meta.url);
    defineCustomElements(window);
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <RootShell>
          <ToasterProvider>
            <SceneListModalProvider>
              <Suspense fallback={<CalciteScrim loading />}>
                {children}
              </Suspense>
              <SceneListModal />
              <Toast />
            </SceneListModalProvider>
          </ToasterProvider>
        </RootShell>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html >
  );
}

export default function App() {
  const params = useParams();

  const toast = useToast();

  const queryClient = useInstance(() => new QueryClient({
    defaultOptions: {
      queries: {
        placeholderData: keepPreviousData
      }
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ToastableError) {
          toast(error.toast);
        }
      }
    })
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider key={params.scene}>
        <WalkthroughStoreProvider>
          <Outlet />
        </WalkthroughStoreProvider>
      </StoreProvider>
    </QueryClientProvider>
  )
}
export function HydrateFallback() {
  return (
    <RootShell>
      <CalciteScrim loading />
    </RootShell>
  );
}
