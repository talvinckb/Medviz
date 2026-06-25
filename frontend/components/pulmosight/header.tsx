"use client";

import { User, Trash2 } from "lucide-react";

interface PatientInfo {
  name?: string;
  age?: number;
  gender?: string;
  height?: number;
  smoking_status?: string | null;
}

interface HeaderProps {
  patientId: string;
  patientInfo?: PatientInfo;
  onDelete?: () => void;
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-gray-50 border border-gray-100 px-2.5 py-1">
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[12px] font-semibold text-gray-700">{value}</span>
    </div>
  );
}

export function Header({ patientId, patientInfo, onDelete }: HeaderProps) {
  const hasInfo = patientId && patientInfo;

  const SmokingStatusMap: Record<string, string> = {
    "Never smoked": "Non-fumeur",
    "Ex-smoker": "Ancien fumeur",
    "Current smoker": "Fumeur actuel",
  };

  const smokingStatus =
    SmokingStatusMap[patientInfo?.smoking_status || ""] ||
    patientInfo?.smoking_status ||
    "Inconnu";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
          <User className="h-5 w-5 text-blue-500" />
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800 leading-tight truncate">
              {patientId ? `ID: ${patientId}` : "Tableau de bord"}
            </h1>
          </div>

          {hasInfo && (
            <>
              <div className="h-6 w-px bg-gray-200 shrink-0" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {patientInfo?.age !== undefined && (
                  <InfoBadge label="Âge" value={`${patientInfo.age} ans`} />
                )}
                {patientInfo?.gender && (
                  <InfoBadge
                    label="Sexe"
                    value={patientInfo.gender === "M" ? "Homme" : "Femme"}
                  />
                )}
                {patientInfo?.height !== undefined &&
                  patientInfo.height > 0 && (
                    <InfoBadge
                      label="Taille"
                      value={`${patientInfo.height} cm`}
                    />
                  )}
                {patientInfo?.smoking_status && (
                  <InfoBadge label="Tabac" value={smokingStatus} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {patientId && onDelete && (
        <button
          onClick={onDelete}
          className="ml-4 shrink-0 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      )}
    </header>
  );
}
