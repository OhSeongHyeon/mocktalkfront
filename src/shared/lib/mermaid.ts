let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
const SUPPORTED_MERMAID_DIAGRAM_TYPES = new Set(['graph', 'flowchart', 'sequencediagram', 'erdiagram']);

const detectMermaidDiagramType = (source: string) => {
  const lines = source.split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) {
      continue;
    }

    const lowered = trimmed.toLowerCase();
    if (lowered === 'graph' || lowered.startsWith('graph ')) {
      return 'graph';
    }
    if (lowered === 'flowchart' || lowered.startsWith('flowchart ')) {
      return 'flowchart';
    }
    if (lowered.startsWith('sequencediagram')) {
      return 'sequencediagram';
    }
    if (lowered.startsWith('erdiagram')) {
      return 'erdiagram';
    }

    return lowered.split(/\s+/u, 1)[0] ?? null;
  }

  return null;
};

const isSupportedMermaidDiagramType = (diagramType: string | null) => diagramType !== null && SUPPORTED_MERMAID_DIAGRAM_TYPES.has(diagramType);

const createFallbackPanel = (titleText: string, source: string, className: string) => {
  const fallbackPanel = document.createElement('div');
  fallbackPanel.className = className;

  const title = document.createElement('p');
  title.textContent = titleText;

  const sourcePre = document.createElement('pre');
  sourcePre.textContent = source;

  fallbackPanel.append(title, sourcePre);
  return fallbackPanel;
};

const loadMermaid = async () => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => module.default);
  }
  const mermaid = await mermaidPromise;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: "'Space Grotesk', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  });
  return mermaid;
};

const renderMermaidDiagrams = async (root: HTMLElement | null) => {
  if (!root || typeof window === 'undefined') {
    return;
  }

  const mermaidBlocks = Array.from(
    root.querySelectorAll('pre > code.language-mermaid, pre > code.lang-mermaid, pre > code[data-language="mermaid"]'),
  );

  if (mermaidBlocks.length === 0) {
    return;
  }

  const supportedBlocks: Array<{ block: HTMLElement; pre: HTMLElement; source: string }> = [];

  for (const block of mermaidBlocks) {
    if (!(block instanceof HTMLElement)) {
      continue;
    }
    const source = block.textContent?.trim();
    if (!source) {
      continue;
    }
    const pre = block.parentElement;
    if (!(pre instanceof HTMLElement)) {
      continue;
    }

    const diagramType = detectMermaidDiagramType(source);
    if (!isSupportedMermaidDiagramType(diagramType)) {
      const typeLabel = diagramType ?? '알 수 없는 타입';
      pre.replaceWith(
        createFallbackPanel(
          `현재 지원하지 않는 Mermaid 다이어그램(${typeLabel})입니다. 원본 코드를 그대로 표시합니다.`,
          source,
          'ui-mermaid-unsupported',
        ),
      );
      continue;
    }

    supportedBlocks.push({ block, pre, source });
  }

  if (supportedBlocks.length === 0) {
    return;
  }

  const mermaid = await loadMermaid();
  let renderIndex = 0;

  for (const { pre, source } of supportedBlocks) {
    const renderHost = document.createElement('div');
    renderHost.className = 'ui-mermaid-block';
    renderHost.dataset.mermaidSource = source;

    try {
      const renderId = `mocktalk-mermaid-${Date.now()}-${renderIndex++}`;
      const { svg, bindFunctions } = await mermaid.render(renderId, source);
      renderHost.innerHTML = svg;
      bindFunctions?.(renderHost);
      pre.replaceWith(renderHost);
    } catch {
      pre.replaceWith(createFallbackPanel('Mermaid 렌더링에 실패했습니다.', source, 'ui-mermaid-error'));
    }
  }
};

export { SUPPORTED_MERMAID_DIAGRAM_TYPES, detectMermaidDiagramType, isSupportedMermaidDiagramType, renderMermaidDiagrams };
