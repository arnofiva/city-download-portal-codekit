import Graphic from "@arcgis/core/Graphic";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import { Point } from "@arcgis/core/geometry";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import { fromPromise } from "xstate";

type CreateInput = {
  sketch: SketchViewModel
  onUpdate?: (point: Point) => void;
};
type CreateOutput = Point;
export const PlacePointActor = fromPromise<CreateOutput, CreateInput>(async function place({ input }) {
  const sketch = input.sketch;

  sketch.create("point")
  const graphic = (await reactiveUtils.whenOnce(() => sketch.createGraphic?.geometry.type === "point" && sketch.createGraphic)) as Graphic;

  let state = 'void'
  let geometry = graphic.geometry as Point;

  const stateWatcher = sketch.on("create", (event) => {
    console.log('new state');
    state = event.state;
  })

  const watcher = reactiveUtils.watch(() => graphic.geometry as Point, (geom) => {
    geometry = geom;
    input.onUpdate?.(geom);
  }, { initial: true });

  graphic.addHandles([watcher, stateWatcher]);

  await reactiveUtils.whenOnce(() => sketch.createGraphic == null);

  if (state === "complete" && geometry != null) return geometry
  else throw new Error('cancelled...');
});