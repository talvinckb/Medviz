"use client";

import { User, Trash2 } from "lucide-react";

interface HeaderProps {
  patientId: string;
  onDelete?: () => void;
}

export function Header({ patientId, onDelete }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">
          {patientId ? `ID: ${patientId}` : "Tableau de bord"}
        </h1>
      </div>

      {patientId && onDelete && (
        <button
          onClick={onDelete}
          className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      )}
    </header>
  );
}
