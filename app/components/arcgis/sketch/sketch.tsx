import useInstance from "~/hooks/useInstance";
import { useGraphicsLayer } from "../graphics-layer";
import { useSceneView } from "../views/scene-view/scene-view-context";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import { ForwardedRef, PropsWithChildren, createContext, useContext, useEffect } from "react";
import useProvideRef from "~/hooks/useProvideRef";

interface SketchProps {
  ref?: ForwardedRef<SketchViewModel>;
}

const SketchContext = createContext<SketchViewModel>(null!);
export function useSketch() {
  return useContext(SketchContext);
}

interface SketchTooltipProps {
  inputEnabled: boolean,
  helpMessageIcon: string;
  helpMessage: string;
}
export function SketchTooltip({
  helpMessage,
  helpMessageIcon,
  inputEnabled = false
}: Partial<SketchTooltipProps>) {
  const sketch = useSketch();

  useEffect(() => {
    sketch.tooltipOptions.enabled = true;
    sketch.tooltipOptions.inputEnabled = inputEnabled;

    if (helpMessage) {
      sketch.tooltipOptions.visibleElements.helpMessage = true;
      sketch.tooltipOptions.helpMessage = helpMessage;
      sketch.tooltipOptions.helpMessageIcon = helpMessageIcon!;
    }

    return () => {
      sketch.tooltipOptions.enabled = false;
    }
  }, [helpMessage, helpMessageIcon, inputEnabled, sketch.tooltipOptions]);

  return null;
}

export default function Sketch({ ref, children }: PropsWithChildren<SketchProps>) {
  const view = useSceneView();
  const layer = useGraphicsLayer();

  const sketch = useInstance(() => new SketchViewModel({
    /*
    it's important to not assign the view/layer here in the state initializer
    
    in strict mode, React runs initializers twice - this means we will end up creating two instances targeting the same view/layer
    
    the second instance should mostly be ignored and eventually destroyed, but if the user interacts with a graphic on the layer before that happens, both svm's will be attempting to control it leading to undefined behavior
    */
    defaultCreateOptions: {
      hasZ: false
    },
    defaultUpdateOptions: {
      enableRotation: false,
      enableScaling: false,
      enableZ: false,
      multipleSelectionEnabled: false,
      toggleToolOnClick: false,
      tool: 'reshape',
      reshapeOptions: {
        edgeOperation: 'offset',
        shapeOperation: 'none',
        vertexOperation: 'move'
      },
    },
  }));

  useProvideRef(sketch, ref);

  useEffect(() => {
    sketch.view = view;
    sketch.layer = layer;
  }, [view, layer, sketch]);


  useEffect(() => {
    const handle = sketch.on("create", (event) => {
      if (event.state === 'complete') {
        sketch.layer.remove(event.graphic);
      }
    })

    return handle.remove
  });

  return (
    <SketchContext.Provider value={sketch}>
      {children}
    </SketchContext.Provider>
  );
}
