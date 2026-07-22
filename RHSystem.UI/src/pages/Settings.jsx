import React, { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { Button, Input, Card } from "@/components/ui";
import { Settings as SettingsIcon, Save, Cloud, Link2, KeyRound, UploadCloud, CheckCircle2, Loader2 } from "lucide-react";

export default function Settings() {
    const [folderPath, setFolderPath] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Novos estados para o arquivo de credenciais
    const [credentialsFileName, setCredentialsFileName] = useState("");
    const [credentialsContent, setCredentialsContent] = useState("");
    const [hasCredentialsSaved, setHasCredentialsSaved] = useState(false);
    
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Pede ao C# as configurações atuais
        api.send("CHECK_SYSTEM_STATUS");

        const cleanup = api.onDataReceived((res) => {
            if (res.type === "system-status") {
                if (res.data) {
                    if (res.data.googleDriveFolderId) {
                        setFolderPath(res.data.googleDriveFolderId);
                    }
                    // O C# vai nos avisar se o arquivo credentials.json já existe na máquina
                    if (res.data.hasDriveCredentials) {
                        setHasCredentialsSaved(true);
                    }
                }
            }
            if (res.type === "db-config-success") {
                setLoading(false);
                alert("✅ Configurações salvas com sucesso!");
                setCredentialsContent(""); // Limpa o estado temporário após salvar
                setHasCredentialsSaved(true);
            }
            if (res.type === "error-occurred") {
                setLoading(false);
                alert("❌ Erro: " + res.data);
            }
        });
        
        return () => cleanup();
    }, []);

    // Função para ler o arquivo JSON selecionado pelo usuário
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== "application/json" && !file.name.endsWith(".json")) {
            alert("Por favor, selecione um arquivo válido do tipo .json");
            return;
        }

        setCredentialsFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            setCredentialsContent(event.target.result);
        };
        reader.readAsText(file);
    };

    const handleSave = () => {
        setLoading(true);

        // Extrai o ID se o utilizador colar o link inteiro do Drive
        let finalFolderId = folderPath.trim();
        const driveMatch = finalFolderId.match(/folders\/([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
            finalFolderId = driveMatch[1];
            setFolderPath(finalFolderId); 
        }

        // Envia o ID da pasta e o conteúdo do JSON (se houver um novo)
        api.send("SAVE_DRIVE_CONFIG", { 
            googleDriveFolderId: finalFolderId,
            credentialsJson: credentialsContent 
        });
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner">
                    <SettingsIcon size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configurações Gerais</h1>
                    <p className="text-sm text-slate-500 font-medium">Defina integrações externas e parâmetros globais do sistema.</p>
                </div>
            </div>

            {/* CARD GOOGLE DRIVE */}
            <Card className="p-6 md:p-8 border-slate-200 shadow-xl rounded-3xl bg-white relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm border border-blue-200">
                        <Cloud size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-lg leading-tight">Armazenamento em Nuvem</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Integração Google Drive API</p>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {/* INPUT 1: PASTA DO DRIVE */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">
                            Link ou ID da Pasta de Destino
                        </label>
                        <div className="relative group">
                            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <Input
                                value={folderPath}
                                onChange={(e) => setFolderPath(e.target.value)}
                                placeholder="Cole o link da pasta do Google Drive aqui..."
                                className="pl-12 h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-indigo-500 transition-all text-sm shadow-inner"
                            />
                        </div>
                    </div>

                    {/* INPUT 2: ARQUIVO JSON DE CREDENCIAIS */}
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1.5">
                            <KeyRound size={12} /> Chave de Autenticação (Service Account)
                        </label>
                        
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                onClick={() => fileInputRef.current.click()}
                                className="h-12 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-slate-600 gap-2 rounded-xl"
                            >
                                <UploadCloud size={18} />
                                Selecionar arquivo .json
                            </Button>
                            
                            <input 
                                type="file" 
                                accept=".json" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />

                            {credentialsFileName ? (
                                <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                    <CheckCircle2 size={16} />
                                    {credentialsFileName} (Pronto para salvar)
                                </div>
                            ) : hasCredentialsSaved ? (
                                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    <CheckCircle2 size={16} />
                                    Credenciais já configuradas no servidor
                                </div>
                            ) : (
                                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                    Nenhuma credencial configurada
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 italic pl-1 max-w-xl leading-tight">
                            Este é o arquivo JSON gerado pelo Google Cloud Console. Ele permite que o sistema envie os atestados automaticamente sem precisar de tela de login.
                        </p>
                    </div>
                </div>
            </Card>

            {/* BOTÃO SALVAR */}
            <div className="pt-6 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 h-14 px-12 gap-3 rounded-2xl shadow-lg transition-all font-black text-base active:scale-95"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                    {loading ? "Salvando..." : "Guardar Configurações"}
                </Button>
            </div>
        </div>
    );
}