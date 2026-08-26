import type { TechNode } from '../state/types';

// Seed tech tree. This is where your "fully completable, path-dependent"
// tree will grow. Prereqs form the graph; unlocks apply effects on completion.
export function initialTech(): TechNode[] {
  return [
    {
      id: 'intro-courses',
      name: 'Introductory Courses',
      description: 'Baseline curriculum. Modest capacity bump.',
      cost: 100,
      prereqs: [],
      status: 'available',
      progress: 0,
      unlocks: { capacityBonus: 100 },
    },
    {
      id: 'first-major',
      name: 'First Degree Major',
      description: 'Establish a full major. Raises reputation.',
      cost: 250,
      prereqs: ['intro-courses'],
      status: 'locked',
      progress: 0,
      unlocks: { reputationBonus: 5, tuitionBonus: 1000 },
    },
    {
      id: 'research-lab',
      name: 'Research Laboratory',
      description: 'Enables serious research output.',
      cost: 400,
      prereqs: ['first-major'],
      status: 'locked',
      progress: 0,
      unlocks: { reputationBonus: 8, researchRateBonus: 0.2 },
    },
    {
      id: 'grad-school',
      name: 'Graduate School',
      description: 'Postgraduate programs. Big reputation, big cost.',
      cost: 700,
      prereqs: ['research-lab'],
      status: 'locked',
      progress: 0,
      unlocks: { reputationBonus: 15, tuitionBonus: 3000 },
    },
  ];
}
