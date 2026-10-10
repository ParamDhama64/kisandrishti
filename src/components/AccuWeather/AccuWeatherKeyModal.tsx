import React, { useState, useEffect } from 'react';
import { CloudSun, Key, Check, AlertCircle, ExternalLink, X, RefreshCw, Trash2 } from 'lucide-react';
import { getAccuWeatherKey, saveAccuWeatherKey } from '../../services/weatherApi';

interface AccuWeatherKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: () => void;
  lang: 'hi' | 'en';
}

export const AccuWeatherKeyModal: React.FC<AccuWeatherKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
  lang,
}) => {
  const isHi = lang === 'hi';
  const [apiKey, setApiKey] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getAccuWeatherKey();
      setApiKey(current);
      if (current) {
        setStatusMessage({
          type: 'success',
          text: isHi
            ? 'AccuWeather कुंजी सक्रिय है। 15-मिनट इन-मेमोरी कैश के साथ 50 अनुरोध/दिन सुरक्षित हैं।'
            : 'AccuWeather key is active. Daily 50 req quota preserved via smart in-memory cache.',
        });
      } else {
        setStatusMessage(null);
      }
    }
  }, [isOpen, isHi]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      saveAccuWeatherKey('');
      setStatusMessage({
        type: 'info',
        text: isHi ? 'कुंजी हटा दी गई है। Open-Meteo व IMD रडार पर वापस आ गए हैं।' : 'Key removed. Switched back to Open-Meteo & IMD radar.',
      });
      onKeyUpdated();
      return;
    }

    setIsTesting(true);
    setStatusMessage({
      type: 'info',
      text: isHi ? 'AccuWeather API से कनेक्शन की जांच हो रही है...' : 'Verifying AccuWeather API key connection...',
    });

    try {
      // Test location by coords (Greater Noida)
      const res = await fetch(
        `/api/accuweather/location-by-coords?lat=28.4744&lon=77.5040&apikey=${encodeURIComponent(apiKey.trim())}`
      );
      const json = await res.json();

      if (res.ok && json.success) {
        saveAccuWeatherKey(apiKey.trim());
        setStatusMessage({
          type: 'success',
          text: isHi
            ? 'सफलता! AccuWeather API सफलतापूर्वक कनेक्ट हो गया है।'
            : 'Success! AccuWeather API connected and verified.',
        });
        onKeyUpdated();
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: json.error || (isHi ? 'अमान्य API कुंजी या कोटा समाप्त हो गया है।' : 'Invalid API key or quota exceeded.'),
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    saveAccuWeatherKey('');
    setApiKey('');
    setStatusMessage({
      type: 'info',
      text: isHi ? 'कुंजी हटा दी गई। Open-Meteo व IMD मोड सक्रिय है।' : 'Key cleared. Running in Open-Meteo & IMD radar mode.',
    });
    onKeyUpdated();
  };

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-sky-500/40 bg-slate-950 p-6 shadow-2xl text-white">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-xl shadow-sky-950/50">
              <CloudSun className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <span>AccuWeather API Connection</span>
                <span className="rounded-full bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 text-[10px] text-sky-300">
                  50 Req/Day Free
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isHi
                  ? 'सटीक वास्तविक मौसम, वर्षा व हवा के लिए अपनी AccuWeather API कुंजी जोड़ें'
                  : 'Connect your developer API key for live conditions, forecasts & rain alerts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleTestAndSave} className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              {isHi ? 'AccuWeather API Key (कुंजी)' : 'AccuWeather Developer API Key'}
            </label>
            <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs focus-within:border-sky-500">
              <Key className="h-4 w-4 text-sky-400 mr-2 shrink-0" />
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="e.g. 7fB9kL2x0mPqR4vW8zY1..."
                className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-xs font-mono"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Clear Key"
                  className="text-slate-400 hover:text-red-400 ml-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick link to register */}
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 space-y-2 text-[11px] text-slate-300">
            <div className="font-semibold text-sky-300 flex items-center justify-between">
              <span>{isHi ? 'मुफ्त API कुंजी कैसे प्राप्त करें:' : 'How to get a free API Key:'}</span>
              <a
                href="https://developer.accuweather.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:underline"
              >
                <span>developer.accuweather.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Register free account at AccuWeather Developer Portal</li>
              <li>Create an App under &quot;My Apps&quot; to generate your API Key</li>
              <li>Free tier provides 50 calls/day (our backend caches results for 15 min)</li>
              <li>If no key is entered, KisanDrishti seamlessly runs on Open-Meteo & IMD</li>
            </ol>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-red-950/60 border border-red-500/40 text-red-300'
                  : 'bg-blue-950/60 border border-blue-500/40 text-blue-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 transition"
            >
              {isHi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-950/50 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{isHi ? 'जांच हो रही है...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{isHi ? 'कुंजी सहेजें व कनेक्ट करें' : 'Verify & Save Key'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
