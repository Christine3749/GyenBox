import nlp from 'compromise/two';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

export const SYNTAX_PARTS = ['adjectives', 'nouns', 'adverbs', 'verbs', 'conjunctions'] as const;

export type SyntaxPart = typeof SYNTAX_PARTS[number];
export type SyntaxPartState = Record<SyntaxPart, boolean>;

export const DEFAULT_SYNTAX_PARTS: SyntaxPartState = {
  adjectives: true,
  nouns: true,
  adverbs: true,
  verbs: true,
  conjunctions: true,
};

export const SYNTAX_COLORS = {
  dark: {
    adjectives: '#D7A34D',
    nouns: '#EA9473',
    adverbs: '#CB8FBC',
    verbs: '#76A7D0',
    conjunctions: '#8DBB70',
  },
  light: {
    adjectives: '#A86F16',
    nouns: '#C65F42',
    adverbs: '#9B5689',
    verbs: '#397DA8',
    conjunctions: '#5E8B42',
  },
} as const;

export type SyntaxHighlightRange = { from: number; to: number; part: SyntaxPart };

const TAG_PRIORITY: Array<[SyntaxPart, string]> = [
  ['conjunctions', 'Conjunction'],
  ['adverbs', 'Adverb'],
  ['adjectives', 'Adjective'],
  ['verbs', 'Verb'],
  ['nouns', 'Noun'],
];

function blankPreservingLines(value: string) {
  return value.replace(/[^\n]/g, ' ');
}

/**
 * Keep offsets stable while removing content that should never receive prose
 * syntax colors. iA treats Syntax Highlight as an editor lens: Markdown
 * punctuation, URLs, inline code and fenced code remain neutral.
 */
export function maskNonProse(source: string) {
  return source
    .replace(/^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/, blankPreservingLines)
    .replace(/```[\s\S]*?(?:```|$)/g, blankPreservingLines)
    .replace(/~~~[\s\S]*?(?:~~~|$)/g, blankPreservingLines)
    .replace(/`[^`\n]*`/g, blankPreservingLines)
    .replace(/https?:\/\/[^\s)\]]+/g, blankPreservingLines)
    .replace(/<[^>\n]+>/g, blankPreservingLines)
    .replace(/[\[\]()*_~=#>]/g, ' ');
}

export function findSyntaxHighlights(
  source: string,
  enabled: SyntaxPartState = DEFAULT_SYNTAX_PARTS,
): SyntaxHighlightRange[] {
  if (!source.trim()) return [];

  const masked = maskNonProse(source);
  const sentences = nlp(masked).json({ offset: true }) as Array<{
    terms?: Array<{
      tags?: string[];
      offset?: { start?: number; length?: number };
    }>;
  }>;
  const ranges: SyntaxHighlightRange[] = [];

  for (const sentence of sentences) {
    for (const term of sentence.terms ?? []) {
      const tags = new Set(term.tags ?? []);
      // Pronouns are a separate grammatical class in iA's five-color lens.
      if (tags.has('Pronoun')) continue;
      const match = TAG_PRIORITY.find(([part, tag]) => enabled[part] && tags.has(tag));
      const start = term.offset?.start;
      const length = term.offset?.length;
      if (!match || start == null || !length) continue;
      // The bundled tagger is English. Never paint an unsupported script as
      // one giant noun; Latin words inside a multilingual document still work.
      if (!/[A-Za-z]/.test(source.slice(start, start + length))) continue;
      ranges.push({ from: start, to: start + length, part: match[0] });
    }
  }

  return ranges.sort((a, b) => a.from - b.from || a.to - b.to);
}

const marks: Record<SyntaxPart, Decoration> = {
  adjectives: Decoration.mark({ class: 'cm-syntax-adjective' }),
  nouns: Decoration.mark({ class: 'cm-syntax-noun' }),
  adverbs: Decoration.mark({ class: 'cm-syntax-adverb' }),
  verbs: Decoration.mark({ class: 'cm-syntax-verb' }),
  conjunctions: Decoration.mark({ class: 'cm-syntax-conjunction' }),
};

function mergeVisibleLines(view: EditorView) {
  const ranges: Array<{ from: number; to: number }> = [];
  for (const visible of view.visibleRanges) {
    const from = view.state.doc.lineAt(visible.from).from;
    const to = view.state.doc.lineAt(visible.to).to;
    const previous = ranges.at(-1);
    if (previous && from <= previous.to + 1) previous.to = Math.max(previous.to, to);
    else ranges.push({ from, to });
  }
  return ranges;
}

export function syntaxHighlightExt(enabled: SyntaxPartState) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
    }

    build(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      // Mask once against the complete document so a long fenced code block
      // remains neutral even when its opening fence is above the viewport.
      const prose = maskNonProse(view.state.doc.toString());
      for (const visible of mergeVisibleLines(view)) {
        const source = prose.slice(visible.from, visible.to);
        for (const range of findSyntaxHighlights(source, enabled)) {
          builder.add(visible.from + range.from, visible.from + range.to, marks[range.part]);
        }
      }
      return builder.finish();
    }
  }, { decorations: value => value.decorations });
}
