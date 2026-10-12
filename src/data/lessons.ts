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
  on: 'firstCatch' | 'firstDeploy' | 'firstLure' | 'firstBoat' | 'firstSlick';
  title: string;
  text: string;
}

export const LESSONS: Lesson[] = [
  {
    on: 'firstCatch', title: 'Into the live well',
    text: 'Every fish is a choice: sell it, or deploy it in the light water beside the road. A pufferfish paralyses and poisons whatever snatches it (a gull dies of it, and its flock lands round it to steal it). An electric ray shocks walkers on the wet road at the water\'s edge, and gulls sitting on the water, never one in the air. Click the fish in your live well.',
  },
  {
    on: 'firstDeploy', title: 'A fish on guard',
    text: 'Thieves walk the road to the smokehouse, take crates and slip away into the woods. Raccoons and bears claw at a fish right beside the road, so keep rays a tile back. Fish heal only a little between waves. Now press L and cast a worm on the road a tile or two short of your ray, on the side the thieves come from.',
  },
  {
    on: 'firstLure', title: 'Bait moves trouble',
    text: 'Raccoons near the worm leave the road and eat it one at a time. The rest wait in line behind it and wade out for any fish within 2 tiles: in lure mode the road shows where the line will stand, red for the fish it reaches, gold for the rays that reach the eater. A gull swallows a worm whole, bears ignore it, and it spoils when the wave ends.',
  },
  {
    on: 'firstBoat', title: 'A line you don\'t hold',
    text: 'Pick the boat (click it, or its row at the bottom left), press Send and click the water it should fish. It goes there by water, fishes, and brings the catch to your live well; with the well full it waits at the dock. Set a kind to Sell and that kind goes to market as it lands. It loads worms from your can, leaving you three, and buys the rest at the bait shop.',
  },
  {
    on: 'firstSlick', title: 'Chum moves the big ones',
    text: 'Gulls drop onto the water round a slick and fight over it; bears leave the road and wade out to it. Either way they are on the water, where a ray reaches them. A raccoon finds one a tile from the road, never two. Gulls eat a slick fast, so one for the bears goes down once the flocks are through.',
  },
];

/** What the status line says before the player has done anything. */
export const FIRST_HINT = 'Deploy the ray caught at dawn, or sell it toward the surf rod or a rowboat (B). Hover the water to see what bites; click to cast.';
