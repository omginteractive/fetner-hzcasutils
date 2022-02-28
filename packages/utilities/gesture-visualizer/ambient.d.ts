import {ScaleLinear} from 'd3-scale';

declare module 'd3-scale-chromatic' {
  export const schemeTableau10: string[];
}

declare module '@vx/scale' {
  export interface ScaleType extends ScaleLinear<number, number> {
    range(): [number, number];
    range(range: ReadonlyArray<number>): this;
    domain(): [any, any]; // eslint-disable-line @typescript-eslint/no-explicit-any
    domain(domain: Array<number | {valueOf(): number}>): this;
  }
}
