import { Polygon } from "@arcgis/core/geometry";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import { fromPromise } from "xstate";

type UpdateInput = {
  sketch: SketchViewModel;
  onUpdate: (polygon: Polygon) => void;
}
export const editPolygonActor = fromPromise<Polygon, UpdateInput>(async function update({ input }) {
  let
    resolve: (value: __esri.Polygon | PromiseLike<__esri.Polygon>) => void,
    reject: (reason?: any) => void;

  const promise = new Promise<Polygon>((res, rej) => {
    resolve = res;
    reject = rej;
  })

  const sketch = input.sketch;

  const polygon = sketch.layer.graphics.find(graphic => graphic.geometry.type === "polygon")!;

  if (sketch.state !== "active") {
    sketch.update(polygon);
  }

  const handle = sketch.on("update", (event) => {
    const [graphic] = event.graphics;
    const polygon = graphic.geometry as Polygon;

    input.onUpdate(polygon);
    if (event.state === "complete" && !event.aborted) {
      return resolve(polygon);
    }
    if (event.state === "complete" && event.aborted) {
      return reject()
    }
  })

  try {
    return await promise;
  } catch (error) {
    sketch.cancel();
    throw new Error('the update was cancelled')
  } finally {
    handle.remove();
  }
});
