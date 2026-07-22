import React from 'react';
import { api } from "@/services/api";
import { Terminal } from "lucide-react";

export default function DebugTools() {
    // Só renderiza em ambiente de desenvolvimento
    if (window.location.hostname !== "localhost") return null;

    return (
        <button
            onClick={() => api.send("OPEN_INSPECT")}
            // z-[9999] garante que fique acima de modais e menus
            className="fixed bottom-6 right-6 bg-yellow-500 hover:bg-yellow-600 text-black p-3 rounded-full shadow-2xl z-[9999] flex items-center gap-2 font-bold text-xs border-2 border-black/10 transition-transform active:scale-95"
            title="Abrir DevTools (Inspecionar)"
        >
            <Terminal size={18} />
            <span className="hidden md:inline">DEBUG</span>
        </button>
    );
}