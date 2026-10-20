'use client';

import React, { useState } from 'react';
import { useReader } from '@/context/ReaderContext';
import { ReaderTheme, ReaderFont, ColumnWidth, TTSProvider } from '@/lib/types';
import { X, Volume2, Type, Sliders, KeyRound, Play, Check, Eye } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, availableVoices } = useReader();
  const [activeTab, setActiveTab] = useState<'reading' | 'audio' | 'api'>('reading');
  const [testAudioPlaying, setTestAudioPlaying] = useState(false);

  if (!isOpen) return null;

  const testVoiceSample = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTestAudioPlaying(true);
      const u = new SpeechSynthesisUtterance('Welcome to Audbook. Experience books through synchronized voice and distraction-free reading.');
      u.rate = settings.playbackSpeed;
      u.pitch = settings.pitch;

      if (settings.browserVoiceURI) {
        const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === settings.browserVoiceURI);
        if (v) u.voice = v;
      }

      u.onend = () => setTestAudioPlaying(false);
      u.onerror = () => setTestAudioPlaying(false);
      window.speechSynthesis.speak(u);
    }
  };

  const themes: Array<{ id: ReaderTheme; label: string; bg: string; border: string; text: string }> = [
    { id: 'light', label: 'Paper White', bg: '#FFFFFF', border: '#CBD5E1', text: '#0A2540' },
    { id: 'sepia', label: 'Warm Sepia', bg: '#FBF0D9', border: '#D1C2A5', text: '#3A2E24' },
    { id: 'cream', label: 'Soft Cream', bg: '#FAF8F5', border: '#DDD6CA', text: '#23211F' },
    { id: 'dark', label: 'Slate Dark', bg: '#12141A', border: '#2D3748', text: '#E2E8F0' },
    { id: 'amoled', label: 'AMOLED Black', bg: '#000000', border: '#3F3F46', text: '#D4D4D8' },
  ];

  const fonts: Array<{ id: ReaderFont; label: string; fontClass: string; desc: string }> = [
    { id: 'literata', label: 'Literata', fontClass: 'font-literata', desc: 'Refined editorial serif designed for digital reading' },
    { id: 'merriweather', label: 'Merriweather', fontClass: 'font-merriweather', desc: 'Classic literary serif with warm character' },
    { id: 'inter', label: 'Inter', fontClass: 'font-inter', desc: 'Clean, modern high-legibility sans-serif' },
    { id: 'opendyslexic', label: 'OpenDyslexic', fontClass: 'font-opendyslexic', desc: 'Specialized high-contrast typeface' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl transition-all overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 1px 1px var(--border-hairline)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[var(--text-ink)]" />
            <h3 className="text-base font-bold tracking-tight text-[var(--text-ink)]">
              Reader & Voice Preferences
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)]/30 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('reading')}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'reading'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            Typography & Themes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`ml-6 flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'audio'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Voice & Karaoke Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`ml-6 flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'api'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            TTS Cloud APIs
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'reading' && (
            <div className="space-y-6">
              {/* Theme Palettes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  Color Canvas Theme
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {themes.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => updateSettings({ theme: th.id })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all text-center border ${
                        settings.theme === th.id
                          ? 'ring-2 ring-blue-500 border-transparent shadow-xs'
                          : 'border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                      }`}
                      style={{ backgroundColor: th.bg }}
                    >
                      <span
                        className="h-5 w-5 rounded-full border shadow-inner flex items-center justify-center"
                        style={{ backgroundColor: th.bg, borderColor: th.border }}
                      >
                        {settings.theme === th.id && (
                          <Check className="h-3 w-3" style={{ color: th.text }} />
                        )}
                      </span>
                      <span
                        className="text-[11px] font-medium leading-none"
                        style={{ color: th.text }}
                      >
                        {th.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Choice */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  Typeface
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateSettings({ fontFamily: f.id })}
                      className={`flex flex-col items-start rounded-xl p-3 text-left border transition-all ${
                        settings.fontFamily === f.id
                          ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <span className={`text-base font-bold ${f.fontClass} text-[var(--text-ink)]`}>
                        {f.label}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1">
                        {f.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Line Height */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    <span>Font Size</span>
                    <span className="font-mono tnum text-[var(--text-ink)]">{settings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    step="1"
                    value={settings.fontSize}
                    onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    <span>Line Spacing</span>
                    <span className="font-mono tnum text-[var(--text-ink)]">{settings.lineHeight.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="2.2"
                    step="0.05"
                    value={settings.lineHeight}
                    onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Column Width & Alignment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    Page Column Width
                  </label>
                  <div className="flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1">
                    {(['narrow', 'standard', 'wide'] as ColumnWidth[]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateSettings({ columnWidth: w })}
                        className={`flex-1 rounded py-1 text-xs font-medium capitalize transition-colors ${
                          settings.columnWidth === w
                            ? 'bg-[var(--bg-surface)] text-[var(--text-ink)] shadow-xs font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    Text Alignment
                  </label>
                  <div className="flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1">
                    {(['left', 'justify'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateSettings({ textAlign: align })}
                        className={`flex-1 rounded py-1 text-xs font-medium capitalize transition-colors ${
                          settings.textAlign === align
                            ? 'bg-[var(--bg-surface)] text-[var(--text-ink)] shadow-xs font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Voice Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Browser Synthesizer Voice ({availableVoices.length} detected)
                  </label>
                  <button
                    type="button"
                    onClick={testVoiceSample}
                    disabled={testAudioPlaying}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>{testAudioPlaying ? 'Speaking...' : 'Test Sample'}</span>
                  </button>
                </div>
                <select
                  value={settings.browserVoiceURI || ''}
                  onChange={(e) => updateSettings({ browserVoiceURI: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-ink)] focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Default System Narrator</option>
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}) {v.isNatural ? '★ Natural' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Tips: Voices with "Natural", "Neural", "Google", or "Siri" offer lifelike inflections.
                </p>
              </div>

              {/* Playback Speed */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Playback Narration Speed
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => updateSettings({ playbackSpeed: speed })}
                      className={`rounded-lg border py-2 text-xs font-mono font-medium transition-all ${
                        settings.playbackSpeed === speed
                          ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Karaoke Highlighting Mode */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Read-Along Karaoke Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'Sentence & Word', desc: 'Luminous sentence + word pill' },
                    { id: 'sentence', label: 'Sentence Only', desc: 'Soft paragraph focus' },
                    { id: 'word', label: 'Word Only', desc: 'Precision word marker' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateSettings({ highlightMode: mode.id as any })}
                      className={`flex flex-col rounded-xl border p-2.5 text-left transition-all ${
                        settings.highlightMode === mode.id
                          ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <span className="text-xs font-bold text-[var(--text-ink)]">{mode.label}</span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Scroll toggle */}
              <div className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-ink)]">
                    Auto-Center Follow Scroll
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Smoothly scroll reading page to keep the actively spoken word centered
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ autoScroll: !settings.autoScroll })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.autoScroll ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      settings.autoScroll ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/50 p-3.5 text-xs text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-ink)] mb-1">
                  Optional AI Voice Cloud Providers
                </p>
                Audbook functions 100% free with the browser SpeechSynthesis engine. If you possess an ElevenLabs or OpenAI API key, configure it below for studio-grade human narration.
              </div>

              {/* ElevenLabs Key */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-ink)] mb-1">
                  ElevenLabs API Key
                </label>
                <input
                  type="password"
                  placeholder="xi-..."
                  value={settings.elevenLabsApiKey || ''}
                  onChange={(e) => updateSettings({ elevenLabsApiKey: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-ink)] focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              {/* OpenAI Key */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-ink)] mb-1">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={settings.openAiApiKey || ''}
                  onChange={(e) => updateSettings({ openAiApiKey: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-ink)] focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 py-3.5">
          <span className="text-[11px] text-[var(--text-muted)]">
            Preferences auto-saved to IndexedDB
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--text-ink)] px-4 py-1.5 text-xs font-semibold text-[var(--bg-surface)] shadow-xs hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
