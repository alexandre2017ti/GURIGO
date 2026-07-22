import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { 
    Card, Button, Input, Label, 
    Popover, PopoverContent, PopoverTrigger, Calendar, Badge 
} from "@/components/ui";
import { 
    Clock, Search, MapPin, Calendar as CalendarIcon, 
    FileText, X, UserSearch, ShieldAlert, CheckCircle2, Upload, Loader2,
    DownloadCloud, PlusCircle, FileSpreadsheet, Settings2, FileCheck, Plane 
} from "lucide-react";
import { format, startOfMonth, isToday } from "date-fns"; 
import { ptBR } from "date-fns/locale";
import { useLocation } from "react-router-dom";

// ============================================================================
// 2. MODAL DE IMPORTAÇÃO DE TEXTO
// ============================================================================
function ImportPointModal({ isOpen, onClose, employees }) {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [rawText, setRawText] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleImport = () => {
        if (!selectedEmployee || !rawText) return alert("Preencha todos os campos!");
        setLoading(true);
        api.send("IMPORT_PONTO_TEXTO", {
            employeeId: parseInt(selectedEmployee),
            texto: rawText
        });
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-lg bg-white shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                <DownloadCloud className="text-blue-500" size={28} /> Importar Folha
                            </h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                Cole o texto bruto do relógio
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Selecionar Colaborador</Label>
                            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 px-3 outline-none">
                                <option value="">Selecione um colaborador...</option>
                                {employees.map(emp => (
                                    <option key={emp.Id} value={emp.Id}>{emp.Name} (ID: {emp.Id})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Texto Bruto da Folha</Label>
                            <textarea className="w-full h-48 rounded-2xl border-2 border-slate-100 p-4 font-medium text-slate-600 text-sm focus:border-indigo-500 outline-none resize-none" placeholder="Cole aqui o texto copiado do relatório antigo..." value={rawText} onChange={(e) => setRawText(e.target.value)} />
                        </div>
                    </div>
                    <Button disabled={loading} onClick={handleImport} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] gap-2 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : "Processar e Salvar no Banco"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
// ============================================================================
// 3. MODAL DE JUSTIFICATIVA DA TABELA (Alinhado com o C#)
// ============================================================================
function JustifyAbsenceModal({ isOpen, onClose, employeeId, date, employeeName }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    
    const [type, setType] = useState("ATESTADO"); 
    const [description, setDescription] = useState("");
    const [isAbonado, setIsAbonado] = useState(true);
    const [imageBase64, setImageBase64] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && date) setStartDate(date);
    }, [isOpen, date]);

    useEffect(() => {
        if (!isOpen) return;
        const handleData = (res) => {
            if (res.type === "db-config-success") {
                setLoading(false);
                setStartDate(""); setEndDate(""); setStartTime(""); setEndTime(""); setImageBase64(null); setDescription("");
                onClose();
            }
            if (res.type === "error-occurred" || res.type === "db-config-error") {
                alert("Falha ao salvar: " + res.data);
                setLoading(false);
            }
        };
        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("A imagem é muito grande. Escolha uma foto com menos de 5MB.");
                e.target.value = ''; 
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setImageBase64(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!type || !startDate) return alert("A Data de Início é obrigatória.");
        setLoading(true);
        const payload = {
            employeeId: parseInt(employeeId),
            startDate,
            endDate: endDate || null,
            startTime: startTime || null, // ✨ Manda o horário independente de abonar ou não
            endTime: endTime || null,     // ✨ Manda o horário independente de abonar ou não
            type, 
            description: description || "Sem observação",
            isAbonado: type === "LICENCA_MATERNIDADE" ? true : isAbonado,
            imageBase64
        };
        api.send("SAVE_JUSTIFICATION", payload);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                <ShieldAlert className="text-amber-500" size={28} /> Justificar Ponto
                            </h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                {employeeName}
                            </p>
                        </div>
                        <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 text-slate-400"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Data Início *</Label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 px-3 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Data Fim (Opcional)</Label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 px-3 outline-none" />
                            </div>
                        </div>

                        <div className="space-y-2 mt-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Motivo do Afastamento</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => { setType("ATESTADO"); setIsAbonado(true); }} className={`py-3 rounded-2xl text-[9px] font-black transition-all border-2 ${type === 'ATESTADO' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>ATESTADO</button>
                                <button onClick={() => { setType("FALTA JUSTIFICADA"); setIsAbonado(false); }} className={`py-3 rounded-2xl text-[9px] font-black transition-all border-2 ${type === 'FALTA JUSTIFICADA' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>FALTA JUSTIF.</button>
                                <button onClick={() => { setType("LICENCA_MATERNIDADE"); setIsAbonado(true); }} className={`py-3 rounded-2xl text-[9px] font-black transition-all border-2 ${type === 'LICENCA_MATERNIDADE' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>LICENÇA MATERN.</button>
                            </div>
                        </div>

                        {/* ✨ O BLOCO INTELIGENTE EXIBE O HORÁRIO SEMPRE */}
                        {(type === "ATESTADO" || type === "FALTA JUSTIFICADA") && (
                            <div className={`p-4 rounded-2xl border-2 transition-all animate-in slide-in-from-top-2 ${isAbonado ? 'bg-indigo-50/50 border-indigo-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <input type="checkbox" id="chkAbono" checked={isAbonado} onChange={(e) => setIsAbonado(e.target.checked)} className={`w-5 h-5 cursor-pointer ${isAbonado ? 'accent-indigo-600' : 'accent-amber-600'}`} />
                                    <label htmlFor="chkAbono" className={`text-[11px] font-black cursor-pointer uppercase ${isAbonado ? 'text-slate-700' : 'text-amber-800'}`}>ABONAR HORAS (Não Descontar)</label>
                                </div>
                                
                                <div className={`grid grid-cols-2 gap-4 pt-3 border-t ${isAbonado ? 'border-indigo-100/50' : 'border-amber-200/50'}`}>
                                    <div className="space-y-1.5">
                                        <Label className={`text-[9px] uppercase font-black pl-1 ${isAbonado ? 'text-indigo-400' : 'text-amber-500'}`}>Hora Início (Parcial)</Label>
                                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`w-full h-10 rounded-xl border bg-white font-bold text-slate-700 px-3 outline-none transition-colors ${isAbonado ? 'border-indigo-100 focus:border-indigo-400' : 'border-amber-200 focus:border-amber-400'}`} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={`text-[9px] uppercase font-black pl-1 ${isAbonado ? 'text-indigo-400' : 'text-amber-500'}`}>Hora Fim (Parcial)</Label>
                                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`w-full h-10 rounded-xl border bg-white font-bold text-slate-700 px-3 outline-none transition-colors ${isAbonado ? 'border-indigo-100 focus:border-indigo-400' : 'border-amber-200 focus:border-amber-400'}`} />
                                    </div>
                                    <p className="col-span-2 text-[9px] text-slate-400 font-bold px-1 text-center">Deixe em branco para aplicar o dia todo.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer overflow-hidden group">
                                {imageBase64 ? <img src={imageBase64} className="w-full h-full object-cover" /> : 
                                <div className="text-center">
                                    <Upload className="mx-auto text-slate-300 group-hover:text-indigo-500 mb-1 transition-colors" size={24}/>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Carregar Imagem</p>
                                </div>}
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <Input placeholder="Ex: CID M54.5" value={description} onChange={(e) => setDescription(e.target.value)} className="h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500" />
                        </div>
                    </div>

                    <Button disabled={loading} onClick={handleSave} className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] gap-2 font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Salvar no Histórico</>}
                    </Button>
                </div>
            </Card>
        </div>
    );
}

// ============================================================================
// 4. MODAL DE LANÇAMENTO AVULSO DE ATESTADO/FALTA (Alinhado com o C#)
// ============================================================================
function AddAtestadoModal({ isOpen, onClose, employees }) {
    const [selectedEmp, setSelectedEmp] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [type, setType] = useState("ATESTADO");
    const [description, setDescription] = useState("");
    const [isAbonado, setIsAbonado] = useState(true);
    const [imageBase64, setImageBase64] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleData = (res) => {
            if (res.type === "db-config-success") {
                setLoading(false);
                onClose();
                setSelectedEmp(""); setStartDate(""); setEndDate(""); setStartTime(""); setEndTime(""); setImageBase64(null); setDescription("");
            }
            if (res.type === "error-occurred" || res.type === "db-config-error") {
                alert("Falha ao lançar atestado: " + res.data);
                setLoading(false);
            }
        };
        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("A imagem é muito grande. Escolha uma foto com menos de 5MB.");
                e.target.value = ''; 
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setImageBase64(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!selectedEmp || !startDate) return alert("Selecione o colaborador e a Data Início.");
        setLoading(true);
        const payload = {
            employeeId: parseInt(selectedEmp),
            startDate, 
            endDate: endDate || null, 
            startTime: startTime || null, // ✨ Manda o horário sempre
            endTime: endTime || null,     // ✨ Manda o horário sempre
            type, 
            description: description || "Sem observação",
            isAbonado: type === "LICENCA_MATERNIDADE" ? true : isAbonado,
            imageBase64
        };
        api.send("SAVE_ABONO", payload);
    };

    return (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                <ShieldAlert className="text-indigo-500" size={28} /> Lançar Atestado
                            </h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                Lançamento avulso (Sem registro de ponto)
                            </p>
                        </div>
                        <button onClick={onClose} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 text-slate-400"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Colaborador</Label>
                            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} className="w-full h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 px-3 outline-none">
                                <option value="">Selecione...</option>
                                {employees.map(emp => <option key={emp.Id} value={emp.Id}>{emp.Name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Data Início *</Label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 px-3 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Data Fim (Opcional)</Label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 px-3 outline-none" />
                            </div>
                        </div>

                        <div className="space-y-2 mt-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Motivo do Afastamento</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => { setType("ATESTADO"); setIsAbonado(true); }} className={`py-3 rounded-2xl text-[9px] font-black transition-all border-2 ${type === 'ATESTADO' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>ATESTADO</button>
                                <button onClick={() => { setType("FALTA JUSTIFICADA"); setIsAbonado(false); }} className={`py-3 rounded-2xl text-[9px] font-black transition-all border-2 ${type === 'FALTA JUSTIFICADA' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>FALTA JUSTIF.</button>
                                <button onClick={() => { setType("LICENCA_MATERNIDADE"); setIsAbonado(true); }} className={`py-3 rounded-2xl text-[9px] font-black transition-all border-2 ${type === 'LICENCA_MATERNIDADE' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>LICENÇA MATERN.</button>
                            </div>
                        </div>

                        {/* ✨ O BLOCO INTELIGENTE EXIBE O HORÁRIO SEMPRE */}
                        {(type === "ATESTADO" || type === "FALTA JUSTIFICADA") && (
                            <div className={`p-4 rounded-2xl border-2 transition-all animate-in slide-in-from-top-2 ${isAbonado ? 'bg-indigo-50/50 border-indigo-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <input type="checkbox" id="chkAbonoAvulso" checked={isAbonado} onChange={(e) => setIsAbonado(e.target.checked)} className={`w-5 h-5 cursor-pointer ${isAbonado ? 'accent-indigo-600' : 'accent-amber-600'}`} />
                                    <label htmlFor="chkAbonoAvulso" className={`text-[11px] font-black cursor-pointer uppercase ${isAbonado ? 'text-slate-700' : 'text-amber-800'}`}>ABONAR HORAS (Não Descontar)</label>
                                </div>
                                
                                <div className={`grid grid-cols-2 gap-4 pt-3 border-t ${isAbonado ? 'border-indigo-100/50' : 'border-amber-200/50'}`}>
                                    <div className="space-y-1.5">
                                        <Label className={`text-[9px] uppercase font-black pl-1 ${isAbonado ? 'text-indigo-400' : 'text-amber-500'}`}>Hora Início (Parcial)</Label>
                                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`w-full h-10 rounded-xl border bg-white font-bold text-slate-700 px-3 outline-none transition-colors ${isAbonado ? 'border-indigo-100 focus:border-indigo-400' : 'border-amber-200 focus:border-amber-400'}`} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={`text-[9px] uppercase font-black pl-1 ${isAbonado ? 'text-indigo-400' : 'text-amber-500'}`}>Hora Fim (Parcial)</Label>
                                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`w-full h-10 rounded-xl border bg-white font-bold text-slate-700 px-3 outline-none transition-colors ${isAbonado ? 'border-indigo-100 focus:border-indigo-400' : 'border-amber-200 focus:border-amber-400'}`} />
                                    </div>
                                    <p className="col-span-2 text-[9px] text-slate-400 font-bold px-1 text-center">Deixe em branco para aplicar o dia todo.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer overflow-hidden group">
                                {imageBase64 ? <img src={imageBase64} className="w-full h-full object-cover" /> : 
                                <div className="text-center">
                                    <Upload className="mx-auto text-slate-300 group-hover:text-indigo-500 transition-colors" size={24}/>
                                </div>}
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <Input placeholder="Ex: CID M54.5" value={description} onChange={(e) => setDescription(e.target.value)} className="h-12 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500" />
                        </div>
                    </div>

                    <Button disabled={loading} onClick={handleSave} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] gap-2 font-black uppercase text-[11px] tracking-widest shadow-xl transition-all">
                        {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Salvar Lançamento</>}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
// ============================================================================
// 6. MODAL DE CONFIGURAÇÃO DE EXPORTAÇÃO
// ============================================================================
// ============================================================================
// 6. MODAL DE CONFIGURAÇÃO DE EXPORTAÇÃO
// ============================================================================
function ExportSettingsModal({ isOpen, onClose, employees, stores, onGenerate }) {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [exportMode, setExportMode] = useState("ALL"); // ALL, SELECTED, STORE
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");

    if (!isOpen) return null;

    const handleToggleCheck = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const handleConfirm = () => {
        if (exportMode === "SELECTED" && selectedIds.length === 0) return alert("Selecione pelo menos um colaborador na lista.");
        if (exportMode === "STORE" && !selectedStoreId) return alert("Selecione uma loja para exportar.");
        if (startDate > endDate) return alert("A data inicial não pode ser maior que a final.");
        
        // ✨ LÓGICA INTELIGENTE DE FILTRO
        let idsToSend = [];
        if (exportMode === "SELECTED") {
            idsToSend = selectedIds;
        } else if (exportMode === "STORE") {
            // Pega apenas os IDs dos funcionários que pertencem à loja selecionada
            idsToSend = employees.filter(e => String(e.StoreId) === String(selectedStoreId)).map(e => e.Id);
            if (idsToSend.length === 0) {
                return alert("Nenhum colaborador encontrado para esta loja.");
            }
        }

        onGenerate({
            startDate,
            endDate,
            employeeIds: idsToSend // Manda pro C# só quem interessa!
        });
    };

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-xl bg-white shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <Settings2 className="text-emerald-600" size={28} /> Exportação de Horas
                        </h2>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configure o período e os funcionários</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20} /></button>
                </div>

                <div className="p-8 space-y-6 bg-white">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[10px] uppercase font-black text-slate-400">Data Inicial</Label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 transition-colors" />
                        </div>
                        <div>
                            <Label className="text-[10px] uppercase font-black text-slate-400">Data Final</Label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-0">
                        <Label className="text-[10px] uppercase font-black text-slate-400">Filtro de Exportação</Label>
                        {/* ✨ OS TRÊS BOTÕES AQUI */}
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            <button onClick={() => setExportMode("ALL")} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${exportMode === 'ALL' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-100' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                                <span className="font-black text-xs sm:text-sm">Geral</span>
                                <span className="text-[9px] font-bold opacity-70 text-center">Toda Empresa</span>
                            </button>
                            <button onClick={() => setExportMode("STORE")} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${exportMode === 'STORE' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-100' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                                <span className="font-black text-xs sm:text-sm">Por Loja</span>
                                <span className="text-[9px] font-bold opacity-70 text-center">Filtrar unidade</span>
                            </button>
                            <button onClick={() => setExportMode("SELECTED")} className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${exportMode === 'SELECTED' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-100' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                                <span className="font-black text-xs sm:text-sm">Nomes</span>
                                <span className="text-[9px] font-bold opacity-70 text-center">Selecionar</span>
                            </button>
                        </div>
                    </div>

                    {/* ✨ DROPDOWN DA LOJA (Só aparece se clicar em Por Loja) */}
                    {exportMode === "STORE" && (
                        <div className="border-2 border-slate-200 rounded-2xl p-4 bg-slate-50 animate-in slide-in-from-top-2">
                            <Label className="text-[10px] uppercase font-black text-slate-500 mb-1 block">Selecione a Unidade</Label>
                            <select 
                                value={selectedStoreId} 
                                onChange={(e) => setSelectedStoreId(e.target.value)} 
                                className="w-full h-12 rounded-xl border border-slate-200 font-bold text-slate-700 px-3 outline-none focus:border-emerald-500 bg-white"
                            >
                                <option value="">Selecione uma loja...</option>
                                {stores?.map(store => (
                                    <option key={store.Id} value={store.Id}>{store.Name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* LISTA DE FUNCIONÁRIOS (Só aparece se clicar em Nomes) */}
                    {exportMode === "SELECTED" && (
                        <div className="border-2 border-slate-200 rounded-2xl p-4 bg-slate-50 max-h-60 overflow-y-auto space-y-1 animate-in slide-in-from-top-2">
                            {employees.map(emp => (
                                <label key={emp.Id} className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100">
                                    <input type="checkbox" checked={selectedIds.includes(emp.Id)} onChange={() => handleToggleCheck(emp.Id)} className="w-5 h-5 accent-emerald-600" />
                                    <span className="font-bold text-sm text-slate-700 truncate">{emp.Name}</span>
                                    <span className="ml-auto text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">ID {emp.Id}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-4">
                    <Button onClick={handleConfirm} className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-100 gap-2 transition-all active:scale-95">
                        <FileSpreadsheet size={18} /> Gerar Pré-visualização
                    </Button>
                </div>
            </Card>
        </div>
    );
}
// ============================================================================
// 7. MODAL DE PRÉ-VISUALIZAÇÃO DA PLANILHA DE FECHAMENTO
// ============================================================================
function ReportPreviewModal({ isOpen, onClose, data, onDownload }) {
    
    const timeToMins = (timeStr) => {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h * 60) + (m || 0);
    };

    const minsToTime = (totalMins) => {
        if (totalMins === 0) return "00:00";
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const groupedData = useMemo(() => {
        if (!data || data.length === 0) return {};
        
        return data.reduce((acc, row) => {
            const name = row.EmployeeName || row.employeeName || "Desconhecido";
            
            if (!acc[name]) {
                acc[name] = { records: [], tWork: 0, tAbsence: 0, t20: 0, t50: 0, t100: 0, tHoliday: 0 };
            }
            
            acc[name].records.push(row);
            acc[name].tWork += timeToMins(row.TotalWork ?? row.totalWork ?? "00:00");
            acc[name].tAbsence += timeToMins(row.Absence ?? row.absence ?? "00:00");
            acc[name].t20 += timeToMins(row.He20 ?? row.he20 ?? "00:00");
            acc[name].t50 += timeToMins(row.He50 ?? row.he50 ?? "00:00");
            acc[name].t100 += timeToMins(row.He100 ?? row.he100 ?? "00:00");
            acc[name].tHoliday += timeToMins(row.Holiday ?? row.holiday ?? "00:00");
            
            return acc;
        }, {});
    }, [data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-[1400px] bg-white shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200 border border-slate-700">
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="text-emerald-600" size={28} /> Tabela de Fechamento
                        </h2>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Valide os totais espelhados antes de exportar</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-full transition-colors text-slate-400 shadow-sm border border-slate-200"><X size={20} /></button>
                </div>
                
                <div className="p-0 overflow-y-auto flex-1 bg-white relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4 pl-8 min-w-[200px]">Colaborador</th>
                                <th className="p-4 ">Data</th>
                                <th className="p-4 text-center text-indigo-600">Total Trab.</th>
                                <th className="p-4 text-center text-rose-500">Faltas / Atrasos</th>
                                <th className="p-4 text-center">Noturno (20%)</th>
                                <th className="p-4 text-center text-emerald-600">1:59H Abaixo</th>
                                <th className="p-4 text-center text-amber-600">2:00H Acima</th>
                                <th className="p-4 text-center text-blue-600 pr-8">Feriado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-[12px]">
                            {Object.keys(groupedData).length === 0 ? (
                                <tr><td colSpan="8" className="p-12 text-center text-slate-400 font-bold text-lg">Nenhum registro encontrado no período.</td></tr>
                            ) : (
                                Object.entries(groupedData).map(([empName, group], gIdx) => (
                                    <React.Fragment key={gIdx}>
                                        <tr className="bg-slate-800">
                                            <td colSpan="8" className="p-3 pl-8 font-black text-white uppercase tracking-widest text-[11px] shadow-inner">
                                                👤 {empName}
                                            </td>
                                        </tr>
                                        {group.records.map((row, idx) => (
                                            <tr key={`${gIdx}-${idx}`} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                                <td className="p-3 pl-8 font-bold text-slate-400">{row.EmployeeName || row.employeeName}</td>
                                                <td className="p-3 font-bold text-slate-700">{row.Date || row.date}</td>
                                                <td className="p-3 text-center font-black text-indigo-600 bg-indigo-50/40 border-l border-slate-100">{row.TotalWork ?? row.totalWork ?? "00:00"}</td>
                                                <td className="p-3 text-center font-bold text-rose-500 bg-rose-50/20">{row.Absence ?? row.absence ?? "00:00"}</td>
                                                <td className="p-3 text-center font-bold text-slate-500 border-l border-slate-100">{row.He20 ?? row.he20 ?? "00:00"}</td>
                                                <td className="p-3 text-center font-bold text-emerald-600">{row.He50 ?? row.he50 ?? "00:00"}</td>
                                                <td className="p-3 text-center font-bold text-amber-600">{row.He100 ?? row.he100 ?? "00:00"}</td>
                                                <td className="p-3 text-center font-bold text-blue-600 pr-8 border-l border-slate-100">{row.Holiday ?? row.holiday ?? "00:00"}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100/50 border-b-8 border-white">
                                            <td colSpan="2" className="p-4 pr-6 text-right font-black text-slate-700 uppercase text-[11px] tracking-widest">
                                                Totais Mensais:
                                            </td>
                                            <td className="p-4 text-center font-black text-indigo-700 text-sm bg-indigo-100/50 shadow-inner rounded-l-xl border border-indigo-200/50">
                                                {minsToTime(group.tWork)}
                                            </td>
                                            <td className="p-4 text-center font-black text-rose-600 text-sm bg-rose-50/50 border-y border-rose-100">{minsToTime(group.tAbsence)}</td>
                                            <td className="p-4 text-center font-black text-slate-800 text-sm border-l border-slate-200">{minsToTime(group.t20)}</td>
                                            <td className="p-4 text-center font-black text-emerald-700 text-sm">{minsToTime(group.t50)}</td>
                                            <td className="p-4 text-center font-black text-amber-700 text-sm">{minsToTime(group.t100)}</td>
                                            <td className="p-4 text-center font-black text-blue-700 text-sm pr-8 rounded-r-xl border-l border-blue-100 bg-blue-50/50">{minsToTime(group.tHoliday)}</td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap sm:flex-nowrap justify-end gap-4 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <Button onClick={onClose} variant="ghost" className="w-full sm:w-auto h-12 px-6 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-500 hover:bg-slate-200">Cancelar</Button>
                    <Button onClick={onDownload} disabled={data.length === 0} className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-100 gap-2 transition-all active:scale-95">
                        <DownloadCloud size={18} /> Baixar CSV para Excel
                    </Button>
                </div>
            </Card>
        </div>
    );
}

// ============================================================================
// 8. COMPONENTE PRINCIPAL: HISTÓRICO DE PONTO (TELA)
// ============================================================================
export default function TimeTracking() {
    const location = useLocation();
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filterEmpId, setFilterEmpId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [stores, setStores] = useState([]);
    
    // Controles de Modais
    const [isAddFeriasOpen, setIsAddFeriasOpen] = useState(false);
    const [justifyModal, setJustifyModal] = useState({ open: false, date: null, empId: null, empName: "" });
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isAddAtestadoOpen, setIsAddAtestadoOpen] = useState(false);
    const [isExportConfigOpen, setIsExportConfigOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [exportParamsMemory, setExportParamsMemory] = useState(null);

    // Carregamento de Dados Iniciais
    useEffect(() => {
        const handleData = (res) => {
            const unpack = (d) => Array.isArray(d) ? d : (d?.data || []);

            switch (res.type) {
                case "time-records-loaded":
                    setRecords(unpack(res.data).map(r => ({
                        Id: r.Id ?? r.id, 
                        EmployeeName: r.EmployeeName ?? r.employeeName ?? "Desconhecido",
                        EmployeeId: r.EmployeeId ?? r.employeeId ?? "", 
                        Date: (r.Date ?? r.date ?? "").split('T')[0],
                        Time: r.Time ?? r.time ?? "--:--", 
                        StoreName: r.StoreName ?? r.storeName ?? "Unidade",
                        HasJustification: r.HasJustification ?? false
                    })));
                    break;
                case "employees-loaded": 
                    setEmployees(unpack(res.data).map(e => ({ 
                        Id: e.Id ?? e.id, 
                        Name: e.Name ?? e.name,
                        StoreId: e.StoreId ?? e.storeId
                    }))); 
                    break;
                case "stores-loaded":
                    setStores(unpack(res.data).map(s => ({ Id: s.Id ?? s.id, Name: s.Name ?? s.name })));
                    break;
                case "db-config-success": 
                case "manual-point-success": 
                    setIsImportOpen(false); 
                    api.send("GET_TIME_RECORDS"); 
                    break;
                case "export-success": 
                    alert(res.data); 
                    break;
                case "export-error": 
                    alert("Falha: " + res.data); 
                    break;
                case "report-preview-loaded":
                    setPreviewData(res.data || []);
                    setIsPreviewOpen(true);
                    break;
            }
        };

        const cleanup = api.onDataReceived(handleData);
        api.send("GET_TIME_RECORDS");
        api.send("GET_EMPLOYEES");
        api.send("GET_STORES"); 
        return () => cleanup();
    }, []);

    // Recepção de Filtros via Rota (Dashboard)
    useEffect(() => {
        if (location.state && location.state.empId) {
            setFilterEmpId(String(location.state.empId));
            setSearchTerm(location.state.empName);
            
            if (location.state.actionDate) {
                const [year, month, day] = location.state.actionDate.split('-');
                setSelectedDate(new Date(year, month - 1, day));
            }
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Filtros e Memorização
    const filteredRecords = useMemo(() => {
        const dateString = format(selectedDate, "yyyy-MM-dd");
        return records.filter(r => r.Date === dateString && (filterEmpId === "" || String(r.EmployeeId) === String(filterEmpId)));
    }, [records, selectedDate, filterEmpId]);

    const suggestedEmployees = useMemo(() => {
        if (!searchTerm) return [];
        return employees.filter(e => e.Name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 6);
    }, [employees, searchTerm]);

    const handleGeneratePreview = (params) => {
        setExportParamsMemory(params);
        setIsExportConfigOpen(false);
        api.send("PREVIEW_CSV_REPORT", params);
    };

    const confirmDownload = () => {
        api.send("EXPORT_CSV_REPORT", exportParamsMemory);
        setIsPreviewOpen(false);
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 bg-slate-50/50 min-h-screen pb-20">
            
            {/* INSTÂNCIA DOS MODAIS */}
            <ImportPointModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} employees={employees} />
            <JustifyAbsenceModal isOpen={justifyModal.open} onClose={() => setJustifyModal({ ...justifyModal, open: false })} employeeId={justifyModal.empId} employeeName={justifyModal.empName} date={justifyModal.date} />
            <AddAtestadoModal isOpen={isAddAtestadoOpen} onClose={() => setIsAddAtestadoOpen(false)} employees={employees} />
            <ExportSettingsModal 
                isOpen={isExportConfigOpen} 
                onClose={() => setIsExportConfigOpen(false)} 
                employees={employees} 
                stores={stores} /* ✨ PASSANDO AS LOJAS PARA O MODAL */
                onGenerate={handleGeneratePreview} 
            />
            <ReportPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} data={previewData} onDownload={confirmDownload} />

            {/* HEADER DA PÁGINA REDESENHADO */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 opacity-50"></div>
                <div className="flex items-center gap-4 z-10">
                    <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
                        <Clock size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Gestão de Ponto</h1>
                        <p className="text-slate-500 font-medium text-sm mt-0.5">Controle diário, justificativas e exportação de folha.</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto z-10">
                    {/* Botões Secundários (Outline) */}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => setIsAddAtestadoOpen(true)} className="flex-1 sm:flex-none h-12 rounded-xl text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 font-bold gap-2 transition-all">
                            <ShieldAlert size={16} className="text-amber-500" /> Atestados
                        </Button>
                        <Button variant="outline" onClick={() => setIsImportOpen(true)} className="flex-1 sm:flex-none h-12 rounded-xl text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-bold gap-2 transition-all">
                            <DownloadCloud size={16} className="text-blue-500" /> Importar TXT
                        </Button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden sm:block mx-2"></div>

                    {/* Botões Primários (Ação Principal) */}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={() => setIsExportConfigOpen(true)} className="flex-1 sm:flex-none h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xl shadow-emerald-100 font-black gap-2 transition-all active:scale-95">
                            <FileSpreadsheet size={18} /> Exportar
                        </Button>
                    </div>
                </div>
            </div>

            {/* FILTROS INTEGRADOS (Design Clean) */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Seletor de Data */}
                <div className="w-full md:w-1/3 xl:w-1/4 relative">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full h-14 justify-start bg-white border-slate-200 rounded-2xl shadow-sm hover:border-indigo-400 transition-all ${isToday(selectedDate) ? 'border-indigo-200 bg-indigo-50/30 text-indigo-700' : 'text-slate-700'}`}>
                                <CalendarIcon className={`mr-3 h-5 w-5 ${isToday(selectedDate) ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <div className="flex flex-col items-start">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Data do Filtro</span>
                                    <span className="font-bold text-sm leading-none">{format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-[2rem] overflow-hidden shadow-2xl border-slate-100" align="start">
                            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Busca de Colaborador */}
                <div className="w-full md:flex-1 relative">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <Input 
                            placeholder="Buscar colaborador na tabela..." 
                            className="w-full h-14 pl-12 pr-12 bg-white border-slate-200 rounded-2xl font-bold text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all outline-none" 
                            value={searchTerm} 
                            onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); if (!e.target.value) setFilterEmpId(""); }} 
                            onFocus={() => setIsSearchOpen(true)} 
                        />
                        {filterEmpId && (
                            <button onClick={() => { setFilterEmpId(""); setSearchTerm(""); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 hover:bg-rose-100 rounded-full text-slate-500 hover:text-rose-600 transition-colors">
                                <X size={14} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                    
                    {/* Dropdown de Sugestões Moderno */}
                    {isSearchOpen && suggestedEmployees.length > 0 && !filterEmpId && (
                        <div className="absolute z-40 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 animate-in slide-in-from-top-2">
                            <div className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Resultados ({suggestedEmployees.length})</div>
                            {suggestedEmployees.map(e => (
                                <button 
                                    key={e.Id} 
                                    onClick={() => { setFilterEmpId(String(e.Id)); setSearchTerm(e.Name); setIsSearchOpen(false); }} 
                                    className="w-full text-left px-3 py-3 hover:bg-indigo-50 rounded-xl cursor-pointer flex justify-between items-center group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            {e.Name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-slate-700 group-hover:text-indigo-700 text-sm">{e.Name}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-black text-slate-400 bg-white border-slate-200">ID {e.Id}</Badge>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Botão de Relatório Individual Dinâmico */}
                {filterEmpId && (
                    <div className="w-full md:w-auto animate-in zoom-in duration-200">
                        <Button 
                            onClick={() => api.send("GENERATE_REPORT", { employeeId: parseInt(filterEmpId), startDate: format(selectedDate, "yyyy-MM-01"), endDate: format(selectedDate, "yyyy-MM-dd") })} 
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-100 font-black uppercase text-[10px] tracking-widest gap-2"
                        >
                            <FileCheck size={16} /> Espelho Individual
                        </Button>
                    </div>
                )}
            </div>

            {/* TABELA DE REGISTROS DIÁRIOS */}
            <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            <tr>
                                <th className="px-6 py-5">Colaborador</th>
                                <th className="px-6 py-5">Unidade</th>
                                <th className="px-6 py-5 text-center">Registro</th>
                                <th className="px-6 py-5 text-right">Status / Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-5 bg-slate-50 rounded-full">
                                                <UserSearch size={48} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-600 font-bold text-lg mt-2">Nenhum ponto registrado para esta data.</p>
                                            <p className="text-slate-400 text-sm">Os funcionários ainda não bateram o ponto ou o filtro não retornou resultados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((rec) => (
                                    <tr key={rec.Id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 font-black text-sm shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    {rec.EmployeeName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-base">{rec.EmployeeName}</div>
                                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5">ID: {rec.EmployeeId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase bg-slate-50 px-3 py-1.5 rounded-lg w-max">
                                                <MapPin size={14} className="text-indigo-400" />
                                                {rec.StoreName}
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center justify-center bg-slate-900 text-white px-5 py-2 rounded-xl font-mono text-xl font-black shadow-md">
                                                {rec.Time}
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 text-right">
                                            {rec.HasJustification ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black uppercase text-[10px] py-2 px-3 gap-1.5 shadow-sm">
                                                    <CheckCircle2 size={14} strokeWidth={3} /> Tratado
                                                </Badge>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="h-9 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 font-black text-[10px] uppercase rounded-xl shadow-sm" 
                                                        onClick={() => setJustifyModal({ open: true, date: rec.Date, empId: rec.EmployeeId, empName: rec.EmployeeName })}
                                                    >
                                                        <ShieldAlert size={14} className="mr-1.5" /> Tratar Ponto
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}