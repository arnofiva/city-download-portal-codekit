import {
  CalcitePanel,
  CalciteShellPanel,
} from "@esri/calcite-components-react";
import useIsRoot from "~/hooks/useIsRoot";
import ModelOrigin from "./model-origin";
import SelectionInfo from "./selection-info";
import ExportSettings from "./export-settings";
import { useEffect, useReducer } from "react";
import { BlockStateReducer, SidebarState } from "./sidebar-state";
import { useWalkthroughSelector } from "../selection/walk-through-context";
import { useSelectionStateSelector } from "~/data/selection-store";

const initialState = {
  modelOrigin: { mode: 'managed', state: 'closed' },
  selection: { mode: 'managed', state: 'closed' },
  exportSettings: { mode: 'managed', state: 'closed' },
} satisfies SidebarState;

export default function Sidebar() {
  const isRoot = useIsRoot();

  const walkthroughState = useWalkthroughSelector(store => store.state);
  const hasSelection = useSelectionStateSelector(store => store.selection != null)!;


  const [blockState, dispatch] = useReducer(
    BlockStateReducer,
    initialState
  );
  useEffect(() => {
    switch (walkthroughState) {
      case 'not-started':
      case 'done': break;

      case 'placing-origin':
      case 'placing-terminal': {
        dispatch([{ block: 'modelOrigin', type: 'open' }]);
        break;
      }
      case 'confirm': {
        dispatch([{ block: 'selection', type: 'open' }]);
        break;
      }
      case 'downloading': {
        dispatch([
          { block: 'exportSettings', type: 'open' },
          { block: 'modelOrigin', type: 'close' },
          { block: 'selection', type: 'close' }
        ]);
        break;
      }
    }
  }, [walkthroughState]);

  return (
    <CalciteShellPanel slot="panel-end" collapsed={isRoot} style={{
      '--calcite-shell-panel-width': '30vw'
    }}>
      <CalcitePanel>
        <ModelOrigin state={blockState.modelOrigin.state} dispatch={dispatch} />
        <SelectionInfo key={hasSelection ? 'selection' : 'no-selection'} state={blockState.selection.state} dispatch={dispatch} />
        <ExportSettings state={blockState.exportSettings.state} dispatch={dispatch} />
      </CalcitePanel>
    </CalciteShellPanel>
  );
}
