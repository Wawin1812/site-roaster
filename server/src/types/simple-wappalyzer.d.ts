// simple-wappalyzer has no published TypeScript types; this ambient
// declaration covers only the surface area this project actually uses.
declare module 'simple-wappalyzer' {
  export interface WappalyzerCategory {
    id?: number;
    name: string;
  }

  export interface WappalyzerApplication {
    name: string;
    slug: string;
    categories?: WappalyzerCategory[];
    version?: string | null;
    confidence: number;
    website?: string;
  }

  export interface WappalyzerInput {
    url: string;
    html: string;
    statusCode: number;
    headers: Record<string, string>;
  }

  export default function wappalyzer(
    input: WappalyzerInput
  ): Promise<WappalyzerApplication[]>;
}
