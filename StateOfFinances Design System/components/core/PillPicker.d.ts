/**
 * Horizontal scrollable pill row for time range selection.
 */
export interface PillPickerProps {
  /** Default: ['Daily','Weekly','Monthly','Yearly'] */
  options?: string[];
  defaultActive?: string;
  onChange?: (value: string) => void;
}
