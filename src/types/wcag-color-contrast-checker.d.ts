declare module "wcag-color-contrast-checker" {
  export type RGBColor = {
    r: number;
    g: number;
    b: number;
  };
  export function checkContrast(c1: RGBColor, c2: RGBColor): boolean;
}
