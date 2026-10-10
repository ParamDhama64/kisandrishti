import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Droplets,
  Wind,
  Bug,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Wheat,
} from 'lucide-react';
import { AgroRiskAssessment, CurrentWeatherData } from '../../types/weather';

interface RiskScorecardProps {
  assessment: AgroRiskAssessment;
  currentWeather: CurrentWeatherData;
  lang: 'hi' | 'en';
}

export const RiskScorecard: React.FC<RiskScorecardProps> = ({ assessment, currentWeather, lang }) => {
  const isHi = lang === 'hi';

  const getAlertBadge = (level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED') => {
    switch (level) {
      case 'RED':
        return {
          bg: 'bg-red-500/20 text-red-400 border-red-500/40',
          dot: 'bg-red-500',
          label: isHi ? 'लाल चेतावनी (RED ALERT)' : 'Red Alert (Take Action)',
          desc: isHi ? 'भीषण मौसम: फसल सुरक्षा के त्वरित कदम उठाएं' : 'Severe Weather: Immediate protection needed',
        };
      case 'ORANGE':
        return {
          bg: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
          dot: 'bg-orange-500',
          label: isHi ? 'नारंगी चेतावनी (ORANGE ALERT)' : 'Orange Alert (Be Prepared)',
          desc: isHi ? 'खराब मौसम की संभावना: सतर्क रहें' : 'Adverse weather expected: Stay alert',
        };
      case 'YELLOW':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
          label: isHi ? 'पीली चेतावनी (YELLOW ALERT)' : 'Yellow Alert (Watch)',
          desc: isHi ? 'मौसम पर नजर रखें: सामान्य सतर्कता' : 'Keep watch on changing conditions',
        };
      case 'GREEN':
      default:
        return {
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dot: 'bg-emerald-400',
          label: isHi ? 'हरा सामान्य (GREEN - NO WARNING)' : 'Green (Favorable / Normal)',
          desc: isHi ? 'मौसम कृषि गतिविधियों के अनुकूल है' : 'Weather suitable for regular field work',
        };
    }
  };

  const alertBadge = getAlertBadge(assessment.imdAlertLevel);

  return (
    <div className="flex flex-col gap-3">
      {/* IMD Government Agromet Warning Bar */}
      <div className={`rounded-xl border p-3 ${alertBadge.bg} transition-all`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${alertBadge.dot} animate-pulse`} />
            <span className="text-xs font-bold tracking-wide">
              {isHi ? 'आईएमडी मौसम चेतावनी स्तर' : 'IMD Agromet Advisory Level'}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10">
            {assessment.imdAlertLevel}
          </span>
        </div>
        <div className="mt-1 text-xs font-medium">{alertBadge.label}</div>
        <div className="text-[11px] opacity-80 mt-0.5">{alertBadge.desc}</div>
      </div>

      {/* 1. Spraying Suitability */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Droplets className="h-4 w-4 text-cyan-400" />
            <span>{isHi ? 'कीटनाशक / फफूंदनाशक छिड़काव' : 'Spraying Suitability Index'}</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              assessment.sprayingIndex.status === 'OPTIMAL'
                ? 'bg-emerald-500/20 text-emerald-300'
                : assessment.sprayingIndex.status === 'MODERATE'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {assessment.sprayingIndex.status === 'OPTIMAL'
              ? isHi
                ? 'अनुकूल (OPTIMAL)'
                : 'Optimal'
              : assessment.sprayingIndex.status === 'MODERATE'
              ? isHi
                ? 'मध्यम (MODERATE)'
                : 'Moderate'
              : isHi
              ? 'प्रतिकूल (AVOID)'
              : 'Unfavorable'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {isHi ? assessment.sprayingIndex.hindiReason : assessment.sprayingIndex.reason}
        </p>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
          <span>{isHi ? 'हवा गति सीमा' : 'Wind Threshold'}: &lt;15 km/h</span>
          <span className="text-cyan-300 font-medium">
            {isHi ? 'वर्तमान' : 'Current'}: {currentWeather.windSpeed} km/h
          </span>
        </div>
      </div>

      {/* 2. Irrigation Decision Support */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Wheat className="h-4 w-4 text-emerald-400" />
            <span>{isHi ? 'सिंचाई दिशा-निर्देश' : 'Irrigation Scheduling'}</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              assessment.irrigationGuidance.needed
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {assessment.irrigationGuidance.needed
              ? isHi
                ? 'सिंचाई उपयुक्त'
                : 'Irrigate'
              : isHi
              ? 'सिंचाई रोकें'
              : 'Hold Water'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {isHi
            ? assessment.irrigationGuidance.hindiRecommendation
            : assessment.irrigationGuidance.recommendation}
        </p>
      </div>

      {/* 3. Pest & Disease Alert */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Bug className="h-4 w-4 text-rose-400" />
            <span>{isHi ? 'कीट व फफूंद रोग जोखिम' : 'Pest & Pathogen Vulnerability'}</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              assessment.pestDiseaseRisk.riskLevel === 'HIGH'
                ? 'bg-rose-500/20 text-rose-300'
                : assessment.pestDiseaseRisk.riskLevel === 'MEDIUM'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {assessment.pestDiseaseRisk.riskLevel} {isHi ? 'जोखिम' : 'RISK'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {assessment.pestDiseaseRisk.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(isHi
            ? assessment.pestDiseaseRisk.hindiThreats
            : assessment.pestDiseaseRisk.threats
          ).map((t, idx) => (
            <span
              key={idx}
              className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-300"
            >
              ⚠️ {t}
            </span>
          ))}
        </div>
      </div>

      {/* 4. Wind Lodging & Severe Storm Risk */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Wind className="h-4 w-4 text-yellow-400" />
            <span>{isHi ? 'फसल गिरने (लॉजिंग) का जोखिम' : 'Crop Lodging Hazard'}</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              assessment.windLodgingRisk.riskLevel === 'HIGH'
                ? 'bg-rose-500/20 text-rose-300'
                : assessment.windLodgingRisk.riskLevel === 'MEDIUM'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {assessment.windLodgingRisk.riskLevel}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {assessment.windLodgingRisk.description}
        </p>
      </div>

      {/* 5. Damini Lightning Network Warning */}
      <div
        className={`rounded-xl border p-3 backdrop-blur-sm ${
          assessment.daminiLightningRisk.active
            ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
            : 'bg-slate-900/40 border-white/10 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Zap
            className={`h-4 w-4 ${
              assessment.daminiLightningRisk.active ? 'text-yellow-300 animate-bounce' : 'text-slate-400'
            }`}
          />
          <span>{isHi ? 'दामिनी ऐप: आकाशीय बिजली सुरक्षा' : 'Damini Lightning Network Alert'}</span>
        </div>
        <p className="mt-1.5 text-xs opacity-90 leading-relaxed">
          {assessment.daminiLightningRisk.alertMessage}
        </p>
      </div>
    </div>
  );
};
