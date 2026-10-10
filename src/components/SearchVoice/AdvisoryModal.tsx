import React, { useEffect, useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Wheat,
  Clock,
} from 'lucide-react';
import { speechHandler } from '../../services/speechService';
import { FarmerLocation, CurrentWeatherData } from '../../types/weather';

interface AdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  response: string;
  isLoading: boolean;
  language: 'hi' | 'en';
  location: FarmerLocation;
  currentWeather: CurrentWeatherData | null;
}

export const AdvisoryModal: React.FC<AdvisoryModalProps> = ({
  isOpen,
  onClose,
  query,
  response,
  isLoading,
  language,
  location,
  currentWeather,
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const isHi = language === 'hi';

  useEffect(() => {
    // When modal opens with new response, optionally voice read if desired or stop previous speech
    return () => {
      speechHandler.stopSpeaking();
      setIsSpeaking(false);
    };
  }, [isOpen, response]);

  if (!isOpen) return null;

  const handleToggleVoice = () => {
    if (isSpeaking) {
      speechHandler.stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speechHandler.speak(response, language, () => {
        setIsSpeaking(false);
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const textToShare = encodeURIComponent(
      `🌾 *किसान मौसम सलाह (KisanDrishti)*\n📍 स्थान: ${location.name}\n❓ प्रश्न: ${query}\n\n${response}\n\n- किसान दृष्टि वेदर रडार`
    );
    window.open(`https://api.whatsapp.com/send?text=${textToShare}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-emerald-500/30 bg-slate-950 p-5 shadow-2xl text-white max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <Sparkles className="h-5 w-5 text-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                  {isHi ? 'कृषि वैज्ञानिक व मौसम AI' : 'Agromet AI Intelligence'}
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
                  {location.name}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mt-0.5 truncate max-w-md">
                "{query}"
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              speechHandler.stopSpeaking();
              setIsSpeaking(false);
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 text-slate-200 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400 animate-pulse">
                {isHi
                  ? 'मौसम डेटा, हवा की गति और IMD मानकों का विश्लेषण हो रहा है...'
                  : 'Analyzing radar winds, moisture and agromet risk parameters...'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-900/80 border border-white/5 p-4 text-xs whitespace-pre-wrap leading-relaxed">
              {response}
            </div>
          )}

          {/* Sources Grounding Tag */}
          {!isLoading && (
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  {isHi
                    ? 'डेटा स्रोत: IMD Mausam, Open-Meteo Doppler, KVK Agromet Advisory'
                    : 'Grounded in IMD Agromet, Doppler Radar & KVK Guidelines'}
                </span>
              </div>
              <span className="text-slate-400">
                {currentWeather
                  ? `${currentWeather.temperature}°C • ${currentWeather.windSpeed} km/h Wind`
                  : ''}
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
          {/* Audio TTS Button (Farmer Voice Readout) */}
          <button
            onClick={handleToggleVoice}
            disabled={isLoading || !response}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-medium transition active:scale-95 ${
              isSpeaking
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/10 text-slate-200 hover:bg-white/15'
            }`}
            title="Listen to advice in audio (सलाह आवाज में सुनें)"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4 text-amber-400 animate-pulse" />
                <span>{isHi ? 'आवाज रोकें' : 'Stop Audio'}</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span>{isHi ? 'सलाह सुनें (Audio)' : 'Listen Aloud'}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {/* WhatsApp Share for Farmers */}
            <button
              onClick={handleShareWhatsApp}
              disabled={isLoading || !response}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3 py-2 text-emerald-300 hover:bg-emerald-600/30 transition"
              title="Share advice on WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{isHi ? 'व्हाट्सएप साझा करें' : 'WhatsApp'}</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              disabled={isLoading || !response}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/10 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? (isHi ? 'कॉपी हो गया' : 'Copied') : isHi ? 'कॉपी' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
