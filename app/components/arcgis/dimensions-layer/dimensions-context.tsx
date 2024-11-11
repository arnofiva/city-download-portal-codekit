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
import DimensionAnalysis from "@arcgis/core/analysis/DimensionAnalysis";
import DimensionLayer from "@arcgis/core/layers/DimensionLayer";
import { createContext, useContext } from "react";

export const DimensionsContext = createContext<{
  layer: DimensionLayer;
  analyses: DimensionAnalysis;
}>(null!);

export function useDimensions() {
  return useContext(DimensionsContext);
}


