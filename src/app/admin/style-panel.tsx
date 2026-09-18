'use client';

import { useState } from 'react';
import { Palette, Save } from 'lucide-react';

const presets = [
  {
    id: 'default',
    name: '深蓝高端（默认）',
    primary: '#0A1628',
    accent: '#2563EB',
    cyan: '#06B6D4',
  },
  {
    id: 'midnight',
    name: '午夜黑金',
    primary: '#0F0F0F',
    accent: '#D4A853',
    cyan: '#C0A060',
  },
  {
    id: 'forest',
    name: '深林翠绿',
    primary: '#0B2B1A',
    accent: '#10B981',
    cyan: '#34D399',
  },
  {
    id: 'wine',
    name: '酒红典雅',
    primary: '#1A0A0A',
    accent: '#991B1B',
    cyan: '#DC2626',
  },
];

export function StylePanel() {
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [customPrimary, setCustomPrimary] = useState('#0A1628');
  const [customAccent, setCustomAccent] = useState('#2563EB');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setCustomPrimary(preset.primary);
      setCustomAccent(preset.accent);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Presets */}
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="w-5 h-5 text-brand-blue" />
          <h3 className="text-lg font-semibold text-navy">预设主题</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                selectedPreset === preset.id
                  ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/20'
                  : 'border-border/50 hover:border-border hover:bg-surface/50'
              }`}
            >
              <div className="flex gap-1">
                <div
                  className="w-6 h-6 rounded-full border border-border/30"
                  style={{ backgroundColor: preset.primary }}
                />
                <div
                  className="w-6 h-6 rounded-full border border-border/30"
                  style={{ backgroundColor: preset.accent }}
                />
                <div
                  className="w-6 h-6 rounded-full border border-border/30"
                  style={{ backgroundColor: preset.cyan }}
                />
              </div>
              <span className="text-sm font-medium text-navy">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom colors */}
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">自定义颜色</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground w-24">主色调</label>
            <input
              type="color"
              value={customPrimary}
              onChange={(e) => setCustomPrimary(e.target.value)}
              className="w-10 h-10 rounded-md border border-border cursor-pointer"
            />
            <input
              type="text"
              value={customPrimary}
              onChange={(e) => setCustomPrimary(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-white text-foreground text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground w-24">强调色</label>
            <input
              type="color"
              value={customAccent}
              onChange={(e) => setCustomAccent(e.target.value)}
              className="w-10 h-10 rounded-md border border-border cursor-pointer"
            />
            <input
              type="text"
              value={customAccent}
              onChange={(e) => setCustomAccent(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-white text-foreground text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white rounded-md font-medium hover:bg-brand-blue-light transition-colors"
      >
        <Save className="w-4 h-4" />
        {saved ? '已保存' : '保存样式设置'}
      </button>
    </div>
  );
}
