import { useContext } from 'react'
import { LiveStatusContext } from '@/features/live-updates/live-status-context'

/** Current live-updates connection status ("closed" outside of LiveUpdatesProvider). */
export const useLiveStatus = () => useContext(LiveStatusContext).status

export const useLiveControls = () => useContext(LiveStatusContext)
