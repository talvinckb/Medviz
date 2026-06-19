"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { FVCRecord } from "@/types/types";
import { Slider } from "@/components/ui/slider";

interface DiseaseScoreProps {
  sickness_value: number;
  fibrosis_ratio: number;
  fvc_baseline: number;
  optimal_fvc: number;
  fvc_records?: FVCRecord[];
}

export function DiseaseScore({
  sickness_value,
  fibrosis_ratio,
  fvc_baseline,
  optimal_fvc,
  fvc_records = [],
}: DiseaseScoreProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Set week range from 0 to 52 weeks
  const minWeek = 0;
  const maxWeek = 52;

  // Default to week 0 if available, else first available week, else 0
  const defaultWeek = fvc_records.some((r) => r.week_num === 0)
    ? 0
    : fvc_records.length > 0
      ? Math.max(0, Math.min(52, fvc_records[0].week_num))
      : 0;

  const [selectedWeek, setSelectedWeek] = useState<number>(defaultWeek);

  // Sync selectedWeek if patient / fvc_records changes
  useEffect(() => {
    const newDefaultWeek = fvc_records.some((r) => r.week_num === 0)
      ? 0
      : fvc_records.length > 0
        ? Math.max(0, Math.min(52, fvc_records[0].week_num))
        : 0;
    setSelectedWeek(newDefaultWeek);
  }, [fvc_records]);

  // Find active record or use baseline FVC if not found
  const activeRecord = fvc_records.find((r) => r.week_num === selectedWeek);
  const selectedFVC = activeRecord ? activeRecord.fvc : fvc_baseline || 0;

  // Sickness value is selectedFVC / optimal_fvc (optimal_fvc is in mL, selectedFVC is in liters)
  const dynamicSicknessValue =
    optimal_fvc > 0 ? selectedFVC / (optimal_fvc / 1000.0) : sickness_value;

  console.log(
    "DiseaseScore selectedWeek:",
    selectedWeek,
    "selectedFVC:",
    selectedFVC,
    "sickness_value:",
    dynamicSicknessValue,
  );

  // Formula: score = (1 - sickness_value) * 10. Max score is 4.
  const score = Math.max(0, Math.min(4, (1 - dynamicSicknessValue) * 10));

  const getStageLabel = (score: number) => {
    if (score < 1.5) return "Pas malade";
    if (score < 2.5) return "Modéré";
    if (score < 3.5) return "Sévère";
    return "Très sévère 💀";
  };

  const getScoreColor = (score: number) => {
    if (score < 1.5) return "text-[#4CAF50]"; // Green
    if (score < 2.5) return "text-[#FFB300]"; // Amber/Yellow
    if (score < 3.5) return "text-[#FF9800]"; // Orange
    return "text-[#F44336]"; // Red
  };

  // Calculate pin position (0-4 scale, percentage)
  const pinPosition = (score / 4) * 100;

  return (
    <Card className="h-full flex flex-col rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="pb-0 pt-4 px-6">
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-gray-800">
          Score de maladie (GI-2012)
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="rounded-full text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            aria-label="Afficher les informations sur le score de maladie"
          >
            <Info className="h-4 w-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 items-center justify-center gap-6 pb-8 pt-4 mx-6">
        <div className="text-center w-full">
          <p
            className={`text-[64px] leading-none font-bold tracking-tight ${getScoreColor(score)}`}
          >
            {score.toFixed(1)}
          </p>
          <p className={`mt-2 text-[15px] font-medium ${getScoreColor(score)}`}>
            {getStageLabel(score)}
          </p>
          <p className="mt-2 text-[13px] text-gray-500 font-medium">
            Ratio de fibrose: {(fibrosis_ratio * 100).toFixed(1)}%
          </p>

          <div className="mt-4 flex gap-4 justify-center text-[13px] border-t border-gray-100 pt-3">
            <div>
              <span className="text-gray-400">
                FVC Semaine {selectedWeek} :{" "}
              </span>
              <span className="font-semibold text-gray-700">
                {selectedFVC ? `${selectedFVC.toFixed(2)} L` : "N/A"}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200 align-middle self-center" />
            <div>
              <span className="text-gray-400">FVC Optimale : </span>
              <span className="font-semibold text-gray-700">
                {optimal_fvc ? `${(optimal_fvc / 1000).toFixed(2)} L` : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full mt-2 relative">
          <div className=" mb-1 h-8">
            <div
              className="absolute -translate-x-1/2 flex flex-col items-center translate-y-1/2"
              style={{ left: `${pinPosition}%` }}
            >
              <div className="h-3 w-3 rounded-full bg-[#1e293b]" />
              <div className="h-5 w-0.5 bg-[#1e293b]" />
            </div>
          </div>

          <div className="h-3 w-full rounded-full bg-linear-to-r from-[#4CAF50] via-[#FFEB3B] via-50% to-[#F44336]" />

          <div className="mt-3 relative w-full h-10 text-[13px] text-gray-600 font-medium">
            <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center">
              <span>0</span>
            </div>
            <div className="absolute left-[25%] -translate-x-1/2 flex flex-col items-center">
              <span>1</span>
              <span className="text-gray-400 mt-0.5">Léger</span>
            </div>
            <div className="absolute left-[50%] -translate-x-1/2 flex flex-col items-center">
              <span>2</span>
              <span className="text-gray-400 mt-0.5">Modéré</span>
            </div>
            <div className="absolute left-[75%] -translate-x-1/2 flex flex-col items-center">
              <span>3</span>
              <span className="text-gray-400 mt-0.5">Sévère</span>
            </div>
            <div className="absolute left-full -translate-x-1/2 flex flex-col items-center">
              <span>4</span>
              <span className="text-gray-400 mt-0.5">Très sévère</span>
            </div>
          </div>
        </div>

        {/* Week Selector Slider */}
        {fvc_records.length > 0 && (
          <div className="w-full mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
              <span>Comparer avec la semaine :</span>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                Semaine {selectedWeek}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400 w-12 text-right">
                Sem. {minWeek}
              </span>
              <Slider
                value={[selectedWeek]}
                onValueChange={(values) => {
                  if (values && values.length > 0) {
                    setSelectedWeek(values[0]);
                  }
                }}
                min={minWeek}
                max={maxWeek}
                step={1}
                className="flex-1 cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-12 text-left">
                Sem. {maxWeek}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>À propos du score de maladie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6 text-gray-600">
            <p>
              Ce score est une prédiction calculée à partir de la FVC maximale.
              Il sert à donner une estimation visuelle de la sévérité, mais il
              ne remplace pas un avis médical.
            </p>
            <div className="rounded-md bg-gray-50 p-3 border border-gray-100">
              <p className="font-semibold text-gray-800 mb-1">
                Détails du calcul :
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>
                  <strong>Semaine comparée :</strong> Semaine {selectedWeek}
                </li>
                <li>
                  <strong>FVC Semaine {selectedWeek} :</strong>{" "}
                  {selectedFVC ? `${selectedFVC.toFixed(2)} L` : "N/A"}
                </li>
                <li>
                  <strong>FVC Optimale (fixe) :</strong>{" "}
                  {optimal_fvc ? `${(optimal_fvc / 1000).toFixed(2)} L` : "N/A"}
                </li>
                <li>
                  <strong>Ratio observé :</strong>{" "}
                  {dynamicSicknessValue.toFixed(3)}
                </li>
                <li>
                  <strong>Formule :</strong>{" "}
                  <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">
                    (1 - Ratio) × 10
                  </code>
                </li>
              </ul>
            </div>
            <p>
              <strong>
                Pour avoir une interprétation fiable de l'état de santé du
                patient, il faut demander l'avis d'un professionnel de santé
              </strong>
              . Seul un médecin peut confirmer un résultat et le replacer dans
              votre contexte clinique.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
