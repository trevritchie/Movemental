/** Nested help views inside the settings Help modal. */
export type HelpView =
  | 'hub'
  | 'creation-theory'
  | 'borrowing-neighbors'
  | 'elevator-system';

export function helpDialogTitle(view: HelpView): string {
  switch (view) {
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
