import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CalciteButton } from "@esri/calcite-components-react";
import GraphicsLayer from "~/components/arcgis/graphics-layer";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import PointTool from "~/components/arcgis/sketch/tools/point-tool";
import { Point, Polygon } from "@arcgis/core/geometry";
import Graphic from "~/components/arcgis/graphic";
import Sketch from "../arcgis/sketch/sketch";
import { PointSymbol3D, TextSymbol3DLayer, IconSymbol3DLayer, FillSymbol3DLayer, PolygonSymbol3D } from "@arcgis/core/symbols";
import LineCallout3D from "@arcgis/core/symbols/callouts/LineCallout3D";
import pinTearIcon from './pin-tear-f.svg?url';
import { assign, setup } from "xstate";
import { useActor } from "@xstate/react";
import StylePattern3D from "@arcgis/core/symbols/patterns/StylePattern3D";
import { useReferenceElementId, useWalkthrough } from "~/components/selection/walk-through-context";
import { useAccessorValue } from "~/hooks/reactive";
import { useSceneView } from "../arcgis/views/scene-view/scene-view-context";
import CoreGraphic from "@arcgis/core/Graphic";
import WalkthroughPopover from "~/components/selection/walk-through-popover";
import { RootShellPortal } from "~/components/root-shell";
import { contains } from "@arcgis/core/geometry/geometryEngine";
import Highlight from "./highlight";

type SelectionEvents =
  | { type: 'start' }
  | { type: 'active', point: Point }
  | { type: 'complete', point: Point }
  | { type: 'cancel' }
  | { type: 'delete' }
  | { type: 'update', polygon: Polygon }

type SelectionContext = {
  origin: Point | null;
  terminal: Point | null;
  startDrawing: () => void;
};

type SelectionInput = {
  startDrawing: () => void;
};

const createSelectionMachine = setup({
  types: {
    context: {} as SelectionContext,
    events: {} as SelectionEvents,
    input: {} as SelectionInput
  },
  actions: {
    startDrawing: ({ context }) => context.startDrawing(),
    updateOrigin: assign({
      origin: (_, point: Point) => point,
      terminal: null
    }),
    updateTerminal: assign({
      terminal: (_, point: Point) => point
    }),
    updatePolygon: assign((_, { origin, terminal }: { origin: Point, terminal: Point }) => ({
      origin, terminal
    })),
    clear: assign({
      origin: null,
      terminal: null,
    })
  }
})
  .createMachine({
    context: ({ input }) => ({
      origin: null,
      terminal: null,
      startDrawing: input.startDrawing
    }),
    initial: 'notStarted',
    states: {
      notStarted: {
        on: {
          start: {
            target: 'creating'
          }
        }
      },
      creating: {
        initial: 'placingOrigin',
        states: {
          placingOrigin: {
            entry: ['clear', 'startDrawing'],
            on: {
              complete: {
                target: 'placingTerminal',
                actions: {
                  type: 'updateOrigin',
                  params: ({ event }) => event.point
                }
              },
              cancel: {
                target: '#(machine).notStarted',
              }
            }
          },
          placingTerminal: {
            entry: 'startDrawing',
            on: {
              active: {
                actions: {
                  type: 'updateTerminal',
                  params: ({ event }) => event.point
                }
              },
              complete: {
                target: '#(machine).created',
                actions: {
                  type: 'updateTerminal',
                  params: ({ event }) => event.point
                }
              },
              cancel: {
                // if there was already a selection, it should probably be restored
                actions: 'clear',
              }
            }
          },
        }
      },
      created: {
        on: {
          start: {
            target: 'maybeRecreating'
          },
          update: {
            actions: {
              type: 'updatePolygon',
              params: ({ context, event }) => {
                const [
                  oo,
                  ot,
                  tt,
                  to,
                ] = event.polygon.rings[0];

                const currentOrigin = context.origin!;
                const currentTerminal = context.terminal!;

                if (oo[0] !== currentOrigin.x || oo[1] !== currentOrigin.y) {
                  const origin = currentOrigin.clone();
                  origin.x = oo[0];
                  origin.y = oo[1];

                  return { origin, terminal: currentTerminal }
                }

                if (ot[0] !== currentOrigin.x || ot[1] !== currentTerminal.y) {
                  const origin = currentOrigin.clone();
                  origin.x = ot[0];

                  const terminal = currentTerminal.clone();
                  terminal.y = ot[1];

                  return { origin, terminal }
                }

                if (tt[0] !== currentTerminal.x || tt[1] !== currentTerminal.y) {
                  const terminal = currentTerminal.clone();
                  terminal.x = tt[0];
                  terminal.y = tt[1];

                  return { terminal, origin: currentOrigin }
                }

                if (to[0] !== currentTerminal.x || to[1] !== currentOrigin.y) {
                  const terminal = currentTerminal.clone();
                  terminal.x = to[0];

                  const origin = currentOrigin.clone();
                  origin.y = to[1];

                  return { origin, terminal }
                }

                return { origin: currentOrigin, terminal: currentTerminal }
              }
            }
          }
        }
      },
      maybeRecreating: {
        entry: 'startDrawing',
        on: {
          complete: {
            target: '#(machine).creating.placingTerminal',
            actions: {
              type: 'updateOrigin',
              params: ({ event }) => event.point
            }
          },
        }
      }
    },
    on: {
      delete: {
        target: '.notStarted',
        actions: 'clear'
      }
    }
  });

