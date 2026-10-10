import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface WindCanvasOverlayProps {
  map: L.Map | null;
  active: boolean;
  baseWindSpeed: number; // km/h
  baseWindDirection: number; // degrees 0-360 (Compass heading: 0=N, 90=E, 180=S, 270=W)
  opacity?: number;
}

interface WindLineParticle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  speedMultiplier: number;
}

export const WindCanvasOverlay: React.FC<WindCanvasOverlayProps> = ({
  map,
  active,
  baseWindSpeed,
  baseWindDirection,
  opacity = 0.9,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<WindLineParticle[]>([]);

  useEffect(() => {
    if (!map || !active) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Zoom-dependent particle density:
    // When zooming in, more localized wind particle lines appear dynamically
    const getParticleCountForZoom = (zoom: number) => {
      const baseArea = (window.innerWidth * window.innerHeight) / 2400;
      if (zoom <= 5) return Math.min(300, Math.floor(baseArea * 0.75)); // All-India overview
      if (zoom <= 8) return Math.min(550, Math.floor(baseArea * 1.25)); // State-level
      if (zoom <= 11) return Math.min(850, Math.floor(baseArea * 1.75)); // District-level localized
      return Math.min(1250, Math.floor(baseArea * 2.4)); // Farmland / Village localized view
    };

    const initParticles = (width: number, height: number, count: number) => {
      const particles: WindLineParticle[] = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          age: Math.floor(Math.random() * 50),
          maxAge: 40 + Math.floor(Math.random() * 45),
          speedMultiplier: 0.85 + Math.random() * 0.35,
        });
      }
      particlesRef.current = particles;
    };

    const resizeCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      const count = getParticleCountForZoom(map.getZoom());
      initParticles(size.x, size.y, count);
    };

    resizeCanvas();

    const handleZoomEnd = () => {
      const count = getParticleCountForZoom(map.getZoom());
      const size = map.getSize();
      initParticles(size.x, size.y, count);
    };

    map.on('zoomend', handleZoomEnd);
    map.on('resize', resizeCanvas);

    // Dynamic wind speed color palette (cyan -> emerald -> amber -> orange -> rose)
    const getLineColor = (speedKmh: number, alpha: number) => {
      if (speedKmh < 10) return `rgba(56, 189, 248, ${alpha})`; // Sky blue (calm breeze)
      if (speedKmh < 20) return `rgba(52, 211, 153, ${alpha})`; // Emerald mint (moderate)
      if (speedKmh < 32) return `rgba(250, 204, 21, ${alpha})`; // Amber yellow (active)
      if (speedKmh < 45) return `rgba(251, 146, 60, ${alpha})`; // Vivid orange (strong)
      return `rgba(244, 63, 94, ${alpha})`; // Crimson red (high gusts)
    };

    let lastTime = performance.now();

    /**
     * Physical wind vector calculation following international meteorological standards (WMO, IMD, AccuWeather):
     *
     * Meteorological wind direction `baseWindDirection` is defined as the azimuth FROM which the wind is blowing:
     * - North wind (0° / 360°): Air arrives FROM the North and blows TOWARDS the South (flow heading = 180°).
     * - East wind (90°): Air arrives FROM the East and blows TOWARDS the West (flow heading = 270°).
     * - South wind (180°): Air arrives FROM the South and blows TOWARDS the North (flow heading = 0°).
     * - West wind (270°): Air arrives FROM the West and blows TOWARDS the East (flow heading = 90°).
     *
     * Therefore, the physical direction of particle motion (flow heading) is:
     *   flowHeadingDeg = (baseWindDirection + 180) % 360;
     *
     * On the 2D map screen coordinate plane (where +x is East/right and +y is South/down):
     *   u = Math.sin(flowRad)   // Eastward component of velocity
     *   v = -Math.cos(flowRad)  // Northward is -y, Southward is +y
     *
     * Examples:
     * - For East wind (90°): flowHeading = 270° -> u = sin(270°) = -1 (moves West / leftwards), v = -cos(270°) = 0
     * - For North wind (0°): flowHeading = 180° -> u = sin(180°) = 0, v = -cos(180°) = +1 (moves South / downwards)
     * - For South wind (180°): flowHeading = 0° -> u = sin(0°) = 0, v = -cos(0°) = -1 (moves North / upwards)
     * - For West wind (270°): flowHeading = 90° -> u = sin(90°) = +1 (moves East / rightwards), v = -cos(90°) = 0
     */
    const computeWindVector = (
      zoom: number
    ): { u: number; v: number; speed: number; flowHeadingDeg: number } => {
      const originDeg = baseWindDirection;
      const effectiveSpeed = Math.max(3, baseWindSpeed);

      const flowHeadingDeg = (originDeg + 180) % 360;
      const flowRad = flowHeadingDeg * (Math.PI / 180);

      const u = Math.sin(flowRad);
      const v = -Math.cos(flowRad);

      return { u, v, speed: effectiveSpeed, flowHeadingDeg };
    };

    const render = (time: number) => {
      const delta = Math.min(32, time - lastTime);
      lastTime = time;
      const step = delta / 16;

      const width = canvas.width;
      const height = canvas.height;
      const zoom = map.getZoom();

      // Clear frame cleanly
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      ctx.lineWidth = zoom >= 12 ? 2.0 : zoom >= 9 ? 1.6 : 1.3;
      ctx.lineCap = 'round';

      const vec = computeWindVector(zoom);

      // Line length scales with wind speed and zoom for high-contrast visibility
      const lineLength = Math.max(10, Math.min(48, vec.speed * 1.3)) * (zoom >= 10 ? 1.2 : 1.0);
      const velocity = (vec.speed / 11 + 0.7) * step;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move particle along vector
        p.x += vec.u * velocity * p.speedMultiplier;
        p.y += vec.v * velocity * p.speedMultiplier;
        p.age++;

        // Smooth fade-in and fade-out
        const lifeRatio = p.age / p.maxAge;
        let alpha = 0;
        if (lifeRatio < 0.25) {
          alpha = (lifeRatio / 0.25) * 0.9;
        } else if (lifeRatio > 0.75) {
          alpha = ((1 - lifeRatio) / 0.25) * 0.9;
        } else {
          alpha = 0.9;
        }
        alpha *= opacity;

        // Tail behind particle head along vector
        const tailX = p.x - vec.u * lineLength;
        const tailY = p.y - vec.v * lineLength;

        // Draw particle line
        ctx.strokeStyle = getLineColor(vec.speed, Math.max(0, Math.min(1, alpha)));
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Re-spawn seamlessly
        if (
          p.age >= p.maxAge ||
          p.x < -60 ||
          p.x > width + 60 ||
          p.y < -60 ||
          p.y > height + 60
        ) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.age = 0;
          p.maxAge = 40 + Math.floor(Math.random() * 45);
          p.speedMultiplier = 0.85 + Math.random() * 0.35;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off('zoomend', handleZoomEnd);
      map.off('resize', resizeCanvas);
    };
  }, [map, active, baseWindSpeed, baseWindDirection, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[420]"
      style={{ opacity }}
    />
  );
};
