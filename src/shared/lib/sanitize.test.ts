import { describe, expect, it } from 'vitest';

import { sanitizeHtml } from './sanitize';

describe('shared/lib/sanitize', () => {
  it('에디터 이미지의 크기 및 데이터 속성을 유지한다', () => {
    // given
    const html = `
      <figure data-type="editor-image" data-align="center" data-original-width="1280" data-original-height="720">
        <img
          src="/uploads/editor/image.png"
          alt="샘플"
          data-align="center"
          data-width="640px"
          data-height="360px"
          data-caption="샘플 캡션"
          data-original-width="1280"
          data-original-height="720"
          width="640"
          height="360"
          style="width: 640px; height: 360px;"
        />
        <figcaption>샘플 캡션</figcaption>
      </figure>
    `;

    // when
    const sanitized = sanitizeHtml(html);
    const container = document.createElement('div');
    container.innerHTML = sanitized;
    const figure = container.querySelector('figure[data-type="editor-image"]');
    const image = figure?.querySelector('img');

    // then
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute('data-align')).toBe('center');
    expect(figure?.getAttribute('data-original-width')).toBe('1280');
    expect(figure?.getAttribute('data-original-height')).toBe('720');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('data-width')).toBe('640px');
    expect(image?.getAttribute('data-height')).toBe('360px');
    expect(image?.getAttribute('width')).toBe('640');
    expect(image?.getAttribute('height')).toBe('360');
    expect(image?.getAttribute('style')).toContain('width: 640px');
    expect(image?.getAttribute('style')).toContain('height: 360px');
  });

  it('허용되지 않은 style 속성은 제거하고 안전한 속성만 유지한다', () => {
    // given
    const html = `
      <p style="text-align: center; position: fixed; top: 0;">정렬 문단</p>
      <span style="color: #1f2937; font-size: 16px; background-image: url(javascript:alert(1));">텍스트</span>
      <img src="/uploads/editor/image.png" style="width: 640px; height: 360px; position: absolute;" />
    `;

    // when
    const sanitized = sanitizeHtml(html);
    const container = document.createElement('div');
    container.innerHTML = sanitized;
    const paragraph = container.querySelector('p');
    const span = container.querySelector('span');
    const image = container.querySelector('img');

    // then
    expect(paragraph?.getAttribute('style')).toBe('text-align: center');
    expect(span?.getAttribute('style')).toBe('color: rgb(31, 41, 55); font-size: 16px');
    expect(image?.getAttribute('style')).toBe('width: 640px; height: 360px');
  });

  it('테이블 관련 태그를 유지한다', () => {
    // given
    const html = `
      <table>
        <thead>
          <tr>
            <th>항목</th>
            <th>값</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>예시</td>
            <td>내용</td>
          </tr>
        </tbody>
      </table>
    `;

    // when
    const sanitized = sanitizeHtml(html);
    const container = document.createElement('div');
    container.innerHTML = sanitized;

    // then
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('thead')).not.toBeNull();
    expect(container.querySelector('tbody')).not.toBeNull();
    expect(container.querySelector('th')?.textContent).toBe('항목');
    expect(container.querySelector('td')?.textContent).toBe('예시');
  });
});
