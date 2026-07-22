import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import {
    Button, Input, Label, Card, Checkbox
} from "@/components/ui";
import { Palmtree, Plus, Trash2, Calendar as CalendarIcon, User, Plane, X, CheckCircle2, Loader2 } from "lucide-react";

// ============================================================================
// 1. MODAL DE FÉRIAS (Independente e limpo)
// ============================================================================
function AddFeriasModal({ isOpen, onClose, employees, onSaveSuccess }) {
    const [selectedEmp, setSelectedEmp] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!selectedEmp || !startDate || !endDate) return alert("Preencha todos os campos!");
        
        setLoading(true);
        const empIdInt = parseInt(selectedEmp);

        // 1. Salva na tabela Vacations (Agora o C# tem o case para isso!)
        api.send("SAVE_VACATION", {
            EmployeeId: empIdInt,
            StartDate: startDate,
            EndDate: endDate,
            Status: "Agendado",
            Description: description || "Férias programadas"
        });

        // 2. Salva na tabela AbsenceJustifications (Com os campos blindados)
        api.send("SAVE_JUSTIFICATION", {
            employeeId: empIdInt,
            startDate: startDate,
            endDate: endDate,
            startTime: "", // Vazio para dia inteiro
            endTime: "",   // Vazio para dia inteiro
            type: "FERIAS",
            description: description || "Férias programadas",
            isAbonado: true,
            imageBase64: "" // Vazio porque não tem anexo de imagem
        });

        setTimeout(() => {
            setLoading(false);
            onSaveSuccess(); 
            onClose();
            setSelectedEmp(""); setStartDate(""); setEndDate(""); setDescription("");
        }, 800); // Aumentei 200ms para dar tempo do banco do C# respirar
    };

    return (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white shadow-2xl rounded-[2.5rem] overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <Plane className="text-emerald-500" size={28} /> Lançar Férias
                        </h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 pl-1">Colaborador</Label>
                            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} className="w-full h-12 rounded-2xl border-2 border-slate-100 font-bold px-3 outline-none focus:border-emerald-500">
                                <option value="">Selecione...</option>
                                {employees.map(emp => <option key={emp.Id} value={emp.Id}>{emp.Name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-2xl border-2 border-slate-100 font-bold px-3 outline-none focus:border-emerald-500" />
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 rounded-2xl border-2 border-slate-100 font-bold px-3 outline-none focus:border-emerald-500" />
                        </div>

                        <Input placeholder="Observação (Ex: Período 24/25)" value={description} onChange={(e) => setDescription(e.target.value)} className="h-12 rounded-2xl border-2 border-slate-100 font-bold" />
                    </div>

                    <Button disabled={loading} onClick={handleSave} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all">
                        {loading ? <Loader2 className="animate-spin" /> : "Confirmar Férias"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}

// ============================================================================
// 2. COMPONENTE PAI (A TELA PRINCIPAL)
// ============================================================================
export default function Vacations() {
    const [vacations, setVacations] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // loadData agora está no escopo correto e memorizado
    const loadData = useCallback(() => {
        api.send("GET_VACATIONS");
        api.send("GET_EMPLOYEES");
    }, []);

    useEffect(() => {
        const handleData = (res) => {
            // 📝 DEBUG 1: Ver exatamente o que chega do C# bruto
            console.log("📡 [DADOS BRUTOS DO C#]:", res);

            const unpack = (d) => (d && d.data && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
            
            if (res.type === "vacations-loaded") {
                const rawList = unpack(res.data);
                
                // 📝 DEBUG 2: Ver a lista após o "unpack"
                console.log("📋 [LISTA DE FÉRIAS]:", rawList);

                if (rawList.length === 0) {
                    console.warn("⚠️ A lista de férias veio VAZIA do C#.");
                }

                const mapped = rawList.map(v => {
                    // 📝 DEBUG 3: Verificar os campos individuais
                    // (Aqui pegamos se o C# mandou 'Id' ou 'id', etc)
                    return {
                        Id: v.Id ?? v.id,
                        EmployeeId: v.EmployeeId ?? v.employeeId,
                        StartDate: v.StartDate ?? v.startDate,
                        EndDate: v.EndDate ?? v.endDate,
                        Status: v.Status ?? v.status
                    };
                });

                console.log("✅ [LISTA MAPEADA PARA O ESTADO]:", mapped);
                setVacations(mapped);
                setSelectedIds([]);
            }
            
            if (res.type === "employees-loaded") {
                console.log("👤 [LISTA DE FUNCIONÁRIOS]:", unpack(res.data).length, "recebidos.");
                const mapped = unpack(res.data).map(e => ({
                    Id: e.Id ?? e.id,
                    Name: e.Name ?? e.name
                }));
                setEmployees(mapped);
            }
        };

        const cleanup = api.onDataReceived(handleData);
        loadData();
        return () => cleanup();
    }, [loadData]);
const handleDelete = () => {
        if (confirm(`Deseja cancelar ${selectedIds.length} agendamento(s) de férias?`)) {
            
            const vacationsToDelete = vacations
                .filter(v => selectedIds.includes(v.Id))
                .map(v => ({
                    Id: v.Id, // ✨ AQUI ESTAVA O ERRO! Precisamos mandar o ID pro C#
                    EmployeeId: v.EmployeeId,
                    StartDate: v.StartDate,
                    EndDate: v.EndDate
                }));

            api.send("DELETE_VACATIONS", vacationsToDelete);
            
            // Aguardamos um pouco mais para o C# processar a eliminação em massa
            setTimeout(() => {
                loadData();
                setSelectedIds([]);
            }, 800);
        }
    };
    
    const fmtDate = (dateStr) => {
        if (!dateStr) return "-";
        const [y, m, d] = dateStr.split("T")[0].split("-");
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Modal com as conexões corrigidas */}
            <AddFeriasModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                employees={employees} 
                onSaveSuccess={loadData} 
            />

            <div className="flex justify-between items-center h-12">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Férias</h1>
                    <p className="text-slate-500 font-medium">Exibindo: Últimos 3 meses e próximos 6 meses.</p>
                </div>
                {selectedIds.length > 0 ? (
                    <Button variant="destructive" onClick={handleDelete} className="gap-2 h-12 rounded-xl">
                        <Trash2 size={18} /> Excluir {selectedIds.length} selecionados
                    </Button>
                ) : (
                    <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl gap-2">
                        <Plane size={18} /> Agendar Férias
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vacations.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-slate-50 border-slate-200">
                        <Palmtree className="mx-auto text-slate-300 mb-2" size={48} />
                        <p className="text-slate-400 font-bold">Nenhuma férias agendada para este período.</p>
                    </div>
                ) : (
                    vacations.map((vac) => {
                        const emp = employees.find(e => e.Id === vac.EmployeeId);
                        return (
                            <Card key={vac.Id} className={`relative p-6 border-t-4 transition-all ${selectedIds.includes(vac.Id) ? 'border-emerald-500 bg-emerald-50/20' : 'border-t-emerald-500 bg-white'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">
                                            {emp?.Name.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{emp?.Name || "Funcionário " + vac.EmployeeId}</h3>
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">ID {vac.EmployeeId}</span>
                                        </div>
                                    </div>
                                    <Checkbox 
                                        checked={selectedIds.includes(vac.Id)} 
                                        onCheckedChange={() => setSelectedIds(prev => prev.includes(vac.Id) ? prev.filter(x => x !== vac.Id) : [...prev, vac.Id])}
                                    />
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2 font-mono text-xs">
                                    <CalendarIcon size={14} className="text-slate-400" />
                                    <span className="font-black text-slate-700">{fmtDate(vac.StartDate)}</span>
                                    <span className="text-slate-300">➜</span>
                                    <span className="font-black text-slate-700">{fmtDate(vac.EndDate)}</span>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}