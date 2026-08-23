import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SYNTAX_PARTS,
  findSyntaxHighlights,
  maskNonProse,
} from './core/hooks/iwriterSyntaxHighlight';

const ARTICLE = 'The quiet editor carefully reveals repeated nouns, but strong verbs move every sentence forward.';

describe('iWriter syntax highlight', () => {
  it('finds all five iA Writer parts of speech in natural prose', () => {
    const parts = new Set(findSyntaxHighlights(ARTICLE).map(range => range.part));
    expect(parts).toEqual(new Set(['adjectives', 'nouns', 'adverbs', 'verbs', 'conjunctions']));
  });

  it('keeps Markdown code and URLs neutral', () => {
    const source = `${ARTICLE}\n\n\`quiet editor moves\`\n\n\`\`\`js\nconst vividFox = quicklyRun();\n\`\`\`\nhttps://example.com/bright-code`;
    const codeStart = source.indexOf('`quiet');
    const highlights = findSyntaxHighlights(source, DEFAULT_SYNTAX_PARTS);
    expect(highlights.some(range => range.from >= codeStart)).toBe(false);
    expect(maskNonProse(source)).toHaveLength(source.length);
  });

  it('respects individual part-of-speech switches', () => {
    const highlights = findSyntaxHighlights(ARTICLE, {
      ...DEFAULT_SYNTAX_PARTS,
      nouns: false,
      verbs: false,
    });
    expect(highlights.some(range => range.part === 'nouns')).toBe(false);
    expect(highlights.some(range => range.part === 'verbs')).toBe(false);
  });

  it('does not mislabel unsupported CJK prose as a noun', () => {
    expect(findSyntaxHighlights('这是一个安静的中文写作测试。')).toEqual([]);
  });
});
