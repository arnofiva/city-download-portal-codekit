
export type BlockAction = { mode?: 'managed' | 'manual', type: 'open' | 'close', block: keyof SidebarState }

export interface BlockState { mode: 'managed' | 'manual', state: 'closed' | 'open' }
export interface SidebarState {
  modelOrigin: BlockState;
  selection: BlockState;
  exportSettings: BlockState;
}
export function BlockStateReducer(state: SidebarState, actions: BlockAction[]) {
  const next = { ...state, };
  for (const action of actions) {
    const { type, mode = 'managed', block } = action;
    const blockState = { ...next[block] };
    next[block] = blockState

    if (blockState.mode === "manual") {
      if (mode === 'manual') {
        blockState.state = type === 'open' ? 'open' : 'closed';
      }
    } else {
      blockState.mode = mode;
      blockState.state = type === 'open' ? 'open' : 'closed';
    }
  }

  return next;
}