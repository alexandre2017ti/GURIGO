import React, { useState, useEffect, useContext } from "react";
import { api } from "@/services/api";
import { Card, Button, Input, Label } from "@/components/ui";
import { Printer, FileText, Loader2, PlusCircle, Save, Info, Clock } from "lucide-react";
import { GlobalContext } from "@/contexts/GlobalContext";
import PrintableTimesheet from "@/components/PrintableTimesheet";


export default function Timesheet() {
    const { employees } = useContext(GlobalContext);
    
    const [selectedEmp, setSelectedEmp] = useState("");
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusModal, setStatusModal] = useState({ isOpen: false, dateFormatted: null });
    const [isUpdating, setIsUpdating] = useState(false);
    const [customDetail, setCustomDetail] = useState("");
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customBase, setCustomBase] = useState("FOLGA");
    const [customText, setCustomText] = useState("")
    const [punches, setPunches] = useState([]);
    const [scheduleMsg, setScheduleMsg] = useState(null);
    const [isFetchingPunches, setIsFetchingPunches] = useState(false);
    const [description, setDescription] = useState("");
    const [imageBase64, setImageBase64] = useState("");
    const [type, setType] = useState("NORMAL");
    const [isAbonado, setIsAbonado] = useState(true);
    const [customStartTime, setCustomStartTime] = useState("");
    const [customEndTime, setCustomEndTime] = useState("");
    const [rawSchedule, setRawSchedule] = useState(null);
    
    // ✨ Função para limpar e formatar o texto da escala (Ex: 08:00 às 12:00)
    const formatShift = (s1, e1, s2, e2) => {
        const clean = (val) => (val && val !== "--:--" && val !== "00:00:00") ? val.substring(0, 5) : "";
        const p1 = (clean(s1) && clean(e1)) ? `${clean(s1)} às ${clean(e1)}` : "";
        const p2 = (clean(s2) && clean(e2)) ? `${clean(s2)} às ${clean(e2)}` : "";

        if (p1 && p2) return `${p1} | ${p2}`;
        if (p1) return p1;
        if (p2) return p2;
        return "Horário não definido";
    };
    const handleFullDayUpdate = (statusFromButton = null, isCustom = false) => {
        // 1. Define o Status Final
        let finalStatus = statusFromButton || type; // Se veio do botão, usa ele. Se não, usa o selecionado no formulário.
        
        if (isCustom) {
        let constructedStatus = customBase;
        
        // ✨ MÁGICA: Se preencheu as horas, o React formata exatamente como o C# espera ler!
        if ((customBase === "ATESTADO" || customBase === "FALTA JUSTIFICADA" || customBase === "FALTA") && customStartTime && customEndTime) {
            constructedStatus += ` ${customStartTime} às ${customEndTime}`;
        }
        
        if (customText.trim() !== "") {
            constructedStatus += ` - ${customText.trim().toUpperCase()}`;
        }
        
        finalStatus = constructedStatus;
    }

        if (!selectedEmp || !statusModal.dateFormatted) return;

        const [day, m] = statusModal.dateFormatted.split("/");
        const isoDate = `${year}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;

        setIsUpdating(true); // Ativa o loader na folha
        setStatusModal({ isOpen: false, dateFormatted: null });

        // ✨ ENVIO COMPLETO: Batidas + Status + Arquivo + Descrição
        api.send("UPDATE_DAY_STATUS", {
            employeeId: parseInt(selectedEmp),
            date: isoDate,
            status: finalStatus,
            punches: punches, // Array de batidas do lado direito
            description: description || "", // CID ou Motivo
            base64: imageBase64 ? imageBase64.split(',')[1] : "", // Arquivo do Google Drive
            fileName: imageBase64 ? `atestado_${selectedEmp}_${isoDate}.png` : "",
            month: parseInt(m),
            year: parseInt(year),
            isAbonado : isAbonado
        });

        // Limpa os campos de atestado para o próximo uso
        setImageBase64("");
        setDescription("");
        setType("NORMAL");
    };
    useEffect(() => {
        const handleData = (res) => {
            // 1. Quando a folha carrega (Desliga o loader geral)
            if (res.type === "timesheet-report-loaded") {
                console.log("🕵️‍♂️ O QUE O C# ENVIOU:", res.data);
                setReport(res.data);
                setLoading(false);
                setIsUpdating(false); // Garante que tudo desligue aqui também
            }          
            // 2. Quando as batidas do dia chegam
            if (res.type === "day-punches-loaded") { 
                setPunches(res.data); 
                setIsFetchingPunches(false); 
            }
            // 3. Quando a escala chega
            // 3. Quando a escala chega (AGORA LÊ O HISTÓRICO DA MÁQUINA DO TEMPO)
            if (res.type === "employee-schedule-history-loaded") {
                const history = res.data;
                
                if (!history || history.length === 0) {
                    setRawSchedule(null);
                    setScheduleMsg({ text: "Sem escala", time: "--:--", color: "text-slate-400", bg: "bg-slate-50" });
                    return;
                }

                // Descobre a data que o RH clicou para abrir o modal
                const [d, m] = statusModal.dateFormatted.split("/");
                const targetDateStr = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                
                let activeSched = null;

                // Varre o histórico procurando a escala que estava valendo neste dia específico
                for (let i = 0; i < history.length; i++) {
                    const s = history[i];
                    const effDate = s.EffectiveDate || s.effectiveDate;
                    if (!effDate) {
                        activeSched = s; // É a escala padrão (sem data)
                        break;
                    }
                    if (effDate.substring(0, 10) <= targetDateStr) {
                        activeSched = s; // Achou a vigência correta!
                        break;
                    }
                }

                if (!activeSched) activeSched = history[history.length - 1];

                setRawSchedule(activeSched); 
                
                const shiftText = formatShift(
                    activeSched.shiftStart || activeSched.ShiftStart, 
                    activeSched.shiftEnd || activeSched.ShiftEnd, 
                    activeSched.shiftStart2 || activeSched.ShiftStart2, 
                    activeSched.shiftEnd2 || activeSched.ShiftEnd2
                );
                
                setScheduleMsg({ 
                    text: "Escala Prevista", time: shiftText, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-100" 
                });
            }

            if (res.type === "employee-schedule-empty") {
                setRawSchedule(null);
                setScheduleMsg({ text: "Sem escala", time: "--:--", color: "text-slate-400", bg: "bg-slate-50" });
            }

            // ✨ 4. A CURA DO CARREGAMENTO INFINITO ✨
            // O C# avisou que salvou com sucesso!
            if (res.type === "status-updated-success" || res.type === "punches-saved-success") {
                setIsUpdating(false); // 🔴 DESLIGA O LOADER NA HORA!
                
                // Pede a folha de novo silenciosamente para a linha piscar e atualizar a cor
                api.send("GET_TIMESHEET_REPORT", {
                    employeeId: parseInt(selectedEmp),
                    month: parseInt(month),
                    year: parseInt(year)
                });
            }

            // ✨ 5. SE DER ERRO NO SERVIDOR, NÃO DEIXA A TELA TRAVADA
            if (res.type === "error-occurred") {
                setIsUpdating(false); // 🔴 DESLIGA O LOADER!
                alert("Atenção: " + res.data); // Mostra o que deu errado
            }
        };

        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, [selectedEmp, month, year, statusModal.dateFormatted]);

    useEffect(() => {
        if (statusModal.isOpen && selectedEmp) {
            setIsFetchingPunches(true);
            const [day, m] = statusModal.dateFormatted.split("/");
            const isoDate = `${year}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;

            api.send("GET_DAY_PUNCHES", { employeeId: parseInt(selectedEmp), date: isoDate });
            api.send("GET_EMPLOYEE_SCHEDULE", { employeeId: parseInt(selectedEmp) });
        }
    }, [statusModal.isOpen, statusModal.dateFormatted]);

    const handleGenerate = () => {
        if (!selectedEmp) return alert("Selecione um funcionário.");
        setLoading(true);
        setReport(null);
        api.send("GET_TIMESHEET_REPORT", {
            employeeId: parseInt(selectedEmp),
            month: parseInt(month),
            year: parseInt(year)
        });
    };
    const confirmStatusChange = (statusValue, isCustom = false) => {
        // 1. Pega o status atual caso o usuário esteja só salvando os pontos do quadrado vermelho
        const currentDay = report?.days?.find(d => d.dateFormatted === statusModal.dateFormatted);
        const currentStatus = currentDay?.statusRH || "NORMAL";

        let finalStatus = statusValue || currentStatus;

        // Se for modo personalizado, junta o combo: "FOLGA - ANIVERSÁRIO"
        if (isCustom && customText.trim() !== "") {
            finalStatus = `${customBase} - ${customText.trim().toUpperCase()}`;
        } else if (isCustom && customText.trim() === "") {
            finalStatus = customBase; // Se o RH não digitou nada, manda só a base
        }

        // Limpa a tela
        const dateFormatted = statusModal.dateFormatted;
        setStatusModal({ isOpen: false, dateFormatted: null });
        setIsCustomMode(false);
        setCustomText("");
        
        const employeeData = employees.find(e => e.Id === parseInt(selectedEmp) || e.id === parseInt(selectedEmp));
        if (!employeeData) return alert("Selecione um colaborador primeiro.");
        
        setIsUpdating(true);

        const [day, m] = dateFormatted.split("/");
        const isoDate = `${year}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const envioIsAbonado = isCustom ? isAbonado : (statusValue !== "NORMAL");

        // ✨ CORREÇÃO: Usando os estados corretos do React
        api.send("UPDATE_DAY_STATUS", {
            employeeId: parseInt(selectedEmp), // Usando selectedEmp em vez de empId
            date: isoDate,                     // Usando isoDate em vez de date
            status: finalStatus,               // Status unificado (Botões ou Quadrado Vermelho)
            punches: punches,
            description: description || "",
            base64: imageBase64 ? imageBase64.split(',')[1] : "",
            fileName: imageBase64 ? `doc_${selectedEmp}_${isoDate}.png` : "", // Evita erro se não houver foto
            isAbonado: envioIsAbonado
        });
    };

    const getExpectedTimes = () => {
        if (!rawSchedule || !statusModal.dateFormatted) return [];
        
        const [d, m] = statusModal.dateFormatted.split("/");
        
        // Forma segura de pegar o dia da semana no JS sem bugar o fuso horário (0 = Domingo, 6 = Sábado)
        const dateObj = new Date(year, parseInt(m) - 1, parseInt(d));
        const dow = dateObj.getDay();

        let times = [];
        
        // ✨ Lê as propriedades independentemente se vieram maiúsculas ou minúsculas
        const hasSun = rawSchedule.hasCustomSunday || rawSchedule.HasCustomSunday;
        const hasSat = rawSchedule.hasCustomSaturday || rawSchedule.HasCustomSaturday;

        if (dow === 0 && hasSun) {
            times = [
                rawSchedule.sundayStart || rawSchedule.SundayStart, 
                rawSchedule.sundayEnd || rawSchedule.SundayEnd, 
                rawSchedule.sundayStart2 || rawSchedule.SundayStart2, 
                rawSchedule.sundayEnd2 || rawSchedule.SundayEnd2
            ];
        } else if (dow === 6 && hasSat) {
            times = [
                rawSchedule.saturdayStart || rawSchedule.SaturdayStart, 
                rawSchedule.saturdayEnd || rawSchedule.SaturdayEnd, 
                rawSchedule.saturdayStart2 || rawSchedule.SaturdayStart2, 
                rawSchedule.saturdayEnd2 || rawSchedule.SaturdayEnd2
            ];
        } else {
            times = [
                rawSchedule.shiftStart || rawSchedule.ShiftStart, 
                rawSchedule.shiftEnd || rawSchedule.ShiftEnd, 
                rawSchedule.shiftStart2 || rawSchedule.ShiftStart2, 
                rawSchedule.shiftEnd2 || rawSchedule.ShiftEnd2
            ];
        }
        
        // Filtra nulos e pega só o "HH:mm"
        return times.filter(t => t && t !== "--:--" && t !== "00:00:00" && t.length >= 5).map(t => t.substring(0, 5));
    };

    const expectedTimes = getExpectedTimes();

    return (
        <div className="p-8 space-y-6 w-full animate-in fade-in duration-500 print:p-0 print:m-0">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 0 60px !important; 
                    }

                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        /* ✨ FUNDO TRANSPARENTE REAL */
                        background: transparent !important;
                        width: 100%;
                        height: 100%;
                        overflow: hidden !important;
                    }

                    /* Container principal */
                    .print-container {
                        padding-top: 20px !important;
                        max-height: 100vh;
                        background: transparent !important;
                    }

                    /* ✨ LIMPEZA TOTAL DE CORES DE FUNDO */
                    /* Remove fundos de qualquer elemento que possa ter vindo do Tailwind ou CSS global */
                    *, div, table, tr, td, th, section, span, p {
                        background-color: transparent !important;
                        background-image: none !important;
                        color: #000000 !important;
                        border-color: #000000 !important;
                        box-shadow: none !important;
                        text-shadow: none !important;
                    }

                    /* ✨ COMPACTAÇÃO PARA PÁGINA ÚNICA */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: fixed !important;
                        margin-bottom: 8px !important;
                    }

                    td, th {
                        font-size: 8.5pt !important;
                        padding: 3px 2px !important; 
                        line-height: 1 !important;
                        border: 1px solid #000 !important;
                    }

                    /* Esconde elementos de interface */
                    nav, aside, header, footer, .print\\:hidden, button, .no-print { 
                        display: none !important; 
                    }

                    /* Sobe as assinaturas para não vazar para a pag 2 */
                    .signatures-container, .mt-10, .mt-8 {
                        margin-top: 12px !important; 
                        background: transparent !important;
                    }
                    
                    /* Evita quebras de linha dentro de elementos */
                    .print-container * {
                        page-break-inside: avoid !important;
                    }
                }
            `}} />

            {/* HEADER PRINCIPAL */}
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <FileText className="text-indigo-600" size={32} /> Espelho de Ponto
                </h1>
                {report && (
                    <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-black gap-2 h-11 px-6 shadow-lg rounded-xl">
                        <Printer size={18} /> Imprimir Documento
                    </Button>
                )}
            </div>

            {/* FILTROS E BUSCA */}
            <Card className="p-2 bg-white border-slate-200 shadow-xl print:hidden rounded-2xl">
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[7px] uppercase font-black text-slate-400 tracking-widest pl-1">Colaborador</Label>
                        <select
                            className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 focus:border-indigo-500 outline-none"
                            value={selectedEmp}
                            onChange={(e) => setSelectedEmp(e.target.value)}
                        >
                            <option value="">Selecione o funcionário...</option>
                            {employees.map((emp) => (
                                <option key={`emp-${emp.Id ?? emp.id}`} value={emp.Id ?? emp.id}>{emp.Name ?? emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-32 space-y-2">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Mês</Label>
                        <Input className="h-12 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold" type="number" min="1" max="12" value={month} onChange={e => setMonth(e.target.value)} />
                    </div>
                    <div className="w-32 space-y-2">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Ano</Label>
                        <Input className="h-12 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold" type="number" value={year} onChange={e => setYear(e.target.value)} />
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-10 rounded-xl shadow-lg transition-all active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : "Gerar Espelho"}
                    </Button>
                </div>
            </Card>

            {/* DOCUMENTO DE IMPRESSÃO */}
            {report && (
                <div className="relative">
                    {/* Overlay de carregamento (Fica por cima do PrintableTimesheet) */}
                    {isUpdating && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-40 flex items-center justify-center cursor-wait animate-in fade-in duration-200">
                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                                <Loader2 className="animate-spin text-indigo-600" size={24} />
                                <span className="font-black text-slate-700 text-sm">Atualizando Folha...</span>
                            </div>
                        </div>
                    )}

                    {/* ✨ O COMPONENTE COMPARTILHADO AQUI! */}
                    <PrintableTimesheet 
                        report={report} 
                        year={year}
                        // Quando clicarem em uma linha no A4, ele abre o Modal de Status daqui!
                        onRowClick={(dateFormatted) => setStatusModal({ isOpen: true, dateFormatted })}
                    />
                </div>
            )}

            {/* MODAL DE ALTERAÇÃO DE STATUS */}
            {statusModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center print:hidden animate-in fade-in duration-300">
                    {/* Aumentamos o max-w para 4xl para caber as duas colunas confortavelmente */}
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
                        
                        {/* CABEÇALHO */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-slate-800 text-xl tracking-tight">Gestão do Dia</h3>
                                <p className="text-sm font-bold text-indigo-600">Data selecionada: {statusModal.dateFormatted}</p>
                            </div>
                            {scheduleMsg && (
                                <div className={`${scheduleMsg.bg} border px-4 py-2 rounded-2xl flex items-center gap-2`}>
                                    <Info size={14} className={scheduleMsg.color} />
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${scheduleMsg.color}`}>
                                        {scheduleMsg.text}: <span className="opacity-70">{scheduleMsg.time}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-1 overflow-hidden min-h-[400px]">
                            {/* 👈 LADO ESQUERDO: STATUS DO DIA (Seu código original) */}
                            <div className="w-[45%] p-6 border-r border-slate-100 overflow-y-auto custom-scrollbar">
                                {!isCustomMode ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1 mb-1">Status do Dia</Label>
                                        <button onClick={() => confirmStatusChange("NORMAL")} className="text-left px-4 py-3 rounded-xl font-bold text-slate-700 border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Dia Normal
                                        </button>
                                        <button onClick={() => confirmStatusChange("FALTA")} className="text-left px-4 py-3 rounded-xl font-bold text-rose-700 border-2 border-rose-50 hover:border-rose-200 hover:bg-rose-50 transition-all flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Falta
                                        </button>
                                        <button onClick={() => confirmStatusChange("FOLGA")} className="text-left px-4 py-3 rounded-xl font-bold text-sky-700 border-2 border-sky-50 hover:border-sky-200 hover:bg-sky-50 transition-all flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span> Folga
                                        </button>
                                        <button onClick={() => confirmStatusChange("ATESTADO")} className="text-left px-4 py-3 rounded-xl font-bold text-teal-700 border-2 border-teal-50 hover:border-teal-200 hover:bg-teal-50 transition-all flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Atestado
                                        </button>
                                        <button onClick={() => confirmStatusChange("FERIADO")} className="text-left px-4 py-3 rounded-xl font-bold text-blue-700 border-2 border-blue-50 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Feriado
                                        </button>
                                        <button onClick={() => confirmStatusChange("FERIAS")} className="text-left px-4 py-3 rounded-xl font-bold text-emerald-700 border-2 border-emerald-50 hover:border-emerald-200 hover:bg-emerald-50 transition-all flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Férias
                                        </button>
                                        <button onClick={() => confirmStatusChange("INSS")} className="text-left px-4 py-3 rounded-xl font-bold text-orange-700 border-2 border-orange-50 hover:border-orange-200 hover:bg-orange-50 transition-all flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> INSS
                                        </button>
                                        <button onClick={() => confirmStatusChange("ABONO")} className="text-left px-4 py-3 rounded-xl font-bold text-fuchsia-700 border-2 border-fuchsia-50 hover:border-fuchsia-200 hover:bg-fuchsia-50 transition-all flex items-center gap-2">
                                            <span className="text-lg">🎁</span> Abonar Atrasos/Faltas
                                        </button>
                                        <button onClick={() => setIsCustomMode(true)} className="text-left px-4 py-3 rounded-xl font-bold text-indigo-700 border-2 border-indigo-50 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-2">
                                            <span className="text-lg">✍️</span> Personalizado...
                                        </button>
                                    </div>
                                ) : (
                                    /* MODO CUSTOM (Ajustado para o layout lateral) */
                                                                    <div className="space-y-3 animate-in slide-in-from-left-4 duration-300">
                                    <div className="bg-indigo-50/50 border-2 border-indigo-100 p-3 rounded-2xl text-center">
                                        <span className="text-[9px] uppercase font-black text-indigo-400 block mb-1">Preview:</span>
                                        <span className="text-xs font-black text-indigo-700">
                                            {customBase} 
                                            {(customBase === "ATESTADO" || customBase === "FALTA JUSTIFICADA" || customBase === "FALTA" || customBase === "FERIADO") && customStartTime && customEndTime ? ` ${customStartTime} às ${customEndTime}` : ""}
                                            {customText ? ` - ${customText.toUpperCase()}` : ""}
                                        </span>
                                    </div>
                                    
                                    <select 
                                        className="w-full h-11 rounded-xl border-2 border-slate-200 font-bold text-sm px-3 outline-none focus:border-indigo-400" 
                                        value={customBase} 
                                        onChange={e => {
                                            setCustomBase(e.target.value);
                                            // Auto-seleciona o abono por padrão para facilitar
                                            if(e.target.value === "ATESTADO" || e.target.value === "LICENÇA MATERNIDADE" || e.target.value === "INSS") setIsAbonado(true);
                                            if(e.target.value === "FALTA JUSTIFICADA") setIsAbonado(false);
                                        }}
                                    >
                                        <option value="FOLGA">Folga</option>
                                        <option value="ABONO">Abono</option>
                                        <option value="ATESTADO">Atestado</option>
                                        <option value="FALTA">Falta</option>
                                        <option value="FERIADO">Feriado</option>
                                        <option value="INSS">INSS</option>
                                        <option value="FALTA JUSTIFICADA">Falta Justificada</option>
                                        <option value="LICENÇA MATERNIDADE">Licença Maternidade</option>
                                    </select>
                                    
                                    <Input className="h-11 rounded-xl font-bold" value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Motivo..." />
                                    
                                    {/* ✨ BLOCO INTELIGENTE DE ABONO E HORÁRIOS */}
                                    {(customBase === "ATESTADO" || customBase === "FALTA JUSTIFICADA" || customBase === "FALTA" || customBase === "FERIADO") && (
                                        <div className={`p-3 rounded-xl border-2 transition-all... animate-in slide-in-from-top-2 ${isAbonado ? 'bg-indigo-50/50 border-indigo-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <input type="checkbox" id="chkAbonoTimesheet" checked={isAbonado} onChange={(e) => setIsAbonado(e.target.checked)} className={`w-4 h-4 cursor-pointer ${isAbonado ? 'accent-indigo-600' : 'accent-amber-600'}`} />
                                                <label htmlFor="chkAbonoTimesheet" className={`text-[10px] font-black cursor-pointer uppercase ${isAbonado ? 'text-slate-700' : 'text-amber-800'}`}>ABONAR HORAS</label>
                                            </div>
                                            
                                            <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${isAbonado ? 'border-indigo-100/50' : 'border-amber-200/50'}`}>
                                                <div className="space-y-1">
                                                    <Label className={`text-[8px] uppercase font-black pl-1 ${isAbonado ? 'text-indigo-400' : 'text-amber-500'}`}>Início (Parcial)</Label>
                                                    <input type="time" value={customStartTime} onChange={(e) => setCustomStartTime(e.target.value)} className={`w-full h-9 rounded-lg border bg-white font-bold text-slate-700 px-2 outline-none transition-colors ${isAbonado ? 'border-indigo-100 focus:border-indigo-400' : 'border-amber-200 focus:border-amber-400'}`} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className={`text-[8px] uppercase font-black pl-1 ${isAbonado ? 'text-indigo-400' : 'text-amber-500'}`}>Fim (Parcial)</Label>
                                                    <input type="time" value={customEndTime} onChange={(e) => setCustomEndTime(e.target.value)} className={`w-full h-9 rounded-lg border bg-white font-bold text-slate-700 px-2 outline-none transition-colors ${isAbonado ? 'border-indigo-100 focus:border-indigo-400' : 'border-amber-200 focus:border-amber-400'}`} />
                                                </div>
                                                <p className="col-span-2 text-[8px] text-slate-400 font-bold text-center leading-none mt-1">Deixe branco p/ aplicar o dia todo</p>
                                            </div>
                                        </div>
                                    )}

                                    <Button onClick={() => confirmStatusChange("", true)} className="w-full h-11 bg-indigo-600 rounded-xl font-black uppercase text-[10px] shadow-md hover:bg-indigo-700 mt-2">Confirmar Status</Button>
                                    <button onClick={() => setIsCustomMode(false)} className="w-full text-[10px] font-bold text-slate-400 uppercase mt-2 hover:text-slate-600">← Voltar</button>
                                </div>
                                )}
                            </div>

                            {/* 👉 LADO DIREITO: AJUSTE DE BATIDAS (Seu código do ManualEntry) */}
                            <div className="w-[55%] p-6 bg-slate-50/30 overflow-y-auto custom-scrollbar flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">
                                        Registros de Ponto
                                    </Label>
                                    <Button 
                                        onClick={() => setPunches([...punches, { id: null, time: "00:00", isActive: true }])}
                                        variant="ghost" 
                                        className="h-7 px-2 text-indigo-600 font-black text-[9px] uppercase gap-1"
                                    >
                                        <PlusCircle size={14} /> Adicionar
                                    </Button>
                                </div>
                                {expectedTimes.length > 0 && !isFetchingPunches && (
                                    <div className="mb-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl animate-in fade-in">
                                        <Label className="text-[9px] uppercase font-black text-indigo-500 tracking-widest block mb-2 pl-1">
                                            Adicionar da Escala ({statusModal.dateFormatted})
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {expectedTimes.map((time, idx) => {
                                                const jaExiste = punches.some(p => p.time === time && p.isActive);
                                                return (
                                                    <button
                                                        key={`quick-${idx}`}
                                                        onClick={() => {
                                                            if (!jaExiste) setPunches([...punches, { id: null, time: time, isActive: true }]);
                                                        }}
                                                        disabled={jaExiste}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 border
                                                            ${jaExiste 
                                                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                                                : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
                                                            }`}
                                                    >
                                                        <Clock size={12} /> {time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 flex-1">
                                    {isFetchingPunches ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                            <Loader2 className="animate-spin mb-2" size={32} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Buscando batidas...</span>
                                        </div>
                                    ) : punches.length === 0 ? (
                                        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50 text-slate-400 font-bold text-xs">
                                            Nenhuma batida registrada.
                                        </div>
                                    ) : (
                                        punches.map((punch, idx) => (
                                            <div key={idx} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${punch.isActive ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-100/50 border-transparent opacity-50'}`}>
                                                {/* Switch de Ativo/Inativo */}
                                                <input 
                                                    type="checkbox" 
                                                    checked={punch.isActive} 
                                                    onChange={(e) => {
                                                        const newP = [...punches];
                                                        newP[idx].isActive = e.target.checked;
                                                        setPunches(newP);
                                                    }}
                                                    className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer" 
                                                />
                                                
                                                <div className="flex-1">
                                                    <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">{idx + 1}ª Marcação</p>
                                                    <input 
                                                        type="time" 
                                                        value={punch.time} 
                                                        disabled={!punch.isActive}
                                                        onChange={(e) => {
                                                            const newP = [...punches];
                                                            newP[idx].time = e.target.value;
                                                            setPunches(newP);
                                                        }}
                                                        className="font-mono font-black text-lg text-slate-700 outline-none bg-transparent w-full"
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* BOTÃO MESTRE DE SALVAMENTO */}
                                {!isFetchingPunches && (
                                    <Button 
                                        onClick={() => handleFullDayUpdate(null)} // Salva o que estiver na tela
                                        className="w-full mt-6 h-12 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex gap-2"
                                    >
                                        <Save size={18} /> Salvar Alterações de Ponto
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button 
                                onClick={() => setStatusModal({ isOpen: false })} 
                                className="px-8 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Fechar Janela
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}