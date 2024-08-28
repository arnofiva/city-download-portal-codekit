import useInstance from "~/hooks/useInstance";
import { useGraphicsLayer } from "../graphics-layer";
import { useSceneView } from "../views/scene-view/scene-view-context";
import { ForwardedRef, PropsWithChildren, createContext, memo, useContext, useEffect } from "react";
import useProvideRef from "~/hooks/useProvideRef";
import { SketchToolManager } from "./tools/create-tool";

interface SketchProps {
  ref?: ForwardedRef<SketchToolManager>;
  disableZ?: boolean;
}

const SketchContext = createContext<SketchToolManager>(null!);
export function useSketch() {
  return useContext(SketchContext);
}

interface SketchTooltipProps {
  inputEnabled: boolean,
  helpMessageIcon: string;
  helpMessage: string;
}
export const SketchTooltip = memo(
  function SketchTooltip({
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
)

export default function Sketch({ ref, children, disableZ = false }: PropsWithChildren<SketchProps>) {
  const view = useSceneView();
  const layer = useGraphicsLayer();

  const sketch = useInstance(() => new SketchToolManager({
    /*
    it's important to not assign the view/layer here in the state initializer
    
    in strict mode, React runs initializers twice - this means we will end up creating two instances targeting the same view/layer
    
    the second instance should mostly be ignored and eventually destroyed, but if the user interacts with a graphic on the layer before that happens, both svm's will be attempting to control it leading to undefined behavior
    */
    defaultCreateOptions: {
      hasZ: !disableZ
    }
  }));

  useEffect(() => {
    sketch.defaultCreateOptions.hasZ = !disableZ
  }, [disableZ, sketch.defaultCreateOptions])

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
