import Color from "@arcgis/core/Color";
import { Point } from "@arcgis/core/geometry";
import Mesh from "@arcgis/core/geometry/Mesh";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import { PointSymbol3D, ObjectSymbol3DLayer } from "@arcgis/core/symbols";
import Diamond from './diamond.gltf?url';

export const SymbologyColors = {
  selection(alpha = 1) {
    return new Color([99, 177, 255, alpha])
  },
  staleSelection(alpha = 1) {
    return new Color([157, 201, 238, alpha])
  },
  measurements(alpha = 1) {
    return new Color([255, 0, 0, alpha])
  }
} as const;

const diamondSize = 7.5;
const cylinderSize = 2;

export function createOriginSymbol(height: number) {
  const heightWithFallback = height || 50
  const layers = [
    new ObjectSymbol3DLayer({
      material: { color: SymbologyColors.measurements() },
      resource: { primitive: 'cylinder' },
      width: cylinderSize,
      depth: cylinderSize,
      height: heightWithFallback,
    }),
    new ObjectSymbol3DLayer({
      material: { color: SymbologyColors.measurements() },
      resource: { primitive: 'diamond' },
      width: diamondSize,
      depth: diamondSize,
      height: diamondSize,
      anchor: 'relative',
      anchorPosition: { x: 0, y: 0, z: -(height / diamondSize) }
    })
  ]

  return new PointSymbol3D({
    symbolLayers: layers
  })
}

export async function createOriginMarker(origin: Point, meshHeight: number) {
  const markerHeight = meshHeight;

  const box = (await Mesh.createFromGLTF(origin, Diamond))
    .scale(diamondSize)
    .offset(0, 0, markerHeight);

  const cylender = Mesh.createCylinder(origin)

  const transform = cylender.transform?.clone() ?? {};
  transform.scale = [cylinderSize, cylinderSize, markerHeight];
  cylender.transform = transform;

  const mesh = meshUtils.merge([box, cylender]);

  return mesh;
}
