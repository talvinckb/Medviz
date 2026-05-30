"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

interface DiseaseScoreProps {
  score: number;
}

export function DiseaseScore({ score }: DiseaseScoreProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const getStageLabel = (score: number) => {
    if (score < 1.5) return "Léger";
    if (score < 2.5) return "Modéré";
    if (score < 3.5) return "Sévère";
    return "Très sévère";
  };

  const getScoreColor = (score: number) => {
    if (score < 1.5) return "text-[#4CAF50]"; // specific green from screenshot
    if (score < 2.5) return "text-[#4CAF50]";
    if (score < 3.5) return "text-orange-500";
    return "text-red-500";
  };

  // Calculate pin position (0-4 scale, percentage)
  const pinPosition = (score / 4) * 100;

  return (
    <Card className="h-full flex flex-col rounded-xl border border-gray-100 shadow-sm">
      <CardHeader className="pb-0 pt-6 px-6">
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
        <div className="text-center">
          <p
            className={`text-[64px] leading-none font-bold tracking-tight ${getScoreColor(score)}`}
          >
            {score.toFixed(1)}
          </p>
          <p className={`mt-2 text-[15px] font-medium ${getScoreColor(score)}`}>
            Stade {getStageLabel(score).toLowerCase()}
          </p>
        </div>

        <div className="w-full mt-4 relative">
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
            <p>
              Pour avoir une interprétation fiable de l'état de santé du
              patient, il faut demander l'avis d'un professionnel de santé. Seul
              un médecin peut confirmer un résultat et le replacer dans votre
              contexte clinique.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
