import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ArrowUp,
  Compass,
  Wind,
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Layers,
  Sparkles,
  Key,
} from 'lucide-react';
import {
  FarmerLocation,
  CurrentWeatherData,
  HourlyForecastItem,
  DailyForecastItem,
  AgroRiskAssessment,
} from '../../types/weather';
import { getWeatherConditionName } from '../../utils/agrometCalculations';
import { RiskScorecard } from './RiskScorecard';
import { HourlyForecast } from './HourlyForecast';

interface SideWeatherPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  location: FarmerLocation;
  currentWeather: CurrentWeatherData | null;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  agroAssessment: AgroRiskAssessment | null;
  isLoading: boolean;
  onRefresh: () => void;
  lang: 'hi' | 'en';
  onAskAi: (prompt?: string) => void;
  onOpenAccuWeatherKey?: () => void;
}

export const SideWeatherPanel: React.FC<SideWeatherPanelProps> = ({
  isOpen,
  onToggle,
  location,
  currentWeather,
  hourly,
  daily,
  agroAssessment,
  isLoading,
  onRefresh,
  lang,
  onAskAi,
  onOpenAccuWeatherKey,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'govt'>('overview');
  const isHi = lang === 'hi';

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-20 right-4 z-[500] flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-slate-100 shadow-2xl backdrop-blur-md hover:bg-slate-900 active:scale-95 transition"
        title="Open Weather & Agro-Risk Window (मौसम पैनल खोलें)"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>{isHi ? 'कृषि मौसम खिड़की' : 'Weather & Crop Risk'}</span>
        <ChevronLeft className="h-4 w-4 text-cyan-400" />
      </button>
    );
  }

  const conditionText = currentWeather
    ? getWeatherConditionName(currentWeather.weatherCode, lang)
    : '--';

  return (
    <aside className="absolute top-16 bottom-20 right-4 z-[500] w-96 max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl text-white overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="relative border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-slate-900/40 to-slate-950/40 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {isHi ? 'खेत मौसम' : 'Farmer Portal'}
              </span>
              {currentWeather?.dataSource === 'AccuWeather' ? (
                <span className="text-[9px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/40 flex items-center gap-1">
                  <span>⚡ AccuWeather Live</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAccuWeatherKey}
                  className="text-[9px] font-semibold text-slate-300 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 transition cursor-pointer"
                  title="Connect AccuWeather API Key"
                >
                  <span>🌐 Open-Meteo & IMD</span>
                  <Key className="h-2.5 w-2.5 text-amber-300" />
                </button>
              )}
              {location.isUserGps && (
                <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  GPS Live
                </span>
              )}
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-100 truncate">
              {isHi ? location.hindiName || location.name : location.name}
            </h2>
            <div className="text-[11px] text-slate-400">
              {location.crop || 'Paddy / Wheat / Vegetables'} • {location.farmSize || 'Farm'}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh Live Weather"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onToggle}
              title="Close Panel"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 active:scale-95 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Current Big Temperature Banner */}
        {currentWeather && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-white">
                  {currentWeather.temperature}°
                </span>
                <span className="text-xs text-slate-400">C</span>
                <span className="ml-2 text-xs text-slate-400">
                  {isHi ? 'आभास' : 'Feels'} {currentWeather.apparentTemperature}°C
                </span>
              </div>
              <div className="text-xs font-medium text-emerald-300 mt-0.5">{conditionText}</div>
            </div>

            {/* Quick Ask AI button on this farm's weather */}
            <button
              onClick={() => onAskAi()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/80 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 active:scale-95 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              <span>{isHi ? 'AI सलाह लें' : 'Ask AI'}</span>
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-3 flex rounded-lg bg-black/40 p-1 border border-white/5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHi ? 'मौसम व पूर्वानुमान' : 'Live & Forecast'}
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
              activeTab === 'risk'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHi ? 'कृषि जोखिम (Agro Risk)' : 'Risk Analysis'}
          </button>
          <button
            onClick={() => setActiveTab('govt')}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
              activeTab === 'govt'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHi ? 'सरकारी मानक' : 'Govt Data'}
          </button>
        </div>
      </div>

      {/* Panel Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {currentWeather && activeTab === 'overview' && (
          <>
            {/* Real-time Agro Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Wind & Wind Direction Metric */}
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-medium">{isHi ? 'हवा गति व बहाव' : 'Wind Speed & Flow'}</span>
                  {/* Rotating Direction Arrow synchronized with physical particle flow on map */}
                  {(() => {
                    const originDeg = currentWeather.windDirection;
                    const flowDeg = (originDeg + 180) % 360;
                    return (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 transition-transform duration-500 shadow-sm shadow-cyan-900/50"
                        style={{ transform: `rotate(${flowDeg}deg)` }}
                        title={
                          isHi
                            ? `हवा स्रोत: ${originDeg}° से | बहाव दिशा: ${flowDeg}° की ओर (नक्शे के कणों के अनुरूप)`
                            : `Wind Origin: from ${originDeg}° | Flow Heading: towards ${flowDeg}° (matching map particles)`
                        }
                      >
                        <ArrowUp className="h-4 w-4 text-cyan-300 stroke-[2.5]" />
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-100">{currentWeather.windSpeed}</span>
                  <span className="text-[10px] text-slate-400">km/h</span>
                </div>
                {/* Differentiated Meteorological Origin vs Travel Heading */}
                {(() => {
                  const originDeg = currentWeather.windDirection;
                  const flowDeg = (originDeg + 180) % 360;
                  const dirs = isHi
                    ? ['उत्तर (N)', 'उ-पूर्व (NE)', 'पूर्व (E)', 'द-पूर्व (SE)', 'दक्षिण (S)', 'द-पश्चिम (SW)', 'पश्चिम (W)', 'उ-पश्चिम (NW)']
                    : ['North (N)', 'NE', 'East (E)', 'SE', 'South (S)', 'SW', 'West (W)', 'NW'];
                  const originIdx = Math.round(((originDeg % 360) / 45)) % 8;
                  const flowIdx = Math.round(((flowDeg % 360) / 45)) % 8;
                  const originName = dirs[originIdx];
                  const flowName = dirs[flowIdx];

                  return (
                    <div className="mt-1.5 space-y-1 rounded-lg bg-black/30 p-1.5 border border-white/5 text-[10px]">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{isHi ? 'स्रोत (From):' : 'From:'}</span>
                        <span className="font-semibold text-emerald-300 truncate max-w-[95px] text-right">
                          {originName} {originDeg}°
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] border-t border-white/5 pt-0.5">
                        <span className="text-slate-400">{isHi ? 'बहाव (To):' : 'Flow to:'}</span>
                        <span className="font-semibold text-cyan-300 truncate max-w-[95px] text-right flex items-center justify-end gap-0.5">
                          <span>{flowName} {flowDeg}°</span>
                          <span className="text-[10px]">➔</span>
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-300/80 pt-0.5 border-t border-white/5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate">
                          {isHi ? `${originName} से ${flowName} की ओर` : `${originName} → ${flowName}`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <div className="text-[10px] text-slate-400 mt-1">
                  {isHi ? 'झोंके' : 'Gusts'}: {currentWeather.windGusts} km/h
                </div>
              </div>

              {/* Humidity metric */}
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">{isHi ? 'हवा में नमी' : 'Relative Humidity'}</span>
                  <Droplets className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-100">{currentWeather.humidity}</span>
                  <span className="text-[10px] text-slate-400">%</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {currentWeather.humidity > 75
                    ? isHi
                      ? 'उच्च आर्द्रता (फफूंद खतरा)'
                      : 'High (Fungal alert)'
                    : isHi
                    ? 'सामान्य नमी'
                    : 'Favorable range'}
                </div>
              </div>

              {/* Rain metric */}
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">{isHi ? 'वर्षा स्तर' : 'Precipitation'}</span>
                  <CloudRain className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-100">{currentWeather.rain}</span>
                  <span className="text-[10px] text-slate-400">mm</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {daily[0]?.precipitationProbMax || 0}% {isHi ? 'आज की संभावना' : 'prob today'}
                </div>
              </div>

              {/* Soil / Pressure */}
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">{isHi ? 'वायुदाब / मिट्टी' : 'Pressure / Soil'}</span>
                  <Thermometer className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-slate-100">{currentWeather.surfacePressure}</span>
                  <span className="text-[10px] text-slate-400">hPa</span>
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  {isHi ? 'मिट्टी तापमान' : 'Soil temp'}: {Math.round(currentWeather.soilTemperature || 25)}°C
                </div>
              </div>
            </div>

            {/* Hourly & 7-Day Forecast */}
            <HourlyForecast hourly={hourly} daily={daily} lang={lang} />
          </>
        )}

        {/* Tab 2: Agro Risk Scorecard */}
        {activeTab === 'risk' && agroAssessment && currentWeather && (
          <RiskScorecard
            assessment={agroAssessment}
            currentWeather={currentWeather}
            lang={lang}
          />
        )}

        {/* Tab 3: Government Agromet & Disasters APIs */}
        {activeTab === 'govt' && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>{isHi ? 'आईएमडी मौसम व मेघदूत ऐप' : 'IMD Mausam & Meghdoot Agromet'}</span>
              </div>
              <p className="mt-1.5 text-slate-300 text-[11px] leading-relaxed">
                {isHi
                  ? 'भारत मौसम विज्ञान विभाग (IMD) द्वारा जिला स्तरीय कृषि मौसम बुलेटिन। हर मंगलवार और शुक्रवार को रबी और खरीफ फसलों के लिए जारी।'
                  : 'District-level agrometeorological advisory issued by India Meteorological Department (IMD) in partnership with ICAR KVKs twice weekly.'}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-400 border-t border-white/5 pt-1.5">
                <span>IMD Agrimet Feed: Connected (सक्रिय)</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5">Live GFS/ECMWF</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <AlertTriangle className="h-4 w-4 text-purple-400" />
                <span>{isHi ? 'दामिनी: बिजली चेतावनी नेटवर्क' : 'Damini Lightning Warning Network'}</span>
              </div>
              <p className="mt-1.5 text-slate-300 text-[11px] leading-relaxed">
                {isHi
                  ? 'पृथ्वी विज्ञान मंत्रालय और IITM पुणे का सेंसर नेटवर्क जो 20 से 40 किमी के दायरे में आकाशीय बिजली गिरने से 30-45 मिनट पहले चेतावनी देता है।'
                  : 'IITM Pune & Ministry of Earth Sciences lightning detection network providing early alerts 30-45 minutes in advance.'}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Sun className="h-4 w-4 text-yellow-400" />
                <span>{isHi ? 'प्रधानमंत्री फसल बीमा योजना (PMFBY)' : 'PM Fasal Bima Yojana (PMFBY)'}</span>
              </div>
              <p className="mt-1.5 text-slate-300 text-[11px] leading-relaxed">
                {isHi
                  ? 'असामयिक बारिश, ओलावृष्टि, सूखा अथवा चक्रवात से फसल नुकसान की स्थिति में 72 घंटे के भीतर PMFBY पोर्टल अथवा टोल-फ्री 14447 पर सूचना दर्ज करें।'
                  : 'In case of localized disaster (hail, unseasonal inundation), report crop loss within 72 hours via PMFBY portal or toll-free 14447.'}
              </p>
            </div>

            {/* Admin Integration Note */}
            <div className="rounded-xl border border-dashed border-emerald-500/30 bg-emerald-950/20 p-3 text-[11px] text-slate-300">
              <div className="font-semibold text-emerald-400">
                🔌 {isHi ? 'एडमिन पैनल एकीकरण तैयार' : 'Admin Panel Connect Ready'}
              </div>
              <p className="mt-1 text-slate-400">
                {isHi
                  ? 'यह पैनल आपके मुख्य किसान एडमिन पैनल या बैकएंड से आसानी से डेटा सिंक कर सकता है (Webhook / JSON API तैयार)।'
                  : 'Ready to connect to your secondary admin dashboard with standardized state hooks and exportable telemetry.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Ask AI Prompt Bar */}
      <div className="border-t border-white/10 bg-slate-950/95 p-3">
        <button
          onClick={() => onAskAi()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 active:scale-98 transition"
        >
          <Sparkles className="h-4 w-4 text-yellow-300" />
          <span>{isHi ? 'कृषि वैज्ञानिक AI से मौसम सलाह पूछें' : 'Consult Agromet AI Advisor'}</span>
        </button>
      </div>
    </aside>
  );
};
