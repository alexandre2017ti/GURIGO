import React, { useState, useEffect, useMemo, useContext } from "react";
import { api } from "@/services/api";
import { Card, Button, Label, Input, Badge } from "@/components/ui";
import { 
    Clock, Save, Search, CalendarDays, Sun, RotateCcw, 
    Users, ChevronLeft, ChevronRight, Info, Calculator, Calendar as CalendarIcon, PlusCircle
} from "lucide-react";
import { GlobalContext } from "@/contexts/GlobalContext";
import ShiftCalculator from "@/components/ShiftCalculator";

export default function Schedules() {
    const { employees, refreshData } = useContext(GlobalContext);
    const [templates, setTemplates] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [scheduleHistory, setScheduleHistory] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);

    const [config, setConfig] = useState({
        id: null,
        effectiveDate: "", 
        scheduleType: "FIXED",
        rosterDays: [],
        isBreastfeeding: false,
        shiftStart: "07:00", shiftEnd: "11:00",
        shiftStart2: "13:00", shiftEnd2: "17:20",
        worksSaturday: true, hasCustomSaturday: false, saturdayStart: "", saturdayEnd: "", saturdayStart2: "", saturdayEnd2: "", 
        worksSunday: false, hasCustomSunday: false, sundayStart: "", sundayEnd: "", sundayStart2: "", sundayEnd2: "",
        offDay: "Dom" 
    });

    useEffect(() => {
        api.send("GET_SCHEDULE_TEMPLATES"); 
        const handleData = (res) => {
            const unpack = (d) => Array.isArray(d) ? d : (d?.data || []);
            if (res.type === "templates-loaded") setTemplates(unpack(res.data));
            
            if (res.type === "employee-schedule-history-loaded") {
                const history = unpack(res.data);
                setScheduleHistory(history);

                if (history.length > 0) {
                    // Aceita ID ou id
                    setActiveTabId(history[0].Id ?? history[0].id);
                    loadScheduleIntoConfig(history[0]);
                } else {
                    resetConfig();
                }
            }
            
            if (res.type === "employee-schedule-empty") {
                setScheduleHistory([]);
                resetConfig();
            }
            if (res.type === "db-config-success") {
                alert("✅ Escala salva com sucesso!");
                if (selectedEmp) {
                    api.send("GET_EMPLOYEE_SCHEDULE", { employeeId: selectedEmp.Id ?? selectedEmp.id });
                }
                refreshData(); 
            }
            if (res.type === "error-occurred") alert("❌ Erro: " + res.data);
        };
        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, [selectedEmp, refreshData]);

    const loadScheduleIntoConfig = (sched) => {
        const wDays = sched.WorkDays ?? sched.workDays ?? "Seg,Ter,Qua,Qui,Sex,Sab";
        // ✨ CORREÇÃO: Pega a data independentemente se vier maiúscula ou minúscula
        const effDate = sched.EffectiveDate ?? sched.effectiveDate; 
        
        setConfig({
            id: sched.Id ?? sched.id,
            effectiveDate: effDate ? effDate.substring(0,10) : "",
            scheduleType: sched.ScheduleType ?? sched.scheduleType ?? "FIXED",
            rosterDays: sched.RosterDays ?? sched.rosterDays ?? [],
            isBreastfeeding: sched.IsBreastfeeding ?? sched.isBreastfeeding ?? false,
            shiftStart: sched.ShiftStart ?? sched.shiftStart ?? "07:00",
            shiftEnd: sched.ShiftEnd ?? sched.shiftEnd ?? "11:00",
            shiftStart2: sched.ShiftStart2 ?? sched.shiftStart2 ?? "13:00",
            shiftEnd2: sched.ShiftEnd2 ?? sched.shiftEnd2 ?? "17:20",
            worksSaturday: sched.WorksSaturday ?? sched.worksSaturday ?? wDays.includes("Sab"),
            hasCustomSaturday: sched.HasCustomSaturday ?? sched.hasCustomSaturday ?? false,
            saturdayStart: sched.SaturdayStart ?? sched.saturdayStart ?? "",
            saturdayEnd: sched.SaturdayEnd ?? sched.saturdayEnd ?? "",
            saturdayStart2: sched.SaturdayStart2 ?? sched.saturdayStart2 ?? "",
            saturdayEnd2: sched.SaturdayEnd2 ?? sched.saturdayEnd2 ?? "",
            worksSunday: sched.WorksSunday ?? sched.worksSunday ?? wDays.includes("Dom"),
            hasCustomSunday: sched.HasCustomSunday ?? sched.hasCustomSunday ?? false,
            sundayStart: sched.SundayStart ?? sched.sundayStart ?? "",
            sundayEnd: sched.SundayEnd ?? sched.sundayEnd ?? "",
            sundayStart2: sched.SundayStart2 ?? sched.sundayStart2 ?? "",
            sundayEnd2: sched.SundayEnd2 ?? sched.sundayEnd2 ?? "",
            offDay: sched.OffDay ?? sched.offDay ?? "Dom"
        });
    };

    const resetConfig = () => {
        setConfig({
            id: null, effectiveDate: "", scheduleType: "FIXED", rosterDays: [], isBreastfeeding: false,
            shiftStart: "07:00", shiftEnd: "11:00", shiftStart2: "13:00", shiftEnd2: "17:20",
            worksSaturday: false, hasCustomSaturday: false, saturdayStart: "", saturdayEnd: "", saturdayStart2: "", saturdayEnd2: "",
            worksSunday: false, hasCustomSunday: false, sundayStart: "", sundayEnd: "", sundayStart2: "", sundayEnd2: "",
            offDay: "Dom"
        });
        setActiveTabId("NEW");
    };

    const handleNewScheduleClick = () => {
        setConfig(prev => ({
            ...prev,
            id: null,
            effectiveDate: ""
        }));
        setActiveTabId("NEW");
    };

    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        return employees.filter(e => {
            const isActive = e.IsActive ?? e.isActive;
            const name = e.Name ?? e.name ?? "";
            return isActive !== false && name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [employees, searchTerm]);
        
    const handleSelectEmployee = (emp) => {
        setSelectedEmp(emp); 
        setSearchTerm(emp.Name ?? emp.name); 
        setIsDropdownOpen(false);
        api.send("GET_EMPLOYEE_SCHEDULE", { employeeId: emp.Id ?? emp.id });
    };

    const handleSave = () => {
        const empId = selectedEmp?.Id ?? selectedEmp?.id;
        if (!empId) return alert("Selecione um colaborador.");
        
        if (activeTabId === "NEW" && !config.effectiveDate) {
            return alert("Para agendar uma nova escala, você precisa informar a Data de Vigência!");
        }

        const cleanTime = (val) => (val && val.trim() !== "" ? val : null);
        
        let daysArray = ["Seg", "Ter", "Qua", "Qui", "Sex"];
        if (config.worksSaturday) daysArray.push("Sab");
        if (config.worksSunday) daysArray.push("Dom");
        const baseWorkDays = daysArray.join(",");
        
        let isoDate = null;
        if (config.effectiveDate) {
            isoDate = new Date(config.effectiveDate + "T12:00:00Z").toISOString();
        }
        
        api.send("SAVE_SCHEDULE", {
            EmployeeId: Number(empId),
            StoreId: selectedEmp?.StoreId ?? selectedEmp?.storeId,
            EffectiveDate: isoDate, 
            ScheduleType: config.scheduleType,
            RosterDays: config.scheduleType === "VARIABLE" ? config.rosterDays : [],
            IsBreastfeeding: config.isBreastfeeding,
            ShiftStart: cleanTime(config.shiftStart),
            ShiftEnd: cleanTime(config.shiftEnd),
            ShiftStart2: cleanTime(config.shiftStart2),
            ShiftEnd2: cleanTime(config.shiftEnd2),
            WorksSaturday: config.worksSaturday,
            HasCustomSaturday: config.hasCustomSaturday,
            SaturdayStart: cleanTime(config.saturdayStart),
            SaturdayEnd: cleanTime(config.saturdayEnd),
            SaturdayStart2: cleanTime(config.saturdayStart2),
            SaturdayEnd2: cleanTime(config.saturdayEnd2),
            WorksSunday: config.worksSunday,
            HasCustomSunday: config.hasCustomSunday,
            SundayStart: cleanTime(config.sundayStart),
            SundayEnd: cleanTime(config.sundayEnd),
            SundayStart2: cleanTime(config.sundayStart2),
            SundayEnd2: cleanTime(config.sundayEnd2),
            OffDay: config.scheduleType === "FIXED" ? config.offDay : "",
            WorkDays: baseWorkDays,
        });
    };

    const weeklyHours = useMemo(() => {
        const parseToMins = (t) => {
            if (!t) return 0;
            const [h, m] = t.split(':').map(Number);
            return (h * 60) + (m || 0);
        };
        const calcDur = (s1, e1, s2, e2) => {
            let total = 0;
            if (e1 && s1) total += Math.max(0, parseToMins(e1) - parseToMins(s1));
            if (e2 && s2) total += Math.max(0, parseToMins(e2) - parseToMins(s2));
            return total;
        };

        const baseMins = calcDur(config.shiftStart, config.shiftEnd, config.shiftStart2, config.shiftEnd2);
        let satMins = config.worksSaturday ? (config.hasCustomSaturday ? calcDur(config.saturdayStart, config.saturdayEnd, config.saturdayStart2, config.saturdayEnd2) : baseMins) : 0;
        let sunMins = config.worksSunday ? (config.hasCustomSunday ? calcDur(config.sundayStart, config.sundayEnd, config.sundayStart2, config.sundayEnd2) : baseMins) : 0;

        let regularDays = 5; 
        if (config.scheduleType === "FIXED") {
            if (["Seg", "Ter", "Qua", "Qui", "Sex"].includes(config.offDay)) regularDays -= 1;
            if (config.offDay === "Sab") satMins = 0;
            if (config.offDay === "Dom") sunMins = 0;
        }

        const lactanteDisc = config.isBreastfeeding ? 60 : 0;
        let totalMins = 0;
        
        totalMins += regularDays * Math.max(0, baseMins - lactanteDisc);
        if (satMins > 0) totalMins += Math.max(0, satMins - lactanteDisc);
        if (sunMins > 0) totalMins += Math.max(0, sunMins - lactanteDisc);

        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}h`;
    }, [config]);

    const formatDateBR = (dateStr) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.substring(0,10).split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-500 min-h-screen pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <CalendarDays className="text-indigo-600" size={24} /> Gestão de Escalas
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">Configure horários, DSR e agende novas escalas.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSave} className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-100 gap-2">
                        <Save size={16} /> SALVAR ESCALA
                    </Button>
                </div>
            </div>

            <Card className="p-4 border-none shadow-sm bg-indigo-600">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                        <Input 
                            placeholder="Buscar colaborador para configurar..." 
                            className="pl-10 h-12 bg-white/10 border-white/10 text-white placeholder:text-indigo-200 text-base rounded-xl focus:ring-2 focus:ring-white/20"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                            onFocus={() => setIsDropdownOpen(true)}
                        />
                        {isDropdownOpen && searchTerm && (
                            <div className="absolute z-[100] w-full mt-2 bg-white rounded-xl shadow-2xl max-h-60 overflow-auto border border-slate-100 py-1 animate-in zoom-in-95 duration-200">
                                {filteredEmployees.length > 0 ? filteredEmployees.map((e) => (
                                    <button key={e.Id ?? e.id} onClick={() => handleSelectEmployee(e)} className="w-full px-4 py-3 text-left hover:bg-indigo-50 text-slate-700 text-sm font-bold border-b border-slate-50 last:border-0 flex justify-between items-center group">
                                        <span className="group-hover:text-indigo-600 transition-colors">{e.Name ?? e.name}</span>
                                        <Badge variant="outline" className="text-[10px] opacity-50 uppercase font-black">ID {e.Id ?? e.id}</Badge>
                                    </button>
                                )) : <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum resultado</div>}
                            </div>
                        )}
                    </div>
                    {selectedEmp && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-xl border border-white/10 h-12">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xs text-white">
                                {(selectedEmp.Name ?? selectedEmp.name).charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm leading-tight truncate max-w-[150px]">{selectedEmp.Name ?? selectedEmp.name}</span>
                                <span className="text-[9px] text-indigo-200 font-black uppercase tracking-wider">Colaborador Selecionado</span>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {selectedEmp && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* ✨ A NOVA BARRA DE ABAS COMPACTA */}
                        <div className="flex overflow-x-auto custom-scrollbar bg-slate-50 rounded-t-2xl border-b-2 border-slate-200">
                            {scheduleHistory.map((sh, idx) => {
                                const shId = sh.Id ?? sh.id;
                                const effDate = sh.EffectiveDate ?? sh.effectiveDate;
                                
                                return (
                                    <button
                                        key={shId}
                                        onClick={() => { setActiveTabId(shId); loadScheduleIntoConfig(sh); }}
                                        className={`px-4 py-2.5 font-bold text-xs border-b-2 -mb-[2px] transition-all whitespace-nowrap flex flex-col items-start gap-0.5 ${
                                            activeTabId === shId
                                                ? "border-indigo-600 bg-white text-indigo-700 shadow-sm"
                                                : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="text-[8px] uppercase font-black opacity-70">
                                            {idx === 0 ? "Escala Atual" : "Histórico"}
                                        </span>
                                        {effDate ? `A partir de ${formatDateBR(effDate)}` : "Padrão (Desde a Admissão)"}
                                    </button>
                                );
                            })}
                            
                            <button
                                onClick={handleNewScheduleClick}
                                className={`px-4 py-2.5 font-black text-xs border-b-2 -mb-[2px] transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    activeTabId === "NEW"
                                        ? "border-emerald-600 bg-white text-emerald-600 shadow-sm"
                                        : "border-transparent text-emerald-500/70 hover:text-emerald-600 hover:bg-emerald-50/50"
                                }`}
                            >
                                <PlusCircle size={14} /> Agendar Nova
                            </button>
                        </div>

                        <Card className="p-6 shadow-sm border-slate-100 rounded-b-2xl bg-white space-y-8 rounded-tr-none">
                            
                            {/* MOSTRA O CAMPO DE DATA SÓ SE FOR UMA NOVA ESCALA */}
                            {activeTabId === "NEW" && (
                                <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-xl mb-6 animate-in slide-in-from-top-2">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-black text-emerald-800 text-sm">A partir de quando esta escala vale?</h3>
                                            <p className="text-[10px] text-emerald-600/70 mt-0.5">Selecione o dia em que o colaborador começará este novo horário.</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-emerald-200 shadow-sm">
                                            <CalendarIcon size={16} className="text-emerald-500 ml-2" />
                                            <input 
                                                type="date" 
                                                value={config.effectiveDate}
                                                onChange={(e) => setConfig({...config, effectiveDate: e.target.value})}
                                                className="h-8 border-none bg-transparent text-sm font-bold text-emerald-700 focus:ring-0 w-36 outline-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TIPO DE ESCALA */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                                    <Users size={16} className="text-indigo-500" />
                                    <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Tipo de Escala</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button 
                                        type="button" onClick={() => setConfig({...config, scheduleType: 'FIXED'})}
                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${config.scheduleType === 'FIXED' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                                    >
                                        <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${config.scheduleType === 'FIXED' ? 'border-indigo-600' : 'border-slate-300'}`}>
                                            {config.scheduleType === 'FIXED' && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">Escala Fixa</p>
                                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">DSR fixo semanal (Ex: 6x1).</p>
                                        </div>
                                    </button>
                                    <button 
                                        type="button" onClick={() => setConfig({...config, scheduleType: 'VARIABLE'})}
                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${config.scheduleType === 'VARIABLE' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                                    >
                                        <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${config.scheduleType === 'VARIABLE' ? 'border-amber-600' : 'border-slate-300'}`}>
                                            {config.scheduleType === 'VARIABLE' && <div className="w-2 h-2 bg-amber-600 rounded-full" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">Escala Rotativa</p>
                                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Folgas manuais no calendário.</p>
                                        </div>
                                    </button>
                                </div>
                            </section>

                            {/* HORÁRIOS */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-indigo-500" />
                                        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Carga Horária Base</h3>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Entrada', key: 'shiftStart' },
                                        { label: 'Almoço', key: 'shiftEnd' },
                                        { label: 'Retorno', key: 'shiftStart2' },
                                        { label: 'Saída', key: 'shiftEnd2' }
                                    ].map((item) => (
                                        <div key={item.key} className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">{item.label}</Label>
                                            <Input type="time" value={config[item.key] || ""} onChange={e => setConfig({...config, [item.key]: e.target.value})} className="h-10 text-center font-bold bg-slate-50 border-slate-100 focus:bg-white" />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* SÁBADO E DOMINGO */}
                            <section className="pt-4 border-t border-slate-50 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sun size={16} className="text-amber-500" />
                                            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Sábados</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border transition-all ${config.worksSaturday ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                <input type="checkbox" checked={config.worksSaturday} onChange={e => setConfig({...config, worksSaturday: e.target.checked})} className="hidden" />
                                                <span className="text-[10px] font-black uppercase">{config.worksSaturday ? 'Trabalha' : 'Não Trabalha'}</span>
                                            </label>
                                            {config.worksSaturday && (
                                                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border transition-all ${config.hasCustomSaturday ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                    <input type="checkbox" checked={config.hasCustomSaturday} onChange={e => setConfig({...config, hasCustomSaturday: e.target.checked})} className="hidden" />
                                                    <span className="text-[10px] font-black uppercase">Horário Especial</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    {config.worksSaturday && config.hasCustomSaturday && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-amber-50/30 rounded-xl border border-amber-100 animate-in slide-in-from-top-2">
                                            <Input type="time" value={config.saturdayStart || ""} onChange={e => setConfig({...config, saturdayStart: e.target.value})} className="h-9 text-center font-bold bg-white border-amber-100" />
                                            <Input type="time" value={config.saturdayEnd || ""} onChange={e => setConfig({...config, saturdayEnd: e.target.value})} className="h-9 text-center font-bold bg-white border-amber-100" />
                                            <Input type="time" value={config.saturdayStart2 || ""} onChange={e => setConfig({...config, saturdayStart2: e.target.value})} className="h-9 text-center font-bold bg-white border-amber-100" />
                                            <Input type="time" value={config.saturdayEnd2 || ""} onChange={e => setConfig({...config, saturdayEnd2: e.target.value})} className="h-9 text-center font-bold bg-white border-amber-100" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sun size={16} className="text-emerald-500" />
                                            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Domingos</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border transition-all ${config.worksSunday ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                <input type="checkbox" checked={config.worksSunday} onChange={e => setConfig({...config, worksSunday: e.target.checked})} className="hidden" />
                                                <span className="text-[10px] font-black uppercase">{config.worksSunday ? 'Trabalha' : 'Não Trabalha'}</span>
                                            </label>
                                            {config.worksSunday && (
                                                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border transition-all ${config.hasCustomSunday ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                    <input type="checkbox" checked={config.hasCustomSunday} onChange={e => setConfig({...config, hasCustomSunday: e.target.checked})} className="hidden" />
                                                    <span className="text-[10px] font-black uppercase">Horário Especial</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    {config.worksSunday && config.hasCustomSunday && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 animate-in slide-in-from-top-2">
                                            <Input type="time" value={config.sundayStart || ""} onChange={e => setConfig({...config, sundayStart: e.target.value})} className="h-9 text-center font-bold bg-white border-emerald-100" />
                                            <Input type="time" value={config.sundayEnd || ""} onChange={e => setConfig({...config, sundayEnd: e.target.value})} className="h-9 text-center font-bold bg-white border-emerald-100" />
                                            <Input type="time" value={config.sundayStart2 || ""} onChange={e => setConfig({...config, sundayStart2: e.target.value})} className="h-9 text-center font-bold bg-white border-emerald-100" />
                                            <Input type="time" value={config.sundayEnd2 || ""} onChange={e => setConfig({...config, sundayEnd2: e.target.value})} className="h-9 text-center font-bold bg-white border-emerald-100" />
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* CARDS FINAIS DA ESQUERDA */}
                            <div className="pt-8 border-t-2 border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                <Card className="bg-slate-900 shadow-xl border-none p-5 text-white flex flex-col items-center justify-center relative overflow-hidden rounded-2xl">
                                    <div className="absolute -right-6 -top-6 text-white/5 opacity-50">
                                        <Calculator size={100} />
                                    </div>
                                    <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase mb-1 z-10">Jornada Semanal Total</span>
                                    <div className="text-4xl font-mono font-black z-10 flex items-end gap-1">
                                        {weeklyHours.split('h')[0]}<span className="text-xl text-indigo-400 mb-1 leading-none">h</span>
                                    </div>
                                </Card>

                                <Card className={`p-5 border-2 transition-all rounded-2xl flex flex-col justify-center ${config.isBreastfeeding ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="w-full flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-lg ${config.isBreastfeeding ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Status Especial</p>
                                                <p className="text-sm font-bold text-slate-800">Lactante / Reduzido</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={config.isBreastfeeding} 
                                                onChange={e => setConfig({...config, isBreastfeeding: e.target.checked})}
                                                className="sr-only peer"
                                            />
                                            <div className="w-12 h-7 bg-slate-300 rounded-full peer peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </Card>
                            </div>
                        </Card>
                    </div>

                    {/* LADO DIREITO */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="p-4 bg-slate-50 shadow-sm border-slate-100 rounded-2xl space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                                <Clock size={14} className="text-indigo-400"/> Resumo Diário
                            </Label>
                            
                            <div className="grid grid-cols-1 gap-2 origin-top">
                                <ShiftCalculator label="Segunda a Sexta" h1={config.shiftStart} h2={config.shiftEnd} h3={config.shiftStart2} h4={config.shiftEnd2} />
                                {config.worksSaturday && (
                                    <ShiftCalculator label="Sábado" h1={config.hasCustomSaturday ? config.saturdayStart : config.shiftStart} h2={config.hasCustomSaturday ? config.saturdayEnd : config.shiftEnd} h3={config.hasCustomSaturday ? config.saturdayStart2 : config.shiftStart2} h4={config.hasCustomSaturday ? config.saturdayEnd2 : config.shiftEnd2} />
                                )}
                                {config.worksSunday && (
                                    <ShiftCalculator label="Domingo" h1={config.hasCustomSunday ? config.sundayStart : config.shiftStart} h2={config.hasCustomSunday ? config.sundayEnd : config.shiftEnd} h3={config.hasCustomSunday ? config.sundayStart2 : config.shiftStart2} h4={config.hasCustomSunday ? config.sundayEnd2 : config.shiftEnd2} />
                                )}
                            </div>
                        </Card>

                        <Card className="p-5 border-none shadow-xl bg-slate-900 text-white rounded-2xl">
                            {config.scheduleType === 'FIXED' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                                        <div className="p-1.5 bg-rose-500 rounded-lg"><Info size={14} /></div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Folga Semanal (DSR)</Label>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map(day => (
                                            <button key={day} type="button" onClick={() => setConfig({...config, offDay: day})} className={`h-10 rounded-xl text-xs font-black transition-all border-2 ${config.offDay === day ? "bg-white border-white text-slate-900 shadow-lg scale-105" : "bg-white/5 border-white/10 text-white/40 hover:border-white/30"}`}>{day}</button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                                        <div className="p-1.5 bg-amber-500 rounded-lg text-white"><CalendarDays size={11} /></div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Calendário de Folgas</Label>
                                    </div>
                                    <RosterCalendar offDays={config.rosterDays} onChange={(newDays) => setConfig({...config, rosterDays: newDays})} />
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

function RosterCalendar({ offDays, onChange }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const toggleOffDay = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const newDays = offDays.includes(dateStr) ? offDays.filter(d => d !== dateStr) : [...offDays, dateStr];
        onChange(newDays);
    };

    return (
        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-black text-[10px] uppercase tracking-widest text-white">{monthNames[month]} {year}</span>
                <div className="flex gap-1">
                    <button type="button" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-all"><ChevronLeft size={16} /></button>
                    <button type="button" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-all"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-[9px] font-black text-white/20">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isOffDay = offDays.includes(dateStr);
                    return (
                        <button
                            key={day} type="button" onClick={() => toggleOffDay(day)}
                            className={`h-8 w-full rounded-lg text-[10px] font-bold transition-all flex items-center justify-center
                                ${isOffDay ? 'bg-amber-500 text-white shadow-lg' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}