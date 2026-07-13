/** Nested help views inside the settings Help modal. */
export type HelpView =
  | 'hub'
  | 'elemental-scores'
  | 'creation-theory'
  | 'borrowing-neighbors'
  | 'elevator-system';

export function helpDialogTitle(view: HelpView): string {
  switch (view) {
    case 'elemental-scores':
      return 'Elemental Scores';
    case 'creation-theory':
      return 'Creation Theory';
    case 'borrowing-neighbors':
      return 'Borrowing from the Neighbors';
    case 'elevator-system':
      return 'Elevator System';
    default:
      return 'Help';
  }
}
