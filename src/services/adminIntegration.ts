import { FarmerLocation, CurrentWeatherData, AgroRiskAssessment } from '../types/weather';

export interface AdminTelemetryPayload {
  appletId: string;
  timestamp: string;
  farmerLocation: FarmerLocation;
  currentWeather: CurrentWeatherData | null;
  agroAssessment: AgroRiskAssessment | null;
  systemStatus: {
    radarStreamActive: boolean;
    windVectorStreamActive: boolean;
    imdAlertLevel: string;
    actionableAdvisoryCount: number;
  };
}

export function generateAdminPayload(
  location: FarmerLocation,
  weather: CurrentWeatherData | null,
  assessment: AgroRiskAssessment | null
): AdminTelemetryPayload {
  return {
    appletId: '9a41aede-f4f9-4b6a-8c31-609a41a96581',
    timestamp: new Date().toISOString(),
    farmerLocation: location,
    currentWeather: weather,
    agroAssessment: assessment,
    systemStatus: {
      radarStreamActive: true,
      windVectorStreamActive: true,
      imdAlertLevel: assessment?.imdAlertLevel || 'GREEN',
      actionableAdvisoryCount: assessment?.pestDiseaseRisk?.threats?.length || 0,
    },
  };
}

// Dispatches browser CustomEvent and updates window bridge for secondary admin app
export function broadcastToAdminApp(payload: AdminTelemetryPayload): void {
  if (typeof window === 'undefined') return;

  // Window event
  const event = new CustomEvent('kisanDrishtiTelemetry', { detail: payload });
  window.dispatchEvent(event);

  // Expose on global window object for parent or sibling applet frames
  (window as any).KisanDrishtiBridge = {
    getTelemetry: () => payload,
    lastUpdated: payload.timestamp,
  };
}
