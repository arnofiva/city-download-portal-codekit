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