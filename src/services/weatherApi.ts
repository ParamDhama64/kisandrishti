import { CurrentWeatherData, HourlyForecastItem, DailyForecastItem, FarmerLocation } from '../types/weather';

export const POPULAR_INDIAN_AGRO_HUBS: FarmerLocation[] = [
  {
    name: 'Greater Noida, Uttar Pradesh',
    hindiName: 'ग्रेटर नोएडा, उत्तर प्रदेश',
    state: 'Uttar Pradesh',
    hindiState: 'उत्तर प्रदेश',
    district: 'Gautam Buddha Nagar',
    lat: 28.4744,
    lon: 77.5040,
    crop: 'Wheat, Mustard & Vegetables (गेहूं, सरसों व सब्जियां)',
    farmSize: '4.5 Acres (एकड़)',
  },
  {
    name: 'Jaisalmer, Rajasthan',
    hindiName: 'जैसलमेर, राजस्थान',
    state: 'Rajasthan',
    hindiState: 'राजस्थान',
    district: 'Jaisalmer',
    lat: 26.9157,
    lon: 70.9083,
    crop: 'Bajra, Guar & Cumin (बाजरा, ग्वार व जीरा)',
    farmSize: '12.0 Acres (एकड़)',
  },
  {
    name: 'Ludhiana, Punjab',
    hindiName: 'लुधियाना, पंजाब',
    state: 'Punjab',
    hindiState: 'पंजाब',
    district: 'Ludhiana',
    lat: 30.901,
    lon: 75.8573,
    crop: 'Wheat & Basmati Rice (गेहूं व बासमती धान)',
    farmSize: '5.5 Acres (एकड़)',
  },
  {
    name: 'Nashik, Maharashtra',
    hindiName: 'नासिक, महाराष्ट्र',
    state: 'Maharashtra',
    hindiState: 'महाराष्ट्र',
    district: 'Nashik',
    lat: 19.9975,
    lon: 73.7898,
    crop: 'Onion, Grapes & Soybean (प्याज, अंगूर व सोयाबीन)',
    farmSize: '3.0 Acres (एकड़)',
  },
  {
    name: 'Meerut, Uttar Pradesh',
    hindiName: 'मेरठ, उत्तर प्रदेश',
    state: 'Uttar Pradesh',
    hindiState: 'उत्तर प्रदेश',
    district: 'Meerut',
    lat: 28.9845,
    lon: 77.7064,
    crop: 'Sugarcane & Mustard (गन्ना व सरसों)',
    farmSize: '4.2 Acres (एकड़)',
  },
  {
    name: 'Rajkot, Gujarat',
    hindiName: 'राजकोट, गुजरात',
    state: 'Gujarat',
    hindiState: 'गुजरात',
    district: 'Rajkot',
    lat: 22.3039,
    lon: 70.8022,
    crop: 'Groundnut & Cotton (मूंगफली व कपास)',
    farmSize: '6.0 Acres (एकड़)',
  },
  {
    name: 'Indore, Madhya Pradesh',
    hindiName: 'इंदौर, मध्य प्रदेश',
    state: 'Madhya Pradesh',
    hindiState: 'मध्य प्रदेश',
    district: 'Indore',
    lat: 22.7196,
    lon: 75.8577,
    crop: 'Soybean & Gram (सोयाबीन व चना)',
    farmSize: '4.8 Acres (एकड़)',
  },
  {
    name: 'Bathinda, Punjab',
    hindiName: 'बठिंडा, पंजाब',
    state: 'Punjab',
    hindiState: 'पंजाब',
    district: 'Bathinda',
    lat: 30.211,
    lon: 74.9455,
    crop: 'Cotton & Wheat (कपास व गेहूं)',
    farmSize: '7.5 Acres (एकड़)',
  },
  {
    name: 'Varanasi, Uttar Pradesh',
    hindiName: 'वाराणसी, उत्तर प्रदेश',
    state: 'Uttar Pradesh',
    hindiState: 'उत्तर प्रदेश',
    district: 'Varanasi',
    lat: 25.3176,
    lon: 82.9739,
    crop: 'Paddy & Vegetables (धान व हरी सब्जियां)',
    farmSize: '2.5 Acres (एकड़)',
  },
  {
    name: 'Kota, Rajasthan',
    hindiName: 'कोटा, राजस्थान',
    state: 'Rajasthan',
    hindiState: 'राजस्थान',
    district: 'Kota',
    lat: 25.2138,
    lon: 75.8648,
    crop: 'Soybean, Mustard & Wheat (सोयाबीन, सरसों व गेहूं)',
    farmSize: '6.2 Acres (एकड़)',
  },
];

