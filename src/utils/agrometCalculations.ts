import { CurrentWeatherData, DailyForecastItem, AgroRiskAssessment } from '../types/weather';

/**
 * Computes agricultural meteorology risk assessment based on IMD, ICAR & KVK guidelines
 */
export function computeAgroRiskAssessment(
  current: CurrentWeatherData,
  daily: DailyForecastItem[]
): AgroRiskAssessment {
  const rainProbTomorrow = daily[0]?.precipitationProbMax ?? 0;
  const rainSumNext3Days = daily.slice(0, 3).reduce((acc, d) => acc + (d.precipitationSum || 0), 0);
  const maxWindNext2Days = Math.max(...daily.slice(0, 2).map((d) => d.windSpeedMax || current.windSpeed));

  // 1. Spraying Suitability:
  // Ideal: Wind 4-15 km/h, Rain prob < 25%, Temp < 35°C
  let sprayingStatus: 'OPTIMAL' | 'MODERATE' | 'UNFAVORABLE' = 'OPTIMAL';
  let sprayReason = 'Ideal wind and weather conditions for foliar pesticide/fungicide spray.';
  let sprayReasonHi = 'कीटनाशक व फफूंदनाशक छिड़काव के लिए हवा और मौसम पूर्णतः अनुकूल है।';

  if (current.windSpeed > 18 || rainProbTomorrow > 45 || current.precipitation > 0) {
    sprayingStatus = 'UNFAVORABLE';
    if (current.windSpeed > 18) {
      sprayReason = `High wind (${current.windSpeed} km/h) causes drift and wastage. Wait for wind < 15 km/h.`;
      sprayReasonHi = `तेज हवा (${current.windSpeed} km/h) के कारण दवा उड़ जाएगी। हवा शांत (<15 km/h) होने का इंतजार करें।`;
    } else {
      sprayReason = `Rain expected (${rainProbTomorrow}% chance). Chemical will wash off before absorption.`;
      sprayReasonHi = `बारिश की संभावना (${rainProbTomorrow}%) है। दवा धुलने का खतरा है, छिड़काव टालें।`;
    }
  } else if (current.windSpeed > 13 || rainProbTomorrow > 25 || current.temperature > 36) {
    sprayingStatus = 'MODERATE';
    sprayReason = 'Marginal conditions. Spray during early morning (6-9 AM) or late evening (4-6 PM).';
    sprayReasonHi = 'सावधानीपूर्वक केवल सुबह (6-9 बजे) अथवा शाम (4-6 बजे) के समय ही छिड़काव करें।';
  }

  // 2. Irrigation Guidance:
  let irrigationNeeded = true;
  let irrigationRec = 'Light irrigation recommended based on soil moisture.';
  let irrigationRecHi = 'खेत में नमी देखकर आवश्यकतानुसार हल्की सिंचाई करें।';

  if (rainSumNext3Days > 12 || rainProbTomorrow > 50) {
    irrigationNeeded = false;
    irrigationRec = `Hold irrigation! Expected rainfall (${rainSumNext3Days.toFixed(1)} mm) will replenish moisture and avoid waterlogging.`;
    irrigationRecHi = `सिंचाई रोकें! अगले दिनों में वर्षा (${rainSumNext3Days.toFixed(1)} मिमी) की संभावना है, पानी भरा रहने और खाद बहने से बचाएं।`;
  } else if (current.temperature > 37) {
    irrigationNeeded = true;
    irrigationRec = 'High heatwave evapotranspiration. Frequent light irrigation prevents thermal stress.';
    irrigationRecHi = 'अधिक तापमान के कारण वाष्पीकरण तेज है। फसल को तापघात से बचाने के लिए हल्की सिंचाई करें।';
  }

  // 3. Pest & Disease Alert (Based on Temp & Relative Humidity)
  const isHighHumidity = current.humidity >= 78;
  const isModerateTemp = current.temperature >= 18 && current.temperature <= 30;
  let pestLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  const threats: string[] = [];
  const hindiThreats: string[] = [];
  let pestDesc = 'Normal microclimate. Standard scouting recommended.';

  if (isHighHumidity && isModerateTemp) {
    pestLevel = 'HIGH';
    threats.push('Fungal Rust & Blight', 'Aphids / Mahu', 'Powdery Mildew');
    hindiThreats.push('रतुआ एवं झुलसा फफूंद', 'माहू (एफिड्स) कीट', 'चूर्णिल आसिता (पाउडरी मिल्ड्यू)');
    pestDesc = `High relative humidity (${current.humidity}%) with warm temperatures triggers rapid fungal spore dispersion and sucking pests.`;
  } else if (current.humidity >= 65 || current.temperature >= 35) {
    pestLevel = 'MEDIUM';
    threats.push('Sucking Pests', 'Borer / Caterpillars');
    hindiThreats.push('रस चूसक कीट', 'तना छेदक व इल्ली');
    pestDesc = 'Moderate pest vulnerability. Inspect undersides of leaves in morning.';
  } else {
    threats.push('Low Threat Threshold');
    hindiThreats.push('जोखिम सामान्य सीमा में');
  }

  // 4. Wind Lodging Risk (Tall crops like Wheat, Mustard, Paddy, Sugarcane)
  let lodgingLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let lodgingDesc = 'Gentle breezes pose negligible risk to standing crops.';
  if (current.windGusts >= 40 || maxWindNext2Days >= 35) {
    lodgingLevel = 'HIGH';
    lodgingDesc = `Severe wind gusts up to ${Math.max(current.windGusts, maxWindNext2Days)} km/h. High lodging threat to tall standing crops. Avoid field flooding.`;
  } else if (current.windSpeed >= 22 || current.windGusts >= 28) {
    lodgingLevel = 'MEDIUM';
    lodgingDesc = `Moderate wind gusts (${current.windGusts} km/h). Earth up sugarcane and tall crops.`;
  }

  // 5. Damini Lightning Network Risk
  const isLightningRisk = (current.weatherCode >= 95 && current.weatherCode <= 99) || current.precipitation > 5;
  const daminiLightningRisk = {
    active: isLightningRisk,
    alertMessage: isLightningRisk
      ? 'Thunderstorm/Lightning activity detected within radar radius. Seek pucca shelter immediately!'
      : 'No convective lightning hazards detected in the farm perimeter.',
  };

  // 6. Overall IMD Alert Classification
  let imdAlert: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' = 'GREEN';
  let overallScore = 15;

  if (current.windGusts > 50 || rainSumNext3Days > 50 || current.temperature > 43) {
    imdAlert = 'RED';
    overallScore = 85;
  } else if (current.windGusts > 35 || rainSumNext3Days > 25 || rainProbTomorrow > 70 || current.temperature > 40) {
    imdAlert = 'ORANGE';
    overallScore = 65;
  } else if (current.windSpeed > 20 || rainProbTomorrow > 35 || current.humidity > 80) {
    imdAlert = 'YELLOW';
    overallScore = 40;
  }

  let overallLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = 'LOW';
  if (overallScore >= 75) overallLevel = 'SEVERE';
  else if (overallScore >= 55) overallLevel = 'HIGH';
  else if (overallScore >= 35) overallLevel = 'MODERATE';

  // 7. Harvest Advisory
  const safeToHarvest = rainProbTomorrow < 30 && current.precipitation === 0 && current.windSpeed < 24;

  return {
    overallRiskLevel: overallLevel,
    overallRiskScore: overallScore,
    imdAlertLevel: imdAlert,
    sprayingIndex: {
      status: sprayingStatus,
      reason: sprayReason,
      hindiReason: sprayReasonHi,
    },
    irrigationGuidance: {
      needed: irrigationNeeded,
      recommendation: irrigationRec,
      hindiRecommendation: irrigationRecHi,
    },
    pestDiseaseRisk: {
      riskLevel: pestLevel,
      threats,
      hindiThreats,
      description: pestDesc,
    },
    windLodgingRisk: {
      riskLevel: lodgingLevel,
      windSpeedKmh: current.windSpeed,
      description: lodgingDesc,
    },
    daminiLightningRisk,
    harvestAdvisory: {
      safeToHarvest,
      note: safeToHarvest
        ? 'Weather is clear and dry. Suitable for grain harvest, drying, and threshing.'
        : 'Do NOT harvest today. Elevated moisture and rain hazard can cause grain discoloration and mold.',
    },
  };
}

