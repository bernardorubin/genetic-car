import { useContext } from 'react';
import { Sim3DContext, type Sim3DContextValue } from './Sim3DContext';

export function useSim3d(): Sim3DContextValue {
  const ctx = useContext(Sim3DContext);
  if (!ctx) throw new Error('useSim3d must be used within a Sim3DProvider');
  return ctx;
}
