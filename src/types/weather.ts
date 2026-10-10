export interface FarmerLocation {
  name: string;
  hindiName?: string;
  state: string;
  hindiState?: string;
  district?: string;
  lat: number;
  lon: number;
  isUserGps?: boolean;
  isExactUserLocation?: boolean;
  accuracy?: number;
  crop?: string;
  farmSize?: string;
}

export interface CurrentWeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  rain: number;
  surfacePressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  weatherCode: number;
  soilTemperature?: number;
  soilMoisture?: number;
  uvIndex?: number;
  time: string;
  dataSource?: 'AccuWeather' | 'Open-Meteo';
  weatherText?: string;
}

export interface HourlyForecastItem {
  time: string;
  temp: number;
  precipitationProb: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
}

export interface DailyForecastItem {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbMax: number;
  windSpeedMax: number;
  uvIndexMax: number;
}

export interface AgroRiskAssessment {
  overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  overallRiskScore: number; // 0 - 100
  imdAlertLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  sprayingIndex: {
    status: 'OPTIMAL' | 'MODERATE' | 'UNFAVORABLE';
    reason: string;
    hindiReason: string;
  };
  irrigationGuidance: {
    needed: boolean;
    recommendation: string;
    hindiRecommendation: string;
  };
  pestDiseaseRisk: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    threats: string[];
    hindiThreats: string[];
    description: string;
  };
  windLodgingRisk: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    windSpeedKmh: number;
    description: string;
  };
  daminiLightningRisk: {
    active: boolean;
    alertMessage: string;
  };
  harvestAdvisory: {
    safeToHarvest: boolean;
    note: string;
  };
}

export type ActiveMapLayer = 'satellite' | 'street' | 'dark' | 'wind' | 'precipitation' | 'temperature' | 'clouds';

export interface FarmerProfile {
  name: string;
  district: string;
  state: string;
  farmlandArea: string; // e.g. "5 Acres"
  cropGrowing: string; // e.g. "Wheat"
  phone?: string;
  lat?: number;
  lon?: number;
  registeredAt?: string;
}

export interface RainCloudCell {
  lat: number;
  lon: number;
  rainMm: number;
  intensity: 'light' | 'heavy';
  locationName: string;
}
