"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ReferenceLine,
  ComposedChart,
} from "recharts";

interface FVCPredictionProps {
  data: {
    week: number;
    fvc: number;
    upper90: number;
    lower90: number;
    upper60: number;
    lower60: number;
    reliability: number;
  }[];
  fvc_optimal: number;
  period: "3" | "6" | "12";
  onPeriodChange: (period: "3" | "6" | "12") => void;
  selectedWeek: number | null;
}

export function FVCPrediction({
  data,
  fvc_optimal,
  period,
  onPeriodChange,
  selectedWeek,
}: FVCPredictionProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Filter by selected period (months → weeks)
  const filteredData = data.filter((d) => {
    if (d.week < 0) return false;
    if (period === "3") return d.week <= 12;
    if (period === "6") return d.week <= 26;
    if (period === "12") return d.week <= 52;
    return true;
  });

  const chartData = filteredData.map((d) => ({
    ...d,
    range90: [d.lower90, d.upper90] as [number, number],
    range60: [d.lower60, d.upper60] as [number, number],
  }));

  const criticalThreshold = (fvc_optimal * 0.8) / 1000; // 80% of optimal FVC in liters

  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.upper90 || 0, d.fvc || 0)),
    4.0,
  );

  const dataMin =
    chartData.length > 0
      ? Math.min(...chartData.map((d) => Math.min(d.lower90 ?? d.fvc, d.fvc)))
      : 1.5;
  const rawMin = Math.min(dataMin, criticalThreshold);
  const yMin = rawMin < 1.5 ? Math.max(0, Math.floor(rawMin * 10) / 10) : 1.5;
  const yDomain = [yMin, maxVal > 4 ? Math.ceil(maxVal) : 4];

  return (
    <Card className="h-full flex flex-col rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6 gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-gray-800">
            Prédiction de la FVC au cours du temps
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              className="rounded-full text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              aria-label="Afficher les informations sur la prédiction de la FVC"
            >
              <Info className="h-4 w-4" />
            </button>
          </CardTitle>
          <div className="text-[13px] font-medium text-gray-600">FVC (L)</div>
        </div>

        <Tabs
          value={period}
          onValueChange={(val) => onPeriodChange(val as any)}
          className="w-auto"
        >
          <TabsList className="bg-gray-100/80 p-0.5 h-8">
            <TabsTrigger value="3" className="text-xs px-2.5 h-7">
              3 mois
            </TabsTrigger>
            <TabsTrigger value="6" className="text-xs px-2.5 h-7">
              6 mois
            </TabsTrigger>
            <TabsTrigger value="12" className="text-xs px-2.5 h-7">
              12 mois
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 pb-6 min-h-0">
        <div className="flex-1 min-h-0 px-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                vertical={true}
                horizontal={true}
                strokeDasharray="3 3"
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                label={{
                  value: "Temps (Semaines)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 12,
                  fill: "#64748b",
                }}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* IC 90% band [Q05, Q95] — wide, very light */}
              <Area
                type="monotone"
                dataKey="range90"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.08}
              />

              {/* IC 60% band [Q20, Q80] — narrower, more opaque */}
              <Area
                type="monotone"
                dataKey="range60"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.18}
              />

              <ReferenceLine
                y={criticalThreshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Seuil critique",
                  position: "insideBottomLeft",
                  fill: "#ef4444",
                  fontSize: 12,
                  offset: 10,
                }}
              />

              {selectedWeek !== null && (
                <ReferenceLine
                  x={selectedWeek}
                  stroke="#64748b"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}

              <Line
                type="monotone"
                dataKey="fvc"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#2563eb" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-[13px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center relative w-6">
              <div className="h-0.5 w-6 bg-blue-500 absolute top-1/2 -translate-y-1/2" />
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-gray-600 font-medium">FVC prédite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-6 rounded bg-blue-500/25 border border-blue-500/30" />
            <span className="text-gray-600 font-medium">IC 80% [Q10–Q90]</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-6 rounded bg-blue-500/10 border border-blue-500/15" />
            <span className="text-gray-600 font-medium">
              IC 95% [Q2.5–Q97.5]
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 border-t-2 border-dashed border-red-400" />
            <span className="text-gray-600 font-medium">Seuil critique</span>
          </div>
        </div>

        <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>À propos de la prédiction FVC</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm leading-6 text-gray-600">
              <p>
                Cette courbe est construite à partir de{" "}
                <strong>6 modèles XGBoost</strong> : un modèle central pour la
                FVC et cinq modèles de régression quantile (Q5, Q20, Q50, Q80,
                Q95).
              </p>
              <p>Les deux bandes de confiance représentent :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>IC 80%</strong> — intervalle [Q10, Q90] : zone où 80 %
                  des vraies valeurs sont attendues.
                </li>
                <li>
                  <strong>IC 95%</strong> — intervalle [Q2.5, Q97.5] : zone de
                  confiance élargie à 95 %.
                </li>
              </ul>
              <p>
                Plus les bandes sont étroites, plus le modèle est confiant dans
                sa prédiction. Ces intervalles sont estimés par ML, pas par une
                formule fixe.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: {
    value: number | [number, number];
    dataKey: string;
    payload?: {
      reliability?: number;
      lower90?: number;
      upper90?: number;
      lower60?: number;
      upper60?: number;
    };
  }[];
  label?: number;
}) {
  if (active && payload && payload.length) {
    const fvcPoint = payload.find((p) => p.dataKey === "fvc");
    const fvcValue = fvcPoint?.value as number | undefined;
    const meta = fvcPoint?.payload;
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-md min-w-[170px]">
        <p className="mb-1 text-sm font-medium text-gray-800">
          Semaine {label}
        </p>
        <p className="text-sm text-blue-600">
          FVC : <span className="font-semibold">{fvcValue?.toFixed(2)} L</span>
        </p>
        {meta?.lower60 != null && meta?.upper60 != null && (
          <p className="text-xs text-blue-500 mt-0.5">
            IC 80% : [{meta.lower60.toFixed(2)}&nbsp;–&nbsp;
            {meta.upper60.toFixed(2)} L]
          </p>
        )}
        {meta?.lower90 != null && meta?.upper90 != null && (
          <p className="text-xs text-blue-400 mt-0.5">
            IC 95% : [{meta.lower90.toFixed(2)}&nbsp;–&nbsp;
            {meta.upper90.toFixed(2)} L]
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Fiabilité :{" "}
          <span className="font-semibold text-gray-700">
            {meta?.reliability?.toFixed(0)}%
          </span>
        </p>
      </div>
    );
  }
  return null;
}
