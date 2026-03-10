type TurndownLikeService = {
  turndown(input: string): string;
};

let turndownServicePromise: Promise<TurndownLikeService> | null = null;

const loadTurndownService = async () => {
  if (!turndownServicePromise) {
    turndownServicePromise = Promise.all([import('turndown'), import('turndown-plugin-gfm')]).then(([turndownModule, pluginModule]) => {
      const TurndownService = turndownModule.default;
      const turndownService = new TurndownService({
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
        headingStyle: 'atx',
        bulletListMarker: '-',
      });

      turndownService.use(pluginModule.gfm);
      return turndownService;
    });
  }

  return turndownServicePromise;
};

const convertHtmlToMarkdown = async (htmlSource: string) => {
  if (!htmlSource.trim()) {
    return '';
  }
  const turndownService = await loadTurndownService();
  return turndownService.turndown(htmlSource).trim();
};

export { convertHtmlToMarkdown };
