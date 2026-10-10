import React, { useState } from 'react';
import {
  Mic,
  Send,
  Languages,
  Sparkles,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { FarmerLocation } from '../../types/weather';

interface BottomSearchBarProps {
  onSearch: (query: string) => void;
  lang: 'hi' | 'en';
  onToggleLang: () => void;
  location: FarmerLocation;
  isLoading: boolean;
  onOpenLiveVoice: () => void;
  onOpenChatbot: (initialQuery?: string) => void;
}

export const BottomSearchBar: React.FC<BottomSearchBarProps> = ({
  onSearch,
  lang,
  onToggleLang,
  location,
  isLoading,
  onOpenLiveVoice,
  onOpenChatbot,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const isHi = lang === 'hi';

  const quickPrompts = isHi
    ? [
        { label: '💧 क्या आज सिंचाई करें?', query: 'क्या आज खेत में सिंचाई करना सही रहेगा या बारिश का इंतजार करें?' },
        { label: '💨 कीटनाशक छिड़काव का सही समय?', query: 'हवा की गति को देखते हुए क्या आज कीटनाशक या फफूंदनाशक का छिड़काव सुरक्षित है?' },
        { label: '🌧️ अगले 3 दिनों में कितनी बारिश होगी?', query: 'अगले 3 दिनों में हमारे क्षेत्र में वर्षा की क्या संभावना है?' },
        { label: '🐛 कीट व फफूंद रोग का जोखिम?', query: 'वर्तमान तापमान और नमी के आधार पर फसल में किस कीट या रोग का खतरा है और रोकथाम क्या है?' },
      ]
    : [
        { label: '💧 Should I irrigate today?', query: 'Should I irrigate my farm today based on soil moisture and rain forecast?' },
        { label: '💨 Safe to spray pesticides?', query: 'Given current wind speeds, is it safe to spray pesticides or fungicides?' },
        { label: '🌧️ Rain forecast next 3 days?', query: 'What is the precipitation and storm probability over the next 3 days?' },
        { label: '🐛 Pest outbreak threat?', query: 'What is the pest and fungal pathogen risk given current temperature and humidity?' },
      ];

  const handleBarClick = () => {
    // Clicking the bottom search bar directly opens the Kisan Mitra AI Chat
    onOpenChatbot(inputText.trim() || undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (query) {
      onOpenChatbot(query);
      setInputText('');
    } else {
      onOpenChatbot();
    }
  };

  const handleChipClick = (query: string) => {
    // Clicking quick prompt directly opens Kisan Mitra AI Chat with that question
    onOpenChatbot(query);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] w-full max-w-xl px-4 flex flex-col items-center gap-2">
      {/* Quick Question Chips - Directly Open Kisan Mitra AI Chat */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none animate-in fade-in slide-in-from-bottom-2">
        {quickPrompts.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleChipClick(chip.query)}
            className="whitespace-nowrap rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-[11px] font-medium text-slate-300 shadow-lg backdrop-blur-md hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-500/30 transition active:scale-95"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Merged Kisan Mitra AI Search & Live Voice Bar */}
      <form
        onSubmit={handleSubmit}
        className="relative flex w-full items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/90 hover:border-emerald-500/50 p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-200 group"
      >
        {/* Language Switcher Badge */}
        <button
          type="button"
          onClick={onToggleLang}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/15 active:scale-95 transition shrink-0"
          title={isHi ? 'अंग्रेजी में बदलें (Switch to English)' : 'हिंदी में बदलें (Switch to Hindi)'}
        >
          <Languages className="h-3.5 w-3.5 text-emerald-400" />
          <span>{isHi ? 'हिन्दी' : 'EN'}</span>
        </button>

        {/* AI Mitra Indicator */}
        <div
          onClick={handleBarClick}
          className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 cursor-pointer shrink-0"
        >
          <Sparkles className="h-3 w-3" />
          <span>{isHi ? 'किसान मित्र AI' : 'Kisan Mitra'}</span>
        </div>

        {/* Input Field - Clicking opens Kisan Mitra AI Chat */}
        <div className="flex-1 relative flex items-center min-w-0" onClick={handleBarClick}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onClick={handleBarClick}
            placeholder={
              isHi
                ? `किसान मित्र AI से पूछें... (क्लिक करें या लिखें)`
                : `Ask Kisan Mitra AI... (click to chat or type)`
            }
            className="w-full bg-transparent px-2 py-1 text-xs text-white placeholder-slate-400 outline-none cursor-pointer"
          />
        </div>

        {/* Green Icon: Triggers Live Voice Chat with Gemini 3.8 Live API */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLiveVoice();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/40 active:scale-90 transition shrink-0 relative group/mic"
          title={
            isHi
              ? 'लाइव आवाज: Gemini 3.8 Live से सीधे बोलकर बात करें'
              : 'Live Voice: Speak directly with Gemini 3.8 Live Voice Chat'
          }
        >
          <Mic className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
        </button>

        {/* Send / Open Chat Submit Button */}
        <button
          type="submit"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 active:scale-95 transition shrink-0"
          title={isHi ? 'किसान मित्र AI चैट खोलें' : 'Open Kisan Mitra Chat'}
        >
          <Send className="h-4 w-4 text-cyan-400" />
        </button>
      </form>
    </div>
  );
};
