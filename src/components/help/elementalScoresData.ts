/** Elemental score sheet metadata served from public/elemental-scores. */
export interface ElementalScore {
  title: string;
  filename: string;
}

export const ELEMENTAL_SCORES: ElementalScore[] = [
  { title: 'Blues', filename: 'blues.jpg' },
  { title: 'How High the Moon', filename: 'how_high_the_moon.jpg' },
  { title: 'Out of Nowhere', filename: 'out_of_nowhere.jpg' },
  { title: 'Severance Theme', filename: 'severance_theme.png' },
  { title: 'The Girl from Ipanema', filename: 'the_girl_from_ipanema.jpg' },
];

export function elementalScoreUrl(filename: string): string {
  return `${import.meta.env.BASE_URL}elemental-scores/${filename}`;
}
