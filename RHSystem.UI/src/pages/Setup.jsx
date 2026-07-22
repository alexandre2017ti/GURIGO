import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Button, Input, Label, Card } from "@/components/ui";
import { Server, Save, Loader2, Database, ShieldCheck } from "lucide-react";

export default function Setup() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const [formData, setFormData] = useState({
        Host: "localhost",
        Port: "5432", // <--- A vírgula dupla estava aqui
        Database: "rhsystem",
        Username: "postgres",
        Password: ""
    });

    // Escuta a resposta do C# (Sucesso ou Erro na conexão)
    useEffect(() => {
        const handleData = (res) => {
            if (res.type === "db-config-success") {
                setStatus("success");
                setLoading(false);
                // Dá um tempinho para o usuário ver o "Sucesso" antes de recarregar
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
            if (res.type === "db-config-error") {
                setStatus("error");
                setLoading(false);
                setErrorMessage(res.data || "Erro desconhecido ao conectar.");
            }
        };

        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, []);

    const handleSave = () => {
        if (!formData.Host || !formData.Username) {
            alert("Preencha pelo menos o Host e o Usuário.");
            return;
        }
        setLoading(true);
        setErrorMessage("");
        setStatus("idle");

        // Envia para o C# testar e salvar
        api.send("SAVE_DB_CONFIG", formData);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 animate-in fade-in duration-700">
            <Card className="w-full max-w-lg bg-white shadow-2xl overflow-hidden border-0">
                {/* Cabeçalho */}
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Server className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Configuração Inicial</h1>
                    <p className="text-indigo-200 mt-2 text-sm">
                        O sistema não encontrou um banco de dados configurado.
                        <br />Por favor, aponte para o servidor PostgreSQL.
                    </p>
                </div>

                {/* Formulário */}
                <div className="p-8 space-y-6">
                    {status === "error" && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2 animate-in shake">
                            <span className="font-bold">Erro:</span> {errorMessage}
                        </div>
                    )}

                    {status === "success" && (
                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-100 flex items-center gap-2 animate-in zoom-in">
                            <ShieldCheck size={18} />
                            <span className="font-bold">Conectado!</span> Reiniciando sistema...
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Endereço IP (Host)</Label>
                                <Input
                                    value={formData.Host}
                                    onChange={e => setFormData({ ...formData, Host: e.target.value })}
                                    placeholder="Ex: 192.168.0.100"
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Porta</Label>
                                <Input
                                    value={formData.Port}
                                    onChange={e => setFormData({ ...formData, Port: e.target.value })}
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors text-center"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome do Banco de Dados</Label>
                            <div className="relative">
                                <Database className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <Input
                                    value={formData.Database}
                                    onChange={e => setFormData({ ...formData, Database: e.target.value })}
                                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label>Usuário</Label>
                                <Input
                                    value={formData.Username}
                                    onChange={e => setFormData({ ...formData, Username: e.target.value })}
                                    placeholder="postgres"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Senha</Label>
                                <Input
                                    type="password"
                                    value={formData.Password}
                                    onChange={e => setFormData({ ...formData, Password: e.target.value })}
                                    placeholder="••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading || status === "success"}
                        className={`w-full h-12 text-lg font-medium shadow-md transition-all
                            ${status === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"}
                        `}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin mr-2" /> Testando Conexão...
                            </>
                        ) : status === "success" ? (
                            <>
                                <ShieldCheck className="mr-2" /> Tudo Pronto!
                            </>
                        ) : (
                            <>
                                <Save className="mr-2" /> Salvar e Conectar
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Rodapé discreto */}
            <div className="absolute bottom-4 text-slate-500 text-xs text-center opacity-50">
                RH System Enterprise • Setup Wizard v1.0
            </div>
        </div>
    );
}