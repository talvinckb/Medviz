"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";

interface LungVolumeProps {
  volume: number;
  optimalFvc: number;
}

export function LungVolume({ volume, optimalFvc }: LungVolumeProps) {
  const expectedVolume = optimalFvc * 1.25;
  const percentage =
    expectedVolume > 0 ? Math.round((volume / expectedVolume) * 100) : 0;
  const chartPercentage = Math.min(100, percentage);
  const data = [{ value: chartPercentage, fill: "#3b82f6" }];

  return (
    <Card className="h-full flex flex-col rounded-xl border border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
          Volume pulmonaire
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-between gap-6 px-6 pb-6 pt-2">
        <div className="flex flex-col flex-1">
          <div className="mb-1">
            <p className="text-sm font-medium text-slate-500 mb-1">
              Volume mesuré
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {volume.toFixed(2)}
              </span>
              <span className="text-lg font-bold text-slate-400">mL</span>
            </div>
          </div>

          {/* <div className="mt-5 rounded-lg bg-green-50 border border-green-100 p-3">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">
              Volume attendu
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-green-700">
                {expectedVolume.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-green-500/80">
                mL
              </span>
            </div>
          </div>
        </div>

        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="75%"
              outerRadius="100%"
              barSize={12}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: "#f1f5f9" }}
                dataKey="value"
                cornerRadius={12}
                angleAxisId={0}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-blue-600 tracking-tighter">
              {percentage}%
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Prévu
            </span>
          </div>
        </div> */}
        </div>
      </CardContent>
    </Card>
  );
}
