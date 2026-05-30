"use client";

import { Settings, ChevronRight, Plus, Stethoscope, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Patient {
  id: string;
  name: string;
}

interface SidebarProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  onOpenDicomModal: () => void;
}

export function Sidebar({
  patients,
  selectedPatientId,
  onSelectPatient,
  onOpenDicomModal,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
          <Image src="/icon.svg" alt="Logo" width={20} height={20} />
        </div>
        <span className="text-xl font-bold tracking-tight">PulmoSight</span>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onOpenDicomModal}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-blue-600 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Ajouter un patient
        </button>
      </div>

      <div className="px-5 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Patients
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-1">
          {patients.map((patient) => {
            const isSelected = patient.id === selectedPatientId;
            return (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={cn(
                  "group flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-all cursor-pointer",
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <User
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isSelected ? "text-white" : "text-slate-400",
                    )}
                  />
                  <p className="truncate text-sm font-medium">
                    ID: {patient.id}
                  </p>
                </div>
                {isSelected && <ChevronRight className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* <div className="border-t border-slate-800 p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800">
          <Settings className="h-5 w-5" />
          Paramètres
        </button>
      </div> */}
    </aside>
  );
}
