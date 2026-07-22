import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { Button, Checkbox, Input, Dialog, DialogContent } from "@/components/ui"; 
import { 
    UserPlus, Trash2, RefreshCw, Edit2, 
    Eye, EyeOff, Layers, Phone, MapPin, Search, Printer 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmployeeForm from "./EmployeeForm";
import { cn } from "@/lib/utils";
import PrintableTimesheet from "@/components/PrintableTimesheet";

export default function Employees() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [stores, setStores] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [showInactives, setShowInactives] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [terminationReportData, setTerminationReportData] = useState(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // 1. Efeito de Inicialização e Listener de Dados
    useEffect(() => {
        const handleData = (res) => {
            const getSafeList = (data) => Array.isArray(data) ? data : (data?.data || []);
            
            if (res.type === "stores-loaded") {
                setStores(getSafeList(res.data).map(s => ({ 
                    Id: s.Id ?? s.id, 
                    Name: s.Name ?? s.name 
                })));
            }

            if (res.type === "departments-loaded") {
                setDepartments(getSafeList(res.data).map(d => ({
                    Id: d.Id ?? d.id,
                    Name: d.Name ?? d.name
                })));
            }

            // ✨ FIX 1: Agora aceita AMBAS as listas (Ativos e Inativos) do C#
            if (res.type === "employees-loaded" || res.type === "inactive-employees-loaded") {
                const rawData = getSafeList(res.data);
                const normalized = rawData.map(emp => ({
                    ...emp,
                    Id: emp.id ?? emp.Id,
                    Name: emp.name ?? emp.Name,
                    Role: emp.role ?? emp.Role,
                    StoreId: emp.storeId ?? emp.StoreId,
                    IsActive: emp.isActive ?? emp.IsActive ?? true,
                    Phone: emp.phone ?? emp.Phone ?? "",
                    SendToAccounting: emp.sendToAccounting ?? emp.SendToAccounting ?? false,
                    CanPunchInAnyStore: emp.canPunchInAnyStore ?? emp.CanPunchInAnyStore ?? false
                    
                }));
                setEmployees(normalized);
            }
            if (res.type === "print-termination-report") {
                        setTerminationReportData(res.data);
                        setIsPrintModalOpen(true);
                    }

        if (res.type === "db-config-success") {
                // ✨ FIX 2: Ao salvar ou reativar, recarrega a lista correta
                if (showInactives) {
                    api.send("GET_INACTIVE_EMPLOYEES");
                } else {
                    api.send("GET_EMPLOYEES");
                }
                setSelectedIds([]);
                setIsFormOpen(false);
            }
        };

        const cleanup = api.onDataReceived(handleData);
        api.send("GET_STORES"); 
        api.send("GET_DEPARTMENTS");
        // O GET_EMPLOYEES foi movido para o useEffect abaixo!
        
        return () => cleanup();
    }, [showInactives]); // Adicionamos showInactives como dependência para o sucesso recarregar certo

    // ✨ FIX 3: O Gatilho que muda de aba e pede os dados pro Banco
    useEffect(() => {
        setEmployees([]); // Limpa a tela rapidamente para dar efeito de loading
        if (showInactives) {
            api.send("GET_INACTIVE_EMPLOYEES");
        } else {
            api.send("GET_EMPLOYEES");
        }
    }, [showInactives]);

    const filteredEmployees = useMemo(() => {
        return employees
            .filter(e => {
                // Mantemos este filtro por segurança, mas o banco já está mandando a lista certa
                const matchesStatus = Boolean(e.IsActive) === !showInactives;
                const matchesSearch = e.Name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                     (e.Role || "").toLowerCase().includes(searchTerm.toLowerCase());
                return matchesStatus && matchesSearch;
            })
            .map(emp => {
                const storeObj = stores.find(s => String(s.Id) === String(emp.StoreId));
                return {
                    ...emp,
                    StoreName: storeObj ? storeObj.Name : "Loja não definida"
                };
            });
    }, [employees, showInactives, searchTerm, stores]);

    const handleToggleStatus = () => {
        if (selectedIds.length === 0) return;
        
        const action = showInactives ? "REACTIVATE_EMPLOYEES" : "DELETE_EMPLOYEES";
        const label = showInactives ? 'Reativar' : 'Inativar';
        
        if (window.confirm(`Deseja ${label} ${selectedIds.length} colaborador(es)?`)) {
            api.send(action, selectedIds); 
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        {showInactives ? <EyeOff className="text-slate-400" /> : <Eye className="text-indigo-600" />}
                        {showInactives ? "Equipe Inativa" : "Gestão de Equipe"}
                    </h1>
                    <p className="text-xs text-slate-400 italic">{filteredEmployees.length} registros encontrados</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate("/employees/departments")} className="text-indigo-600 border-indigo-100">
                        <Layers size={18} className="mr-2" /> Setores
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowInactives(!showInactives); setSelectedIds([]); }}>
                        {showInactives ? "Ver Ativos" : "Ver Inativos"}
                    </Button>
                    {selectedIds.length > 0 && (
                        <Button onClick={handleToggleStatus} variant={showInactives ? "default" : "destructive"} className={cn("shadow-lg", showInactives && "bg-emerald-600")}>
                            {showInactives ? <RefreshCw size={18} className="mr-2" /> : <Trash2 size={18} className="mr-2" />}
                            {selectedIds.length} Selecionado(s)
                        </Button>
                    )}
                    {!showInactives && (
                        <Button onClick={() => { setEditingEmp(null); setIsFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                            <UserPlus size={18} className="mr-2" /> Novo Funcionário
                        </Button>
                    )}
                </div>
            </div>

            {/* BARRA DE PESQUISA */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                    placeholder="Buscar por nome ou setor..." 
                    className="pl-10 h-11 bg-white shadow-sm" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>

            {/* GRID DE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl text-slate-400 italic">
                        Nenhum colaborador encontrado nesta categoria.
                    </div>
                ) : (
                    filteredEmployees.map((emp) => (
                        <div 
                            key={emp.Id} 
                            className={cn(
                                "relative group border p-5 rounded-2xl transition-all bg-white hover:shadow-md",
                                selectedIds.includes(emp.Id) ? "border-indigo-500 ring-2 ring-indigo-50" : "border-slate-100"
                            )}
                        >
                            <div className="absolute top-5 left-5 z-10">
                                <Checkbox 
                                    checked={selectedIds.includes(emp.Id)} 
                                    onCheckedChange={() => toggleSelect(emp.Id)} 
                                />
                            </div>

                            <div className="pl-10 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="max-w-[150px]">
                                        <h3 className="font-bold text-slate-800 truncate" title={emp.Name}>{emp.Name}</h3>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                            {emp.Role || "SEM SETOR"}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        {emp.SendToAccounting && (
                                            <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold">CONTÁBIL</span>
                                        )}
                                        {/* Removido o badge REDE duplicado que tinha aqui */}
                                        {emp.CanPunchInAnyStore && (
                                            <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded-full font-bold">REDE</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                                    <span className="flex items-center gap-2">
                                        <Phone size={14} className="text-slate-300"/> 
                                        {emp.Phone || "---"}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <MapPin size={14} className="text-slate-300"/> 
                                        {emp.StoreName}
                                    </span>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => { setEditingEmp(emp); setIsFormOpen(true); }} 
                                        className="h-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    >
                                        <Edit2 size={14} className="mr-2" /> Detalhes
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isFormOpen && (
                <EmployeeForm 
                    employee={editingEmp} 
                    stores={stores} 
                    departments={departments} 
                    onCancel={() => setIsFormOpen(false)} 
                />
            )}
            **
            {isPrintModalOpen && terminationReportData && (
                <Dialog open={true} onOpenChange={() => setIsPrintModalOpen(false)}>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-slate-100 p-8 border-none print:p-0 print:m-0 print:max-w-none print:max-h-none print:overflow-visible">
                        
                        {/* BOTÕES - A classe no-print é vital aqui */}
                        <div className="flex justify-between items-center mb-6 no-print print:hidden">
                            <h2 className="text-xl font-bold">Relatório de Desligamento</h2>
                            <Button onClick={() => window.print()} className="bg-indigo-600 text-white">
                                <Printer size={18} className="mr-2" /> Imprimir
                            </Button>
                        </div>

                        {/* O PAPEL - Adicione a classe print-container aqui */}
                        <div className="bg-white p-0 shadow-2xl print:shadow-none print:p-0">
                            <PrintableTimesheet 
                                report={terminationReportData} 
                                isFromModal={true} 
                            />
                        </div>

                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}