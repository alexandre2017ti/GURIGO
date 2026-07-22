import React from "react";
import { Users, Fingerprint, Zap, Loader2, BrainCircuit, Globe2 } from "lucide-react";

export default function LoadingScreen({ message = "Sincronizando Ecossistema..." }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#020617]">
            {/* BACKGROUND TECH: Partículas de Grade e Luzes Neon */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="relative z-20 flex flex-col items-center max-w-md w-full px-6">
                
                {/* ORBE DE TALENTOS (Logo Central) */}
                <div className="relative mb-12 group">
                    {/* Anéis Orbitais de DP */}
                    <div className="absolute inset-[-20px] border border-dashed border-indigo-500/30 rounded-full animate-spin-slow"></div>
                    <div className="absolute inset-[-40px] border border-dotted border-emerald-500/20 rounded-full animate-reverse-spin"></div>
                    
                    {/* Núcleo de Vidro */}
                    <div className="relative w-32 h-32 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)] flex items-center justify-center overflow-hidden">
                        {/* Brilho Interno */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
                        
                        {/* Ícones de Setor que Alternam */}
                        <div className="relative z-10 flex flex-col items-center">
                            <Users size={48} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] animate-float" strokeWidth={1.5} />
                            <div className="absolute -top-2 -right-2">
                                <Zap size={20} className="text-emerald-400 fill-emerald-400 animate-bounce" />
                            </div>
                        </div>
                    </div>

                    {/* Tags Flutuantes de DP (Simulando Processamento) */}
                    <div className="absolute -left-16 top-0 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md animate-float-delayed">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter flex items-center gap-1">
                           <Fingerprint size={10}/> Biometria
                        </span>
                    </div>
                    <div className="absolute -right-20 bottom-4 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md animate-float">
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-tighter flex items-center gap-1">
                           <BrainCircuit size={10}/> Analytics
                        </span>
                    </div>
                </div>

                {/* TEXTO DE IMPACTO */}
                <div className="text-center mb-20">
                    <h1 className="text-6xl font-black italic tracking-tighter text-white mb-3 italic">
                        GURI<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-emerald-400">GO</span>
                    </h1>
                    <div className="animate-pulse h-1 w-22 bg-gradient-to-r from-indigo-500 to-emerald-500 mx-auto rounded-full mb-4"></div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.3em] opacity-80">
                        Inteligência em Recursos Humanos
                    </p>
                </div>

                {/* STATUS DE CARREGAMENTO */}
                <div className="w-full space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                        <span className="flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin text-indigo-500" />
                            {message}
                        </span>
                        <span className="text-emerald-400 animate-pulse">Encriptado AES-256</span>
                    </div>

                    {/* BARRA DE PROGRESSO DESIGNER */}
                    <div className="relative h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                        <div className="absolute top-0 left-0 h-full w-[60%] bg-gradient-to-r from-indigo-600 via-emerald-400 to-indigo-600 animate-progress-flow rounded-full shadow-[0_0_15px_rgba(52,211,153,0.5)]"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-shimmer-fast bg-[length:200%_100%]"></div>
                    </div>
                </div>

                {/* RODAPÉ ESTATÍSTICO */}
                <div className="mt-12 flex gap-8 opacity-40">
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Uptime</span>
                        <span className="text-xs text-white font-mono">99.9%</span>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-800"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Security</span>
                        <span className="text-xs text-white font-mono">Tier IV</span>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-800"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Region</span>
                        <span className="text-xs text-white font-mono">BR-SAO</span>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes progress-flow {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes shimmer-fast {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(8px); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes reverse-spin {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                .animate-progress-flow { animation: progress-flow 3s infinite linear; }
                .animate-shimmer-fast { animation: shimmer-fast 1.5s infinite linear; }
                .animate-float { animation: float 4s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 5s ease-in-out infinite; }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
                .animate-reverse-spin { animation: reverse-spin 12s linear infinite; }
                .animate-pulse-slow { animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            `}} />
        </div>
    );
}