export function getWeatherConditionName(code: number, lang: 'hi' | 'en' = 'en'): string {
  const codes: Record<number, { en: string; hi: string }> = {
    0: { en: 'Clear Skies', hi: 'साफ आसमान' },
    1: { en: 'Mainly Clear', hi: 'मुख्यतः साफ' },
    2: { en: 'Partly Cloudy', hi: 'आंशिक बादल' },
    3: { en: 'Overcast', hi: 'घने बादल' },
    45: { en: 'Fog / Mist', hi: 'कोहरा / धुंध' },
    48: { en: 'Depositing Rime Fog', hi: 'घना कोहरा' },
    51: { en: 'Light Drizzle', hi: 'हल्की बूंदाबांदी' },
    53: { en: 'Moderate Drizzle', hi: 'मध्यम बूंदाबांदी' },
    55: { en: 'Dense Drizzle', hi: 'तेज बूंदाबांदी' },
    61: { en: 'Slight Rain', hi: 'हल्की बारिश' },
    63: { en: 'Moderate Rain', hi: 'मध्यम बारिश' },
    65: { en: 'Heavy Rain', hi: 'भारी बारिश' },
    71: { en: 'Light Snow / Hail', hi: 'हल्के ओले / हिमपात' },
    73: { en: 'Moderate Hail', hi: 'ओलावृष्टि' },
    75: { en: 'Heavy Hail', hi: 'भारी ओलावृष्टि' },
    80: { en: 'Passing Rain Showers', hi: 'बौछारें' },
    81: { en: 'Moderate Showers', hi: 'तेज बौछारें' },
    82: { en: 'Violent Cloudburst Showers', hi: 'अति भारी बौछारें' },
    95: { en: 'Thunderstorm', hi: 'आंधी तूफान / तड़ित' },
    96: { en: 'Thunderstorm with Hail', hi: 'तूफान व ओलावृष्टि' },
    99: { en: 'Severe Thunderstorm with Heavy Hail', hi: 'भीषण आंधी व भारी ओले' },
  };

  const item = codes[code] || { en: 'Partly Sunny', hi: 'धूप-छांव' };
  return lang === 'hi' ? item.hi : item.en;
}
