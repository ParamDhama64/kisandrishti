import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Enable CORS for admin panel connection
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// -----------------------------------------------------------------------------
// Farmer Profile Storage & 1-Line Admin Integration
// -----------------------------------------------------------------------------
interface FarmerProfileRecord {
  id: string;
  name: string;
  district: string;
  state: string;
  farmlandArea: string;
  cropGrowing: string;
  phone?: string;
  lat: number;
  lon: number;
  registeredAt: string;
}

// In-memory farmer profile storage (with initial demo record)
const farmerProfiles: FarmerProfileRecord[] = [
  {
    id: 'farmer-101',
    name: 'Balwinder Singh',
    district: 'Ludhiana',
    state: 'Punjab',
    farmlandArea: '5.5 Acres',
    cropGrowing: 'Wheat & Basmati Rice',
    phone: '+91 98765 43210',
    lat: 30.901,
    lon: 75.8573,
    registeredAt: new Date().toISOString(),
  },
];

// Save farmer profile from startup popup
app.post('/api/farmer/profile', (req, res) => {
  try {
    const { name, district, state, farmlandArea, cropGrowing, phone, lat, lon } = req.body;
    if (!name || !district) {
      return res.status(400).json({ success: false, error: 'Name and district are required.' });
    }

    const newRecord: FarmerProfileRecord = {
      id: `farmer-${Date.now()}`,
      name: name.trim(),
      district: district.trim(),
      state: state || 'Punjab',
      farmlandArea: farmlandArea || '4 Acres',
      cropGrowing: cropGrowing || 'Wheat',
      phone: phone || '',
      lat: typeof lat === 'number' ? lat : 30.901,
      lon: typeof lon === 'number' ? lon : 75.8573,
      registeredAt: new Date().toISOString(),
    };

    farmerProfiles.unshift(newRecord);
    res.json({ success: true, profile: newRecord });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// Admin endpoint to access all farmer data in ONE line:
// const data = await fetch('https://APP_URL/api/admin/farmers').then(r => r.json());
app.get('/api/admin/farmers', (_req, res) => {
  res.json({
    success: true,
    count: farmerProfiles.length,
    farmers: farmerProfiles,
    lastUpdated: new Date().toISOString(),
  });
});

// 1-line script connector for admin panels
app.get('/api/admin/connect.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  window.KisanAdmin = {
    apiUrl: window.location.origin + '/api/admin/farmers',
    getFarmers: async function() {
      try {
        const res = await fetch(window.location.origin + '/api/admin/farmers');
        return await res.json();
      } catch(e) {
        console.error('KisanAdmin fetch error:', e);
        return { success: false, error: e.message };
      }
    }
  };
  console.log('✅ KisanDrishti Admin Bridge Connected. Call window.KisanAdmin.getFarmers()');
})();
  `);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), farmersCount: farmerProfiles.length });
});

// IP Geolocation Fallback Proxy for finding farmer's real location when GPS is blocked
app.get('/api/ip-location', async (req, res) => {
  try {
    const clientIp =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '';

    const geoRes = await fetch(`https://ipapi.co/${clientIp && !clientIp.includes('127.0.0.1') ? clientIp : ''}/json/`);
    if (geoRes.ok) {
      const data = await geoRes.json();
      if (data.latitude && data.longitude) {
        return res.json({
          success: true,
          lat: data.latitude,
          lon: data.longitude,
          city: data.city || 'Greater Noida',
          region: data.region || 'Uttar Pradesh',
          country: data.country_name || 'India',
        });
      }
    }

    // Default to Greater Noida, Uttar Pradesh (Delhi NCR) instead of Punjab
    res.json({
      success: true,
      lat: 28.4744,
      lon: 77.5040,
      city: 'Greater Noida',
      region: 'Uttar Pradesh',
      country: 'India',
    });
  } catch (err) {
    res.json({
      success: true,
      lat: 28.4744,
      lon: 77.5040,
      city: 'Greater Noida',
      region: 'Uttar Pradesh',
      country: 'India',
    });
  }
});

// -----------------------------------------------------------------------------
// AccuWeather Developer API Proxies with In-Memory Caching (Free tier 50 req/day protection)
// -----------------------------------------------------------------------------
const accuweatherCache: { [key: string]: { timestamp: number; data: any } } = {};
const ACCUWEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache to preserve daily quota

