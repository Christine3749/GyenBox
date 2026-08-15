import React, { useState } from 'react';
import { Check, Keyboard, Palette, RotateCcw, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';

interface InputSettingsViewProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const InputSettingsView: React.FC<InputSettingsViewProps> = ({ onShowToast }) => {
  const [fontSize, setFontSize] = useState(16);
  const [candidateCount, setCandidateCount] = useState(5);
  const [shiftSwitch, setShiftSwitch] = useState(true);
  const [rawEnglish, setRawEnglish] = useState(true);
  const [association, setAssociation] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState(true);

  const save = () => onShowToast('输入法配置已在本机生效，等待空闲时同步', 'success');

  return (
    <div className="ciku-settings-page">
      <section className="ciku-settings-hero">
        <div className="ciku-settings-hero-heading">
          <div className="ciku-settings-icon"><Keyboard size={18} /></div>
          <div>
            <p className="ciku-settings-kicker">IME_CONFIGURATION</p>
            <h1 className="ciku-settings-title">输入法设置</h1>
            <p className="ciku-settings-description">个人配置是词库工作台的辅助模块；输入过程始终使用本机数据，不依赖网络。</p>
          </div>
        </div>
        <div className="ciku-settings-status">LOCAL_FIRST · READY</div>
      </section>

      <section className="ciku-settings-grid">
        <div className="ciku-settings-card">
          <h2 className="ciku-settings-card-title"><Palette size={16} /> 外观与候选框</h2>
          <label className="ciku-settings-field">
            <span>字体</span>
            <select defaultValue="Microsoft YaHei"><option>Microsoft YaHei</option><option>微软雅黑</option><option>等线</option></select>
          </label>
          <label className="ciku-settings-field">
            <span>字号 <b>{fontSize}px</b></span>
            <input type="range" min="12" max="22" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
          </label>
          <label className="ciku-settings-field">
            <span>同屏候选数 <b>{candidateCount}</b></span>
            <input type="range" min="3" max="9" value={candidateCount} onChange={(e) => setCandidateCount(Number(e.target.value))} />
          </label>
          <div className="ciku-settings-preview"><span>GY</span><span>你好</span><span>输入法</span><span>设置</span><span>词库</span></div>
        </div>

        <div className="ciku-settings-card">
          <h2 className="ciku-settings-card-title"><SlidersHorizontal size={16} /> 输入行为</h2>
          <SettingToggle label="Shift 切换中英文" description="切换后完整保留英文原文，不丢失字母或标点。" checked={shiftSwitch} onChange={setShiftSwitch} />
          <SettingToggle label="英文原文直通" description="密码框、邮箱、网址和英文输入保持原始内容。" checked={rawEnglish} onChange={setRawEnglish} />
          <SettingToggle label="联想词提示" description="仅使用本地词库和已同步的个人词频。" checked={association} onChange={setAssociation} />
        </div>

        <div className="ciku-settings-card">
          <h2 className="ciku-settings-card-title"><Keyboard size={16} /> 按键规则</h2>
          <label className="ciku-settings-field"><span>空格键</span><select defaultValue="commit"><option value="commit">确认首选词</option><option value="space">输入空格</option></select></label>
          <label className="ciku-settings-field"><span>回车键</span><select defaultValue="pinyin"><option value="pinyin">提交拼音</option><option value="candidate">确认当前候选</option></select></label>
          <label className="ciku-settings-field"><span>Tab 键</span><select defaultValue="page"><option value="page">翻页 / 展开候选</option><option value="indent">插入制表符</option></select></label>
        </div>

        <div className="ciku-settings-card">
          <h2 className="ciku-settings-card-title"><ShieldCheck size={16} /> 本地与同步</h2>
          <SettingToggle label="同步个人词频" description="仅同步确认过的词条和频次，不上传原始按键日志。" checked={syncFrequency} onChange={setSyncFrequency} />
          <div className="ciku-settings-note">公共词库与个人词库分离。你的姓名、地址、项目名不会自动进入公共词库。</div>
        </div>
      </section>

      <div className="ciku-settings-actions">
        <button className="ciku-settings-button ciku-settings-button-secondary" onClick={() => onShowToast('已恢复本机默认输入法设置', 'info')}><RotateCcw size={14} />恢复默认</button>
        <button className="ciku-settings-button ciku-settings-button-primary" onClick={save}><Save size={14} />保存配置</button>
      </div>
    </div>
  );
};

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="ciku-settings-toggle">
      <div><strong>{label}</strong><p>{description}</p></div>
      <button type="button" className={`ciku-settings-switch ${checked ? 'is-on' : ''}`} aria-pressed={checked} onClick={() => onChange(!checked)}>
        <span>{checked && <Check size={11} />}</span>
      </button>
    </div>
  );
}
