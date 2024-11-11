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
export default async function convertGLBToOBJ(file: ArrayBuffer) {
  const GLTFLoader = await import('three/addons/loaders/GLTFLoader.js').then(mod => mod.GLTFLoader);
  const OBJExporter = await import('three/addons/exporters/OBJExporter.js').then(mod => mod.OBJExporter);

  const blob = new Blob([file], { type: 'model/gltf-binary' })
  const url = window.URL.createObjectURL(blob);
  const loader = new GLTFLoader();
  const scene = await loader.loadAsync(url);
  // const scene = await loader.parseAsync(file, import.meta.url);

  const exporter = new OBJExporter();
  const objString = exporter.parse(scene.scene);

  return objString;
}