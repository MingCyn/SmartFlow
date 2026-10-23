import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BASELINE_STORM } from '../lib/scoring'
import type { DispatchStatus } from '../types'

/** A demo flood placed by an operator, as an offset in metres from the user (or township centre). */
export interface ExtraFlood {
  id: string
  northM: number
  eastM: number
}

interface OpsState {
  storm: number
  dispatch: Record<string, DispatchStatus>
  extraFloods: ExtraFlood[]
  setStorm: (storm: number) => void
  setDispatch: (cellId: string, status: DispatchStatus) => void
  addFloodNearby: () => void
  reset: () => void
}

// Seeded so the demo opens with one crew already moving.
const INITIAL_DISPATCH: Record<string, DispatchStatus> = { B2: 'on-site', A2: 'assigned' }

export const useOps = create<OpsState>()(
  persist(
    (set) => ({
      storm: BASELINE_STORM,
      dispatch: INITIAL_DISPATCH,
      extraFloods: [],
      setStorm: (storm) => set({ storm }),
      setDispatch: (cellId, status) => set((s) => ({ dispatch: { ...s.dispatch, [cellId]: status } })),
      addFloodNearby: () =>
        set((s) => {
          // 200 to 800 m away in a random direction, so it lands near the user but not on top of them.
          const angle = Math.random() * 2 * Math.PI
          const dist = 200 + Math.random() * 600
          const id = `X${s.extraFloods.length + 1}`
          return { extraFloods: [...s.extraFloods, { id, northM: Math.round(dist * Math.cos(angle)), eastM: Math.round(dist * Math.sin(angle)) }] }
        }),
      reset: () => set({ storm: BASELINE_STORM, dispatch: INITIAL_DISPATCH, extraFloods: [] }),
    }),
    { name: 'smartflow-ops', version: 1 },
  ),
)
