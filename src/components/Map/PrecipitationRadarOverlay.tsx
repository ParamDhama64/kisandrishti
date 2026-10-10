import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { Play, Pause, RotateCcw, CloudRain, Clock } from 'lucide-react';
import { fetchRainViewerRadar, RainViewerRadarFrame } from '../../services/weatherApi';

interface PrecipitationRadarOverlayProps {
  map: L.Map | null;
  active: boolean;
  opacity?: number;
}

export const PrecipitationRadarOverlay: React.FC<PrecipitationRadarOverlayProps> = ({
  map,
  active,
  opacity = 0.75,
}) => {
  const [radarFrames, setRadarFrames] = useState<RainViewerRadarFrame[]>([]);
  const [apiHost, setApiHost] = useState<string>('https://tilecache.rainviewer.com');
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch RainViewer radar metadata
  useEffect(() => {
    if (!active) return;

    let mounted = true;
    setIsLoading(true);

    fetchRainViewerRadar()
      .then((data) => {
        if (!mounted) return;
        setApiHost(data.host || 'https://tilecache.rainviewer.com');
        const allFrames = [...data.past, ...data.nowcast];
        if (allFrames.length > 0) {
          setRadarFrames(allFrames);
          setCurrentFrameIndex(Math.max(0, data.past.length - 1)); // Default to latest real past frame
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Radar metadata error:', err);
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [active]);

  // Update Leaflet tile layer when frame or active state changes
  useEffect(() => {
    if (!map) return;

    if (!active || radarFrames.length === 0) {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
      return;
    }

    const currentFrame = radarFrames[currentFrameIndex];
    if (!currentFrame) return;

    // Remove old layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Color scheme 2 is radar rainbow (standard meteorological rain colors)
    const tileUrl = `${apiHost}/v2/radar/${currentFrame.time}/256/{z}/{x}/{y}/2/1_1.png`;

    const newLayer = L.tileLayer(tileUrl, {
      opacity,
      maxZoom: 18,
      zIndex: 350,
      attribution: 'Radar © RainViewer',
    });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;

    return () => {
      if (tileLayerRef.current && map.hasLayer(tileLayerRef.current)) {
        map.removeLayer(tileLayerRef.current);
      }
    };
  }, [map, active, currentFrameIndex, radarFrames, apiHost, opacity]);

  // Animation playback loop
  useEffect(() => {
    if (!active || !isPlaying || radarFrames.length <= 1) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, 750);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, isPlaying, radarFrames.length]);

  if (!active || radarFrames.length === 0) return null;

  const currentFrame = radarFrames[currentFrameIndex];
  const frameDate = currentFrame ? new Date(currentFrame.time * 1000) : new Date();
  const timeFormatted = frameDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="absolute bottom-20 left-4 z-[500] flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/80 p-3 shadow-2xl backdrop-blur-md text-white transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <CloudRain className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-200">
              Live Rain Radar (डॉपलर वर्षा रडार)
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3 text-cyan-400" />
              <span>{timeFormatted} IST</span>
              {currentFrameIndex >= radarFrames.length - 3 && (
                <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-bold text-emerald-400">
                  NOWCAST
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause radar loop' : 'Play radar loop'}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 active:scale-95 transition"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
      </div>

      {/* Frame Scrubber */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="range"
          min={0}
          max={radarFrames.length - 1}
          value={currentFrameIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentFrameIndex(parseInt(e.target.value, 10));
          }}
          className="h-1.5 w-44 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
        />
        <button
          onClick={() => {
            setCurrentFrameIndex(radarFrames.length - 1);
            setIsPlaying(true);
          }}
          title="Jump to current live"
          className="text-slate-400 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Rain intensity legend */}
      <div className="flex items-center justify-between pt-1 text-[9px] text-slate-400">
        <span>Light (हल्की)</span>
        <div className="flex h-1.5 w-24 overflow-hidden rounded-full">
          <div className="w-1/4 bg-cyan-400"></div>
          <div className="w-1/4 bg-emerald-400"></div>
          <div className="w-1/4 bg-yellow-400"></div>
          <div className="w-1/4 bg-red-500"></div>
        </div>
        <span>Heavy (भारी)</span>
      </div>
    </div>
  );
};
