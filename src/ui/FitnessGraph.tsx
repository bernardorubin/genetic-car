import { useSim } from '../state/useSim';
import { FitnessGraphCanvas } from './FitnessGraphCanvas';

export function FitnessGraph() {
  const { stats } = useSim();
  return <FitnessGraphCanvas history={stats.history} />;
}
