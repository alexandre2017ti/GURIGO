import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Card, Button, Input, Label } from "@/components/ui";
import { X, Upload, CheckCircle2, FileText, Loader2 } from "lucide-react";

export default function JustifyAbsenceModal({ isOpen, onClose, employeeId, date, employeeName }) {
    const [type, setType] = useState("ATESTADO");
    const [description, setDescription] = useState("");
    const [isAbonado, setIsAbonado] = useState(true);
    const [imageBase64, setImageBase64] = useState(null);
    const [loading, setLoading] = useState(false);

    // ✨ ESCUTA ISOLADA (Tratamento de sucesso e erro)
    useEffect(() => {
        if (!isOpen) return; // Só escuta se o modal estiver aberto!

        const handleData = (res) => {
            if (res.type === "db-config-success") {
                setLoading(false);
                onClose(); // Fecha o modal e volta para a tela de ponto
            }
            if (res.type === "error-occurred") {
                alert("Falha ao salvar: " + res.data);
                setLoading(false);
            }
        };

        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // ✨ COMPRESSÃO BÁSICA (Protege o C# de receber arquivos pesados que dão timeout)
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Se o arquivo tiver mais de 5MB, avisamos o usuário
            if (file.size > 5 * 1024 * 1024) {
                alert("A imagem é muito grande. Escolha uma foto com menos de 5MB.");
                e.target.value = ''; // Limpa o input
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => setImageBase64(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!type) return alert("Selecione o tipo de justificativa.");
        
        setLoading(true);
        const payload = {
            employeeId,
            date,
            type,
            description,
            isAbonado: type === "ATESTADO" ? true : isAbonado,
            imageBase64
        };

        api.send("SAVE_JUSTIFICATION", payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <FileText className="text-indigo-600" size={24} /> Justificar Falta
                            </h2>
                            <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                                {employeeName} • {new Date(date).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <button 
                            onClick={onClose} 
                            disabled={loading} // Não deixa fechar enquanto salva
                            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Seletor de Tipo */}
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Tipo</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => { setType("ATESTADO"); setIsAbonado(true); }}
                                    className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${type === 'ATESTADO' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                >
                                    ATESTADO
                                </button>
                                <button 
                                    onClick={() => setType("JUSTIFICADA")}
                                    className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${type === 'JUSTIFICADA' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                                >
                                    JUSTIFICADA
                                </button>
                            </div>
                        </div>

                        {/* Opção de Abono (Apenas para Falta Justificada) */}
                        {type === "JUSTIFICADA" && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
                                <input 
                                    type="checkbox" 
                                    id="abono" 
                                    checked={isAbonado} 
                                    onChange={(e) => setIsAbonado(e.target.checked)}
                                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                                />
                                <label htmlFor="abono" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                    Abonar horas (Não descontar saldo)
                                </label>
                            </div>
                        )}

                        {/* Upload de Imagem */}
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Anexar Documento</Label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 transition-all cursor-pointer overflow-hidden group">
                                {imageBase64 ? (
                                    <div className="relative w-full h-full">
                                        <img src={imageBase64} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-xs uppercase tracking-widest">
                                            Trocar Foto
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors duration-300" size={24} />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Clique para enviar foto</p>
                                        <p className="text-[8px] text-slate-400 mt-1">Máx: 5MB</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} />
                            </label>
                        </div>

                        {/* Observação */}
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Motivo / CID</Label>
                            <Input 
                                placeholder="Descreva brevemente..." 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="rounded-xl border-2 border-slate-100 bg-slate-50 font-medium focus:ring-indigo-500 focus:border-indigo-500 h-11"
                            />
                        </div>
                    </div>

                    <Button 
                        disabled={loading}
                        onClick={handleSave}
                        className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg transition-all active:scale-95 gap-2 font-black uppercase tracking-widest text-[11px]"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> Salvar Justificativa</>}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
