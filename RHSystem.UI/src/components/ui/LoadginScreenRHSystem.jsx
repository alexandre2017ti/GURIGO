import React from "react";
import { Building2, ShieldCheck, DatabaseZap, Loader2 } from "lucide-react";

export default function LoadingScreen({ message = "Iniciando Sistema..." }) {
    return (
        // Container Principal com Fundo Animado e Vidro
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-slate-50">
            {/* Camada 1: Gradiente de fundo que se move suavemente */}
            <div className="absolute inset-0 z-0 bg-gradient-to-tr from-indigo-50 via-slate-50 to-emerald-50 opacity-70 animate-gradient-x"></div>
            {/* Camada 2: Efeito de Vidro Jateado */}
            <div className="absolute inset-0 z-10 backdrop-blur-md"></div>

            {/* CONTEÚDO CENTRAL (z-20 para ficar acima do fundo) */}
            <div className="relative z-20 flex flex-col items-center">

                {/* --- LOGO ANIMADA (Flutuando) --- */}
                <div className="relative flex items-center justify-center mb-8 p-6 animate-float">
                    {/* Halo de luz pulsante atrás */}
                    <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-40 animate-pulse-slow"></div>

                    {/* O 'Emblema' Central */}
                    <div className="relative bg-white/90 p-5 rounded-full shadow-2xl flex items-center justify-center border border-white/60 backdrop-blur-sm ring-4 ring-indigo-50/60">
                        {/* Ícone de Fundo (Escudo) - Estático */}
                        <ShieldCheck size={56} className="text-indigo-100 absolute scale-110" />

                        {/* Ícone Principal (Prédio) - Pulso lento e suave */}
                        <Building2 size={36} className="text-indigo-600 z-10 animate-pulse-slow drop-shadow-sm" strokeWidth={1.5} />

                        {/* Ícone de Destaque (Raio/Banco) - Saltitando animado */}
                        <div className="absolute bottom-2 right-2 z-20 animate-bounce" style={{ animationDuration: '1.5s' }}>
                            <DatabaseZap size={20} className="text-emerald-500 drop-shadow-md" />
                        </div>
                    </div>
                </div>

                {/* Título com Gradiente */}
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-emerald-600 tracking-tight mb-3 drop-shadow-sm text-center">
                    RH Enterprise
                </h2>

                {/* Mensagem de Status com Spinner */}
                <div className="flex items-center gap-2 mb-10 bg-white/60 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm border border-white/40 animate-pulse-slow">
                    <Loader2 size={18} className="text-indigo-600 animate-spin" />
                    <p className="text-sm font-bold text-indigo-900 uppercase tracking-widest">
                        {message}
                    </p>
                </div>

                {/* --- BARRA DE CARREGAMENTO "VIVA" --- */}
                <div className="w-80 h-3 bg-slate-200/60 rounded-full overflow-hidden relative shadow-inner backdrop-blur-md border border-slate-300/50 p-[2px]">
                    {/* Camada 1: O fluxo de energia (gradiente se movendo) */}
                    <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 animate-gradient-x rounded-full opacity-90"></div>

                    {/* Camada 2: O brilho intenso passando rápido */}
                    <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer rounded-full mix-blend-overlay"></div>
                </div>
            </div>

            {/* Botão de Recarregar no Rodapé */}
            <button
                onClick={() => window.location.reload()}
                className="absolute bottom-8 z-30 text-xs font-semibold text-indigo-700/70 hover:text-indigo-800 transition-all bg-white/40 px-6 py-2 rounded-full hover:bg-white/70 backdrop-blur-sm border border-white/30 shadow-sm hover:shadow-md"
            >
                Demorando muito? Clique para recarregar.
            </button>
        </div>
    );
}
