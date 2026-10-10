import React from 'react';
import {
  Layers,
  Wind,
  CloudRain,
  Compass,
  LocateFixed,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Thermometer,
  Cloud,
  ArrowUp,
} from 'lucide-react';
import { ActiveMapLayer } from '../../types/weather';

interface MapControlsProps {
  activeBaseLayer: 'satellite' | 'street' | 'dark';
  onSelectBaseLayer: (layer: 'satellite' | 'street' | 'dark') => void;
  showWindOverlay: boolean;
  onToggleWindOverlay: () => void;
  showRainOverlay: boolean;
  onToggleRainOverlay: () => void;
  showTempOverlay: boolean;
  onToggleTempOverlay: () => void;
  showCloudsOverlay: boolean;
  onToggleCloudsOverlay: () => void;
  showBlueCloudsOverlay: boolean;
  onToggleBlueCloudsOverlay: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterFarm: () => void;
  onDetectGps: () => void;
  isLocating: boolean;
  currentWindSpeed: number;
  currentWindDirection?: number;
  lang?: 'hi' | 'en';
}

export const MapControls: React.FC<MapControlsProps> = ({
  activeBaseLayer,
  onSelectBaseLayer,
  showWindOverlay,
  onToggleWindOverlay,
  showRainOverlay,
  onToggleRainOverlay,
  showTempOverlay,
  onToggleTempOverlay,
  showCloudsOverlay,
  onToggleCloudsOverlay,
  showBlueCloudsOverlay,
  onToggleBlueCloudsOverlay,
  onZoomIn,
  onZoomOut,
  onCenterFarm,
  onDetectGps,
  isLocating,
  currentWindSpeed,
  currentWindDirection = 90,
  lang = 'hi',
}) => {
  const [showLayerMenu, setShowLayerMenu] = React.useState(false);

  return (
    <>
      {/* Top Left: Layer Selector & Weather Overlays Toolbar */}
      <div className="absolute top-20 left-4 z-[500] flex flex-col gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-xs font-medium text-slate-100 shadow-xl backdrop-blur-md hover:bg-slate-900 transition active:scale-95"
            title="Choose Map Base Layer"
          >
            <Layers className="h-4 w-4 text-emerald-400" />
            <span className="capitalize">{activeBaseLayer} View</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-11 left-0 z-50 w-44 rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 px-2 py-1 font-bold">
                Base Satellite / Map
              </div>
              <button
                onClick={() => {
                  onSelectBaseLayer('satellite');
                  setShowLayerMenu(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition ${
                  activeBaseLayer === 'satellite' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>🛰️</span> HD Satellite (उपग्रह)
              </button>
              <button
                onClick={() => {
                  onSelectBaseLayer('dark');
                  setShowLayerMenu(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition ${
                  activeBaseLayer === 'dark' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>🌙</span> Dark Canvas (रात्रिकालीन)
              </button>
              <button
                onClick={() => {
                  onSelectBaseLayer('street');
                  setShowLayerMenu(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition ${
                  activeBaseLayer === 'street' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>🗺️</span> Terrain / Roads (सड़क व भूमि)
              </button>
            </div>
          )}
        </div>

        {/* Overlay Switches (Zoom Earth style) */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-slate-950/85 p-1.5 shadow-xl backdrop-blur-md">
          {/* Wind Animation Toggle */}
          <button
            onClick={onToggleWindOverlay}
            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition ${
              showWindOverlay
                ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Live Wind Flow Streamlets (हवा धारा प्रवाह)"
          >
            <div className="flex items-center gap-2">
              <Wind className="h-3.5 w-3.5" />
              <span>Wind Flow (हवा प्रवाह)</span>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${showWindOverlay ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`}
            />
          </button>

          {/* Rain Radar Toggle */}
          <button
            onClick={onToggleRainOverlay}
            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition ${
              showRainOverlay
                ? 'bg-blue-500/20 text-blue-300 font-medium'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Live Rain Radar (वर्षा रडार)"
          >
            <div className="flex items-center gap-2">
              <CloudRain className="h-3.5 w-3.5" />
              <span>Rain Radar (वर्षा रडार)</span>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${showRainOverlay ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}
            />
          </button>

          {/* Temperature Layer */}
          <button
            onClick={onToggleTempOverlay}
            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition ${
              showTempOverlay
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Thermal Heatmap (तापमान स्तर)"
          >
            <div className="flex items-center gap-2">
              <Thermometer className="h-3.5 w-3.5" />
              <span>Thermal (तापमान)</span>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${showTempOverlay ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`}
            />
          </button>

          {/* Clouds Layer */}
          <button
            onClick={onToggleCloudsOverlay}
            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition ${
              showCloudsOverlay
                ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Satellite Cloud Cover (बादल आवरण)"
          >
            <div className="flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5" />
              <span>Clouds (बादल)</span>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${showCloudsOverlay ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`}
            />
          </button>

          {/* Blue Rain Clouds Layer (Light to Dark Blue intensity) */}
          <button
            onClick={onToggleBlueCloudsOverlay}
            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition ${
              showBlueCloudsOverlay
                ? 'bg-blue-600/30 text-blue-300 font-medium'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            title="Blue Rain Clouds: Dark Blue for Strong Rain, Light Blue for Weak Rain"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🌧️</span>
              <span>Blue Clouds (वर्षा बादल)</span>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${showBlueCloudsOverlay ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}
            />
          </button>
        </div>

        {/* Wind Speed & Flow Vector Legend when Wind overlay is on */}
        {showWindOverlay && (
          <div className="rounded-xl border border-white/10 bg-slate-950/85 p-2 shadow-xl backdrop-blur-md text-[10px] text-slate-300 w-48">
            <div className="flex justify-between items-center pb-1 text-slate-400 font-medium">
              <span>{lang === 'hi' ? 'हवा गति (किमी/घंटा)' : 'Wind Speed (km/h)'}</span>
              <span className="text-cyan-300 font-bold">{currentWindSpeed} km/h</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded">
              <div className="w-1/5 bg-sky-400" title="<10 km/h: Light Calm" />
              <div className="w-1/5 bg-emerald-400" title="10-20 km/h: Moderate" />
              <div className="w-1/5 bg-yellow-400" title="20-35 km/h: Fresh" />
              <div className="w-1/5 bg-orange-400" title="35-50 km/h: Strong" />
              <div className="w-1/5 bg-rose-500" title=">50 km/h: Gale Gusts" />
            </div>
            <div className="flex justify-between text-[8px] text-slate-400 pt-1">
              <span>0</span>
              <span>15</span>
              <span>30</span>
              <span>45</span>
              <span>60+</span>
            </div>

            {/* Differentiated Origin vs Flow Heading aligned with moving map particles */}
            {(() => {
              const originDeg = currentWindDirection;
              const flowDeg = (originDeg + 180) % 360;
              const isHi = lang === 'hi';
              const dirs = isHi
                ? ['उत्तर (N)', 'उ-पूर्व (NE)', 'पूर्व (E)', 'द-पूर्व (SE)', 'दक्षिण (S)', 'द-पश्चिम (SW)', 'पश्चिम (W)', 'उ-पश्चिम (NW)']
                : ['North (N)', 'NE', 'East (E)', 'SE', 'South (S)', 'SW', 'West (W)', 'NW'];
              const originIdx = Math.round(((originDeg % 360) / 45)) % 8;
              const flowIdx = Math.round(((flowDeg % 360) / 45)) % 8;
              const originName = dirs[originIdx];
              const flowName = dirs[flowIdx];

              return (
                <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-1 text-[9px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{isHi ? 'स्रोत (From):' : 'From:'}</span>
                    <span className="font-semibold text-emerald-400">
                      {originName} {originDeg}°
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-0.5">
                    <span className="text-slate-400">{isHi ? 'बहाव (To):' : 'Heading To:'}</span>
                    <span className="font-semibold text-cyan-300 flex items-center gap-1">
                      <span>{flowName} {flowDeg}°</span>
                      <div
                        className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                        style={{ transform: `rotate(${flowDeg}deg)` }}
                        title={isHi ? `बहाव दिशा: ${flowDeg}°` : `Flow heading: ${flowDeg}°`}
                      >
                        <ArrowUp className="h-2.5 w-2.5" />
                      </div>
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Right Map Navigation Buttons (Zoom & Geolocation) */}
      <div className="absolute bottom-28 right-4 z-[500] flex flex-col gap-2">
        {/* GPS Locate Farmer Farm */}
        <button
          onClick={onDetectGps}
          disabled={isLocating}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/85 text-emerald-400 shadow-xl backdrop-blur-md hover:bg-slate-900 active:scale-95 transition disabled:opacity-50"
          title="Detect My Live Farm GPS Location (मेरा खेत खोजें)"
        >
          <LocateFixed className={`h-5 w-5 ${isLocating ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* Center on selected Farm */}
        <button
          onClick={onCenterFarm}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/85 text-slate-200 shadow-xl backdrop-blur-md hover:bg-slate-900 active:scale-95 transition"
          title="Center on Farm (खेत पर केंद्रित करें)"
        >
          <Compass className="h-5 w-5 text-cyan-400" />
        </button>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/85 text-slate-200 shadow-xl backdrop-blur-md hover:bg-slate-900 active:scale-95 transition"
          title="Zoom In"
        >
          <ZoomIn className="h-5 w-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/85 text-slate-200 shadow-xl backdrop-blur-md hover:bg-slate-900 active:scale-95 transition"
          title="Zoom Out"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
      </div>
    </>
  );
};
