import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BASELINE_STORM } from '../lib/scoring'
import type { DispatchStatus } from '../types'

interface OpsState {
  storm: number
  dispatch: Record<string, DispatchStatus>
  setStorm: (storm: number) => void
  setDispatch: (cellId: string, status: DispatchStatus) => void
  reset: () => void
}

// Seeded so the demo opens with one crew already moving.
const INITIAL_DISPATCH: Record<string, DispatchStatus> = { B2: 'on-site', A2: 'assigned' }

export const useOps = create<OpsState>()(
  persist(
    (set) => ({
      storm: BASELINE_STORM,
      dispatch: INITIAL_DISPATCH,
      setStorm: (storm) => set({ storm }),
      setDispatch: (cellId, status) => set((s) => ({ dispatch: { ...s.dispatch, [cellId]: status } })),
      reset: () => set({ storm: BASELINE_STORM, dispatch: INITIAL_DISPATCH }),
    }),
    { name: 'smartflow-ops', version: 1 },
  ),
)
