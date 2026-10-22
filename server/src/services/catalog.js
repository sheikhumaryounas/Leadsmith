// The kinds of job a fabricator quotes for: what we need to know before pricing,
// and what similar jobs usually come to. Prices are in pence, per unit where `perUnit`.
const finish = ['Finish', "Whether you'd like it galvanised, powder coated, or both"];
const supply = ['Supply or fit', "If you'd like us to fit it, or supply only"];

export const JOB_TYPES = [
  {
    type: 'side_gate',
    match: /side gate|garden gate|single gate|pedestrian gate|path gate/i,
    label: 'Side gate',
    need: [['Opening width', 'The width of the opening'], ['Height', 'The height you would like'], finish, supply],
    estimate: 78000, range: [70000, 90000], effort: '1 day + half-day fit', fit: 'Small, quick job',
  },
  {
    type: 'gates',
    match: /drive(way)?\s*gates?|double gates?|pair of gates|\bgates\b/i,
    label: 'Driveway gates',
    need: [['Opening width', 'The width of the opening between your posts or pillars'], ['Height', 'The height you would like'], finish, supply],
    estimate: 295000, range: [270000, 330000], effort: 'About 3 days + half-day fit', fit: 'A style we make often',
  },
  {
    type: 'juliet',
    match: /juliet/i,
    label: 'Juliet balcony',
    need: [['Width', 'The width of each opening'], ['Height', 'The height from the floor'], finish, supply],
    estimate: 107000, range: [95000, 120000], perUnit: true, effort: '1 day each + half-day fit', fit: 'A style we make often',
  },
  {
    type: 'spiral',
    match: /spiral/i,
    label: 'Spiral staircase',
    need: [['Rise', 'The height from the ground to the floor it reaches'], ['Diameter', 'How much space you have, side to side'], ['Treads', 'Chequer plate, perforated or another tread']],
    estimate: 695000, range: [620000, 760000], effort: '7 days + 1 day fit', fit: 'Large, high-value job',
  },
  {
    type: 'balustrade',
    match: /balustrade|banister|stair(case)?\s*rail/i,
    label: 'Staircase balustrade',
    need: [['Number of steps', 'How many steps the staircase has'], ['Infill', 'Whether you prefer glass panels or metal bars'], ['Landing run', 'The length of the landing edge at the top']],
    estimate: 240000, range: [210000, 280000], effort: 'About 3 days + 1 day fit', fit: 'Indoor job, needs a site visit',
  },
  {
    type: 'balcony',
    match: /balcony/i,
    label: 'Balcony railing',
    need: [['Length', 'The length of the balcony edge'], ['Height', 'The height you would like'], finish],
    estimate: 238000, range: [210000, 260000], effort: '2 days + 1 day fit', fit: 'Standard job',
  },
  {
    type: 'railings',
    match: /railing/i,
    label: 'Railings',
    need: [['Length', 'The total length of the run'], ['Height', 'The height you would like'], finish, ['Top style', 'Spear tops, ball tops or a flat rail']],
    estimate: 360000, range: [320000, 410000], effort: '4 days + 1 day fit', fit: 'Good-value job',
  },
  {
    type: 'grilles',
    match: /grille|window bars|security bars/i,
    label: 'Window security grilles',
    need: [['Sizes', 'The width and height of each window'], finish],
    estimate: 58000, range: [52000, 66000], perUnit: true, effort: 'Half a day each + fit', fit: 'A style we make often',
  },
  {
    type: 'handrail',
    match: /hand ?rail/i,
    label: 'Handrail',
    need: [['Run length', 'The length of each run'], finish, ['Fixing', 'What it fixes to: wall, steps or ground']],
    estimate: 132000, range: [110000, 160000], effort: '2 days + 1 day fit', fit: 'Standard job',
  },
];

export const CUSTOM = {
  type: 'custom',
  label: 'Custom metalwork',
  need: [['Overall size', 'The overall width and height you need'], finish, supply],
  estimate: 145000, range: [125000, 170000], effort: 'About 2 days + fit', fit: 'Needs details to confirm',
};

export function jobTypeFor(text) {
  return JOB_TYPES.find((t) => t.match.test(text)) || CUSTOM;
}
