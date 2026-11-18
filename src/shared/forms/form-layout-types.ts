/**
 * Minimal grid placement contract for headless form layout.
 * Host apps extend this (e.g. forms-builder FormComponent).
 */
export interface IFormGridField {
  fieldKey: string;
  row?: number;
  col?: number;
  span?: number;
  rowSpan?: number;
  hAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  /** Label above control (vertical) or beside control (horizontal). */
  labelLayout?: 'vertical' | 'horizontal';
}

export type FormGridHorizontalAlign = NonNullable<IFormGridField['hAlign']>;
export type FormGridVerticalAlign = NonNullable<IFormGridField['vAlign']>;

export interface FormGridFieldSlotProps<TField extends IFormGridField = IFormGridField> {
  field: TField;
  rowIndex: number;
  columnIndex: number;
  columns: number;
  spanClass: string;
  /** Flex alignment classes for the cell wrapper (host may ignore and use `align`). */
  cellAlignClasses: string;
  align: {
    horizontal: FormGridHorizontalAlign;
    vertical: FormGridVerticalAlign;
  };
}
