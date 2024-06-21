import { useDeferredValue, useEffect } from "react";
import { AnyActorRef, assign, fromPromise, setup, spawnChild, stopChild } from "xstate";
import createMesh from "./create-mesh";
import WebScene from "@arcgis/core/WebScene";
import { Mesh, Polygon } from "@arcgis/core/geometry";
import { useActor } from "@xstate/react";
import { useScene } from "../arcgis/maps/web-scene/scene-context";

interface Input { scene: WebScene, selection: Polygon, parent: AnyActorRef }
const logic = fromPromise<Mesh, Input>(async ({ input, signal }) => {
  const mesh = await createMesh(input.scene, input.selection.extent, signal);
  const file = await mesh.toBinaryGLTF();
  const blob = new Blob([file], { type: 'model/gltf-binary' });

  input.parent.send({ type: 'done', size: blob.size });

  return mesh;
});

const machine = setup({
  types: {
    context: {} as {
      scene: WebScene,
      loading: boolean
      size: number | null
    },
    input: {} as {
      scene: WebScene
    },
    events: {} as { type: 'change', selection: Polygon } | { type: 'done', size: number | null }
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
          return ({ scene: context.scene, selection: event.selection, parent: self })
        }
      }
    ),
  }
}).createMachine({
  context: ({ input }) => ({
    scene: input.scene,
    loading: false,
    size: null
  }),
  on: {
    change: {
      actions: ['cancel', 'calculateMesh', assign({ loading: true })],
    },
    done: {
      actions: assign({
        size: ({ event }) => event.size,
        loading: false
      })
    }
  }
})


interface FileSizeProps {
  selection: Polygon;
}
export default function FileSize({ selection }: FileSizeProps) {
  const scene = useScene();
  const deferredSelection = useDeferredValue(selection);

  const [actor, send] = useActor(machine, { input: { scene } });

  useEffect(() => {
    send({ type: 'change', selection: deferredSelection })
  }, [deferredSelection, send])

  return (
    <span className={actor.context.loading ? "italic" : ""}>{actor.context.size ?? actor.context.loading ? "loading" : "unknown"}</span>
  );
}