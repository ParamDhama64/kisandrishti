import React, { useState, useEffect } from 'react';
import {
  Wheat,
  MapPin,
  Search,
  LocateFixed,
  Languages,
  Layers,
  ChevronDown,
  Clock,
  Sparkles,
  ShieldAlert,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle,
} from 'lucide-react';
import { FarmerLocation } from '../../types/weather';
import { POPULAR_INDIAN_AGRO_HUBS, searchIndiaLocations } from '../../services/weatherApi';

interface TopNavbarProps {
  currentLocation: FarmerLocation;
  onSelectLocation: (loc: FarmerLocation) => void;
  onDetectGps: () => void;
  isLocating: boolean;
  isWeatherPanelOpen: boolean;
  onToggleWeatherPanel: () => void;
  lang: 'hi' | 'en';
  onToggleLang: () => void;
  onOpenAiAdvisory: () => void;
  onOpenLiveVoice?: () => void;
  onOpenChatbot?: () => void;
  onOpenProfile?: () => void;
  farmerProfile?: any;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentLocation,
  onSelectLocation,
  onDetectGps,
  isLocating,
  isWeatherPanelOpen,
  onToggleWeatherPanel,
  lang,
  onToggleLang,
  onOpenAiAdvisory,
  onOpenLiveVoice,
  onOpenChatbot,
  onOpenProfile,
  farmerProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FarmerLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showHubDropdown, setShowHubDropdown] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const isHi = lang === 'hi';

  // Live IST clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Search debouncing
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchIndiaLocations(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="absolute top-0 left-0 right-0 z-[500] flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur-xl text-white">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-950/50">
          <Wheat className="h-6 w-6 text-yellow-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-slate-100 flex items-center gap-1.5">
              <span>KisanDrishti</span>
              <span className="text-xs font-normal text-emerald-400">किसान दृष्टि</span>
            </h1>
            <span className="hidden sm:inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
              Live Radar
            </span>
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="hidden lg:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[9px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                title="View or Edit Farmer Profile"
              >
                <span>👨‍🌾</span>
                <span>{farmerProfile?.name ? farmerProfile.name.split(' ')[0] : (isHi ? 'किसान प्रोफाइल' : 'Farm Profile')}</span>
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            {isHi ? 'उपग्रह कृषि मौसम एवं चक्रवात/वर्षा रडार' : 'Interactive India Agromet Radar'}
          </div>
        </div>
      </div>

      {/* Center: Search & Indian Agro Hubs Selector */}
      <div className="hidden md:flex items-center gap-2 max-w-md w-full relative">
        {/* Search Bar for ANY Indian Village / Tehsil / District */}
        <div className="relative flex-1">
          <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 focus-within:border-emerald-500/50 transition">
            <Search className="h-3.5 w-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHi ? 'खोजें: कोई भी गांव, जिला या तहसील...' : 'Search any district, tehsil or state...'}
              className="w-full bg-transparent outline-none placeholder-slate-400 text-xs"
            />
            {isSearching && (
              <div className="h-3.5 w-3.5 border border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-xl z-50 max-h-60 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectLocation(item);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 transition"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{item.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Agricultural Hubs Preset Picker */}
        <div className="relative">
          <button
            onClick={() => setShowHubDropdown(!showHubDropdown)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span className="truncate max-w-[110px]">
              {isHi ? currentLocation.hindiName || currentLocation.name : currentLocation.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showHubDropdown && (
            <div className="absolute top-10 right-0 w-64 rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 max-h-72 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isHi ? 'प्रमुख कृषि केंद्र (Agro Hubs)' : 'Major Agricultural Hubs'}
              </div>
              {POPULAR_INDIAN_AGRO_HUBS.map((hub, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectLocation(hub);
                    setShowHubDropdown(false);
                  }}
                  className={`flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    currentLocation.name === hub.name
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="font-medium">{isHi ? hub.hindiName : hub.name}</span>
                  <span className="text-[10px] text-slate-400">{hub.crop}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: GPS, IST Clock, Weather Toggle, Language */}
      <div className="flex items-center gap-2">
        {/* GPS Locate Button */}
        <button
          onClick={onDetectGps}
          disabled={isLocating}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition"
          title="Detect My Farm via GPS (मेरा खेत खोजें)"
        >
          <LocateFixed className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isHi ? 'मेरा खेत' : 'My Farm'}</span>
        </button>

        {/* Live IST Clock */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>{currentTime || 'IST'}</span>
        </div>

        {/* Gemini Live Voice Chat */}
        {onOpenLiveVoice && (
          <button
            onClick={onOpenLiveVoice}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition"
            title="Talk Live with Gemini 3.8 Live API"
          >
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hidden md:inline">Live Voice</span>
          </button>
        )}

        {/* Multi-turn Chatbot */}
        {onOpenChatbot && (
          <button
            onClick={onOpenChatbot}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition"
            title="Chat with Kisan Mitra AI"
          >
            <span>💬</span>
            <span className="hidden md:inline">AI Chat</span>
          </button>
        )}

        {/* Language Switch */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 active:scale-95 transition"
          title="Switch Language (हिन्दी / English)"
        >
          <Languages className="h-3.5 w-3.5 text-emerald-400" />
          <span>{isHi ? 'English' : 'हिन्दी'}</span>
        </button>

        {/* Weather Window Toggle Button */}
        <button
          onClick={onToggleWeatherPanel}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            isWeatherPanelOpen
              ? 'border-emerald-500/40 bg-emerald-600/20 text-emerald-300'
              : 'border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
          title={isWeatherPanelOpen ? 'Hide Weather Window' : 'Show Weather Window'}
        >
          {isWeatherPanelOpen ? (
            <>
              <PanelRightClose className="h-4 w-4" />
              <span className="hidden sm:inline">{isHi ? 'पैनल छिपाएं' : 'Hide Window'}</span>
            </>
          ) : (
            <>
              <PanelRightOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{isHi ? 'मौसम खिड़की' : 'Weather Panel'}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
