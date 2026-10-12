// The title screen's two lines and the slice's three lesson cards (ROADMAP.md Milestone 1),
// each shown once, the first time its event happens. Words only: no numbers live here.

export const TITLE = {
  name: 'TROTLINE',
  lines: [
    'You don\'t buy towers here. You catch them.',
    'Fish from the dock, then sell each catch or put it in the water to guard the smokehouse.',
  ],
};

export interface Lesson {
  /** the sim event that shows it */
  on: 'firstCatch' | 'firstDeploy' | 'firstLure';
  title: string;
  text: string;
}

export const LESSONS: Lesson[] = [
  {
    on: 'firstCatch', title: 'Into the live well',
    text: 'Every fish is a choice. Sell it for money, or deploy it in the light water beside the road to fight. Pufferfish burst when a thief comes close; eels zap anything within 3 tiles. Click the fish in your live well.',
  },
  {
    on: 'firstDeploy', title: 'A fish on guard',
    text: 'Thieves walk the road to the smokehouse and carry off crates. Fish do the most where the road bends past them. Now press L and cast a worm onto the road beside your fish: raccoons leave the road to eat it.',
  },
  {
    on: 'firstLure', title: 'Bait moves trouble',
    text: 'Raccoons and bears within 4 tiles go for the worm and eat one at a time while the rest wait their turn. Every worm on the road is a cast you didn\'t make, so drop it where your fish can reach.',
  },
];

/** What the status line says before the player has done anything. */
export const FIRST_HINT = 'Click the water near the dock to cast. Thieves come when the timer runs out.';
