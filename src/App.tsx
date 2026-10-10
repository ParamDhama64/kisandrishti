/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FarmerLocation,
  FarmerProfile,
  CurrentWeatherData,
  HourlyForecastItem,
  DailyForecastItem,
  AgroRiskAssessment,
} from './types/weather';
import {
  POPULAR_INDIAN_AGRO_HUBS,
  fetchWeatherData,
  detectUserRealLocation,
  searchIndiaLocations,
} from './services/weatherApi';
import { computeAgroRiskAssessment } from './utils/agrometCalculations';
import { askFarmerAiAdvisory } from './services/aiAdvisoryService';
import { generateAdminPayload, broadcastToAdminApp } from './services/adminIntegration';
import { TopNavbar } from './components/Header/TopNavbar';
import { WeatherMap } from './components/Map/WeatherMap';
import { SideWeatherPanel } from './components/WeatherPanel/SideWeatherPanel';
import { BottomSearchBar } from './components/SearchVoice/BottomSearchBar';
import { AdvisoryModal } from './components/SearchVoice/AdvisoryModal';
import { LiveVoiceChat } from './components/Voice/LiveVoiceChat';
import { KisanChatbot } from './components/Chat/KisanChatbot';
import { FarmerProfileModal } from './components/Registration/FarmerProfileModal';
import { AdminConnectModal } from './components/Admin/AdminConnectModal';
import { AccuWeatherKeyModal } from './components/AccuWeather/AccuWeatherKeyModal';
import { Terminal, Radio, MessageSquare, UserCheck, CloudSun } from 'lucide-react';

