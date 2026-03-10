declare module 'turndown' {
  interface TurndownOptions {
    codeBlockStyle?: string;
    emDelimiter?: string;
    headingStyle?: string;
    bulletListMarker?: string;
  }

  class TurndownService {
    constructor(options?: TurndownOptions);
    use(plugin: unknown): void;
    turndown(input: string): string;
  }

  export default TurndownService;
}

declare module 'turndown-plugin-gfm' {
  const gfm: unknown;

  export { gfm };
}
