import {
  CalcitePanel,
  CalciteShellPanel,
} from "@esri/calcite-components-react";
import useIsRoot from "~/hooks/useIsRoot";
import ModelOrigin from "./model-origin";
import Measurements from "./measurements";
import ExportSettings from "./export-settings";
import { useEffect, useReducer, useState } from "react";
import { useSelectionStateSelector } from "../selection/selection-context";
import { BlockStateReducer, SidebarState } from "./sidebar-state";

const initialState = {
  modelOrigin: { mode: 'managed', state: 'closed' },
  measurements: { mode: 'managed', state: 'closed' },
  exportSettings: { mode: 'managed', state: 'closed' },
} satisfies SidebarState;

export default function Sidebar() {
  const isRoot = useIsRoot();

  const state = useSelectionStateSelector(state => {
    if (state.matches({ initialized: { creating: 'terminal' } })) return 'terminal';
    if (state.matches({ initialized: { created: 'updating' } })) return 'confirming';
    if (state.matches({ initialized: { created: 'idle' } })) return 'finished';

    return 'waiting';
  });

  const [completedState, setCompletedState] = useState('waiting');
  if (state === 'terminal' && completedState === 'waiting') setCompletedState('terminal');
  if (state === 'confirming' && completedState === 'terminal') setCompletedState('confirming');
  if (state === 'finished' && completedState === 'confirming') setCompletedState('finished');

  const [blockState, dispatch] = useReducer(
    BlockStateReducer,
    initialState
  );

  useEffect(() => {
    switch (completedState) {
      case 'waiting': break;
      case 'terminal': {
        dispatch([{ block: 'modelOrigin', type: 'open' }]);
        break;
      }
      case 'confirming': {
        dispatch([{ block: 'measurements', type: 'open' }]);
        break;
      }
      case 'finished': {
        dispatch([
          { block: 'exportSettings', type: 'open' },
          { block: 'modelOrigin', type: 'close' },
          { block: 'measurements', type: 'close' }
        ]);
        break;
      }
    }
  }, [completedState]);

  return (
    <CalciteShellPanel slot="panel-end" collapsed={isRoot} style={{
      '--calcite-shell-panel-width': '30vw'
    }}>
      <CalcitePanel>
        <ModelOrigin state={blockState.modelOrigin.state} dispatch={dispatch} />
        <Measurements state={blockState.measurements.state} dispatch={dispatch} />
        <ExportSettings state={blockState.exportSettings.state} dispatch={dispatch} />
      </CalcitePanel>
    </CalciteShellPanel>
  );
}
