import type {DestinationId} from './destinations.ts';

/** This published edition is dedicated to Geumseonggwan; old regional URLs resolve here. */
export const activeDestinationId: DestinationId = 'geumseonggwan';
export function appDestinationFromSearch(_search: string): DestinationId {
  return activeDestinationId;
}
