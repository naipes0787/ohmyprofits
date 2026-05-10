import { useEffect, useState } from 'react';
import { onSwUpdate, getSwState, type SwUpdateState } from './register';

export function useSwUpdate(): SwUpdateState {
  const [state, setState] = useState<SwUpdateState>(getSwState);
  useEffect(() => onSwUpdate(setState), []);
  return state;
}
