import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/services/api";
import { Label, Button } from "@/components/ui";
import { Loader2, PlusCircle, Save, Clock, Info } from "lucide-react";
import { format } from "date-fns";

export default function ManualTimeEntry({ employees, stores }) {
    const location = useLocation();

    const [selectedEmp, setSelectedEmp] = useState("");
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [punches, setPunches] = useState([]); 
    const [scheduleMsg, setScheduleMsg] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // 1. AUTO-PREENCHIMENTO
    useEffect(() => {
        if (location.state) {
            if (location.state.empId != null) setSelectedEmp(String(location.state.empId));
            if (location.state.actionDate) setSelectedDate(location.state.actionDate);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // 2. BUSCA DE DADOS (Batidas e Escala)
    useEffect(() => {
        if (!selectedEmp || !selectedDate) {
            setPunches([]);
            setScheduleMsg(null);
            return;
        }

        setFetching(true);
        const handleData = (res) => {
            if (res.type === "day-punches-loaded") {
                setPunches(res.data);
                setFetching(false);
            }
            if (res.type === "punches-saved-success" || res.type === "error") {
                setLoading(false);
            }
            
            // ✨ 3. NOVA MATEMÁTICA DA ESCALA (Agora com os 2 períodos!)
            if (res.type === "employee-schedule-loaded" || res.type === "employee-schedule-empty") {
                const sched = res.data;
                
                if (!sched) {
                    setScheduleMsg({ text: "Sem escala vinculada", time: "--:-- às --:--", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" });
                    return;
                }

                // Função para formatar os dois períodos bonitinhos (Ex: 08:00 às 12:00 | 13:00 às 17:00)
                const formatShift = (s1, e1, s2, e2) => {
                    // Pega só as horas e minutos (caso o C# mande 08:00:00)
                    const clean = (val) => val && val !== "--:--" ? val.substring(0, 5) : ""; 
                    const p1 = (clean(s1) && clean(e1)) ? `${clean(s1)} às ${clean(e1)}` : "";
                    const p2 = (clean(s2) && clean(e2)) ? `${clean(s2)} às ${clean(e2)}` : "";
                    
                    if (p1 && p2) return `${p1} | ${p2}`;
                    if (p1) return p1;
                    if (p2) return p2;
                    return "--:-- às --:--";
                };

                const [year, month, day] = selectedDate.split('-');
                const localDate = new Date(year, month - 1, day);
                const dayOfWeek = localDate.getDay(); 
                
                const daysMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
                const dayName = daysMap[dayOfWeek];

                const sType = sched.ScheduleType ?? sched.scheduleType ?? "FIXED";
                const rDays = sched.RosterDays ?? sched.rosterDays ?? [];
                const dOff = sched.OffDay ?? sched.offDay ?? "Dom";
                
                // ✨ Pegando PERÍODO 1 e PERÍODO 2
                const defaultStart = sched.ShiftStart ?? sched.shiftStart ?? "";
                const defaultEnd = sched.ShiftEnd ?? sched.shiftEnd ?? "";
                const defaultStart2 = sched.ShiftStart2 ?? sched.shiftStart2 ?? "";
                const defaultEnd2 = sched.ShiftEnd2 ?? sched.shiftEnd2 ?? "";
                
                const wSat = sched.WorksSaturday ?? sched.worksSaturday ?? false;
                const cSat = sched.HasCustomSaturday ?? sched.hasCustomSaturday ?? false;
                const satStart = sched.SaturdayStart ?? sched.saturdayStart ?? defaultStart;
                const satEnd = sched.SaturdayEnd ?? sched.saturdayEnd ?? defaultEnd;
                const satStart2 = sched.SaturdayStart2 ?? sched.saturdayStart2 ?? defaultStart2;
                const satEnd2 = sched.SaturdayEnd2 ?? sched.saturdayEnd2 ?? defaultEnd2;

                const wSun = sched.WorksSunday ?? sched.worksSunday ?? false;
                const cSun = sched.HasCustomSunday ?? sched.hasCustomSunday ?? false;
                const sunStart = sched.SundayStart ?? sched.sundayStart ?? defaultStart;
                const sunEnd = sched.SundayEnd ?? sched.sundayEnd ?? defaultEnd;
                const sunStart2 = sched.SundayStart2 ?? sched.sundayStart2 ?? defaultStart2;
                const sunEnd2 = sched.SundayEnd2 ?? sched.sundayEnd2 ?? defaultEnd2;

                // LÓGICA PARA ESCALA ROTATIVA (Se hoje for folga rotativa)
                if (sType === "VARIABLE" && rDays.includes(selectedDate)) {
                    setScheduleMsg({ text: "Folga Rotativa", time: "Livre", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" });
                    return;
                }

                // LÓGICA PARA DOMINGO
                if (dayOfWeek === 0) {
                    if (!wSun || (sType === "FIXED" && dOff === "Dom")) {
                        setScheduleMsg({ text: "Folga Semanal (DSR)", time: "Livre", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" });
                    } else {
                        setScheduleMsg({ 
                            text: cSun ? "Domingo (Horário Especial)" : "Domingo", 
                            time: formatShift(sunStart, sunEnd, sunStart2, sunEnd2), 
                            color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" 
                        });
                    }
                    return;
                }

                // LÓGICA PARA SÁBADO
                if (dayOfWeek === 6) {
                    if (!wSat || (sType === "FIXED" && dOff === "Sab")) {
                        setScheduleMsg({ text: "Folga Semanal (DSR)", time: "Livre", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" });
                    } else {
                        setScheduleMsg({ 
                            text: cSat ? "Sábado (Horário Especial)" : "Sábado", 
                            time: formatShift(satStart, satEnd, satStart2, satEnd2), 
                            color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" 
                        });
                    }
                    return;
                }

                // LÓGICA PARA SEGUNDA A SEXTA
                if (sType === "FIXED" && dOff === dayName) {
                    setScheduleMsg({ text: `Folga Semanal (${dayName})`, time: "Livre", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" });
                } else {
                    setScheduleMsg({ 
                        text: "Escala Padrão", 
                        time: formatShift(defaultStart, defaultEnd, defaultStart2, defaultEnd2), 
                        color: "text-sky-700", bg: "bg-sky-50 border-sky-200" 
                    });
                }
            }
        };

        const cleanup = api.onDataReceived(handleData);
        
        api.send("GET_DAY_PUNCHES", { employeeId: parseInt(selectedEmp), date: selectedDate });
        api.send("GET_EMPLOYEE_SCHEDULE", { employeeId: parseInt(selectedEmp) });

        return () => cleanup();
    }, [selectedEmp, selectedDate]);

    // 4. MANIPULAÇÃO DA TELA
    const handlePunchChange = (index, field, value) => {
        const newPunches = [...punches];
        newPunches[index][field] = value;
        setPunches(newPunches);
    };

    const handleAddPunch = () => {
        setPunches([...punches, { id: null, time: "00:00", isActive: true }]);
    };

    const handleSave = () => {
        if (!selectedEmp || !selectedDate) return alert("Selecione colaborador e data.");
        
        setLoading(true);
        api.send("SAVE_DAY_PUNCHES", {
            employeeId: parseInt(selectedEmp),
            date: selectedDate,
            punches: punches
        });

        setTimeout(() => setLoading(false), 1500); 
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-xl space-y-4 border border-slate-100 max-w-2xl mx-auto">
            
            <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Clock size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Ajuste de Ponto</h2>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Edição manual de registros</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Colaborador</Label>
                        <select 
                            value={selectedEmp || ""} 
                            onChange={(e) => setSelectedEmp(e.target.value)} 
                            className="w-full h-10 rounded-lg border-2 border-slate-100 font-bold text-sm text-slate-700 focus:border-indigo-500 px-3 outline-none transition-colors"
                        >
                            <option value="">Selecione...</option>
                            {employees?.map(emp => {
                                const empId = emp.Id ?? emp.id;
                                const empName = emp.Name ?? emp.name;
                                return (
                                    <option key={empId} value={empId}>
                                        {empName}
                                    </option>
                                );
                            })}
                        </select>
                </div>
                
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Data</Label>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className="w-full h-10 rounded-lg border-2 border-slate-100 font-bold text-sm text-slate-700 focus:border-indigo-500 px-3 outline-none transition-colors" 
                    />
                </div>
            </div>

            {scheduleMsg && (
                <div className={`${scheduleMsg.bg} border p-3 rounded-xl flex items-center gap-2 ${scheduleMsg.color} transition-all duration-300`}>
                    <Info size={16} className="min-w-fit" />
                    <span className="text-[10px] uppercase font-black tracking-wider flex-1">
                        {scheduleMsg.text}: <span className="font-bold opacity-80">{scheduleMsg.time}</span>
                    </span>
                </div>
            )}

            <div className="space-y-2 py-2 min-h-[120px] max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                {fetching ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
                ) : punches.length === 0 && selectedEmp ? (
                    <div className="text-center py-6 text-slate-400 font-bold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Nenhuma batida nesta data.
                    </div>
                ) : (
                    punches.map((punch, idx) => (
                        <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all ${punch.isActive ? 'bg-indigo-50/30 border-indigo-50' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                            
                            <label className="flex items-center gap-2 cursor-pointer pl-1">
                                <input type="checkbox" checked={punch.isActive} onChange={(e) => handlePunchChange(idx, "isActive", e.target.checked)} className="w-4 h-4 accent-indigo-600 rounded" />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${punch.isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {punch.isActive ? 'Válido' : 'Inativo'}
                                </span>
                            </label>

                            <input 
                                type="time" 
                                value={punch.time} 
                                onChange={(e) => handlePunchChange(idx, "time", e.target.value)} 
                                disabled={!punch.isActive} 
                                className="ml-auto h-8 px-2 rounded-lg border-2 border-white text-sm font-black text-slate-700 outline-none focus:border-indigo-400 disabled:bg-transparent transition-all" 
                            />
                        </div>
                    ))
                )}
            </div>

            <div className="flex gap-3 pt-2">
                <Button onClick={handleAddPunch} disabled={!selectedEmp || fetching} variant="outline" className="flex-1 h-10 rounded-lg border-2 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-200 gap-2">
                    <PlusCircle size={16} /> Adicionar
                </Button>
                
                <Button onClick={handleSave} disabled={loading || !selectedEmp || fetching} className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 gap-2 transition-all">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Ponto</>}
                </Button>
            </div>
        </div>
    );
}