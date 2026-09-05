/** Nested help views inside the settings Help modal. */
export type HelpView =
  | 'hub'
  | 'elemental-scores'
  | 'creation-theory'
  | 'elevator-system'
  | 'applied-movemental'
  | 'borrowing-neighbors';

export function helpDialogTitle(view: HelpView): string {
  switch (view) {
    case 'elemental-scores':
      return 'Elemental Scores';
    case 'creation-theory':
      return 'Creation Theory';
    case 'elevator-system':
      return 'The Elevator System';
    case 'applied-movemental':
      return 'Applied to Movemental';
    case 'borrowing-neighbors':
      return 'Borrowing from the Neighbors';
    default:
      return 'Help';
  }
}

