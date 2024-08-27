import Color from "@arcgis/core/Color";
import { PointSymbol3D, ObjectSymbol3DLayer } from "@arcgis/core/symbols";

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

const height = 200;
const diamondSize = 7.5;
export const OriginSymbol = new PointSymbol3D({
  symbolLayers: [
    new ObjectSymbol3DLayer({
      material: { color: SymbologyColors.measurements() },
      resource: { primitive: 'cylinder' },
      width: 2,
      depth: 2,
      height,
    }),
    new ObjectSymbol3DLayer({
      material: { color: SymbologyColors.measurements() },
      resource: { primitive: 'diamond' },
      width: diamondSize,
      depth: diamondSize,
      height: diamondSize,
      anchor: 'relative',
      anchorPosition: { x: 0, y: 0, z: -(height / diamondSize) }
    }),
  ]
})