import { createMesh } from "./create-mesh";
import { Extent, Mesh, Point } from "@arcgis/core/geometry";
import { useScene } from "../../../components/arcgis/maps/web-scene/scene-context";
import { useSelectionState } from "~/data/selection-store";
import { useSelectedFeaturesFromLayers } from "../feature-query";
import { useEffect } from "react";
import { useOriginElevationInfo } from "../elevation-query";
import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query';
import { useAccessorValue } from "~/hooks/reactive";
import { ToastableError, useToast } from "~/components/toast";
import WebScene from "@arcgis/core/WebScene";

export function useExportQuery({ enabled = false, includeOriginMarker = true }: { enabled?: boolean, includeOriginMarker?: boolean }) {
  const scene = useScene()
  const store = useSelectionState();
  const selection = useAccessorValue(() => store.selection);
  const featureQuery = useSelectedFeaturesFromLayers(enabled);
  const retry = featureQuery.refetch;
  const featureQueryError = featureQuery.error;
  const features = Array.from(featureQuery.data?.values() ?? []).flat();

  const modelOrigin = useOriginElevationInfo().data

  useEffect(() => {
    if (enabled) {
      retry()
    }
  }, [enabled, retry])

  const isDownloading = useIsMutating({ mutationKey: ['export-download'] }) > 0

  const query = useQuery({
    queryKey: [
      'download',
      features.map(f => f.getObjectId()),
      selection?.extent?.toJSON(),
      modelOrigin?.toJSON(),
      includeOriginMarker
    ],
    queryFn: async ({ signal }) => {
      if (featureQueryError) {
        throw featureQueryError;
      }

      const blob = await createModelBlob({
        scene,
        extent: selection!.extent,
        meshes: features.map(f => f.geometry as Mesh),
        signal,
        origin: modelOrigin!,
        includeOriginMarker,
        filename: "unknown",
      })

      return blob;
    },
    enabled: !isDownloading && enabled && scene != null && selection != null && featureQueryError == null && modelOrigin != null,
  })

  return query;
}

export function useDownloadExportMutation() {
  const store = useSelectionState();
  const toast = useToast();

  return useMutation({
    mutationKey: ['export-download'],
    mutationFn: async (args: {
      includeOriginMarker?: boolean,
      filename: string,
      scene: WebScene,
      extent: Extent,
      meshes: Mesh[],
      origin: Point,
      signal?: AbortSignal
    }) => {
      const blob = await createModelBlob(args);
      return blob
    },
    onSuccess: () => {
      store.exportState = 'exported'
    },
    onError: (error) => {
      if (error instanceof ToastableError) {
        toast(error);
      } else {
        toast({
          key: 'mesh-export-failed',
          message: 'Failed to export mesh',
          title: 'Export error',
          severity: 'danger',
        })
      }
    }
  })
}

async function createModelBlob(args: {
  includeOriginMarker?: boolean,
  filename: string,
  scene: WebScene,
  extent: Extent,
  meshes: Mesh[],
  origin: Point,
  signal?: AbortSignal
}) {
  const {
    includeOriginMarker = false,
    scene,
    extent,
    meshes,
    origin,
    signal
  } = args;

  try {
    // eslint-disable-next-line no-var
    var mesh = await createMesh({
      scene,
      extent: extent,
      features: meshes,
      origin,
      includeOriginMarker,
      signal,
    });
    // throw new Error('errrorororor');
  } catch (_error) {
    throw new ToastableError({
      key: 'mesh-creation-failed',
      message: 'Failed to create mesh',
      title: 'Export error',
      severity: 'danger',
    })
  }

  const file = await mesh.toBinaryGLTF();
  const blob = new Blob([file], { type: 'model/gltf-binary' });
  return blob
}