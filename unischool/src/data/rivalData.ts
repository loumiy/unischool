import type { Rival } from '../state/types';

// Fictionalized rival schools. Reputation is the ranking metric; momentum
// is the hidden trend that keeps the leaderboard alive over decades.
export function initialRivals(): Rival[] {
  return [
    { id: 'r1', name: 'Ashcombe University', reputation: 92, momentum: 0.2 },
    { id: 'r2', name: 'Northgate Institute', reputation: 85, momentum: 0.5 },
    { id: 'r3', name: 'Vale State', reputation: 71, momentum: -0.3 },
    { id: 'r4', name: 'Bellhaven College', reputation: 58, momentum: 0.8 },
    { id: 'r5', name: 'Portland Tech', reputation: 45, momentum: 1.1 },
  ];
}
