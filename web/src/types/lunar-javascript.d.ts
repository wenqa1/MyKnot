declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getFestivals(): string[];
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    getMonth(): number;
    getDay(): number;
    getFestivals(): string[];
  }
}
