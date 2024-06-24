import { AnyActorRef, assign, fromPromise, log, setup, spawnChild, stopChild } from "xstate";
import createMesh from "./create-mesh";
import WebScene from "@arcgis/core/WebScene";
import { Mesh, Polygon } from "@arcgis/core/geometry";
import invariant from "tiny-invariant";

interface Input { scene: WebScene, selection: Polygon, parent: AnyActorRef }
const logic = fromPromise<void, Input>(async ({ input, signal }) => {
  try {
    const mesh = await createMesh(input.scene, input.selection.extent, signal);
    const file = await mesh.toBinaryGLTF();
    const blob = new Blob([file], { type: 'model/gltf-binary' });

    if (!signal.aborted) {
      input.parent.send({ type: 'done', size: blob.size, mesh, file: blob });
    }
  } catch (error) {
    if (signal.aborted) {
      return;
    } else {
      console.log(error);
      input.parent.send({ type: 'error' });
    }
  }
});

export const DownloadMachine = setup({
  types: {
    context: {} as {
      scene: WebScene,
      loading: boolean
      size: number | null,
      mesh: Mesh | null,
      file: Blob | null,
    },
    input: {} as {
      scene: WebScene
    },
    events: {} as
      | { type: 'change', selection: Polygon }
      | { type: 'done', size: number | null, mesh: Mesh, file: Blob }
      | { type: 'clear' }
  },
  actors: {
    logic
  },
  actions: {
    cancel: stopChild('calculator'),
    calculateMesh: spawnChild(
      'logic',
      {
        id: 'calculator',
        input: ({ context, event, self }) => {
          invariant(event.type === "change");

          return ({ scene: context.scene, selection: event.selection, parent: self })
        }
      }
    ),
    clear: assign({
      loading: false,
      size: null,
      mesh: null,
    })
  }
}).createMachine({
  context: ({ input }) => ({
    scene: input.scene,
    loading: false,
    size: null,
    mesh: null,
    file: null,
  }),
  on: {
    change: {
      actions: ['cancel', 'calculateMesh', assign({ loading: true, size: null })],
    },
    done: {
      actions: assign({
        size: ({ event }) => event.size,
        mesh: ({ event }) => event.mesh,
        file: ({ event }) => event.file,
        loading: false
      })
    },
    error: {
      actions: log('there was an error')
    },
    clear: {
      actions: 'clear',
    }
  }
})