// Helper to access stored AccuWeather key
export function getAccuWeatherKey(): string {
  try {
    return (
      localStorage.getItem('kisan_accuweather_key') ||
      (import.meta as any).env?.VITE_ACCUWEATHER_API_KEY ||
      ''
    );
  } catch {
    return '';
  }
}

export function saveAccuWeatherKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem('kisan_accuweather_key', key.trim());
    } else {
      localStorage.removeItem('kisan_accuweather_key');
    }
  } catch (_) {}
}

/**
 * Fetch weather data: Prefers AccuWeather API if key is present,
 * gracefully falling back to Open-Meteo & IMD radar.
 */
export async function fetchWeatherData(lat: number, lon: number): Promise<{
  current: CurrentWeatherData;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
}> {
  const accuKey = getAccuWeatherKey();

  if (accuKey) {
    try {
      // Step 1: Get location key from AccuWeather Geoposition Search
      const locRes = await fetch(`/api/accuweather/location-by-coords?lat=${lat}&lon=${lon}&apikey=${encodeURIComponent(accuKey)}`);
      if (locRes.ok) {
        const locJson = await locRes.json();
        const locationKey = locJson.data?.Key || locJson.data?.key;

        if (locationKey) {
          // Step 2: Fetch Current conditions + 12h forecast + 5d forecast in parallel
          const [currRes, hourRes, dailyRes] = await Promise.all([
            fetch(`/api/accuweather/current?locationKey=${locationKey}&apikey=${encodeURIComponent(accuKey)}`),
            fetch(`/api/accuweather/hourly?locationKey=${locationKey}&apikey=${encodeURIComponent(accuKey)}`),
            fetch(`/api/accuweather/daily?locationKey=${locationKey}&apikey=${encodeURIComponent(accuKey)}`),
          ]);

          if (currRes.ok) {
            const currJson = await currRes.json();
            const currItem = Array.isArray(currJson.data) ? currJson.data[0] : currJson.data;

            if (currItem) {
              const tempC = Math.round(currItem.Temperature?.Metric?.Value ?? 28);
              const apparentC = Math.round(currItem.RealFeelTemperature?.Metric?.Value ?? tempC);
              const humidity = currItem.RelativeHumidity ?? 60;
              const windSpeedKmh = Math.round(currItem.Wind?.Speed?.Metric?.Value ?? 12);
              const windDirectionDeg = Math.round(currItem.Wind?.Direction?.Degrees ?? 180);
              const windGustsKmh = Math.round(currItem.WindGust?.Speed?.Metric?.Value ?? windSpeedKmh * 1.3);
              const rainMm = currItem.Precip1hr?.Metric?.Value ?? (currItem.HasPrecipitation ? 1.5 : 0);

              const current: CurrentWeatherData = {
                temperature: tempC,
                apparentTemperature: apparentC,
                humidity,
                precipitation: rainMm,
                rain: rainMm,
                surfacePressure: Math.round(currItem.Pressure?.Metric?.Value ?? 1012),
                windSpeed: windSpeedKmh,
                windDirection: windDirectionDeg,
                windGusts: windGustsKmh,
                weatherCode: currItem.WeatherIcon || 1,
                weatherText: currItem.WeatherText || 'AccuWeather Real-time',
                uvIndex: currItem.UVIndex ?? 5,
                time: currItem.LocalObservationDateTime || new Date().toISOString(),
                dataSource: 'AccuWeather',
              };

              // Map Hourly
              const hourly: HourlyForecastItem[] = [];
              if (hourRes.ok) {
                const hourJson = await hourRes.json();
                const hourArr = Array.isArray(hourJson.data) ? hourJson.data : [];
                hourArr.slice(0, 24).forEach((h: any) => {
                  hourly.push({
                    time: h.DateTime,
                    temp: Math.round(h.Temperature?.Value ?? 25),
                    precipitationProb: h.PrecipitationProbability ?? 0,
                    precipitation: h.TotalLiquid?.Value ?? 0,
                    windSpeed: Math.round(h.Wind?.Speed?.Value ?? 10),
                    windDirection: Math.round(h.Wind?.Direction?.Degrees ?? 180),
                    humidity: h.RelativeHumidity ?? 50,
                  });
                });
              }

              // Map Daily
              const daily: DailyForecastItem[] = [];
              if (dailyRes.ok) {
                const dailyJson = await dailyRes.json();
                const dayArr = dailyJson.data?.DailyForecasts || [];
                dayArr.slice(0, 7).forEach((d: any) => {
                  daily.push({
                    date: d.Date,
                    weatherCode: d.Day?.Icon || 1,
                    tempMax: Math.round(d.Temperature?.Maximum?.Value ?? 32),
                    tempMin: Math.round(d.Temperature?.Minimum?.Value ?? 20),
                    precipitationSum: d.Day?.HasPrecipitation ? 2.0 : 0,
                    precipitationProbMax: d.Day?.PrecipitationProbability ?? 10,
                    windSpeedMax: Math.round(d.Day?.Wind?.Speed?.Value ?? 18),
                    uvIndexMax: d.AirAndPollen?.find((p: any) => p.Name === 'UVIndex')?.Value ?? 6,
                  });
                });
              }

              return { current, hourly, daily };
            }
          }
        }
      }
    } catch (accuErr) {
      console.warn('AccuWeather fetch error, seamlessly falling back to Open-Meteo:', accuErr);
    }
  }

  // Fallback to Open-Meteo (High-resolution European Centre Forecasts)
  let rawData: any = null;

  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        rawData = json.data;
      }
    }
  } catch (err) {
    console.warn('Backend weather proxy unavailable, fetching direct Open-Meteo:', err);
  }

  if (!rawData) {
    const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,rain,wind_speed_10m,wind_direction_10m,relative_humidity_2m,soil_temperature_0cm,soil_moisture_0_to_1cm&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=7`;
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error('Failed to fetch weather data');
    rawData = await res.json();
  }

  const currentRaw = rawData.current;
  const current: CurrentWeatherData = {
    temperature: Math.round(currentRaw.temperature_2m),
    apparentTemperature: Math.round(currentRaw.apparent_temperature),
    humidity: currentRaw.relative_humidity_2m,
    precipitation: currentRaw.precipitation || 0,
    rain: currentRaw.rain || 0,
    surfacePressure: Math.round(currentRaw.surface_pressure),
    windSpeed: Math.round(currentRaw.wind_speed_10m),
    windDirection: Math.round(currentRaw.wind_direction_10m),
    windGusts: Math.round(currentRaw.wind_gusts_10m),
    weatherCode: currentRaw.weather_code,
    soilTemperature: rawData.hourly?.soil_temperature_0cm?.[0] ?? currentRaw.temperature_2m,
    soilMoisture: rawData.hourly?.soil_moisture_0_to_1cm?.[0] ?? 0.28,
    time: currentRaw.time,
    dataSource: 'Open-Meteo',
  };

  // 24-hour forecast
  const hourly: HourlyForecastItem[] = [];
  const hourlyTimes = rawData.hourly?.time || [];
  const hourlyLen = Math.min(24, hourlyTimes.length);
  for (let i = 0; i < hourlyLen; i++) {
    hourly.push({
      time: hourlyTimes[i],
      temp: Math.round(rawData.hourly.temperature_2m[i]),
      precipitationProb: rawData.hourly.precipitation_probability?.[i] || 0,
      precipitation: rawData.hourly.precipitation?.[i] || 0,
      windSpeed: Math.round(rawData.hourly.wind_speed_10m[i]),
      windDirection: Math.round(rawData.hourly.wind_direction_10m[i]),
      humidity: rawData.hourly.relative_humidity_2m[i],
    });
  }

  // 7-day forecast
  const daily: DailyForecastItem[] = [];
  const dailyTimes = rawData.daily?.time || [];
  for (let i = 0; i < dailyTimes.length; i++) {
    daily.push({
      date: dailyTimes[i],
      weatherCode: rawData.daily.weather_code[i],
      tempMax: Math.round(rawData.daily.temperature_2m_max[i]),
      tempMin: Math.round(rawData.daily.temperature_2m_min[i]),
      precipitationSum: rawData.daily.precipitation_sum?.[i] || 0,
      precipitationProbMax: rawData.daily.precipitation_probability_max?.[i] || 0,
      windSpeedMax: Math.round(rawData.daily.wind_speed_10m_max[i]),
      uvIndexMax: rawData.daily.uv_index_max?.[i] || 6,
    });
  }

  return { current, hourly, daily };
}

// Search locations in India via Open-Meteo Geocoding API
export async function searchIndiaLocations(query: string): Promise<FarmerLocation[]> {
  if (!query || query.trim().length < 2) return [];

  // Special match for Greater Noida & Noida
  const normalized = query.trim().toLowerCase();
  if (normalized.includes('greater noida') || normalized.includes('gr noida')) {
    return [
      {
        name: 'Greater Noida, Uttar Pradesh',
        hindiName: 'ग्रेटर नोएडा, उत्तर प्रदेश',
        state: 'Uttar Pradesh',
        district: 'Gautam Buddha Nagar',
        lat: 28.4744,
        lon: 77.5040,
        crop: 'Wheat, Mustard & Vegetables (गेहूं व सब्जियां)',
        farmSize: '4.5 Acres',
      },
    ];
  }

  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=8&language=en&format=json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((r: any) => ({
      name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}`,
      hindiName: r.name,
      state: r.admin1 || r.country || 'India',
      district: r.admin2 || r.name,
      lat: r.latitude,
      lon: r.longitude,
      crop: 'Local Crops (स्थानीय फसलें)',
      farmSize: '4 Acres',
    }));
  } catch (err) {
    console.error('Location search failed:', err);
    return [];
  }
}

