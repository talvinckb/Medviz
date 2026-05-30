"use client";

import { User } from "lucide-react";

interface HeaderProps {
  patientId: string;
}

export function Header({ patientId }: HeaderProps) {
  return (
    <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">ID: {patientId}</h1>
      </div>
    </header>
  );
}
