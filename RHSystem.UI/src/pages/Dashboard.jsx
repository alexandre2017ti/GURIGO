import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom"; 
import { api } from "@/services/api";
import { 
    Users, Clock, Building2, AlertTriangle, 
    Activity, Bot, TrendingUp, ChevronRight, CheckCircle2 
} from "lucide-react";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { format, subDays, startOfMonth } from "date-fns";

export default function Dashboard() {
    const navigate = useNavigate(); 
    const [lateEmployees, setLateEmployees] = useState([]);
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        const handleData = (res) => {
            const unpack = (d) => Array.isArray(d) ? d : (d?.data || []);

            if (res.type === "time-records-loaded") {
                setRecords(unpack(res.data).map(r => ({
                    Id: r.Id ?? r.id,
                    EmployeeName: r.EmployeeName ?? r.employeeName ?? "Desconhecido",
                    EmployeeId: r.EmployeeId ?? r.employeeId ?? "",
                    Date: (r.Date ?? r.date ?? "").split('T')[0],
                    Time: r.Time ?? r.time ?? "--:--"
                })));
            }
            if (res.type === "delay-notification") setLateEmployees(res.data || []);
            if (res.type === "employees-loaded") {
                setEmployees(unpack(res.data).map(e => ({ Id: e.Id ?? e.id, Name: e.Name ?? e.name })));
            }
        };

        const cleanup = api.onDataReceived(handleData);
        api.send("GET_TIME_RECORDS");
        api.send("GET_EMPLOYEES");
        return () => cleanup(); 
    }, []);

    // --- 🧠 CÉREBRO 1: ESTATÍSTICAS GLOBAIS ---
    const stats = useMemo(() => {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const pointsToday = records.filter(r => r.Date === todayStr).length;
        
        return {
            totalEmployees: employees.length,
            pointsToday: pointsToday,
            totalStores: 1 
        };
    }, [records, employees]);

    // --- 🧠 CÉREBRO 2: RADAR DE ANOMALIAS (Somente dias anteriores) ---
    const smartAlerts = useMemo(() => {
        const today = new Date();
        const alerts = [];
        
        // Começa de 1 (ontem) para evitar falso positivo de ponto ímpar hoje
        for (let i = 1; i <= 7; i++) {
            const targetDate = format(subDays(today, i), "yyyy-MM-dd");
            const dailyRecords = records.filter(r => r.Date === targetDate);
            
            const grouped = {};
            dailyRecords.forEach(r => {
                if (!grouped[r.EmployeeId]) grouped[r.EmployeeId] = { name: r.EmployeeName, times: [] };
                grouped[r.EmployeeId].times.push(r.Time);
            });

            Object.entries(grouped).forEach(([empId, emp]) => {
                emp.times.sort();
                const displayDate = targetDate.split('-').reverse().join('/');

                if (emp.times.length % 2 !== 0) {
                    alerts.push({ 
                        id: empId, name: emp.name, date: displayDate, dateRaw: targetDate, type: 'ODD', 
                        msg: "Batida ímpar (Faltou registro)", 
                        color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", icon: AlertTriangle 
                    });
                    return;
                }

                let totalMins = 0;
                for (let j = 0; j < emp.times.length; j += 2) {
                    const start = emp.times[j].split(':').map(Number);
                    const end = emp.times[j+1].split(':').map(Number);
                    let sMin = start[0] * 60 + start[1];
                    let eMin = end[0] * 60 + end[1];
                    if (eMin < sMin) eMin += 24 * 60;
                    totalMins += (eMin - sMin);
                }
                const hours = totalMins / 60;

                if (hours > 10) {
                    alerts.push({ 
                        id: empId, name: emp.name, date: displayDate, dateRaw: targetDate, type: 'OVER', 
                        msg: `Carga alta: ${Math.floor(hours)}h${String(totalMins % 60).padStart(2, '0')}`, 
                        color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", icon: Activity 
                    });
                }
                else if (hours > 0 && hours < 7) {
                    alerts.push({ 
                        id: empId, name: emp.name, date: displayDate, dateRaw: targetDate, type: 'UNDER', 
                        msg: `Carga baixa: ${Math.floor(hours)}h${String(totalMins % 60).padStart(2, '0')}`, 
                        color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100", icon: Clock 
                    });
                }
            });
        }
        return alerts.slice(0, 8); 
    }, [records]);

    // --- 🧠 CÉREBRO 3: TERMÔMETRO DE HORAS EXTRAS (Mês Atual) ---
    const topOvertime = useMemo(() => {
        const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
        const monthRecords = records.filter(r => r.Date >= monthStart);
        
        const grouped = {};
        monthRecords.forEach(r => {
            if (!grouped[r.EmployeeId]) grouped[r.EmployeeId] = { name: r.EmployeeName, recordsByDate: {} };
            if (!grouped[r.EmployeeId].recordsByDate[r.Date]) grouped[r.EmployeeId].recordsByDate[r.Date] = [];
            grouped[r.EmployeeId].recordsByDate[r.Date].push(r.Time);
        });

        const overtimeList = [];

        Object.entries(grouped).forEach(([empId, emp]) => {
            let totalOvertimeMins = 0;

            Object.values(emp.recordsByDate).forEach(times => {
                times.sort();
                let dailyMins = 0;
                for (let j = 0; j < times.length - 1; j += 2) {
                    const start = times[j].split(':').map(Number);
                    const end = times[j+1].split(':').map(Number);
                    let sMin = start[0] * 60 + start[1];
                    let eMin = end[0] * 60 + end[1];
                    if (eMin < sMin) eMin += 24 * 60;
                    dailyMins += (eMin - sMin);
                }
                if (dailyMins > 480) {
                    totalOvertimeMins += (dailyMins - 480);
                }
            });

            if (totalOvertimeMins > 0) {
                overtimeList.push({ id: empId, name: emp.name, hours: (totalOvertimeMins / 60).toFixed(1) });
            }
        });

        return overtimeList.sort((a, b) => b.hours - a.hours).slice(0, 5);
    }, [records]);

    // --- 🧠 CÉREBRO 4: TOTAL DE HORAS EXTRAS DA EMPRESA (Custo Acumulado) ---
    const companyOvertimeTotal = useMemo(() => {
        const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
        const monthRecords = records.filter(r => r.Date >= monthStart);
        
        const grouped = {};
        monthRecords.forEach(r => {
            if (!grouped[r.EmployeeId]) grouped[r.EmployeeId] = { recordsByDate: {} };
            if (!grouped[r.EmployeeId].recordsByDate[r.Date]) grouped[r.EmployeeId].recordsByDate[r.Date] = [];
            grouped[r.EmployeeId].recordsByDate[r.Date].push(r.Time);
        });

        let grandTotalMins = 0;
        Object.values(grouped).forEach(emp => {
            Object.values(emp.recordsByDate).forEach(times => {
                times.sort();
                let dailyMins = 0;
                for (let j = 0; j < times.length - 1; j += 2) {
                    const start = times[j].split(':').map(Number);
                    const end = times[j+1].split(':').map(Number);
                    let sMin = start[0] * 60 + start[1];
                    let eMin = end[0] * 60 + end[1];
                    if (eMin < sMin) eMin += 24 * 60;
                    dailyMins += (eMin - sMin);
                }
                if (dailyMins > 480) grandTotalMins += (dailyMins - 480);
            });
        });

        const totalHours = Math.floor(grandTotalMins / 60);
        const estimatedCost = totalHours * 25; 

        return { totalHours, estimatedCost };
    }, [records]);

    // --- 🧠 CÉREBRO 5: RADAR DE PONTOS ABERTOS HOJE (Esqueceram de sair) ---
    const openPunches = useMemo(() => {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
        
        const todayRecords = records.filter(r => r.Date === todayStr);
        const grouped = {};
        todayRecords.forEach(r => {
            if (!grouped[r.EmployeeId]) grouped[r.EmployeeId] = { name: r.EmployeeName, times: [] };
            grouped[r.EmployeeId].times.push(r.Time);
        });

        const problematic = [];
        Object.entries(grouped).forEach(([id, emp]) => {
            if (emp.times.length % 2 !== 0) {
                emp.times.sort();
                const lastPunch = emp.times[emp.times.length - 1];
                const [h, m] = lastPunch.split(':').map(Number);
                const lastPunchMins = h * 60 + m;

                if (nowMins - lastPunchMins > 360) {
                    problematic.push({ id, name: emp.name, lastPunch, dateRaw: todayStr });
                }
            }
        });
        return problematic;
    }, [records]);

    return (
        <div className="w-full h-full p-4 md:p-6 space-y-4 animate-in fade-in duration-500 bg-slate-50/30 min-h-screen">
            
            {/* CABEÇALHO COMPACTO */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white"><Activity size={20} /></div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-slate-900">Dashboard Estratégico</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Monitoramento em Tempo Real</p>
                    </div>
                </div>
            </div>

            {/* BLOCO 1: INDICADORES GLOBAIS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Equipe</p>
                            <h2 className="text-xl font-black text-slate-800 leading-none">{stats.totalEmployees}</h2>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Clock size={20} /></div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Batidas Hoje</p>
                            <h2 className="text-xl font-black text-slate-800 leading-none">{stats.pointsToday}</h2>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-white">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Building2 size={20} /></div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Lojas</p>
                            <h2 className="text-xl font-black text-slate-800 leading-none">{stats.totalStores}</h2>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm rounded-2xl bg-indigo-900 text-white">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-white/10 text-indigo-200 rounded-xl"><TrendingUp size={20} /></div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-indigo-300 tracking-widest">Custo HE</p>
                            <h2 className="text-xl font-black">R$ {companyOvertimeTotal.estimatedCost}</h2>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* BANNER DE ALERTA COM NAVEGAÇÃO */}
            {openPunches.length > 0 && (
                <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-subtle">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={24} className="text-rose-200" />
                        <div>
                            <span className="text-sm font-black uppercase tracking-wide block">
                                {openPunches.length} Alertas de saída pendente hoje!
                            </span>
                            <span className="text-xs text-rose-200">Colaboradores a mais de 6h sem registro.</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {openPunches.map(p => (
                            <button 
                                key={p.id}
                                onClick={() => navigate("/ponto", { state: { empId: p.id, empName: p.name, actionDate: p.dateRaw } })} 
                                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl flex items-center gap-2 transition-all"
                            >
                                <span className="font-bold text-[10px] uppercase truncate max-w-[100px]">{p.name}</span>
                                <ChevronRight size={14} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* GRID PRINCIPAL (2 COLUNAS) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* COLUNA ESQUERDA: AUDITORIA */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                        <div className="bg-slate-900 px-6 py-3 flex justify-between items-center">
                            <h3 className="text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <Bot size={16} className="text-emerald-400" /> Auditoria Semanal
                            </h3>
                            <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400 uppercase">Ações Requeridas</Badge>
                        </div>
                        <CardContent className="p-0 max-h-[380px] overflow-y-auto custom-scrollbar">
                            {smartAlerts.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 italic text-sm">Nenhuma pendência encontrada.</div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {smartAlerts.map((alert, i) => (
                                        <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl ${alert.bg} ${alert.color}`}><alert.icon size={18} /></div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{alert.name}</h4>
                                                    <p className={`text-[9px] font-black uppercase tracking-tighter ${alert.color}`}>{alert.date} • {alert.msg}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => navigate("/ponto", { state: { empId: alert.id, empName: alert.name, actionDate: alert.dateRaw } })} 
                                                className="h-8 px-3 bg-slate-50 text-slate-400 hover:text-indigo-600 border border-slate-100 rounded-lg font-black text-[9px] uppercase transition-all"
                                            >
                                                Ajustar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ATRASADOS (COMPACTO) */}
                    {lateEmployees.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {lateEmployees.slice(0, 4).map(emp => (
                                <div key={emp.Id} className="flex justify-between items-center bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 font-black text-xs">{emp.Name.charAt(0)}</div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-xs">{emp.Name}</p>
                                            <p className="text-[9px] text-rose-500 font-black uppercase">Entrada: {emp.Expected}</p>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 text-rose-600 font-black text-[9px] uppercase hover:bg-rose-100" 
                                        onClick={() => navigate("/ponto", { state: { empId: emp.Id, empName: emp.Name, actionDate: format(new Date(), "yyyy-MM-dd") } })}
                                    >
                                        Verificar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: TERMÔMETRO DE HE */}
                <div className="lg:col-span-1">
                    <Card className="border-none shadow-sm rounded-2xl bg-white h-full flex flex-col">
                        <div className="p-4 border-b border-slate-50">
                            <h3 className="text-slate-800 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <TrendingUp size={16} className="text-indigo-600" /> Ranking HE
                            </h3>
                        </div>
                        <CardContent className="p-4 space-y-5">
                            {topOvertime.map((emp, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-600 truncate w-24">{emp.name}</span>
                                        <span className="text-indigo-600">{emp.hours}h</span>
                                    </div>
                                    <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min((emp.hours / 30) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}