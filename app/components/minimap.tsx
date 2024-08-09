import { Suspense, lazy, memo, useDeferredValue, useEffect, useRef, useState } from "react";
import { CalciteScrim } from "@esri/calcite-components-react";
import GraphicsLayer from "./arcgis/graphics-layer";
import Graphic from "./arcgis/graphic";
import {
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol
} from "@arcgis/core/symbols";
import { useSceneView } from "./arcgis/views/scene-view/scene-view-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSelectionStateSelector } from "~/data/selection-store";
import CoreMapView from "@arcgis/core/views/MapView";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import * as geometryEngineAsync from "@arcgis/core/geometry/geometryEngineAsync";
import { Geometry, Polygon, Polyline } from "@arcgis/core/geometry";
import useInstance from "~/hooks/useInstance";
import { SymbologyColors } from "~/symbology";
import { property, subclass } from "@arcgis/core/core/accessorSupport/decorators";
import Accessor from "@arcgis/core/core/Accessor";
import SceneView from "@arcgis/core/views/SceneView";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import * as promiseUtils from "@arcgis/core/core/promiseUtils";
import { removeSceneLayerClones } from "./selection/scene-filter-highlights";
import SceneLayer from "@arcgis/core/layers/SceneLayer";

const Map = lazy(() => import('~/components/arcgis/maps/map/map'));
const MapView = lazy(() => import('~/components/arcgis/views/map-view/map-view'));

const PolygonSymbol = new SimpleFillSymbol({
  color: SymbologyColors.selection(0.25),
  outline: {
    color: SymbologyColors.selection()
  }
})

const FootprintSymbol = new SimpleFillSymbol({
  color: SymbologyColors.selection(),
  outline: {
    width: 0,
  }
})

const LineSymbol = new SimpleLineSymbol({
  width: 3,
  color: SymbologyColors.measurements(),
  cap: 'square',
  marker: {
    color: SymbologyColors.measurements(),
    placement: "end",
    style: "arrow"
  }
})

const OriginSymbol = new SimpleMarkerSymbol({
  color: SymbologyColors.measurements(),
  style: 'diamond',
  outline: null!
})

function SelectionGraphic({ footprints }: { footprints: Polygon | null }) {
  const origin = useSelectionStateSelector(store => store.origin);
  const selection = useSelectionStateSelector(store => store.selection);
  if (selection == null || origin == null) return null;

  const [
    oo,
    ot,
    _tt,
    to,
  ] = selection.rings[0];
  const ooot = new Polyline({
    paths: [[
      oo,
      ot
    ]],
    spatialReference: selection.spatialReference
  })

  const ooto = new Polyline({
    paths: [[
      oo,
      to
    ]],
    spatialReference: selection.spatialReference
  })

  return (
    <>
      <Graphic
        geometry={selection}
        symbol={PolygonSymbol}
      />
      {footprints != null ? (
        <Graphic
          geometry={footprints}
          symbol={FootprintSymbol}
        />
      ) : null}
      <Graphic
        geometry={ooot}
        symbol={LineSymbol}
      />
      <Graphic
        geometry={ooto}
        symbol={LineSymbol}
      />
      <Graphic
        geometry={origin}
        symbol={OriginSymbol}
      />
    </>
  )
}

function InternalMinimap() {
  const [isOpen, setIsOpen] = useState(false);
  const fp = useInstance(() => new Footprints())
  const observer = useInstance(() => new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target;
      if (target instanceof HTMLElement && target.tagName === 'CALCITE-BLOCK') {
        setIsOpen((target as HTMLCalciteBlockElement).open)
      }
    }
  }))

  const sceneView = useSceneView();
  const selection = useSelectionStateSelector((state) => state.selection);
  const footprint = useAccessorValue(() => fp.footprint);

  const viewExtent = useAccessorValue(() => sceneView.extent);
  const sr = useAccessorValue(() => sceneView.spatialReference?.wkid);

  const deferredSelection = useDeferredValue(selection);

  const mapRef = useRef<CoreMapView>(null);

  useEffect(() => {
    fp.view = sceneView
    fp.selection = deferredSelection ?? null
  }, [deferredSelection, fp, sceneView])

  useEffect(() => {
    if (mapRef.current == null || !isOpen) return;
    const controller = new AbortController();
    let target: Geometry | undefined = viewExtent;

    if (deferredSelection != null) {
      const area = Math.abs(geometryEngine.planarArea(deferredSelection));
      const buffered = geometryEngine.buffer(deferredSelection, Math.sqrt(area) * 0.5) as Polygon;
      if (buffered) target = buffered
    }

    if (target)
      mapRef.current.goTo({ target }, { signal: controller.signal, animate: false }).catch()

    return () => controller.abort()
  }, [viewExtent, deferredSelection, isOpen]);

  const disableMapInteractions = "[&_.esri-view-surface]:pointer-events-none"
  return (
    <div
      ref={(ref) => {
        observer.disconnect()
        const parent = ref?.closest("calcite-block");
        if (parent) observer.observe(parent, { attributes: true, attributeFilter: ['open'] })
      }}
      className={"w-full aspect-[1.5/1] " + disableMapInteractions}
    >
      {sr != null ? (
        <Suspense fallback={<CalciteScrim loading />}>
          <Map>
            <GraphicsLayer>
              <SelectionGraphic footprints={footprint ?? null} />
            </GraphicsLayer>
            <MapView ref={mapRef} spatialReference={`${sr}`} />
          </Map>
        </Suspense>
      ) : null}
    </div>
  )
}

const Minimap = memo(InternalMinimap);

export default Minimap;

@subclass()
class Footprints extends Accessor {
  @property()
  selection: Polygon | null = null

  @property()
  view: SceneView | null = null

  @property()
  footprint: Polygon | null = null

  initialize() {
    this.addHandles([
      reactiveUtils.watch(() => this.selection, promiseUtils.debounce(async (selection) => {
        if (selection == null || this.view == null) return;

        const sceneLayers = this.view.map.allLayers
          .filter(removeSceneLayerClones)
          .filter((layer): layer is SceneLayer => layer.type === "scene" && (layer as any).geometryType === 'mesh')
          .toArray() as SceneLayer[]

        try {
          const footprints: Polygon[] = []
          for (const layer of sceneLayers) {
            const footprintQuery = layer.createQuery()
            footprintQuery.multipatchOption = "xyFootprint";
            footprintQuery.returnGeometry = true;
            footprintQuery.geometry = selection;
            footprintQuery.outSpatialReference = this.view.spatialReference;
            footprintQuery.spatialRelationship = "intersects";

            const results = await layer.queryFeatures(footprintQuery);
            const layerFootprints = await Promise.all(results.features
              .map(f => f.geometry as Polygon)
              .filter(Boolean)
              // the footprints are often quite sharp directly from the query,
              // so we add a little bit of a buffer to smooth them out
              .map(f => geometryEngineAsync.buffer(f, 0.5, 'meters') as Promise<Polygon>)
            )
            footprints.push(...layerFootprints)
          }

          const fpUnion = await geometryEngineAsync.union(footprints) as Polygon
          if (fpUnion != null) this.footprint = fpUnion;
          if (this.selection == null) this.footprint = null;
        } catch (error) {
          console.log('caught error...')
        }
      }))
    ])
  }
}