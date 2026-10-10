import { CurrentWeatherData, FarmerLocation } from '../types/weather';

export interface FarmerAdvisoryResponse {
  success: boolean;
  source: string;
  advisory: string;
}

export async function askFarmerAiAdvisory(params: {
  query: string;
  language: 'hi' | 'en';
  location: FarmerLocation;
  currentWeather: CurrentWeatherData;
  selectedCrop?: string;
}): Promise<FarmerAdvisoryResponse> {
  const { query, language, location, currentWeather, selectedCrop } = params;

  try {
    const res = await fetch('/api/farmer-advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        language,
        location,
        currentWeather,
        selectedCrop: selectedCrop || location.crop,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      source: data.source || 'gemini-3.8-flash',
      advisory: data.advisory || '',
    };
  } catch (err) {
    console.warn('Backend advisory call failed, returning fallback agromet response:', err);
    // Client-side fallback if server disconnects
    const isHi = language === 'hi';
    const fallbackText = isHi
      ? `🌾 **किसान मौसम दृष्टि सलाह (${location.name})**
- **तापमान व हवा**: ${currentWeather.temperature}°C, हवा ${currentWeather.windSpeed} km/h
- **छिड़काव सलाह**: ${currentWeather.windSpeed > 18 ? 'तेज हवा के कारण छिड़काव टालें।' : 'हवा सामान्य है, छिड़काव किया जा सकता है।'}
- **सिंचाई निर्देश**: आर्द्रता ${currentWeather.humidity}% है। वर्षा पूर्वानुमान देखकर ही पानी दें।
- **सरकारी मानक**: मौसम आधारित फसल बीमा एवं मेघदूत सलाह के अनुसार कार्य करें।`
      : `🌾 **KisanDrishti Agro Advisory (${location.name})**
- **Temp & Wind**: ${currentWeather.temperature}°C, Wind ${currentWeather.windSpeed} km/h
- **Spraying**: ${currentWeather.windSpeed > 18 ? 'Wind is high. Postpone spraying.' : 'Wind conditions are favorable for spraying.'}
- **Irrigation**: Humidity is ${currentWeather.humidity}%. Check rain forecast before irrigating.
- **Govt Standards**: Comply with IMD Agromet Bulletin and PMFBY weather insurance guidelines.`;

    return {
      success: true,
      source: 'offline-client-rule',
      advisory: fallbackText,
    };
  }
}
