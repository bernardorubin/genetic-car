import { useContext } from 'react';
import { SimContext } from './SimContext';

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error('useSim must be used inside <SimProvider>');
  return ctx;
}
