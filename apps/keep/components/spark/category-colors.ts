import type { NoteColorId } from './types';

type ColorRule = { color: NoteColorId; terms: string[] };

// Synced clipboard entries arrive without a category and historically all used
// database blue.  Keep derives a stable presentation colour from the note's
// category instead of flattening the entire board into one colour.
const CATEGORY_RULES: ColorRule[] = [
  { color: 'slate', terms: ['工作', '项目', '客户', '合同', '代码', '开发', 'work', 'project', 'client', 'code'] },
  { color: 'sage', terms: ['生活', '家庭', '朋友', '生活', 'personal', 'home', 'family'] },
  { color: 'apricot', terms: ['购物', '收据', '订单', '购买', 'shopping', 'receipt', 'order'] },
  { color: 'lavender', terms: ['灵感', '创意', '阅读', '学习', '书', 'idea', 'reading', 'study'] },
  { color: 'mint', terms: ['财务', '账单', '报销', '付款', 'finance', 'budget', 'invoice', 'payment'] },
  { color: 'amber', terms: ['会议', '待办', '提醒', '计划', 'meeting', 'todo', 'reminder', 'plan'] },
  { color: 'sage', terms: ['健康', '健身', '医疗', 'health', 'fitness', 'medical'] },
  { color: 'apricot', terms: ['旅行', '机票', '酒店', 'travel', 'flight', 'hotel'] },
];

const FALLBACKS: NoteColorId[] = ['sage', 'apricot', 'amber', 'lavender', 'mint', 'sand', 'rose', 'blush', 'slate'];

function stableIndex(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash % FALLBACKS.length;
}

export function colorForCategory(input: { id: string; title?: string; content?: string; labels?: string[] }): NoteColorId {
  const corpus = [input.title, input.content, ...(input.labels ?? [])].filter(Boolean).join(' ').toLowerCase();
  const match = CATEGORY_RULES.find((rule) => rule.terms.some((term) => corpus.includes(term)));
  return match?.color ?? FALLBACKS[stableIndex(`${input.id}:${corpus.slice(0, 80)}`)];
}
