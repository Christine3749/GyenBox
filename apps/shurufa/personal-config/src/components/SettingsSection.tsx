import React, { useState } from 'react';
import { GYConfig, QuickPhrase, ThemeType } from '../types';
import { CandidatePreview } from './CandidatePreview';
import {
  Palette,
  Sliders,
  Type,
  Zap,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Shield,
  Search,
} from 'lucide-react';

interface SettingsSectionProps {
  config: GYConfig;
  onUpdateConfig: (updated: Partial<GYConfig>) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'behavior' | 'candidate' | 'phrases' | 'privacy'>('appearance');

  // Quick phrase editor state
  const [phrases, setPhrases] = useState<QuickPhrase[]>(config.quickPhrases || []);
  const [searchPhrase, setSearchPhrase] = useState('');
  const [newShortcut, setNewShortcut] = useState('');
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Appearance handlers
  const handleAppearanceChange = <K extends keyof GYConfig['appearance']>(
    key: K,
    value: GYConfig['appearance'][K]
  ) => {
    onUpdateConfig({
      appearance: {
        ...config.appearance,
        [key]: value,
      },
    });
  };

  // Behavior handlers
  const handleBehaviorChange = <K extends keyof GYConfig['behavior']>(
    key: K,
    value: GYConfig['behavior'][K]
  ) => {
    onUpdateConfig({
      behavior: {
        ...config.behavior,
        [key]: value,
      },
    });
  };

  // Candidate handlers
  const handleCandidateChange = <K extends keyof GYConfig['candidate']>(
    key: K,
    value: GYConfig['candidate'][K]
  ) => {
    onUpdateConfig({
      candidate: {
        ...config.candidate,
        [key]: value,
      },
    });
  };

  // Privacy handlers
  const handlePrivacyChange = <K extends keyof GYConfig['privacy']>(
    key: K,
    value: GYConfig['privacy'][K]
  ) => {
    onUpdateConfig({
      privacy: {
        ...config.privacy,
        [key]: value,
      },
    });
  };

