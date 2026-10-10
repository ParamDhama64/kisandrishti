import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RainCloudCell } from '../../types/weather';
import { getAccuWeatherKey } from '../../services/weatherApi';

interface PrecipitationCloudOverlayProps {
  map: L.Map | null;
  active: boolean;
  rainAmount: number; // Current farmer rain in mm
  opacity?: number;
}

export const PrecipitationCloudOverlay: React.FC<PrecipitationCloudOverlayProps> = ({
  map,
  active,
  rainAmount,
  opacity = 0.85,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [rainCells, setRainCells] = useState<RainCloudCell[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch real live precipitation rain cells across India from AccuWeather/Open-Meteo radar proxy
  useEffect(() => {
    if (!active) return;

    let mounted = true;
    const fetchRainCells = async () => {
      try {
        const key = getAccuWeatherKey();
        const res = await fetch(`/api/live-rain-cells${key ? `?apikey=${encodeURIComponent(key)}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.cells) {
            setRainCells(data.cells);
            setLastUpdated(data.updatedAt || new Date().toISOString());
          }
        }
      } catch (err) {
        console.warn('Live rain cells fetch error:', err);
      }
    };

    fetchRainCells();
    const interval = setInterval(fetchRainCells, 300000); // refresh every 5 min

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [active]);

  useEffect(() => {
    if (!map || !active) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
    };

    resizeCanvas();

    let time = 0;

    const render = () => {
      time += 0.02;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // ONLY RENDER CLOUDS WHERE THERE IS ACTUAL RAIN
      rainCells.forEach((cell, idx) => {
        // Drift coordinates slightly with atmospheric winds
        const driftLat = cell.lat + Math.sin(time * 0.35 + idx) * 0.035;
        const driftLon = cell.lon + Math.cos(time * 0.35 + idx) * 0.035;

        const screenPoint = map.latLngToContainerPoint([driftLat, driftLon]);

        // Don't draw if far off viewport
        if (
          screenPoint.x < -150 ||
          screenPoint.x > width + 150 ||
          screenPoint.y < -150 ||
          screenPoint.y > height + 150
        ) {
          return;
        }

        const zoom = map.getZoom();
        const baseRadiusKm = cell.intensity === 'heavy' ? 85 : 55;
        const pixelRadius = Math.max(30, baseRadiusKm * Math.pow(2, zoom - 7) * 0.85);

        const pulse = 1 + Math.sin(time + idx * 1.3) * 0.05;
        const rad = pixelRadius * pulse;

        // Radial gradient:
        // Dark blue for stronger rain, Light blue for weaker rain
        const grad = ctx.createRadialGradient(
          screenPoint.x,
          screenPoint.y,
          0,
          screenPoint.x,
          screenPoint.y,
          rad
        );

        if (cell.intensity === 'heavy') {
          // Stronger rain: Dark Navy / Indigo Blue (#172554 -> #1e3a8a -> #1d4ed8)
          grad.addColorStop(0, `rgba(23, 37, 84, ${0.88 * opacity})`);
          grad.addColorStop(0.35, `rgba(30, 58, 138, ${0.75 * opacity})`);
          grad.addColorStop(0.7, `rgba(29, 78, 216, ${0.45 * opacity})`);
          grad.addColorStop(1, 'rgba(29, 78, 216, 0)');
        } else {
          // Weaker rain / drizzle: Light Sky Blue (#60a5fa -> #93c5fd -> #bfdbfe)
          grad.addColorStop(0, `rgba(96, 165, 250, ${0.68 * opacity})`);
          grad.addColorStop(0.45, `rgba(147, 197, 253, ${0.45 * opacity})`);
          grad.addColorStop(0.75, `rgba(191, 219, 254, ${0.25 * opacity})`);
          grad.addColorStop(1, 'rgba(191, 219, 254, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(screenPoint.x, screenPoint.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Secondary organic cloud puff lobe
        const lobeDist = rad * 0.38;
        const lobeX = screenPoint.x + Math.cos(idx * 2 + time * 0.25) * lobeDist;
        const lobeY = screenPoint.y + Math.sin(idx * 2 + time * 0.25) * lobeDist;
        const lobeRad = rad * 0.65;

        const lobeGrad = ctx.createRadialGradient(lobeX, lobeY, 0, lobeX, lobeY, lobeRad);
        if (cell.intensity === 'heavy') {
          lobeGrad.addColorStop(0, `rgba(30, 58, 138, ${0.75 * opacity})`);
          lobeGrad.addColorStop(1, 'rgba(30, 58, 138, 0)');
        } else {
          lobeGrad.addColorStop(0, `rgba(147, 197, 253, ${0.45 * opacity})`);
          lobeGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
        }

        ctx.fillStyle = lobeGrad;
        ctx.beginPath();
        ctx.arc(lobeX, lobeY, lobeRad, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const onMapChange = () => render();
    map.on('move', onMapChange);
    map.on('zoom', onMapChange);
    map.on('resize', resizeCanvas);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off('move', onMapChange);
      map.off('zoom', onMapChange);
      map.off('resize', resizeCanvas);
    };
  }, [map, active, rainCells, opacity]);

  if (!active) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[360] transition-opacity duration-300"
        style={{ opacity }}
      />

      {/* Legend Badge for Blue Rain Clouds */}
      <div className="absolute top-20 right-16 z-[490] hidden md:flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-[11px]">
          <span>🌧️ Live Rain Clouds ({rainCells.length} Active Cells)</span>
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-white/10 text-[10px]">
          <span className="text-blue-300">Light (&lt;2mm)</span>
          <div className="flex h-2.5 w-16 rounded overflow-hidden">
            <div className="w-1/2 bg-blue-300" title="Light Rain (Light Blue)" />
            <div className="w-1/2 bg-blue-950 border border-blue-700" title="Heavy Rain (Dark Blue)" />
          </div>
          <span className="text-blue-400 font-bold">Heavy (&gt;2mm)</span>
        </div>
      </div>
    </>
  );
};
