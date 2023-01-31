export type GoogleSheetResponse<T> = {
  range: string;
  majorDimension: "COLUMNS" | "ROWS";
  values: Array<T[]>;
};
