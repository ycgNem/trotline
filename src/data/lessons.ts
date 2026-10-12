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
    text: 'Every fish is a choice: sell it, or deploy it in the light water beside the road. A pufferfish paralyses and poisons whatever snatches it (a gull dies of it). An electric ray shocks walkers near the road, never a gull in the air. Click the fish in your live well.',
  },
  {
    on: 'firstDeploy', title: 'A fish on guard',
    text: 'Thieves walk the road to the smokehouse, take crates and slip away into the woods. Raccoons and bears claw at a fish right beside the road, so keep rays a tile back. Fish heal only a little between waves. Now press L and cast a worm onto the road beside your fish.',
  },
  {
    on: 'firstLure', title: 'Bait moves trouble',
    text: 'Raccoons near the worm leave the road and eat one at a time while the rest wait in line, wading out for your fish. A gull swallows a worm whole, bears ignore it, and a worm spoils when the wave ends: cast it where your rays reach, when the raccoons are coming.',
  },
];

/** What the status line says before the player has done anything. */
export const FIRST_HINT = 'A ray caught at dawn waits in your live well. Hover the water to see what bites, click to cast. Thieves come when the timer runs out.';