  // Quick Phrase Add
  const handleAddPhrase = () => {
    if (!newShortcut.trim() || !newText.trim()) {
      onShowToast('请填写入快捷简码和转换出的短语内容', 'error');
      return;
    }
    const item: QuickPhrase = {
      id: `qp-${Date.now()}`,
      shortcut: newShortcut.trim().toLowerCase(),
      text: newText.trim(),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    const updated = [item, ...phrases];
    setPhrases(updated);
    onUpdateConfig({ quickPhrases: updated });
    setNewShortcut('');
    setNewText('');
    onShowToast(`已添加快捷短语「${item.shortcut}」`, 'success');
  };

  // Quick Phrase Delete
  const handleDeletePhrase = (id: string) => {
    const updated = phrases.filter((p) => p.id !== id);
    setPhrases(updated);
    onUpdateConfig({ quickPhrases: updated });
    onShowToast('快捷短语已删除', 'info');
  };

  const filteredPhrases = phrases.filter(
    (p) =>
      p.shortcut.toLowerCase().includes(searchPhrase.toLowerCase()) ||
      p.text.toLowerCase().includes(searchPhrase.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Settings Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-[#18181b] text-white border border-[#27272a]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181b]'
          }`}
        >
          <Palette className="w-4 h-4 text-[#3b82f6]" />
          外观主题
        </button>

        <button
          onClick={() => setActiveTab('behavior')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'behavior'
              ? 'bg-[#18181b] text-white border border-[#27272a]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181b]'
          }`}
        >
          <Type className="w-4 h-4 text-[#3b82f6]" />
          输入行为
        </button>

        <button
          onClick={() => setActiveTab('candidate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'candidate'
              ? 'bg-[#18181b] text-white border border-[#27272a]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181b]'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#3b82f6]" />
          候选框选词
        </button>

        <button
          onClick={() => setActiveTab('phrases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'phrases'
              ? 'bg-[#18181b] text-white border border-[#27272a]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181b]'
          }`}
        >
          <Zap className="w-4 h-4 text-[#3b82f6]" />
          快捷短语 ({phrases.length})
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeTab === 'privacy'
              ? 'bg-[#18181b] text-white border border-[#27272a]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181b]'
          }`}
        >
          <Lock className="w-4 h-4 text-[#3b82f6]" />
          隐私与数据
        </button>
      </div>

      {/* Tab 1: 外观 (Appearance) */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5 bg-[#18181b] rounded-xl border border-[#27272a] p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#3b82f6]" />
              候选框视觉个性化
            </h3>

            {/* Font Family */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#71717a] font-medium">候选框字体</label>
              <select
                value={config.appearance.fontFamily}
                onChange={(e) => handleAppearanceChange('fontFamily', e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="微软雅黑">微软雅黑 (Microsoft YaHei)</option>
                <option value="思源黑体">思源黑体 (Source Han Sans)</option>
                <option value="PingFang SC">苹方 (PingFang SC)</option>
                <option value="system-ui">系统默认无衬线字体 (System UI)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">候选字号 ({config.appearance.fontSize}px)</span>
                <span className="text-[#71717a] font-mono">12px - 24px</span>
              </div>
              <input
                type="range"
                min={12}
                max={24}
                value={config.appearance.fontSize}
                onChange={(e) => handleAppearanceChange('fontSize', Number(e.target.value))}
                className="w-full accent-[#3b82f6] cursor-pointer"
              />
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">候选框视觉主题</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'dark_minimal' as ThemeType, label: '极简深色', desc: '纯粹暗灰底色，深邃清爽' },
                  { id: 'light_minimal' as ThemeType, label: '极简浅色 (Light)', desc: '亮白极简外观，清晰高对比' },
                  { id: 'light_paper' as ThemeType, label: '优雅纸感 (Warm)', desc: '暖浅质感底色，护眼柔和' },
                  { id: 'classic_laosanyang' as ThemeType, label: '经典老三样', desc: '搜狗/微软拼音经典老三样灰框' },
                  { id: 'english_clean' as ThemeType, label: '纯英文模式 (English)', desc: '极简无干涉英文极速体验' },
                  { id: 'acrylic_classic' as ThemeType, label: '经典亚克力', desc: '高斯模糊质感，现代优雅' },
                  { id: 'aurora_blue' as ThemeType, label: '极光蓝色', desc: '品牌深蓝底色，炫彩醒目' },
                  { id: 'slate_dark' as ThemeType, label: '静谧暗灰', desc: '炭黑沉稳风格，极简边框' },
                  { id: 'pure_contrast' as ThemeType, label: '纯净高对比', desc: '黑黄高对比，字迹极其清晰' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleAppearanceChange('theme', t.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      config.appearance.theme === t.id
                        ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-white ring-1 ring-[#3b82f6]'
                        : 'bg-[#09090b] border-[#27272a] text-[#71717a] hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] text-[#71717a] mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Count */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">同屏显示候选词数量</label>
              <select
                value={config.appearance.candidateCount}
                onChange={(e) => handleAppearanceChange('candidateCount', Number(e.target.value))}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                {[3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num}>
                    {num} 个候选词 {num === 5 ? '(推荐经典)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Logo Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#09090b] border border-[#27272a]">
              <div>
                <div className="text-xs font-medium text-slate-200">在候选框右侧显示 GY 品牌标志</div>
                <div className="text-[11px] text-[#71717a]">开启后候选框右上角呈现精致 GY 图标</div>
              </div>
              <input
                type="checkbox"
                checked={config.appearance.showLogo}
                onChange={(e) => handleAppearanceChange('showLogo', e.target.checked)}
                className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <CandidatePreview appearance={config.appearance} />
          </div>
        </div>
      )}

      {/* Tab 2: 输入行为 (Behavior) */}
      {activeTab === 'behavior' && (
        <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-[#3b82f6]" />
            按键与输入逻辑设置
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Scheme */}
            <div className="space-y-1.5 p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <label className="text-xs font-semibold text-slate-200">输入方案与编码规则</label>
              <select
                value={config.behavior.inputScheme || 'quanpin'}
                onChange={(e) => handleBehaviorChange('inputScheme', e.target.value as any)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="quanpin">全拼方案 (标准全拼，拼音全字母输入)</option>
                <option value="laosanyang_classic">老三样经典方案 (搜狗/微软拼音传统老三样)</option>
                <option value="shuangpin_microsoft">微软双拼 (两键拼音高效率按键)</option>
                <option value="wubi">五笔字型 (86版五笔结构编码)</option>
              </select>
              <p className="text-[11px] text-[#71717a]">支持经典“老三样”、微软双拼及五笔方案</p>
            </div>

            {/* Default Language Mode */}
            <div className="space-y-1.5 p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <label className="text-xs font-semibold text-slate-200">默认初始输入模式</label>
              <select
                value={config.behavior.defaultLanguage || 'chinese'}
                onChange={(e) => handleBehaviorChange('defaultLanguage', e.target.value as any)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="chinese">中文拼音模式 (默认)</option>
                <option value="english">纯英文模式 (Direct English Input)</option>
                <option value="traditional">繁体中文输入 (Traditional Chinese)</option>
              </select>
              <p className="text-[11px] text-[#71717a]">选择应用启动或获得焦点时的初始输入语言</p>
            </div>

            {/* Shift key behavior */}
            <div className="space-y-1.5 p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <label className="text-xs font-semibold text-slate-200">Shift 键行为</label>
              <select
                value={config.behavior.shiftSwitch}
                onChange={(e) => handleBehaviorChange('shiftSwitch', e.target.value as any)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="toggle_cn_en">单击切换中 / 英文模式 (标准模式)</option>
                <option value="none">无动作 (禁用 Shift 切换)</option>
                <option value="hold">按住不放输入大写英文</option>
              </select>
              <p className="text-[11px] text-[#71717a]">控制单击左/右 Shift 键时的响应习惯</p>
            </div>

            {/* Tab key behavior */}
            <div className="space-y-1.5 p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <label className="text-xs font-semibold text-slate-200">Tab 键行为</label>
              <select
                value={config.behavior.tabBehavior}
                onChange={(e) => handleBehaviorChange('tabBehavior', e.target.value as any)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="break_character">候选拆字辅码模式 (辅助生僻字输入)</option>
                <option value="toggle_pinyin">切换拼音注音模式</option>
                <option value="next_page">翻到下一页候选词</option>
                <option value="indent">插入制表符 Tab</option>
              </select>
              <p className="text-[11px] text-[#71717a]">设置按 Tab 键时的专属快捷功能</p>
            </div>

            {/* Enter key behavior */}
            <div className="space-y-1.5 p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <label className="text-xs font-semibold text-slate-200">Enter 回车键行为</label>
              <select
                value={config.behavior.enterBehavior}
                onChange={(e) => handleBehaviorChange('enterBehavior', e.target.value as any)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="commit_letters">直接上屏原始拼音字母 (如 shurufa)</option>
                <option value="commit_first">上屏第一首选词并换行</option>
                <option value="clear">清空当前编码重新输入</option>
              </select>
              <p className="text-[11px] text-[#71717a]">定义有编码未上屏时按回车的效果</p>
            </div>

            {/* Space key behavior */}
            <div className="space-y-1.5 p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <label className="text-xs font-semibold text-slate-200">空格键行为</label>
              <select
                value={config.behavior.spaceBehavior}
                onChange={(e) => handleBehaviorChange('spaceBehavior', e.target.value as any)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="commit_first">上屏第 1 候选词 (标准习惯)</option>
                <option value="space_char">直接输入空格字符</option>
              </select>
              <p className="text-[11px] text-[#71717a]">选择空格键是首选词上屏还是敲击空格</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#09090b] border border-[#27272a]">
              <div>
                <div className="text-xs font-semibold text-slate-200">中文全角/半角标点自动切换</div>
                <div className="text-[11px] text-[#71717a]">中文模式下打字输入中文逗号、句号及顿号</div>
              </div>
              <input
                type="checkbox"
                checked={config.behavior.chinesePunctuation}
                onChange={(e) => handleBehaviorChange('chinesePunctuation', e.target.checked)}
                className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#09090b] border border-[#27272a]">
              <div>
                <div className="text-xs font-semibold text-slate-200">英文模式下保持英文原文大小写</div>
                <div className="text-[11px] text-[#71717a]">不进行首字母自动大写或英文矫正</div>
              </div>
              <input
                type="checkbox"
                checked={config.behavior.rawEnglishMode}
                onChange={(e) => handleBehaviorChange('rawEnglishMode', e.target.checked)}
                className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#09090b] border border-[#27272a]">
              <div>
                <div className="text-xs font-semibold text-slate-200">英文词汇上屏后自动添加后置空格</div>
                <div className="text-[11px] text-[#71717a]">英文打字上屏后自动补充单个空格，提升连贯书写体验</div>
              </div>
              <input
                type="checkbox"
                checked={config.behavior.englishAutoSpace ?? true}
                onChange={(e) => handleBehaviorChange('englishAutoSpace', e.target.checked)}
                className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 候选框 (Candidate Box) */}
      {activeTab === 'candidate' && (
        <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#3b82f6]" />
            候选词排序与选择控制
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">候选词排序规则</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'smart_freq' as const, label: '智能词频优先 (推荐)', desc: '根据历史学习与时间衰减综合打分算法动态排序' },
                  { id: 'static_dict' as const, label: '静态字典规范排序', desc: '仅依赖系统标准词库字典顺序，不改变词频' },
                  { id: 'personal_habit' as const, label: '个人严格习惯强绑定', desc: '强锁个人使用词，高频打字精准前置' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleCandidateChange('sorting', s.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all ${
                      config.candidate.sorting === s.id
                        ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-white'
                        : 'bg-[#09090b] border-[#27272a] text-[#71717a] hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[11px] text-[#71717a] mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#09090b] border border-[#27272a]">
                <div>
                  <div className="text-xs font-medium text-slate-200">数字按键选词 (1-9)</div>
                  <div className="text-[10px] text-[#71717a]">主键盘数字快速选中上屏</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.candidate.numberSelection}
                  onChange={(e) => handleCandidateChange('numberSelection', e.target.checked)}
                  className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#09090b] border border-[#27272a]">
                <div>
                  <div className="text-xs font-medium text-slate-200">方向键 (←/→/↑/↓) 移动选择</div>
                  <div className="text-[10px] text-[#71717a]">方向键自由选择高亮词</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.candidate.arrowSelection}
                  onChange={(e) => handleCandidateChange('arrowSelection', e.target.checked)}
                  className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#09090b] border border-[#27272a]">
                <div>
                  <div className="text-xs font-medium text-slate-200">智能联想词拓展</div>
                  <div className="text-[10px] text-[#71717a]">首词上屏后推荐后续联想词</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.candidate.association}
                  onChange={(e) => handleCandidateChange('association', e.target.checked)}
                  className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: 快捷短语 (Quick Phrases) */}
      {activeTab === 'phrases' && (
        <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#3b82f6]" />
                个人快捷短语展开器 (自定义简码)
              </h3>
              <p className="text-xs text-[#71717a] mt-0.5">
                输入指定快捷编码（如 <code className="text-[#3b82f6] font-mono">sj</code>），快速扩展长文本、常用地址或邮箱。
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="搜索简码或短语..."
                value={searchPhrase}
                onChange={(e) => setSearchPhrase(e.target.value)}
                className="bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          {/* Add New Phrase Form */}
          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-3">
            <span className="text-xs font-semibold text-slate-300">添加新的快捷短语</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input
                type="text"
                placeholder="触发简码 (如 dz)"
                value={newShortcut}
                onChange={(e) => setNewShortcut(e.target.value)}
                className="sm:col-span-3 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#3b82f6]"
              />
              <input
                type="text"
                placeholder="转换长短语 (如 北京市朝阳区科技园区...)"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="sm:col-span-7 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#3b82f6]"
              />
              <button
                onClick={handleAddPhrase}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </div>

          {/* Phrases Table */}
          <div className="overflow-x-auto rounded-lg border border-[#27272a]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#09090b] text-[#71717a] font-semibold uppercase tracking-wider text-[10px] border-b border-[#27272a]">
                <tr>
                  <th className="px-4 py-3">快捷简码</th>
                  <th className="px-4 py-3">替换文本内容</th>
                  <th className="px-4 py-3">最近更新时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] bg-[#18181b]">
                {filteredPhrases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#71717a]">
                      无匹配的快捷短语，请在上方添加新词
                    </td>
                  </tr>
                ) : (
                  filteredPhrases.map((phrase) => (
                    <tr key={phrase.id} className="hover:bg-[#27272a]/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#3b82f6]">
                        {phrase.shortcut}
                      </td>
                      <td className="px-4 py-3 text-slate-200 max-w-md truncate">
                        {phrase.text}
                      </td>
                      <td className="px-4 py-3 text-[#71717a] font-mono text-[11px]">
                        {phrase.updatedAt}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeletePhrase(phrase.id)}
                          className="p-1.5 text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="删除短语"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: 隐私与数据 (Privacy) */}
      {activeTab === 'privacy' && (
        <div className="bg-[#18181b] rounded-xl border border-[#27272a] p-5 space-y-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#22c55e]" />
            隐私安全与个人数据控制
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <div>
                <div className="text-xs font-semibold text-slate-200">是否同步个人词频与打字习惯到云端</div>
                <div className="text-[11px] text-[#71717a]">关闭后仅在本机设备保存学习词频，跨设备不共享</div>
              </div>
              <input
                type="checkbox"
                checked={config.privacy.syncWordFrequency}
                onChange={(e) => handlePrivacyChange('syncWordFrequency', e.target.checked)}
                className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-[#09090b] border border-[#27272a]">
              <div>
                <div className="text-xs font-semibold text-slate-200">是否开启本地自动学习记忆新词</div>
                <div className="text-[11px] text-[#71717a]">关闭后将停止记录输入过程中出现的新词汇</div>
              </div>
              <input
                type="checkbox"
                checked={config.privacy.recordLearning}
                onChange={(e) => handlePrivacyChange('recordLearning', e.target.checked)}
                className="w-4 h-4 accent-[#3b82f6] rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#27272a] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-rose-400">敏感缓存清理</h4>
              <p className="text-[11px] text-[#71717a]">清空当前设备上的临时未上屏缓存和未同步的单次新词。</p>
            </div>
            <button
              onClick={() => onShowToast('已清空本机临时打字学习缓存', 'success')}
              className="px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
            >
              清除本机临时缓存
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
