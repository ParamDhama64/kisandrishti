import React from 'react';
import { CloudRain, Wind, Droplets, Sun, Cloud, CloudLightning } from 'lucide-react';
import { HourlyForecastItem, DailyForecastItem } from '../../types/weather';
import { getWeatherConditionName } from '../../utils/agrometCalculations';

interface HourlyForecastProps {
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  lang: 'hi' | 'en';
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ hourly, daily, lang }) => {
  const isHi = lang === 'hi';

  const getWeatherIcon = (code: number) => {
    if (code >= 95) return <CloudLightning className="h-4 w-4 text-purple-400" />;
    if (code >= 50 && code <= 82) return <CloudRain className="h-4 w-4 text-blue-400" />;
    if (code >= 1 && code <= 3) return <Cloud className="h-4 w-4 text-slate-300" />;
    return <Sun className="h-4 w-4 text-amber-400" />;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 24-Hour Timeline */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold text-slate-200">
            {isHi ? 'अगले 24 घंटे का पूर्वानुमान' : '24-Hour Forecast Timeline'}
          </span>
          <span className="text-[10px] text-slate-400">
            {isHi ? 'बारिश व हवा की गति' : 'Rain & Wind Tracking'}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {hourly.slice(0, 18).map((hour, idx) => {
            const timeDate = new Date(hour.time);
            const timeStr = timeDate.toLocaleTimeString('en-IN', {
              hour: 'numeric',
              hour12: true,
            });

            return (
              <div
                key={idx}
                className="flex min-w-[64px] flex-col items-center rounded-lg bg-white/5 p-2 text-center border border-white/5 transition hover:bg-white/10"
              >
                <span className="text-[10px] font-medium text-slate-400">{timeStr}</span>
                <span className="my-1 text-sm font-bold text-slate-100">{hour.temp}°</span>

                {/* Rain Probability Indicator */}
                <div className="flex items-center gap-0.5 text-[10px] text-cyan-400 font-semibold">
                  <CloudRain className="h-3 w-3" />
                  <span>{hour.precipitationProb}%</span>
                </div>

                {/* Wind Speed Indicator */}
                <div className="mt-1 flex items-center gap-0.5 text-[9px] text-slate-400">
                  <Wind className="h-2.5 w-2.5 text-slate-400" />
                  <span>{hour.windSpeed}k</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7-Day Farm Outlook */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="text-xs font-semibold text-slate-200">
            {isHi ? '7 दिवसीय कृषि मौसम दृष्टिकोण' : '7-Day Agricultural Outlook'}
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">
            {isHi ? 'बुवाई व कटाई चक्र' : 'Crop Cycle Outlook'}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-white/5">
          {daily.map((day, idx) => {
            const dateObj = new Date(day.date);
            const dayName =
              idx === 0
                ? isHi
                  ? 'आज (Today)'
                  : 'Today'
                : idx === 1
                ? isHi
                  ? 'कल (Tomorrow)'
                  : 'Tomorrow'
                : dateObj.toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { weekday: 'short' });

            const condition = getWeatherConditionName(day.weatherCode, lang);

            return (
              <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-2.5 w-28">
                  {getWeatherIcon(day.weatherCode)}
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-200">{dayName}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{condition}</span>
                  </div>
                </div>

                {/* Rain probability bar */}
                <div className="flex items-center gap-1.5 w-24">
                  <CloudRain className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${day.precipitationProbMax}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-300 w-7 text-right">
                    {day.precipitationProbMax}%
                  </span>
                </div>

                {/* High / Low Temp */}
                <div className="flex items-center gap-2 text-right">
                  <span className="font-bold text-slate-100">{day.tempMax}°</span>
                  <span className="text-slate-400 text-[11px]">{day.tempMin}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