export default function App() {
  // 1. Farmer Profile State & Startup Popup
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('kisan_farmer_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Popup window as soon as app starts if not already registered
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('kisan_farmer_profile');
    } catch {
      return true;
    }
  });

  // 2. Fixed User Exact GPS Coordinates (Permanently anchors Blue Dot)
  const [userExactGps, setUserExactGps] = useState<{
    lat: number;
    lon: number;
    accuracy?: number;
    name?: string;
  } | null>(() => {
    try {
      const savedGps = localStorage.getItem('kisan_user_exact_gps');
      return savedGps ? JSON.parse(savedGps) : null;
    } catch {
      return null;
    }
  });

  // 3. Current Weather Inspection Location (Can change when clicking fields without moving the Blue Dot)
  const [currentLocation, setCurrentLocation] = useState<FarmerLocation>({
    ...POPULAR_INDIAN_AGRO_HUBS[0],
    isExactUserLocation: true,
  });

  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherData | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastItem[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecastItem[]>([]);
  const [agroAssessment, setAgroAssessment] = useState<AgroRiskAssessment | null>(null);

  // 4. UI Toggles
  const [isWeatherPanelOpen, setIsWeatherPanelOpen] = useState<boolean>(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>('');
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [isAccuWeatherModalOpen, setIsAccuWeatherModalOpen] = useState<boolean>(false);

  // 5. AI Advisory Modal State
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState<boolean>(false);
  const [advisoryQuery, setAdvisoryQuery] = useState<string>('');
  const [advisoryResponse, setAdvisoryResponse] = useState<string>('');
  const [isLoadingAdvisory, setIsLoadingAdvisory] = useState<boolean>(false);

  // Load weather when location changes
  const loadWeather = useCallback(async (loc: FarmerLocation) => {
    setIsLoadingWeather(true);
    try {
      const data = await fetchWeatherData(loc.lat, loc.lon);
      setCurrentWeather(data.current);
      setHourlyForecast(data.hourly);
      setDailyForecast(data.daily);

      // Compute Agromet Risk Assessment
      const assessment = computeAgroRiskAssessment(data.current, data.daily);
      setAgroAssessment(assessment);

      // Broadcast telemetry to secondary Admin Panel
      const telemetry = generateAdminPayload(loc, data.current, assessment);
      broadcastToAdminApp(telemetry);
    } catch (err) {
      console.error('Failed to load weather data:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(currentLocation);
  }, [currentLocation, loadWeather]);

  // Request browser location permission & fix blue dot at user's exact GPS
  const handleDetectGps = useCallback(async () => {
    setIsLocatingGps(true);
    try {
      const userLoc = await detectUserRealLocation();
      const gpsRecord = {
        lat: userLoc.lat,
        lon: userLoc.lon,
        accuracy: userLoc.accuracy,
        name: userLoc.name,
      };

      setUserExactGps(gpsRecord);
      try {
        localStorage.setItem('kisan_user_exact_gps', JSON.stringify(gpsRecord));
      } catch (_) {}

      // Update current location with farmer profile crop if present
      setCurrentLocation({
        ...userLoc,
        crop: farmerProfile?.cropGrowing || userLoc.crop,
        farmSize: farmerProfile?.farmlandArea || userLoc.farmSize,
      });
    } catch (err) {
      console.warn('Location detection error:', err);
    } finally {
      setIsLocatingGps(false);
    }
  }, [farmerProfile]);

  // Ask location permission on initial app mount
  useEffect(() => {
    handleDetectGps();
  }, [handleDetectGps]);

  // Save profile from startup modal and sync to server / admin
  const handleSaveProfile = async (profile: FarmerProfile) => {
    setFarmerProfile(profile);

    // If district is Greater Noida or user specifies their district, anchor user's location
    let targetLat = userExactGps?.lat;
    let targetLon = userExactGps?.lon;
    const lowerDist = (profile.district || '').toLowerCase();

    if (lowerDist.includes('greater noida') || lowerDist.includes('gr noida') || lowerDist.includes('gautam buddha')) {
      targetLat = 28.4744;
      targetLon = 77.5040;
    } else if (lowerDist.includes('jaisalmer')) {
      targetLat = 26.9157;
      targetLon = 70.9083;
    } else if (!targetLat && profile.district) {
      try {
        const matches = await searchIndiaLocations(profile.district);
        if (matches.length > 0) {
          targetLat = matches[0].lat;
          targetLon = matches[0].lon;
        }
      } catch (_) {}
    }

    if (targetLat && targetLon) {
      const gpsRecord = {
        lat: targetLat,
        lon: targetLon,
        name: `${profile.district}, ${profile.state}`,
      };
      setUserExactGps(gpsRecord);
      try {
        localStorage.setItem('kisan_user_exact_gps', JSON.stringify(gpsRecord));
      } catch (_) {}
    }

    const farmLat = targetLat || currentLocation.lat;
    const farmLon = targetLon || currentLocation.lon;

    try {
      localStorage.setItem('kisan_farmer_profile', JSON.stringify(profile));
      await fetch('/api/farmer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          lat: farmLat,
          lon: farmLon,
        }),
      });
    } catch (err) {
      console.warn('Profile save sync error:', err);
    }

    const updatedLoc: FarmerLocation = {
      name: `${profile.district}, ${profile.state}`,
      hindiName: `${profile.district}, ${profile.state}`,
      state: profile.state,
      district: profile.district,
      lat: farmLat,
      lon: farmLon,
      crop: profile.cropGrowing,
      farmSize: profile.farmlandArea,
      isExactUserLocation: true,
    };
    setCurrentLocation(updatedLoc);
  };

  // Map Click: Inspects target field WITHOUT moving the user's fixed Blue Dot!
  const handleSelectCoordinates = (lat: number, lon: number, customName?: string) => {
    const newLoc: FarmerLocation = {
      name: customName || `Inspected Field (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`,
      hindiName: customName || `खेत (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`,
      state: currentLocation.state,
      lat,
      lon,
      isExactUserLocation: false, // The blue dot stays at userExactGps!
      crop: farmerProfile?.cropGrowing || currentLocation.crop,
      farmSize: farmerProfile?.farmlandArea || currentLocation.farmSize,
    };
    setCurrentLocation(newLoc);
  };

  // Query AI Advisory
  const handleSearchAiAdvisory = async (queryText?: string) => {
    const query =
      queryText ||
      (lang === 'hi'
        ? `वर्तमान मौसम स्थिति (तापमान ${currentWeather?.temperature}°C, हवा ${currentWeather?.windSpeed} km/h) के अनुसार मेरी ${farmerProfile?.cropGrowing || currentLocation.crop || 'फसल'} के लिए क्या सलाह और जोखिम है?`
        : `Based on current weather (Temp: ${currentWeather?.temperature}°C, Wind: ${currentWeather?.windSpeed} km/h), what are the crop risks and spray/irrigation recommendations?`);

    setAdvisoryQuery(query);
    setIsAdvisoryModalOpen(true);
    setIsLoadingAdvisory(true);
    setAdvisoryResponse('');

    if (!currentWeather) {
      setAdvisoryResponse(
        lang === 'hi'
          ? 'मौसम डेटा लोड हो रहा है, कृपया 2 सेकंड प्रतीक्षा करें।'
          : 'Weather data is loading, please wait a moment.'
      );
      setIsLoadingAdvisory(false);
      return;
    }

    try {
      const res = await askFarmerAiAdvisory({
        query,
        language: lang,
        location: currentLocation,
        currentWeather,
        selectedCrop: farmerProfile?.cropGrowing || currentLocation.crop,
      });

      setAdvisoryResponse(res.advisory);
    } catch (err) {
      console.error('Advisory failed:', err);
      setAdvisoryResponse(
        lang === 'hi'
          ? 'सलाह लोड करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
          : 'Unable to retrieve advisory. Please try again.'
      );
    } finally {
      setIsLoadingAdvisory(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans antialiased text-slate-100 select-none">
      {/* 1. Top Navigation Bar */}
      <TopNavbar
        currentLocation={currentLocation}
        onSelectLocation={setCurrentLocation}
        onDetectGps={handleDetectGps}
        isLocating={isLocatingGps}
        isWeatherPanelOpen={isWeatherPanelOpen}
        onToggleWeatherPanel={() => setIsWeatherPanelOpen(!isWeatherPanelOpen)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'hi' ? 'en' : 'hi')}
        onOpenAiAdvisory={() => handleSearchAiAdvisory()}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        farmerProfile={farmerProfile}
      />

      {/* 2. Interactive Map with Fixed Blue Dot at Exact GPS */}
      <main className="absolute inset-0 pt-16">
        <WeatherMap
          location={currentLocation}
          userExactGps={userExactGps}
          currentWeather={currentWeather}
          onSelectCoordinates={handleSelectCoordinates}
          onDetectGps={handleDetectGps}
          isLocating={isLocatingGps}
          onAskAiForLocation={() => handleSearchAiAdvisory()}
          lang={lang}
        />
      </main>

      {/* 3. Collapsible Weather & Agricultural Risk Window (Right Side) */}
      <SideWeatherPanel
        isOpen={isWeatherPanelOpen}
        onToggle={() => setIsWeatherPanelOpen(!isWeatherPanelOpen)}
        location={currentLocation}
        currentWeather={currentWeather}
        hourly={hourlyForecast}
        daily={dailyForecast}
        agroAssessment={agroAssessment}
        isLoading={isLoadingWeather}
        onRefresh={() => loadWeather(currentLocation)}
        lang={lang}
        onAskAi={(prompt) => handleSearchAiAdvisory(prompt)}
        onOpenAccuWeatherKey={() => setIsAccuWeatherModalOpen(true)}
      />

      {/* 4. Bottom Center Merged Search & AI Chat Bar */}
      <BottomSearchBar
        onSearch={(query) => {
          setChatInitialQuery(query);
          setIsChatbotOpen(true);
        }}
        lang={lang}
        onToggleLang={() => setLang(lang === 'hi' ? 'en' : 'hi')}
        location={currentLocation}
        isLoading={isLoadingAdvisory}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenChatbot={(initialQuery) => {
          setChatInitialQuery(initialQuery || '');
          setIsChatbotOpen(true);
        }}
      />

      {/* 5. AI Advisory Quick Response Modal with Audio Speech & WhatsApp Sharing */}
      <AdvisoryModal
        isOpen={isAdvisoryModalOpen}
        onClose={() => setIsAdvisoryModalOpen(false)}
        query={advisoryQuery}
        response={advisoryResponse}
        isLoading={isLoadingAdvisory}
        language={lang}
        location={currentLocation}
        currentWeather={currentWeather}
      />

      {/* 6. Gemini 3.8 Live Voice Chat (Live Mic Audio with Visualizer & Spoken Output) */}
      <LiveVoiceChat
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        location={currentLocation}
        currentWeather={currentWeather}
        lang={lang}
      />

      {/* 7. Multi-Turn Kisan Mitra Chatbot (Merged with Bottom Search Bar) */}
      <KisanChatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        location={currentLocation}
        currentWeather={currentWeather}
        lang={lang}
        initialQuery={chatInitialQuery}
        onClearInitialQuery={() => setChatInitialQuery('')}
      />

      {/* 8. Startup Farmer Details Registration Modal (Stored & 1-Line Admin Synced) */}
      <FarmerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        currentProfile={farmerProfile}
        lang={lang}
      />

      {/* 9. Floating Action Buttons (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[480] flex items-center gap-2">
        {/* AccuWeather Key Button */}
        <button
          onClick={() => setIsAccuWeatherModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-slate-950/90 px-3 py-1.5 text-xs font-bold text-sky-300 shadow-xl backdrop-blur-md hover:bg-sky-950/60 transition active:scale-95"
          title="AccuWeather Developer API (50 req/day)"
        >
          <CloudSun className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden sm:inline">AccuWeather</span>
        </button>

        {/* Live Voice Button */}
        <button
          onClick={() => setIsLiveVoiceOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-slate-950/90 px-3 py-1.5 text-xs font-bold text-cyan-300 shadow-xl backdrop-blur-md hover:bg-cyan-950/60 transition active:scale-95"
          title="Start Live Voice Chat with Gemini 3.8 Live"
        >
          <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Live Voice</span>
        </button>

        {/* Edit Profile Button */}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-md hover:bg-slate-900 hover:text-emerald-300 transition active:scale-95"
          title="Edit Farmer & Farm Profile"
        >
          <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden md:inline">{farmerProfile?.name ? farmerProfile.name.split(' ')[0] : 'Profile'}</span>
        </button>

        {/* Admin Sync Inspector */}
        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-md hover:bg-slate-900 hover:text-cyan-300 transition active:scale-95"
          title="Inspect Telemetry for Admin Panel"
        >
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <span>Admin</span>
        </button>
      </div>

      {/* 10. Admin Connect Inspector Modal */}
      <AdminConnectModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        payload={generateAdminPayload(currentLocation, currentWeather, agroAssessment)}
        lang={lang}
      />

      {/* 11. AccuWeather Key Configuration Modal */}
      <AccuWeatherKeyModal
        isOpen={isAccuWeatherModalOpen}
        onClose={() => setIsAccuWeatherModalOpen(false)}
        onKeyUpdated={() => loadWeather(currentLocation)}
        lang={lang}
      />
    </div>
  );
}
