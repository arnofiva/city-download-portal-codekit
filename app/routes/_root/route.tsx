import config from "@arcgis/core/config";
import '@esri/calcite-components/dist/components/calcite-action';
import '@esri/calcite-components/dist/components/calcite-alert';
import { CalciteAction, CalciteAlert } from "@esri/calcite-components-react";
import { Outlet, useParams, useRouteError, type ClientLoaderFunctionArgs } from "@remix-run/react";
import { QueryClient, keepPreviousData, QueryCache, QueryClientProvider } from "@tanstack/react-query";
import RootShell from "~/routes/_root/root-shell";
import SceneListModal from "~/routes/_root/scene-list-modal/scene-list-modal";
import { SceneListModalProvider } from "~/routes/_root/scene-list-modal/scene-list-modal-context";
import { useToast, ToastableError, Toast, ToasterProvider } from "~/components/toast";
import StoreProvider from "~/routes/_root.$scene/selection/selection-store";
import useInstance from "~/hooks/useInstance";
import DEFAULT_SETTINGS from "~/data/scene-settings.json";
import PortalItem from "@arcgis/core/portal/PortalItem";
import invariant from "tiny-invariant";

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

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  try {
    const { OAuthInfo, IdentityManager } = await loadModules();
    const params = new URL(request.url).searchParams;

    const portalUrlParam = params.get("portal-url");
    const portalUrl = portalUrlParam ?? DEFAULT_SETTINGS.portal;
    const scenes = DEFAULT_SETTINGS.scenes;

    invariant(Array.isArray(scenes), "Expected settings.scenes");

    if (portalUrl) {
      config.portalUrl = decodeURIComponent(portalUrl);
    }
    const info = new OAuthInfo({
      appId: "KojZjH6glligLidj",
      popup: false,
      popupCallbackUrl: `${document.location.origin}${import.meta.env.BASE_URL}oauth-callback-api.html`,
    });

    IdentityManager.registerOAuthInfos([info]);

    const portalItems = scenes
      .map(item => new PortalItem({
        id: item.id,
        portal: {
          url: DEFAULT_SETTINGS.portal
        }
      }))

    await Promise.all(portalItems.map(async item => {
      await item.load();
      return item;
    }));

    const maps = await Promise.all(portalItems.map(async scene => {
      const WebScene = await import('@arcgis/core/WebScene').then(mod => mod.default);

      const ws = new WebScene({
        portalItem: scene
      });

      await ws.load();

      return ws;
    }));

    return { scenes: portalItems, maps, };
  } catch (error) {
    console.error('client loader error', error);
    throw error;
  }
}

export default function App() {
  const params = useParams();

  const toast = useToast();

  const queryClient = useInstance(() => new QueryClient({
    defaultOptions: {
      queries: {
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5,
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
        <ToasterProvider>
          <RootShell>
            <SceneListModalProvider>
              <Outlet />
              <SceneListModal />
              <Toast />
            </SceneListModalProvider>
          </RootShell>
        </ToasterProvider>
      </StoreProvider>
    </QueryClientProvider>
  )
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error)

  return (
    <>
      <CalciteAlert slot="alerts" kind="danger" ref={ref => {
        if (ref) {
          ref.open = true;
        }
      }} label={""}>
        <div slot="title">Error</div>
        <div slot="message">The application failed to load</div>
        <CalciteAction slot="actions-end" text="Reload" icon="refresh" onClick={() => {
          window.location.reload();
        }} />
      </CalciteAlert>
    </>
  );
}