import React from "react";

// Logo Animada GURI GO com Destaque de Luz Esmeralda
export default function GuriGoLogo({ size = 120, showText = true, animated = true }) {
    
    const viewBox = "0 0 120 100";

    return (
        <div className={`flex items-center gap-6 ${animated ? 'group' : ''}`}>

            {showText && (
                <div 
                    className="flex flex-col justify-center select-none opacity-0 relative"
                    style={animated ? { animation: 'fadeIn 0.8s ease-out 1.2s forwards' } : { opacity: 1 }}
                >
                    {/* Efeito de Aura Esmeralda atrás do texto */}
                    <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-150 -z-10 animate-pulse" />

                    <h1 className="text-[3.0rem] font-black tracking-tighter leading-none m-0 flex gap-2 relative overflow-hidden">
                        <span className="text-slate-1200 dark:text-slate-100 flex relative">
                            GURI
                            
                            {/* Destaque GO com Glow Esmeralda Clarinho */}
                            <span className="text-emerald-500 ml-2 relative drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                GO
                                {/* Partículas de luz sutis */}
                                <span className="absolute -top-1 -right-1 w-1 h-1 bg-emerald-300 rounded-full animate-ping opacity-75" />
                            </span>

                            {/* Efeito de Reflexo de Luz (Shimmer) que passa pelo texto */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full animate-[shimmer_4s_infinite] pointer-events-none" />
                        </span>
                    </h1>

                    <h2 className="text-[0.70rem] font-bold text-slate-400 uppercase tracking-[0.25em] mt-1 ml-1 flex items-center gap-2">
                        Sistemas de RH & DP
                        {/* Indicador de "Sistema Ativo" com luz suave */}
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse" />
                    </h2>
                    
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateX(-10px); }
                            to { opacity: 1; transform: translateX(0); }
                        }
                        @keyframes shimmer {
                            0% { transform: translateX(-100%); }
                            30%, 100% { transform: translateX(100%); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}