/* Copyright 2024 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import Graphic from "../../../arcgis/graphic";
import {
  SimpleFillSymbol,
  SimpleLineSymbol
} from "@arcgis/core/symbols";
import { Point, Polygon, Polyline } from "@arcgis/core/geometry";
import { SymbologyColors } from "~/symbology/symbology";
import { useHasTooManyFeatures } from "~/hooks/queries/feature-query";

interface SelectionGraphicProps {
  origin: Point
  selection: Polygon
}

export function SelectionPreviewGraphic({ origin, selection }: SelectionGraphicProps) {
  const hasTooManyFeatures = useHasTooManyFeatures();

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
        index={0}
        geometry={selection}
        symbol={!hasTooManyFeatures ? SelectionSymbol : InvalidSelectionSymbol}
      />
      <Graphic
        index={2}
        geometry={ooot}
        symbol={LineSymbol}
      />
      <Graphic
        index={2}
        geometry={ooto}
        symbol={LineSymbol}
      />
    </>
  )
}

const SelectionSymbol = new SimpleFillSymbol({
  color: SymbologyColors.selection(0.25),
  outline: {
    color: SymbologyColors.selection()
  }
})

const InvalidSelectionSymbol = new SimpleFillSymbol({
  color: SymbologyColors.invalidSelection(0.1),
  outline: {
    color: SymbologyColors.invalidSelection()
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
