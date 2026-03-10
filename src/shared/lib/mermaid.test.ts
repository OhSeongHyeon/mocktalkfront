import { describe, expect, it } from 'vitest';

import { detectMermaidDiagramType, isSupportedMermaidDiagramType } from './mermaid';

describe('shared/lib/mermaid', () => {
  it('지원하는 Mermaid 타입을 식별한다', () => {
    // given
    const flowchart = 'graph TD\nA --> B';
    const sequence = 'sequenceDiagram\nAlice->>Bob: hello';
    const erd = 'erDiagram\nUSER ||--o{ POST : writes';

    // when
    const flowchartType = detectMermaidDiagramType(flowchart);
    const sequenceType = detectMermaidDiagramType(sequence);
    const erdType = detectMermaidDiagramType(erd);

    // then
    expect(flowchartType).toBe('graph');
    expect(sequenceType).toBe('sequencediagram');
    expect(erdType).toBe('erdiagram');
    expect(isSupportedMermaidDiagramType(flowchartType)).toBe(true);
    expect(isSupportedMermaidDiagramType(sequenceType)).toBe(true);
    expect(isSupportedMermaidDiagramType(erdType)).toBe(true);
  });

  it('지원하지 않는 Mermaid 타입을 fallback 대상으로 분류한다', () => {
    // given
    const unsupported = 'mindmap\nroot((MockTalk))';

    // when
    const diagramType = detectMermaidDiagramType(unsupported);

    // then
    expect(diagramType).toBe('mindmap');
    expect(isSupportedMermaidDiagramType(diagramType)).toBe(false);
  });

  it('주석과 init 블록 다음의 실제 타입을 찾는다', () => {
    // given
    const source = '%%{init: { "theme": "neutral" }}%%\n%% comment\nflowchart LR\nA --> B';

    // when
    const diagramType = detectMermaidDiagramType(source);

    // then
    expect(diagramType).toBe('flowchart');
    expect(isSupportedMermaidDiagramType(diagramType)).toBe(true);
  });
});
