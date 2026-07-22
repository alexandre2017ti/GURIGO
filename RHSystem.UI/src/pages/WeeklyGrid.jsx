import React, { useState, useEffect, useMemo, useContext } from "react";
import { api } from "@/services/api";
import { Card, Button } from "@/components/ui";
import { Calendar, RefreshCw, Palmtree, Sun, Clock, Users } from "lucide-react";
import { GlobalContext } from "@/contexts/GlobalContext"; // ✨ Trazendo o nosso reservatório

export default function WeeklyGrid() {
    // Lemos direto da memória os funcionários e a função de atualizar!
    const { employees, refreshData } = useContext(GlobalContext);
    const [loading, setLoading] = useState(false);
    
    const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

    // Se o usuário clicar em "Atualizar", forçamos o GlobalContext a buscar do banco de novo
    const handleRefresh = () => {
        setLoading(true);
        refreshData();
        setTimeout(() => setLoading(false), 800); // Efeito visual de carregamento rápido
    };

    // ✨ AGRUPAMENTO INTELIGENTE (Agora os dados já chegam limpinhos em PascalCase do Contexto)
    const groupedByRole = useMemo(() => {
        if (!employees) return {};
        
        // Filtramos apenas os ativos para não poluir a grade com demitidos
        const activeEmployees = employees.filter(e => e.IsActive);

        return activeEmployees.reduce((acc, emp) => {
            const role = emp.Role || "Geral"; 
            if (!acc[role]) acc[role] = [];
            acc[role].push(emp);
            return acc;
        }, {});
    }, [employees]);

    const renderStatus = (emp, dia) => {
        // ✨ Como o GlobalContext garante as chaves, não precisamos mais do "??"
        const worksSunday = emp.WorksSunday;
        const compensation = emp.SundayCompensation || "";
        const offDayRaw = emp.OffDay || "";
        const workDays = emp.WorkDays || "";

        const offDayClean = offDayRaw.substring(0, 3);

        // 1. REGRA: FOLGA (ESCALA)
        if (worksSunday && compensation === "Escala" && offDayClean === dia) {
            return (
                <div className="flex flex-col items-center text-orange-600 bg-orange-50 p-2 rounded-md border border-orange-300 shadow-sm animate-in zoom-in-95">
                    <Palmtree size={14} className="mb-1" />
                    <span className="text-[9px] font-black uppercase text-center leading-tight">Folga<br />Escala</span>
                </div>
            );
        }

        // 2. REGRA DE DOMINGO
        if (dia === "Dom") {
            if (!worksSunday) {
                return (
                    <div className="flex flex-col items-center text-slate-400 bg-slate-50 p-2 rounded-md border border-dashed border-slate-200 opacity-60">
                        <Palmtree size={14} className="mb-1" />
                        <span className="text-[10px] font-bold uppercase">Folga Dom</span>
                    </div>
                );
            }
            const isDiaria = compensation === "Diária";
            return (
                <div className={`flex flex-col items-center p-2 rounded-md border shadow-sm ${isDiaria ? "text-blue-600 bg-blue-50 border-blue-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"}`}>
                    <Sun size={14} className="mb-1" />
                    <span className="text-[9px] font-extrabold uppercase text-center leading-tight">
                        {isDiaria ? "DIÁRIA" : "TRABALHO\nESCALA"}
                    </span>
                </div>
            );
        }

        // 3. DIAS ÚTEIS DE TRABALHO
        if (workDays.includes(dia)) {
            const s1 = emp.ShiftStart;
            const e1 = emp.ShiftEnd;
            const s2 = emp.ShiftStart2;
            const e2 = emp.ShiftEnd2;

            if (!s1) return <div className="text-slate-200 opacity-20"><Palmtree size={14} /></div>;

            return (
                <div className="flex flex-col items-center text-slate-700 bg-white p-2 rounded-md border border-slate-200 shadow-sm transition-colors hover:border-indigo-300">
                    <Clock size={12} className="text-indigo-500 mb-1" />
                    <span className="text-[10px] font-bold text-slate-800">{s1}-{e1}</span>
                    {s2 && <span className="text-[9px] text-indigo-600 font-medium mt-1 border-t pt-1 w-full text-center">{s2}-{e2}</span>}
                </div>
            );
        }

        // 4. FOLGA PADRÃO
        return (
            <div className="text-slate-200 flex flex-col items-center opacity-20">
                <Palmtree size={14} />
                <span className="text-[8px] uppercase mt-1">Folga</span>
            </div>
        );
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Geral */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                        <Calendar className="text-indigo-500" /> Planejamento Semanal
                    </h1>
                    <p className="text-sm text-slate-500 italic">Visualização agrupada por cargos e setores</p>
                </div>
                <Button variant="outline" className="gap-2 shadow-sm" onClick={handleRefresh}>
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar
                </Button>
            </div>

            {/* Listagem Agrupada */}
            {Object.keys(groupedByRole).length > 0 ? (
                Object.entries(groupedByRole).map(([role, employeesList]) => (
                    <div key={role} className="space-y-4">
                        <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4 py-1">
                            <Users size={18} className="text-indigo-500" />
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                {role}
                            </h2>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">
                                {employeesList.length} MEMBROS
                            </span>
                        </div>

                        <Card className="overflow-hidden shadow-xl border-slate-200 rounded-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse bg-white">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <th className="p-4 text-left text-sm font-bold border-r w-64 sticky left-0 bg-slate-50 z-10 text-indigo-900">Colaborador</th>
                                            {diasSemana.map(d => (
                                                <th key={d} className={`p-4 text-center text-sm font-black ${d === 'Dom' ? 'bg-orange-50/30 text-orange-600' : 'text-slate-600'}`}>
                                                    {d.toUpperCase()}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {employeesList.map((emp) => (
                                            <tr key={emp.Id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 border-r font-bold text-slate-800 text-sm sticky left-0 bg-white z-10 shadow-sm">
                                                    {emp.Name}
                                                </td>
                                                {diasSemana.map(dia => (
                                                    <td key={dia} className={`p-2 text-center border-r last:border-0 ${dia === 'Dom' ? 'bg-orange-50/5' : ''}`}>
                                                        {renderStatus(emp, dia)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed">
                    <Users size={40} className="mb-4 opacity-20" />
                    <p className="font-medium italic">Nenhum colaborador ativo cadastrado.</p>
                </div>
            )}
        </div>
    );
}