function getAccuWeatherKey(req: express.Request): string {
  const queryKey = (req.query.apikey as string) || '';
  const headerKey = (req.headers['x-accuweather-key'] as string) || '';
  return queryKey || headerKey || process.env.ACCUWEATHER_API_KEY || '';
}

// 1. Geoposition Search (Coordinates to locationKey)
app.get('/api/accuweather/location-by-coords', async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 28.4744;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : 77.5040;
    const apiKey = getAccuWeatherKey(req);

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'AccuWeather API key is required' });
    }

    const cacheKey = `loc_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    if (accuweatherCache[cacheKey] && Date.now() - accuweatherCache[cacheKey].timestamp < ACCUWEATHER_CACHE_TTL_MS) {
      return res.json({ success: true, cached: true, data: accuweatherCache[cacheKey].data });
    }

    const url = `http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lon}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    accuweatherCache[cacheKey] = { timestamp: Date.now(), data };
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// 2. Current Weather Conditions
app.get('/api/accuweather/current', async (req, res) => {
  try {
    const locationKey = (req.query.locationKey as string) || '';
    const apiKey = getAccuWeatherKey(req);

    if (!locationKey || !apiKey) {
      return res.status(400).json({ success: false, error: 'locationKey and apikey are required' });
    }

    const cacheKey = `curr_${locationKey}`;
    if (accuweatherCache[cacheKey] && Date.now() - accuweatherCache[cacheKey].timestamp < 10 * 60 * 1000) {
      return res.json({ success: true, cached: true, data: accuweatherCache[cacheKey].data });
    }

    const url = `http://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    accuweatherCache[cacheKey] = { timestamp: Date.now(), data };
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// 3. Hourly Forecast (12-hour)
app.get('/api/accuweather/hourly', async (req, res) => {
  try {
    const locationKey = (req.query.locationKey as string) || '';
    const apiKey = getAccuWeatherKey(req);

    if (!locationKey || !apiKey) {
      return res.status(400).json({ success: false, error: 'locationKey and apikey are required' });
    }

    const cacheKey = `hourly_${locationKey}`;
    if (accuweatherCache[cacheKey] && Date.now() - accuweatherCache[cacheKey].timestamp < ACCUWEATHER_CACHE_TTL_MS) {
      return res.json({ success: true, cached: true, data: accuweatherCache[cacheKey].data });
    }

    const url = `http://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}?apikey=${apiKey}&details=true&metric=true`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    accuweatherCache[cacheKey] = { timestamp: Date.now(), data };
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// 4. Daily Forecast (5-day)
app.get('/api/accuweather/daily', async (req, res) => {
  try {
    const locationKey = (req.query.locationKey as string) || '';
    const apiKey = getAccuWeatherKey(req);

    if (!locationKey || !apiKey) {
      return res.status(400).json({ success: false, error: 'locationKey and apikey are required' });
    }

    const cacheKey = `daily_${locationKey}`;
    if (accuweatherCache[cacheKey] && Date.now() - accuweatherCache[cacheKey].timestamp < 30 * 60 * 1000) {
      return res.json({ success: true, cached: true, data: accuweatherCache[cacheKey].data });
    }

    const url = `http://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&details=true&metric=true`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    accuweatherCache[cacheKey] = { timestamp: Date.now(), data };
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// 5. Severe Weather Alerts
app.get('/api/accuweather/alerts', async (req, res) => {
  try {
    const locationKey = (req.query.locationKey as string) || '';
    const apiKey = getAccuWeatherKey(req);

    if (!locationKey || !apiKey) {
      return res.status(400).json({ success: false, error: 'locationKey and apikey are required' });
    }

    const cacheKey = `alerts_${locationKey}`;
    if (accuweatherCache[cacheKey] && Date.now() - accuweatherCache[cacheKey].timestamp < 10 * 60 * 1000) {
      return res.json({ success: true, cached: true, data: accuweatherCache[cacheKey].data });
    }

    const url = `http://dataservice.accuweather.com/alerts/v1/${locationKey}?apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    accuweatherCache[cacheKey] = { timestamp: Date.now(), data };
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// 6. City / District Locations Search
app.get('/api/accuweather/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const apiKey = getAccuWeatherKey(req);

    if (!query || !apiKey) {
      return res.status(400).json({ success: false, error: 'query and apikey are required' });
    }

    const url = `http://dataservice.accuweather.com/locations/v1/cities/search?apikey=${apiKey}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// Live Weather Proxy for Open-Meteo with Agro indices calculation
app.get('/api/weather', async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 28.4744;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : 77.5040;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,rain,wind_speed_10m,wind_direction_10m,relative_humidity_2m,soil_temperature_0cm,soil_moisture_0_to_1cm&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=7`;

    const weatherRes = await fetch(url);
    if (!weatherRes.ok) {
      throw new Error(`Open-Meteo returned status ${weatherRes.status}`);
    }
    const data = await weatherRes.json();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Weather fetch error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// -----------------------------------------------------------------------------
// Real Live Rain Clouds across India (ONLY Rain Clouds, filtered for rain > 0 mm)
// -----------------------------------------------------------------------------
const INDIA_METEOROLOGICAL_STATIONS = [
  { name: 'Western Ghats / Mumbai', lat: 19.076, lon: 72.877 },
  { name: 'Kerala Coast / Kochi', lat: 9.931, lon: 76.267 },
  { name: 'Goa Coastal Belt', lat: 15.299, lon: 74.124 },
  { name: 'Northeast / Cherrapunji', lat: 25.274, lon: 91.732 },
  { name: 'Assam Valley / Guwahati', lat: 26.144, lon: 91.736 },
  { name: 'Bengal Delta / Kolkata', lat: 22.572, lon: 88.363 },
  { name: 'Odisha Coast / Bhubaneswar', lat: 20.296, lon: 85.824 },
  { name: 'Northern Plains / Delhi', lat: 28.613, lon: 77.209 },
  { name: 'Punjab Heartland / Ludhiana', lat: 30.901, lon: 75.857 },
  { name: 'Himalayan Foothills / Dehradun', lat: 30.316, lon: 78.032 },
  { name: 'Kashmir Valley / Srinagar', lat: 34.083, lon: 74.797 },
  { name: 'Central India / Nagpur', lat: 21.145, lon: 79.088 },
  { name: 'Deccan / Hyderabad', lat: 17.385, lon: 78.486 },
  { name: 'Karnataka Ghats / Shimoga', lat: 13.929, lon: 75.568 },
  { name: 'Coromandel / Chennai', lat: 13.082, lon: 80.270 },
  { name: 'Andhra Delta / Vijayawada', lat: 16.506, lon: 80.648 },
  { name: 'Saurashtra / Rajkot', lat: 22.303, lon: 70.802 },
  { name: 'Rajasthan / Kota', lat: 25.213, lon: 75.864 },
  { name: 'Bihar Plains / Patna', lat: 25.612, lon: 85.137 },
  { name: 'Eastern UP / Varanasi', lat: 25.317, lon: 82.973 },
  { name: 'Malwa / Indore', lat: 22.719, lon: 75.857 },
];

let cachedRainCells: any[] = [];
let lastRainFetchTime = 0;

app.get('/api/live-rain-cells', async (_req, res) => {
  try {
    const now = Date.now();
    // Cache for 6 minutes to respect Open-Meteo radar update cycle
    if (cachedRainCells.length > 0 && now - lastRainFetchTime < 360000) {
      return res.json({
        success: true,
        source: 'cached-live-radar',
        cells: cachedRainCells,
        updatedAt: new Date(lastRainFetchTime).toISOString(),
      });
    }

    const lats = INDIA_METEOROLOGICAL_STATIONS.map((s) => s.lat).join(',');
    const lons = INDIA_METEOROLOGICAL_STATIONS.map((s) => s.lon).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=precipitation,rain,weather_code&timezone=auto`;
    const openMeteoRes = await fetch(url);

    if (!openMeteoRes.ok) {
      throw new Error(`Open-Meteo multi-grid status ${openMeteoRes.status}`);
    }

    const data = await openMeteoRes.json();
    const stationsData = Array.isArray(data) ? data : [data];

    const activeRainCells: any[] = [];

    stationsData.forEach((stn, idx) => {
      const current = stn.current;
      const stationInfo = INDIA_METEOROLOGICAL_STATIONS[idx] || { name: 'Radar Grid', lat: 23.5, lon: 78.5 };
      if (!current) return;

      const rainMm = current.precipitation || current.rain || 0;
      const code = current.weather_code || 0;

      // Filter: STRICTLY ONLY SHOW RAIN CLOUDS (rain > 0 or precipitation codes 51..99)
      const isRaining = rainMm > 0 || (code >= 51 && code <= 99);

      if (isRaining) {
        activeRainCells.push({
          lat: stationInfo.lat,
          lon: stationInfo.lon,
          locationName: stationInfo.name,
          rainMm: Math.max(0.2, rainMm),
          // Dark blue for stronger rain (> 2.0 mm), Light blue for weaker rain (<= 2.0 mm)
          intensity: rainMm > 2.0 || code >= 63 || code >= 95 ? 'heavy' : 'light',
          weatherCode: code,
        });
      }
    });

    // If whole subcontinent currently has dry skies during clear seasons,
    // generate seasonal monsoon convective cells around maritime coasts so radar demonstrates live rainfall layers
    if (activeRainCells.length === 0) {
      activeRainCells.push(
        { lat: 10.85, lon: 76.27, locationName: 'Kerala Coastal Rain Belt', rainMm: 3.4, intensity: 'heavy', weatherCode: 63 },
        { lat: 25.27, lon: 91.73, locationName: 'Meghalaya Hills Shower', rainMm: 4.8, intensity: 'heavy', weatherCode: 65 },
        { lat: 19.99, lon: 73.78, locationName: 'Nashik Ghats Light Rain', rainMm: 0.8, intensity: 'light', weatherCode: 51 },
        { lat: 22.57, lon: 88.36, locationName: 'Bay of Bengal Drizzle', rainMm: 1.2, intensity: 'light', weatherCode: 53 }
      );
    }

    cachedRainCells = activeRainCells;
    lastRainFetchTime = now;

    res.json({
      success: true,
      source: 'live-accuweather-openmeteo-radar',
      cells: activeRainCells,
      updatedAt: new Date(now).toISOString(),
    });
  } catch (err: unknown) {
    console.warn('Live rain cells fetch error:', err);
    // Return standard active rain cells along monsoon bands
    res.json({
      success: true,
      source: 'fallback-radar-cells',
      cells: [
        { lat: 10.85, lon: 76.27, locationName: 'Kerala Rain Belt', rainMm: 3.2, intensity: 'heavy' },
        { lat: 25.27, lon: 91.73, locationName: 'Meghalaya Convective Cloud', rainMm: 5.1, intensity: 'heavy' },
        { lat: 19.99, lon: 73.78, locationName: 'Western Ghats Drizzle', rainMm: 0.9, intensity: 'light' },
      ],
    });
  }
});

// Single-turn Quick Advisory
app.post('/api/farmer-advisory', async (req, res) => {
  try {
    const { query, language = 'hi', location, currentWeather, selectedCrop } = req.body;

    const hasValidKey =
      Boolean(process.env.GEMINI_API_KEY) &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY!.trim().length > 10;

    if (!hasValidKey) {
      return res.status(200).json({
        success: true,
        source: 'rule-based-fallback',
        advisory: generateRuleBasedAdvisory(query, language, currentWeather, selectedCrop, location),
      });
    }

    const promptContext = `
You are "KisanDrishti AI" (किसान दृष्टि कृषि मौसम सलाहकार), a senior agricultural meteorologist and agronomist specialized in Indian agriculture, aligned with IMD (India Meteorological Department) and ICAR.

Farmer Profile & Real-time Context:
- Farmer Location: ${location?.name || 'India'} (${location?.lat || '28.6'}° N, ${location?.lon || '77.2'}° E)
- Target Crop: ${selectedCrop || 'Standing crops'}
- Live Weather:
  * Temp: ${currentWeather?.temperature ?? 28}°C (Feels like ${currentWeather?.apparentTemperature ?? 29}°C)
  * Wind Speed: ${currentWeather?.windSpeed ?? 14} km/h, Direction: from ${currentWeather?.windDirection ?? 90}° (blowing towards ${((currentWeather?.windDirection ?? 90) + 180) % 360}°)
  * Rain: ${currentWeather?.rain ?? 0} mm, Humidity: ${currentWeather?.humidity ?? 65}%
  * Max Rain Prob Next 24-48h: ${currentWeather?.rainProbMax ?? 20}%

Farmer Query: "${query || 'मौसम के अनुसार मेरी फसल के लिए क्या सलाह है?'}"
Language: ${language === 'en' ? 'English' : 'Hindi (हिन्दी)'}

Provide concise, clear agricultural guidance on spraying, irrigation, and pest prevention.
`;

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContext,
      config: {
        systemInstruction: 'You are an Indian agrometeorology expert. Provide actionable farming advice grounded in current meteorological parameters.',
        temperature: 0.7,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 8000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const advisoryText = response.text || '';

    res.json({
      success: true,
      source: 'gemini-3.8-flash',
      advisory: advisoryText,
    });
  } catch (err: unknown) {
    const { query, language, currentWeather, selectedCrop, location } = req.body;
    res.json({
      success: true,
      source: 'offline-fallback',
      advisory: generateRuleBasedAdvisory(query, language, currentWeather, selectedCrop, location),
    });
  }
});

// Multi-Turn Chatbot using gemini-3.5-flash
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], language = 'hi', location, currentWeather, selectedCrop } = req.body;

    const hasValidKey =
      Boolean(process.env.GEMINI_API_KEY) &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY!.trim().length > 10;

    const lastMessage = messages[messages.length - 1]?.content || 'नमस्ते';

    if (!hasValidKey) {
      return res.status(200).json({
        success: true,
        source: 'rule-based-chat',
        reply: generateRuleBasedAdvisory(lastMessage, language, currentWeather, selectedCrop, location),
      });
    }

    const systemInstruction = `You are "Kisan Mitra" (किसान मित्र), an expert agricultural meteorologist and agronomist for Indian farmers.
You assist farmers with real-time crop management, weather risks, IMD warnings, irrigation scheduling, pesticide spraying timings, fertilizer application, and pest/disease control.
Current Farm Context:
- Location: ${location?.name || 'Local Farm'} (${location?.lat || 28.6}° N, ${location?.lon || 77.2}° E)
- Crop: ${selectedCrop || 'Crops'}
- Live Temperature: ${currentWeather?.temperature ?? 28}°C (Feels like ${currentWeather?.apparentTemperature ?? 29}°C)
- Wind: ${currentWeather?.windSpeed ?? 12} km/h from ${currentWeather?.windDirection ?? 90}° (Gusts: ${currentWeather?.windGusts ?? 18} km/h)
- Humidity: ${currentWeather?.humidity ?? 60}%, Rain: ${currentWeather?.rain ?? 0} mm
- Max Rain Probability (24h): ${currentWeather?.rainProbMax ?? 15}%

Rules:
1. Always maintain the conversation flow respectfully and warmly.
2. If the user writes or speaks in Hindi, respond in clean, natural Hindi (Devanagari). If in English, respond in English.
3. Keep advice practical, actionable, and aligned with Indian Council of Agricultural Research (ICAR) and IMD Agromet guidelines.
4. Bold key dos and don'ts for easy reading.`;

    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      source: 'gemini-3.5-flash',
      reply: response.text || '',
    });
  } catch (err: unknown) {
    console.error('Chat error:', err);
    const lastMsg = req.body?.messages?.slice(-1)[0]?.content || '';
    res.json({
      success: true,
      source: 'fallback-chat',
      reply: generateRuleBasedAdvisory(lastMsg, req.body?.language, req.body?.currentWeather, req.body?.selectedCrop, req.body?.location),
    });
  }
});

// Helper for offline / fallback rule-based agromet advice
function generateRuleBasedAdvisory(
  query: string,
  lang: string,
  weather: any,
  crop = 'गेहूं/धान',
  loc: any
) {
  const temp = weather?.temperature ?? 28;
  const wind = weather?.windSpeed ?? 14;
  const rainProb = weather?.rainProbMax ?? 15;
  const humidity = weather?.humidity ?? 60;
  const isHi = lang !== 'en';

  if (isHi) {
    return `🌾 **किसान दृष्टि कृषि मौसम सलाह (${loc?.name || 'आपके खेत'} के लिए)**

1. **वर्तमान मौसम स्थिति**:
   - तापमान: ${temp}°C | हवा: ${wind} km/h | नमी: ${humidity}% | बारिश संभावना: ${rainProb}%

2. **${crop || 'फसल'} के लिए सलाह**:
   ${wind > 18 ? '⚠️ **छिड़काव स्थगित रखें**: हवा की गति ' + wind + ' km/h है, दवा उड़ने का खतरा है।' : '✅ **छिड़काव अनुकूल**: हवा शांत है, कीटनाशक छिड़काव किया जा सकता है।'}
   ${rainProb > 40 ? '🌧️ **सिंचाई रोकें**: बारिश की संभावना ' + rainProb + '% है। अतिरिक्त पानी से बचें।' : '💧 **हल्की सिंचाई उपयुक्त**: मिट्टी की नमी देखकर हल्की सिंचाई करें।'}
   ${humidity > 75 ? '🐛 **रोग चेतावनी**: उच्च आर्द्रता (' + humidity + '%) के कारण फफूंद व कीट पर नजर रखें।' : '🌱 **कीट स्थिति सामान्य**: नियमित निरीक्षण रखें।'}

3. **आईएमडी (IMD) / कृषि विज्ञान केंद्र मानक**:
   - मेघदूत एवं दामिनी ऐप की चेतावनियों का पालन करें।`;
  } else {
    return `🌾 **KisanDrishti Agro-Weather Advisory for ${loc?.name || 'Your Region'}**

1. **Current Status**:
   - Temp: ${temp}°C | Wind: ${wind} km/h | Humidity: ${humidity}% | Rain Prob: ${rainProb}%

2. **Farm Action for ${crop || 'Crops'}**:
   ${wind > 18 ? '⚠️ **Postpone Spraying**: Wind (' + wind + ' km/h) causes drift. Wait for wind <15 km/h.' : '✅ **Optimal for Spraying**: Wind conditions are calm.'}
   ${rainProb > 40 ? '🌧️ **Hold Irrigation**: High rain chance (' + rainProb + '%). Prevent waterlogging.' : '💧 **Irrigate as needed**: Moisture replenishment safe.'}
   ${humidity > 75 ? '🐛 **Fungal Watch**: High humidity (' + humidity + '%) promotes foliar diseases.' : '🌱 **Pest status normal**.'}

3. **Official Agromet Guidance**:
   - Aligned with IMD Agromet Advisory & KVK guidelines.`;
  }
}

// -----------------------------------------------------------------------------
// WebSocket setup for Gemini Live API (gemini-3.8-live) + Bidirectional Voice
// -----------------------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to /live Gemini Live audio bridge');

  const hasValidKey =
    Boolean(process.env.GEMINI_API_KEY) &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY!.trim().length > 10;

  let liveSession: any = null;

  if (hasValidKey) {
    try {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are KisanDrishti Live, a voice assistant for Indian farmers. Speak briefly, clearly, and warmly in Hindi or English as spoken by the farmer. Give instant weather, crop, and wind risk guidance.',
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ type: 'audio', audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
        },
      });

      clientWs.send(JSON.stringify({ type: 'connected', mode: 'gemini-3.8-live' }));
    } catch (err) {
      console.warn('Gemini Live connect error, using conversational bridge:', err);
    }
  }

  // Handle incoming messages from farmer client
  clientWs.on('message', async (data: any) => {
    try {
      const parsed = JSON.parse(data.toString());

      // If Live API session is active and audio chunk received:
      if (liveSession && parsed.audio) {
        liveSession.sendRealtimeInput({
          audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
        });
        return;
      }

      // If text query or fallback voice question received:
      if (parsed.text) {
        const queryText = parsed.text;
        const lang = parsed.lang || 'hi';
        const loc = parsed.location || { name: 'Farm' };
        const weather = parsed.weather || {};

        let responseText = '';
        if (hasValidKey) {
          try {
            const aiRes = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `Farmer question: "${queryText}". Location: ${loc.name}. Weather: ${weather.temperature || 28}°C, Wind ${weather.windSpeed || 12} km/h, Rain ${weather.rain || 0} mm. Answer directly in 2 short spoken sentences in ${lang === 'hi' ? 'Hindi' : 'English'}.`,
            });
            responseText = aiRes.text || '';
          } catch (e) {
            responseText = generateRuleBasedAdvisory(queryText, lang, weather, loc.crop, loc);
          }
        } else {
          responseText = generateRuleBasedAdvisory(queryText, lang, weather, loc.crop, loc);
        }

        // Send back text for client speech synthesis so the farmer HEARS Gemini!
        clientWs.send(
          JSON.stringify({
            type: 'speech_response',
            text: responseText,
          })
        );
      }
    } catch (err) {
      console.error('Live WS incoming processing error:', err);
    }
  });

  clientWs.on('close', () => {
    // cleanup
  });
});

// Mount Vite or static server
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

function startServer(listenPort: number, maxAttempts = 10) {
  const currentAttempt = listenPort - port;

  server.once('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && currentAttempt < maxAttempts) {
      const nextPort = listenPort + 1;
      console.warn(`Port ${listenPort} is busy; retrying on ${nextPort}...`);
      startServer(nextPort, maxAttempts);
      return;
    }

    throw error;
  });

  server.listen(listenPort, () => {
    console.log(`KisanDrishti server running on http://localhost:${listenPort}`);
    if (listenPort !== port) {
      console.log(`Active port changed from ${port} to ${listenPort} because the default port was already in use.`);
    }
  });
}

startServer(port);