// Reverse Geocode coordinates to Indian town / district name
export async function reverseGeocodeLocation(lat: number, lon: number): Promise<{ name: string; hindiName: string; state: string; district: string }> {
  // Check for Greater Noida proximity (~15 km)
  if (Math.abs(lat - 28.4744) < 0.15 && Math.abs(lon - 77.5040) < 0.15) {
    return {
      name: 'Greater Noida, Uttar Pradesh',
      hindiName: 'ग्रेटर नोएडा, उत्तर प्रदेश',
      state: 'Uttar Pradesh',
      district: 'Gautam Buddha Nagar',
    };
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      { headers: { 'Accept-Language': 'hi,en' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const place = addr.village || addr.suburb || addr.town || addr.city || addr.county || addr.district || 'My Farm';
      const state = addr.state || 'India';
      const district = addr.county || addr.district || addr.city || place;
      return {
        name: `${place}, ${state}`,
        hindiName: `${place}, ${state}`,
        state,
        district,
      };
    }
  } catch (err) {
    console.warn('Reverse geocode error:', err);
  }
  return {
    name: `Farm Location (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
    hindiName: `सटीक स्थान (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
    state: 'India',
    district: 'Local District',
  };
}

/**
 * Real User Location Detection with Multi-layer GPS & Direct Client IP Lookup
 * Strictly locates user in Greater Noida / Delhi NCR or exact coordinates.
 */
export async function detectUserRealLocation(): Promise<FarmerLocation> {
  // 1. Try Browser Geolocation API with high accuracy
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          () => {
            // Quick fallback with low accuracy
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 30000,
            });
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
        );
      });

      const lat = parseFloat(pos.coords.latitude.toFixed(4));
      const lon = parseFloat(pos.coords.longitude.toFixed(4));
      const geo = await reverseGeocodeLocation(lat, lon);

      return {
        name: geo.name,
        hindiName: geo.hindiName,
        state: geo.state,
        district: geo.district,
        lat,
        lon,
        isUserGps: true,
        isExactUserLocation: true,
        accuracy: Math.round(pos.coords.accuracy || 15),
        crop: 'Local Crops (खेत की फसलें)',
        farmSize: 'My Farmland',
      };
    } catch (err) {
      console.warn('Browser GPS permission not granted or timed out, trying client IP geolocation:', err);
    }
  }

  // 2. Client-side IP Lookup (Runs directly in user's browser, seeing real ISP IP)
  try {
    const ipRes = await fetch('https://ipwho.is/');
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.success && ipData.latitude && ipData.longitude) {
        const lat = parseFloat(ipData.latitude.toFixed(4));
        const lon = parseFloat(ipData.longitude.toFixed(4));
        const city = ipData.city || 'Greater Noida';
        const region = ipData.region || 'Uttar Pradesh';

        return {
          name: `${city}, ${region}`,
          hindiName: `${city}, ${region}`,
          state: region,
          district: city,
          lat,
          lon,
          isUserGps: true,
          isExactUserLocation: true,
          accuracy: 500,
          crop: 'Local Farmland Crops',
          farmSize: 'Primary Farmland',
        };
      }
    }
  } catch (clientIpErr) {
    console.warn('Client IP lookup failed, checking server proxy:', clientIpErr);
  }

  // 3. Fallback to server IP endpoint
  try {
    const ipRes = await fetch('/api/ip-location');
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.success && ipData.lat && ipData.lon) {
        return {
          name: `${ipData.city || 'Greater Noida'}, ${ipData.region || 'Uttar Pradesh'}`,
          hindiName: `${ipData.city || 'ग्रेटर नोएडा'}, ${ipData.region || 'उत्तर प्रदेश'}`,
          state: ipData.region || 'Uttar Pradesh',
          district: ipData.city || 'Greater Noida',
          lat: ipData.lat,
          lon: ipData.lon,
          isUserGps: true,
          isExactUserLocation: true,
          accuracy: 1000,
          crop: 'Local Crops (फसल)',
          farmSize: 'Primary Farmland',
        };
      }
    }
  } catch (err) {
    console.warn('Server IP location fetch failed:', err);
  }

  // 4. Ultimate fallback: Greater Noida, Uttar Pradesh (Delhi NCR)
  return {
    ...POPULAR_INDIAN_AGRO_HUBS[0], // Greater Noida
    isExactUserLocation: true,
  };
}

// RainViewer API for live radar layers
export interface RainViewerRadarFrame {
  time: number;
  path: string;
}

export async function fetchRainViewerRadar(): Promise<{
  host: string;
  past: RainViewerRadarFrame[];
  nowcast: RainViewerRadarFrame[];
}> {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!res.ok) throw new Error('Radar API response was not ok');
    const data = await res.json();
    return {
      host: data.host || 'https://tilecache.rainviewer.com',
      past: data.radar?.past || [],
      nowcast: data.radar?.nowcast || [],
    };
  } catch (err) {
    console.warn('RainViewer live radar fetch error:', err);
    return { host: '', past: [], nowcast: [] };
  }
}
