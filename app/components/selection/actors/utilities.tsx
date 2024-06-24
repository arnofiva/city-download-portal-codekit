import { Polygon } from "@arcgis/core/geometry";

function updateNeighboringVertices(ring: Ring, index: number, vertical: number, horizontal: number) {
  const path = ring.slice(0, -1);

  const [x, y] = path[index];

  path[vertical][0] = x;
  path[horizontal][1] = y;

  path.push(path[0]);

  return path
}

type Ring = Polygon['rings'][number];

export function alignPolygonAfterChange(nextPolygon: Polygon, previousPolygon: Polygon) {
  const previous: Ring = previousPolygon.rings[0];
  const next: Ring = nextPolygon.rings[0];

  console.log(
    {
      previous,
      next
    }
  )

  const corner = next.findIndex(([x, y], index) => x !== previous[index][0] || y !== previous[index][1]);

  console.log({ corner })

  let alignedRing: Ring;
  switch (corner) {
    case 0:
      alignedRing = updateNeighboringVertices(next, corner, 1, 3)
      break;
    case 1:
      alignedRing = updateNeighboringVertices(next, corner, 0, 2)
      break;
    case 2:
      alignedRing = updateNeighboringVertices(next, corner, 3, 1)
      break;
    case 3:
      alignedRing = updateNeighboringVertices(next, corner, 2, 0)
      break;
    default:
      alignedRing = next;
  }

  const alignedPolygon = nextPolygon.clone();
  alignedPolygon.rings = [alignedRing];

  return alignedPolygon;
}

