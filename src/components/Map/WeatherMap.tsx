import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FarmerLocation, CurrentWeatherData } from '../../types/weather';
import { WindCanvasOverlay } from './WindCanvasOverlay';
import { PrecipitationRadarOverlay } from './PrecipitationRadarOverlay';
import { PrecipitationCloudOverlay } from './PrecipitationCloudOverlay';
import { MapControls } from './MapControls';

interface WeatherMapProps {
  location: FarmerLocation;
  userExactGps?: { lat: number; lon: number; accuracy?: number; name?: string } | null;
  currentWeather: CurrentWeatherData | null;
  onSelectCoordinates: (lat: number, lon: number, customName?: string) => void;
  onDetectGps: () => void;
  isLocating: boolean;
  onAskAiForLocation: () => void;
  lang?: 'hi' | 'en';
}

export const WeatherMap: React.FC<WeatherMapProps> = ({
  location,
  userExactGps,
  currentWeather,
  onSelectCoordinates,
  onDetectGps,
  isLocating,
  onAskAiForLocation,
  lang = 'hi',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Markers
  const blueDotMarkerRef = useRef<L.Marker | null>(null);
  const blueDotCircleRef = useRef<L.Circle | null>(null);
  const inspectedMarkerRef = useRef<L.Marker | null>(null);
  const baseLayersRef = useRef<{ [key: string]: L.LayerGroup }>({});

  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'street' | 'dark'>('satellite');
  const [showWindOverlay, setShowWindOverlay] = useState<boolean>(true);
  const [showRainOverlay, setShowRainOverlay] = useState<boolean>(true);
  const [showBlueCloudsOverlay, setShowBlueCloudsOverlay] = useState<boolean>(true);
  const [showTempOverlay, setShowTempOverlay] = useState<boolean>(false);
  const [showCloudsOverlay, setShowCloudsOverlay] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = userExactGps ? [userExactGps.lat, userExactGps.lon] : [location.lat, location.lon];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: 8,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
    });

    // 1. Satellite Base Layer (Esri HD Satellite + Reference Boundaries)
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
        maxZoom: 19,
      }
    );
    const esriBoundaries = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        opacity: 0.8,
      }
    );
    const satelliteGroup = L.layerGroup([esriSatellite, esriBoundaries]);

    // 2. Dark Canvas
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
    });
    const darkGroup = L.layerGroup([darkLayer]);

    // 3. Street / Topo
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });
    const streetGroup = L.layerGroup([osmLayer]);

    baseLayersRef.current = {
      satellite: satelliteGroup,
      dark: darkGroup,
      street: streetGroup,
    };

    satelliteGroup.addTo(map);

    // Clicking anywhere on map selects that field WITHOUT MOVING the user's fixed Blue Dot!
    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectCoordinates(
        parseFloat(e.latlng.lat.toFixed(4)),
        parseFloat(e.latlng.lng.toFixed(4)),
        `Field (${e.latlng.lat.toFixed(2)}°N, ${e.latlng.lng.toFixed(2)}°E)`
      );
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setMouseCoords({
        lat: parseFloat(e.latlng.lat.toFixed(4)),
        lon: parseFloat(e.latlng.lng.toFixed(4)),
      });
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch base layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.entries(baseLayersRef.current).forEach(([key, layerGroup]) => {
      if (key === activeBaseLayer) {
        if (!map.hasLayer(layerGroup)) {
          layerGroup.addTo(map);
        }
      } else {
        if (map.hasLayer(layerGroup)) {
          map.removeLayer(layerGroup);
        }
      }
    });
  }, [activeBaseLayer]);

  // ---------------------------------------------------------------------------
  // FIXED BLUE DOT AT USER'S EXACT GPS LOCATION (NEVER MOVES ON CLICK)
  // ---------------------------------------------------------------------------
  const hasFlownToGpsRef = useRef<boolean>(false);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const gpsTarget = userExactGps || (location.isExactUserLocation ? location : null);
    if (!gpsTarget) return;

    if (!hasFlownToGpsRef.current) {
      hasFlownToGpsRef.current = true;
      map.flyTo([gpsTarget.lat, gpsTarget.lon], 12, { animate: true, duration: 1.2 });
    }

    const blueDotHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
        <!-- Outer expanding pulse halo -->
        <div class="absolute h-10 w-10 rounded-full bg-blue-500/35 animate-ping pointer-events-none"></div>
        <!-- Middle glowing blue halo -->
        <div class="absolute h-6 w-6 rounded-full bg-blue-500/40 pointer-events-none"></div>
        <!-- Center solid blue dot with crisp white border -->
        <div class="relative h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-xl shadow-blue-500/70"></div>
        <!-- Fixed GPS Label -->
        <div class="absolute -top-7 whitespace-nowrap rounded-md bg-blue-950/95 border border-blue-400/60 px-2 py-0.5 text-[10px] font-bold text-blue-200 shadow-xl pointer-events-none">
          📍 ${gpsTarget.name || 'Your Exact Location (आपका सटीक स्थान)'}
        </div>
      </div>
    `;

    const blueDotIcon = L.divIcon({
      className: 'fixed-user-blue-dot',
      html: blueDotHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (blueDotMarkerRef.current) {
      blueDotMarkerRef.current.setLatLng([gpsTarget.lat, gpsTarget.lon]);
    } else {
      const marker = L.marker([gpsTarget.lat, gpsTarget.lon], {
        icon: blueDotIcon,
        zIndexOffset: 1000, // Always stays on top
      }).addTo(map);

      marker.bindPopup(`
        <div class="p-1 text-slate-800 text-xs">
          <div class="font-bold text-sm text-blue-700 flex items-center gap-1">
            📍 Your Fixed GPS Location (आपका सटीक स्थान)
          </div>
          <div class="text-[11px] text-slate-600 mt-1">
            <strong>Coordinates:</strong> ${gpsTarget.lat.toFixed(4)}°N, ${gpsTarget.lon.toFixed(4)}°E
          </div>
        </div>
      `);
      blueDotMarkerRef.current = marker;
    }

    // Accuracy Circle
    if (gpsTarget.accuracy) {
      if (blueDotCircleRef.current) {
        blueDotCircleRef.current.setLatLng([gpsTarget.lat, gpsTarget.lon]);
        blueDotCircleRef.current.setRadius(Math.max(25, gpsTarget.accuracy));
      } else {
        const circle = L.circle([gpsTarget.lat, gpsTarget.lon], {
          radius: Math.max(25, gpsTarget.accuracy),
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(map);
        blueDotCircleRef.current = circle;
      }
    }
  }, [userExactGps, location.isExactUserLocation]);

  // ---------------------------------------------------------------------------
  // INSPECTED LOCATION PIN (Shows clicked field when exploring different locations)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const isSameAsGps =
      userExactGps &&
      Math.abs(location.lat - userExactGps.lat) < 0.005 &&
      Math.abs(location.lon - userExactGps.lon) < 0.005;

    // If clicked on exact same spot as GPS, no need for redundant inspected pin
    if (isSameAsGps) {
      if (inspectedMarkerRef.current) {
        map.removeLayer(inspectedMarkerRef.current);
        inspectedMarkerRef.current = null;
      }
      return;
    }

    const farmPinHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
        <div class="absolute h-9 w-9 rounded-full bg-emerald-500/25 animate-ping"></div>
        <div class="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 border-2 border-white shadow-2xl text-white text-xs font-bold">
          🌾
        </div>
        <div class="absolute -top-7 whitespace-nowrap rounded-md bg-slate-900/95 border border-emerald-500/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 shadow-lg pointer-events-none">
          ${location.hindiName || location.name.split(',')[0]}
        </div>
      </div>
    `;

    const farmIcon = L.divIcon({
      className: 'inspected-field-pin',
      html: farmPinHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (inspectedMarkerRef.current) {
      inspectedMarkerRef.current.setLatLng([location.lat, location.lon]);
    } else {
      const marker = L.marker([location.lat, location.lon], { icon: farmIcon }).addTo(map);
      marker.bindPopup(`
        <div class="p-1 text-slate-800 text-xs">
          <div class="font-bold text-sm text-emerald-800">
            🌱 ${location.name}
          </div>
          <div class="text-[11px] text-slate-600 mt-0.5">
            ${location.crop ? `<strong>Crop:</strong> ${location.crop}<br/>` : ''}
            <strong>Coordinates:</strong> ${location.lat.toFixed(4)}°N, ${location.lon.toFixed(4)}°E
          </div>
        </div>
      `);
      inspectedMarkerRef.current = marker;
    }
  }, [location, userExactGps]);

  // Controls Handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Center specifically on the user's fixed Blue Dot GPS location
  const handleCenterGps = () => {
    if (!mapInstanceRef.current) return;
    const centerPoint = userExactGps ? [userExactGps.lat, userExactGps.lon] : [location.lat, location.lon];
    mapInstanceRef.current.flyTo(centerPoint as L.LatLngExpression, 12, { duration: 1.0 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Leaflet Map DOM Node */}
      <div ref={mapContainerRef} className="h-full w-full z-0 cursor-crosshair" />

      {/* Wind Particles Animation Canvas (Streamline Lines) */}
      <WindCanvasOverlay
        map={mapInstanceRef.current}
        active={showWindOverlay}
        baseWindSpeed={currentWeather?.windSpeed ?? 14}
        baseWindDirection={currentWeather?.windDirection ?? 90}
        opacity={0.9}
      />

      {/* Live RainViewer Doppler Radar Overlay */}
      <PrecipitationRadarOverlay
        map={mapInstanceRef.current}
        active={showRainOverlay}
        opacity={0.78}
      />

      {/* Live Real Rain Clouds Across India (Dark Blue for Strong Rain, Light Blue for Weak Rain) */}
      <PrecipitationCloudOverlay
        map={mapInstanceRef.current}
        active={showBlueCloudsOverlay}
        rainAmount={currentWeather?.rain ?? 0}
        opacity={0.85}
      />

      {/* Simulated Temperature Thermal Heatmap Overlay */}
      {showTempOverlay && (
        <div
          className="pointer-events-none absolute inset-0 z-[320] mix-blend-color-burn opacity-40 transition-opacity"
          style={{
            background:
              'radial-gradient(circle at 50% 60%, rgba(239, 68, 68, 0.7) 0%, rgba(245, 158, 11, 0.5) 45%, rgba(59, 130, 246, 0.4) 90%)',
          }}
        />
      )}

      {/* Simulated Cloud Cover Overlay */}
      {showCloudsOverlay && (
        <div
          className="pointer-events-none absolute inset-0 z-[330] opacity-35 mix-blend-screen transition-opacity"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 40% 40%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 30%, transparent 70%), radial-gradient(ellipse at 70% 70%, rgba(255, 255, 255, 0.7) 0%, transparent 60%)',
          }}
        />
      )}

      {/* Zoom Earth Floating Map Controls */}
      <MapControls
        activeBaseLayer={activeBaseLayer}
        onSelectBaseLayer={setActiveBaseLayer}
        showWindOverlay={showWindOverlay}
        onToggleWindOverlay={() => setShowWindOverlay(!showWindOverlay)}
        showRainOverlay={showRainOverlay}
        onToggleRainOverlay={() => setShowRainOverlay(!showRainOverlay)}
        showBlueCloudsOverlay={showBlueCloudsOverlay}
        onToggleBlueCloudsOverlay={() => setShowBlueCloudsOverlay(!showBlueCloudsOverlay)}
        showTempOverlay={showTempOverlay}
        onToggleTempOverlay={() => setShowTempOverlay(!showTempOverlay)}
        showCloudsOverlay={showCloudsOverlay}
        onToggleCloudsOverlay={() => setShowCloudsOverlay(!showCloudsOverlay)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenterFarm={handleCenterGps}
        onDetectGps={onDetectGps}
        isLocating={isLocating}
        currentWindSpeed={currentWeather?.windSpeed ?? 14}
        currentWindDirection={currentWeather?.windDirection ?? 90}
        lang={lang}
      />

      {/* Bottom Coordinates & Zoom Tag (Zoom Earth style) */}
      <div className="absolute bottom-2 right-4 z-[450] flex items-center gap-2 rounded-lg bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400 backdrop-blur-sm pointer-events-none">
        <span>Zoom: {currentZoom}x</span>
        <span>•</span>
        <span>
          {mouseCoords
            ? `${mouseCoords.lat.toFixed(2)}° N, ${mouseCoords.lon.toFixed(2)}° E`
            : `${location.lat.toFixed(2)}° N, ${location.lon.toFixed(2)}° E`}
        </span>
        <span>•</span>
        <span className="text-blue-400 font-medium">
          {userExactGps ? '📍 GPS Blue Dot Fixed' : 'India Agro-Radar'}
        </span>
      </div>
    </div>
  );
};
