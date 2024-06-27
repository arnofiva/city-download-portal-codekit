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
    let polygon = graphic.geometry as Polygon;
    if (event.toolEventInfo?.type === "vertex-remove") {
      polygon = graphic.geometry.clone() as Polygon;

      const [ring] = polygon.rings;

      const vertices = event.toolEventInfo.vertices;

      for (const vertex of vertices) {
        ring.splice(vertex.vertexIndex, 0, vertex.coordinates);

        // polygon rings are always closed, so the first vertex' coordinates appear .at(0) and .at(-1)
        // so in this case, we must also replace the last element in the ring array
        if (vertex.vertexIndex === 0) {
          ring.pop();
          ring.push(vertex.coordinates);
        }
      }

      graphic.geometry = polygon;
    }

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
