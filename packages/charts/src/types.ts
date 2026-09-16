/**
 * The charts package defines its own minimal data shape rather than importing
 * domain types. That keeps it genuinely reusable — it charts labelled numbers,
 * and knows nothing about GitHub. Mapping happens at the app layer.
 */
export interface ChartDatum {
  label: string;
  value: number;
}
