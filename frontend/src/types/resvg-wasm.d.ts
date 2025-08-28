declare module '@resvg/resvg-wasm' {
  export function initWasm(input: Response | Promise<Response> | ArrayBuffer | Promise<ArrayBuffer>): Promise<void>;
  export class Resvg {
    constructor(svg: string, opts?: any);
    render(): { asPng(): Uint8Array } | { asPng?: undefined } & Uint8Array;
  }
}
