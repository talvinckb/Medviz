"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";

interface LungVolumeProps {
  volume: number;
  percentage: number;
}

export function LungVolume({ volume, percentage }: LungVolumeProps) {
  const data = [{ value: percentage, fill: "#3b82f6" }];

  return (
    <Card className="h-full flex flex-col rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="pb-0 pt-4 px-6">
        <CardTitle className="text-[15px] font-semibold text-gray-800">
          Volume pulmonaire
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 pb-8 pt-4">
        <div className="flex flex-col gap-1">
          <p className="text-[14px] text-gray-500 font-medium">Volume mesuré</p>
          <p className="text-[40px] font-extrabold text-[#1e293b] tracking-tight">
            {volume.toFixed(2)} mL
          </p>
        </div>

        <div className="relative h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="80%"
              outerRadius="100%"
              barSize={14}
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
                cornerRadius={14}
                angleAxisId={0}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold text-blue-600 leading-none mb-1">
              {percentage}%
            </span>
            <span className="text-[13px] text-gray-400 font-medium">prévu</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
