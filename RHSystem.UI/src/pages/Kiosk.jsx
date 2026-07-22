import React, { useState, useEffect, useCallback, useRef } from "react";
import Webcam from "react-webcam"; // ✨ A CÂMERA FOI ADICIONADA AQUI
import { api } from "@/services/api";
import { Button, Input, Card } from "@/components/ui";
import { Clock, MapPin, CheckCircle2, AlertCircle, Fingerprint, Lock, Loader2, Camera } from "lucide-react";
import RhLogo from "@/components/ui/RhLogo";

// A URL oficial do túnel para a versão Web
const API_URL = "https://api.varandasupermercados.online/api";

// ✨ A MÁGICA DA UNIFICAÇÃO: Descobre se estamos no .EXE ou no Navegador
const isDesktopApp = typeof window !== 'undefined' && window.chrome && window.chrome.webview;

export default function Kiosk({ storeName, storeCode }) {

    // --- ESTADOS ---
    const [pin, setPin] = useState("");
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [message, setMessage] = useState("");
    const webcamRef = useRef(null); // Ref para capturar a foto

    // Admin States (Apenas para Desktop)
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPass, setAdminPass] = useState("");

    // Configuração da Loja
    const [storeConfig, setStoreConfig] = useState({
        StoreName: storeName || (isDesktopApp ? "Identificando Unidade..." : "Terminal Web"),
        StoreCode: storeCode || (isDesktopApp ? "" : "WEB-01")
    });

    // --- FUNÇÕES DE ENVIO UNIFICADAS ---
    const handleRegister = useCallback(async (currentPin) => {
        if (currentPin.length < 4 || status === "loading") return;
        
        setStatus("loading");

        // ✨ CAPTURA A FOTO EXATAMENTE NO MOMENTO DO ÚLTIMO DÍGITO
        let base64Image = "";
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                base64Image = imageSrc.split(',')[1]; // Tira o prefixo "data:image/jpeg;base64,"
            }
        }

        const payload = {
            Pin: currentPin,
            StoreCode: storeConfig.StoreCode,
            ImageBase64: base64Image // Envia a foto para a Azure validar
        };

        if (isDesktopApp) {
            // 🖥️ ROTA DESKTOP: Envia o comando silencioso pro C# pelo WebView2
            api.send("REGISTER_TIME", payload);
            // O resultado será tratado no useEffect do Listener (lá embaixo)
        } else {
            // 🌐 ROTA WEB: Usa o Fetch direto para o túnel da Cloudflare
            try {
                const response = await fetch(`${API_URL}/ponto`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                
                const res = await response.json();
                
                if (response.ok && res.success !== false) {
                    setStatus("success");
                    setMessage(`Olá, ${res.employeeName || 'Colaborador'}! Registrado às ${res.time || '--:--'}`);
                } else {
                    setStatus("error");
                    setMessage(res.message || "Acesso Negado ou Erro ao processar ponto.");
                }
            } catch (error) {
                setStatus("error");
                setMessage("Servidor offline ou erro de conexão.");
            } finally {
                setPin("");
                setTimeout(() => setStatus("idle"), 4000);
            }
        }
    }, [storeConfig.StoreCode, status]);

    const handleAdminUnlock = (e) => {
        e.preventDefault();
        if (!adminPass || !isDesktopApp) return;
        api.send("REQUEST_ADMIN_UNLOCK", { password: adminPass });
    };

    // --- EFEITOS ---
    // Gatilho Automático do PIN
    useEffect(() => {
        if (pin.length === 4) {
            handleRegister(pin);
        }
    }, [pin, handleRegister]);

    // Listener de Mensagens do C# (Roda APENAS no Desktop)
    useEffect(() => {
        if (!isDesktopApp) return;

        const handleData = (res) => {
            switch (res.type) {
                case "app-mode-config":
                    if (res.data) {
                        setStoreConfig({
                            StoreName: res.data.StoreName || res.data.storeName || "Unidade Desconhecida",
                            StoreCode: res.data.StoreCode || res.data.storeCode || ""
                        });
                    }
                    break;
                case "time-success":
                    setStatus("success");
                    setMessage(`Olá, ${res.data?.employeeName || 'Colaborador'}! Registrado às ${res.data?.time || '--:--'}`);
                    setPin("");
                    setTimeout(() => setStatus("idle"), 4000);
                    break;
                case "time-error":
                    setStatus("error");
                    setMessage(res.data || "Erro ao processar ponto.");
                    setPin("");
                    setTimeout(() => setStatus("idle"), 4000);
                    break;
                case "admin-unlock-error":
                    alert("Acesso negado: Senha administrativa incorreta.");
                    setAdminPass("");
                    break;
            }
        };

        const cleanup = api.onDataReceived(handleData);
        api.send("GET_APP_MODE"); 

        return () => cleanup();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            
            {/* FUNDO DINÂMICO */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[120px] rounded-full animate-[pulse_8s_infinite] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[100px] rounded-full animate-[pulse_12s_infinite_reverse] mix-blend-screen" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-emerald-500/5 rounded-full animate-[spin_50s_linear_infinite]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-emerald-500/10 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
            </div>

            {/* ✨ O BOTÃO ADMIN AGORA SÓ APARECE NO DESKTOP */}
            {isDesktopApp && (
                <button onClick={() => setShowAdminLogin(true)} className="absolute top-6 right-6 text-slate-600 hover:text-white transition-all opacity-20 hover:opacity-100 p-3 z-30">
                    <Lock size={22} />
                </button>
            )}

            <div className="mb-10 relative z-20 group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-110 animate-pulse group-hover:bg-emerald-500/40 transition-all duration-700" />
                <div className="absolute inset-0 bg-emerald-400/10 blur-3xl rounded-full scale-150 animate-[ping_4s_linear_infinite]" />
                <div className="relative transform hover:scale-105 transition-transform duration-500">
                    <RhLogo size="h-20" />
                </div>
            </div>

            {/* Card Principal */}
            <Card className="w-full max-w-md bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-[0_0_80px_-15px_rgba(16,185,129,0.2)] space-y-8 text-center relative z-10 border-t-8 border-emerald-500">
                
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <MapPin size={12} className="animate-bounce" />
                        {isDesktopApp ? "Terminal Fixo" : "Terminal Web"}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 leading-tight uppercase tracking-tight">
                        {storeConfig.StoreName}
                    </h1>
                </div>

                <div className="py-10 bg-slate-950 rounded-[2rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                    <div className="text-7xl font-mono font-black text-white tabular-nums tracking-tighter relative z-10">
                        <ClockDisplay />
                    </div>
                    <p className="text-emerald-500/60 text-xs font-bold mt-2 uppercase tracking-widest">Sincronizado via GuriGo</p>
                </div>

                <div className="min-h-[180px] flex flex-col justify-center border-t border-slate-100 pt-8 relative">
                    
                    {status === "success" && (
                        <div className="space-y-4 animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-100/50 rotate-3">
                                <CheckCircle2 size={44} />
                            </div>
                            <h3 className="text-2xl font-black text-emerald-600 italic">Identidade Confirmada!</h3>
                            <p className="text-slate-500 font-bold">{message}</p>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="space-y-4 animate-in shake duration-300">
                            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-100/50 -rotate-3">
                                <AlertCircle size={44} />
                            </div>
                            <h3 className="text-2xl font-black text-rose-600 italic">Atenção</h3>
                            <p className="text-slate-500 font-bold">{message}</p>
                        </div>
                    )}

                    {status === "loading" && (
                        <div className="space-y-4 flex flex-col items-center justify-center">
                            <div className="relative">
                                <Fingerprint size={80} className="text-emerald-500 animate-pulse" />
                                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping" />
                            </div>
                            <div className="flex items-center gap-2 font-black uppercase text-sm tracking-widest text-emerald-600">
                                <Loader2 size={18} className="animate-spin" />
                                Analisando Biometria
                            </div>
                        </div>
                    )}

                    {status === "idle" && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            
                            {/* ✨ A CÂMERA ESCONDIDA DA AZURE (Fica pequena para não poluir, mas tira a foto!) */}
                            <div className="flex justify-center mb-[-10px] opacity-20">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 relative">
                                    <Webcam
                                        ref={webcamRef}
                                        audio={false}
                                        screenshotFormat="image/jpeg"
                                        screenshotQuality={0.8}
                                        videoConstraints={{ facingMode: "user" }}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Olhe para a câmera e insira sua Matrícula</p>
                            
                            <div className="relative max-w-[240px] mx-auto">
                                <Input
                                    type="password"
                                    inputMode="numeric"
                                    className="text-center text-5xl h-24 tracking-[0.5em] font-black border-0 rounded-3xl transition-all bg-slate-50 shadow-inner focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                />
                                <div className="absolute -bottom-2 inset-x-8 h-1 bg-emerald-500/20 blur-sm rounded-full" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
                   <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Terminal ID: <span className="text-slate-400 font-mono">{storeConfig.StoreCode}</span>
                   </div>
                </div>
            </Card>

            {/* Modal Admin (Apenas no Desktop, mas o JSX precisa estar aqui) */}
            {isDesktopApp && showAdminLogin && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <Card className="p-8 w-full max-w-sm bg-white rounded-[2rem] shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Modo Administrador</h2>
                            <p className="text-slate-500 text-sm">Insira a senha mestra para sair do Kiosk</p>
                        </div>
                        <form onSubmit={handleAdminUnlock} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="••••••••"
                                className="h-12 text-center text-2xl border-2 focus:border-emerald-500"
                                value={adminPass}
                                onChange={e => setAdminPass(e.target.value)}
                                autoFocus
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Button type="button" variant="outline" onClick={() => setShowAdminLogin(false)} className="h-12 font-bold rounded-xl hover:bg-slate-50 text-slate-600">
                                    Voltar
                                </Button>
                                <Button type="submit" className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl border-none">
                                    Desbloquear
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}

const ClockDisplay = () => {
    const [time, setTime] = useState(new Date().toLocaleTimeString());
    
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    return <>{time}</>;
};