interface SelectionProps {
  onChange?: (selection: Polygon | null) => void;
}
function InternalSelection({
  onChange
}: SelectionProps) {
  const view = useSceneView();
  const viewReady = useAccessorValue(() => view.ready);

  const walkthrough = useWalkthrough();
  const sketchRef = useRef<SketchViewModel>(null);
  const selectionGraphicRef = useRef<CoreGraphic>(null);
  const id = useReferenceElementId([
    'not-started',
    'placing-origin',
    'placing-terminal',
  ],
    'top');

  const input: SelectionInput = useMemo(() => ({
    startDrawing: () => sketchRef.current?.create('point')
  }), []);

  const [state, send] = useActor(createSelectionMachine, { input });

  const origin = state.context.origin;
  const terminal = state.context.terminal;

  const polygon = useMemo(() => (
    origin != null && terminal != null
      ? createSelectionPolygon(origin, terminal)
      : null
  ), [origin, terminal]);

  const hasCreated = state.matches('created');

  const currentOnChange = useRef(onChange);
  useEffect(() => {
    currentOnChange.current = onChange;
  })

  useEffect(() => {
    currentOnChange.current?.(polygon)
  }, [onChange, polygon]);

  useEffect(() => {
    if (hasCreated && sketchRef.current && selectionGraphicRef.current) {
      sketchRef.current.update(selectionGraphicRef.current)
    }
  }, [hasCreated]);

  const isIdle =
    state.matches('notStarted') ||
    state.matches('created');

  const [hasBeenActive, setState] = useState(false);

  if (!hasBeenActive && !isIdle) {
    setState(true);
  }

  const text = !hasBeenActive ? 'Select area' : 'New selection';

  const appearance: HTMLCalciteButtonElement['appearance'] =
    hasBeenActive
      ? 'outline-fill'
      : 'solid';

  useEffect(() => {
    const handle = view.on("click", (event) => {
      if (selectionGraphicRef.current && sketchRef.current) {
        if (contains(selectionGraphicRef.current.geometry, event.mapPoint)) {
          event.stopPropagation();
          sketchRef.current.update(selectionGraphicRef.current)
        }
      }
    })

    return handle.remove;
  }, [view]);

  return (
    <>
      <GraphicsLayer elevationMode="on-the-ground">
        <Sketch ref={sketchRef}>
          <PointTool
            onStart={() => {
              send({ type: 'start' });
              if (state.matches({ creating: 'placingOrigin' }))
                walkthrough.advance('placing-origin');
              if (state.matches({ creating: 'placingTerminal' }))
                walkthrough.advance('placing-terminal');
            }}
            onActive={(point) => send({ type: 'active', point })}
            onComplete={(point) => {
              send({ type: 'complete', point })
              if (state.matches({ creating: 'placingTerminal' }))
                walkthrough.advance('confirm');
            }}
            onCancel={() => send({ type: 'cancel' })}
          >
            <CalciteButton
              id={id}
              scale="l"
              iconStart="rectangle-plus"
              disabled={!viewReady || !isIdle}
              kind="brand"
              appearance={appearance}
              onClick={() => {
                send({ type: 'start' })
              }}
            >
              {text}
            </CalciteButton>
          </PointTool>

          {polygon != null && hasCreated ? (
            // when we're in the `created` state allow the selection graphic to be edited
            <Graphic
              ref={selectionGraphicRef}
              geometry={polygon}
              symbol={PolygonSymbol}
              onChange={(polygon) => send({ type: 'update', polygon })}
              onDelete={() => send({ type: 'delete' })}
            />
          ) : null}
          <RootShellPortal>
            <WalkthroughPopover />
          </RootShellPortal>
        </Sketch>
      </GraphicsLayer>

      <GraphicsLayer>
        {origin != null ? <Graphic geometry={origin} symbol={Callout} /> : null}
        {terminal != null ? <Graphic geometry={terminal} symbol={Callout} /> : null}

        {polygon != null && !hasCreated ? (
          // when we're not in the `created` state _do not_ allow the selection graphic to be edited
          <Graphic
            geometry={polygon}
            symbol={PolygonSymbol}
          />
        ) : null}
      </GraphicsLayer>
      <Highlight />
    </>
  )
}

function createSelectionPolygon(origin: Point, terminal: Point) {
  return new Polygon({
    rings: [[
      [origin.x, origin.y],
      [origin.x, terminal.y],
      [terminal.x, terminal.y],
      [terminal.x, origin.y],
      [origin.x, origin.y],
    ]],
    spatialReference: origin.spatialReference,
  })
}

const Callout = new PointSymbol3D({
  symbolLayers: [
    new TextSymbol3DLayer({
      text: 'origin',
      size: 24
    }),
    new IconSymbol3DLayer({
      resource: {
        href: pinTearIcon
      },
      size: 35,
      material: { color: 'blue' }
    })
  ],
  verticalOffset: {
    screenLength: 150,
    maxWorldLength: 150,
    minWorldLength: 150
  },
  callout: new LineCallout3D({
    color: 'white',
    size: 2,
  })
});

const PolygonSymbol = new PolygonSymbol3D({
  symbolLayers: [
    new FillSymbol3DLayer({
      material: { color: [255, 0, 0, 0.25] },
      outline: { color: [255, 0, 0, 1] },
      pattern: new StylePattern3D({ style: 'diagonal-cross' })
    })
  ]
});

const Selection = memo(InternalSelection);
export default Selection;