import {
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
import { PropsWithChildren, useEffect } from "react";
import SceneListModal from "./components/scene-list-modal/scene-list-modal";
import { SceneListModalProvider } from "./components/scene-list-modal/scene-list-modal-context";
import SCENES from "~/data/scenes";

import { LinksFunction } from "@remix-run/node";
import { SelectionContext } from "./components/selection/selection-context";
import RootShell from "./components/root-shell";

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

export async function clientLoader() {
  /* this should be removed eventually */
  const { OAuthInfo, IdentityManager } = await loadModules();

  config.portalUrl = "https://zurich.maps.arcgis.com/";

  const info = new OAuthInfo({
    appId: "KojZjH6glligLidj",
    popup: false,
    popupCallbackUrl: `${document.location.origin}${import.meta.env.BASE_URL}oauth-callback-api.html`,
  });

  IdentityManager.registerOAuthInfos([info]);

  try {
    await IdentityManager.checkSignInStatus("https://zurich.maps.arcgis.com/");
  } catch (error) {
    await IdentityManager.getCredential(info.portalUrl + "/sharing");
  }
  /* this should be removed eventually */

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

interface LayoutProps { }


export function Layout({ children }: PropsWithChildren<LayoutProps>) {
  const params = useParams();

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
        <SelectionContext key={params.scene}>
          <RootShell>
            <SceneListModalProvider>
              {children}
              <SceneListModal />
            </SceneListModalProvider>
          </RootShell>
        </SelectionContext>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <RootShell>
      <CalciteScrim loading />
    </RootShell>
  );
}
