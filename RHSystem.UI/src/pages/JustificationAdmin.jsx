import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { Card, Input } from "@/components/ui";
import { ShieldCheck, Trash2, Eye, Search, Loader2, X, Download, Bug } from "lucide-react";

export default function JustificationAdmin() {
    const [justifications, setJustifications] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [viewImage, setViewImage] = useState(null);

    // ESTADO PARA DEBUG
    const [debugRaw, setDebugRaw] = useState(null);
    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
        const cleanup = api.onDataReceived((res) => {
            setDebugRaw(res);

            if (res.type === "justifications-loaded") {
                // Desembrulha garantindo que é array
                const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setJustifications(list);
                setLoading(false);
            }

            if (res.type === "justification-image-loaded") {
                setViewImage(res.data);
            }

            // ✨ Tratamento de erro: Para o loading se o C# avisar que falhou
            if (res.type === "error-occurred") {
                console.error("Erro do Backend:", res.data);
                setLoading(false);
            }
        });

        api.send("GET_SAVED_JUSTIFICATIONS");

        return () => cleanup();
    }, []);

    // ✨ OTIMIZAÇÃO: Filtro ultra-rápido memoizado
    const filtered = useMemo(() => {
        const safeList = Array.isArray(justifications) ? justifications : [];
        const term = searchTerm.toLowerCase().trim();

        if (!term) return safeList;

        return safeList.filter(j => {
            const name = (j?.employeeName || j?.EmployeeName || "Sem Nome").toLowerCase();
            const type = (j?.type || j?.Type || "").toLowerCase();
            const date = (j?.date || j?.Date || "");

            return name.includes(term) || type.includes(term) || date.includes(term);
        });
    }, [justifications, searchTerm]);

    return (
        <div className="p-8 space-y-8 bg-white min-h-screen relative">
            {/* 🐞 BOTÃO E PAINEL DE DEBUG */}
            <div className="fixed bottom-4 right-4 z-[200]">
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="p-3 bg-slate-800 text-white rounded-full shadow-2xl hover:bg-black transition-colors"
                    title="Debug Console"
                >
                    <Bug size={20} />
                </button>
            </div>

            {showDebug && (
                <div className="fixed bottom-20 right-4 w-[400px] h-[500px] bg-slate-900 rounded-3xl shadow-2xl z-[200] border border-white/10 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800">
                        <span className="text-white font-black text-xs uppercase tracking-widest">Debug Console</span>
                        <button onClick={() => setShowDebug(false)} className="text-white/50 hover:text-white"><X size={16} /></button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 font-mono text-[10px]">
                        <p className="text-emerald-400 mb-2">// Última mensagem recebida:</p>
                        <pre className="text-slate-300 whitespace-pre-wrap bg-black/30 p-3 rounded-lg border border-white/5">
                            {debugRaw ? JSON.stringify(debugRaw, null, 2) : "Aguardando dados..."}
                        </pre>
                        <p className="text-amber-400 mt-4 mb-2">// Estado atual das justificativas:</p>
                        <pre className="text-slate-300 whitespace-pre-wrap bg-black/30 p-3 rounded-lg border border-white/5">
                            {justifications.length > 0 ? `Total: ${justifications.length} registros` : "Array vazio"}
                        </pre>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center border-b pb-8">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-xl">
                        <ShieldCheck size={40} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900">Gestão de Atestados</h1>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Auditoria de documentos</p>
                    </div>
                </div>
                <div className="relative w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <Input
                        placeholder="Nome ou data..."
                        className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* TABELA */}
            <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400">
                        <tr>
                            <th className="px-10 py-6">Colaborador</th>
                            <th className="px-10 py-6">Data</th>
                            <th className="px-10 py-6">Tipo</th>
                            <th className="px-10 py-6">Anexo</th>
                            <th className="px-10 py-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={40} /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="5" className="py-20 text-center font-bold text-slate-300 uppercase text-xs">Nenhum registro encontrado</td></tr>
                        ) : filtered.map((j) => (
                            <tr key={j.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-10 py-6 font-black text-slate-700">{j?.employeeName || j?.EmployeeName || "---"}</td>
                                <td className="px-10 py-6 text-slate-500 font-bold">{(j?.date || j?.Date)?.split('-').reverse().join('/')}</td>
                                <td className="px-10 py-6">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${(j?.type || j?.Type) === 'ATESTADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {j?.type || j?.Type}
                                    </span>
                                </td>
                                <td className="px-10 py-6 flex items-center gap-3">
                                    {(j?.hasImage || j?.HasImage) ? (
                                        <>
                                            <button onClick={() => api.send("GET_JUSTIFICATION_IMAGE", { id: j.id || j.Id })} className="flex items-center gap-1 text-indigo-600 font-black text-[10px] uppercase hover:underline">
                                                <Eye size={14} /> Ver
                                            </button>
                                        </>
                                    ) : <span className="text-slate-300 italic text-[10px]">Sem anexo</span>}
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <button onClick={() => window.confirm("Excluir?") && api.send("DELETE_JUSTIFICATION", { id: j.id || j.Id })} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* LIGHTBOX */}
            {viewImage && (
                <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4">
                    <button onClick={() => setViewImage(null)} className="absolute top-8 right-8 text-white/50 hover:text-white bg-white/10 p-4 rounded-full"><X size={32} /></button>
                    <img src={viewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" alt="Anexo" />
                </div>
            )}
        </div>
    );
}