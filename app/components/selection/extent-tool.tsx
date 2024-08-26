import Accessor from '@arcgis/core/core/Accessor';
import { property, subclass } from '@arcgis/core/core/accessorSupport/decorators';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { Point } from '@arcgis/core/geometry';

@subclass()
class ExtentTool extends Accessor {
  @property()
  state: 'ready' | 'placing-origin' | 'placing-terminal' | 'disabled' = 'disabled'

  @property()
  private origin: Point | null = null

  @property()
  private terminal: Point | null = null
}