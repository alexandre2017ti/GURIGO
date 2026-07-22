import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { api } from "@/services/api";
import { Card, Button, Input, Label } from "@/components/ui";
import { Layers, Plus, Trash2, ArrowLeft, ShieldAlert } from "lucide-react";

export default function DepartmentsConfig() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [newDept, setNewDept] = useState("");

    useEffect(() => {
        const handleData = (res) => {
            if (res.type === "departments-loaded") {
                console.log("📦 Dados recebidos do C#:", res.data);
                
                const rawData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                
                // NORMALIZAÇÃO: Convertemos tudo para Maiúsculo para manter o seu padrão de código
                const normalized = rawData.map(d => ({
                    Id: d.id ?? d.Id, // Tenta pegar minúsculo (que é o que está vindo) ou maiúsculo
                    Name: d.name ?? d.Name
                }));
                
                setDepartments(normalized);
            }

            if (res.type === "db-config-success") {
                api.send("GET_DEPARTMENTS");
                setNewDept("");
            }

            if (res.type === "dept-usage-checked") {
                const finalData = res.data?.data || res.data;
                const name = finalData?.Name || finalData?.name;
                const count = finalData?.Count ?? finalData?.count ?? 0;

                if (count > 0) {
                    alert(`⚠️ BLOQUEADO!\n\nO setor "${name}" está em uso por ${count} funcionário(s).\n\nAltere o cargo deles antes de deletar.`);
                } else {
                    if (confirm(`Confirmar exclusão do setor "${name}"?`)) {
                        api.send("DELETE_DEPARTMENT", { Name: name });
                    }
                }
            }
        };

        const cleanup = api.onDataReceived(handleData);
        api.send("GET_DEPARTMENTS");
        return () => cleanup();
    }, []);

    const handleSave = () => {
        if (!newDept.trim()) return;

        const exists = departments.some(d => d.Name?.toLowerCase() === newDept.trim().toLowerCase());
        if (exists) {
            alert("Este setor já está cadastrado.");
            return;
        }

        api.send("SAVE_DEPARTMENT", { Name: newDept.trim() });
    };

    const handleDeleteAttempt = (deptName) => {
        if (!deptName) return;
        api.send("CHECK_DEPT_USAGE", { Name: deptName });
    };

    return (
        <div className="p-8 space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center mb-2">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/employees")}
                    className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all gap-2"
                >
                    <ArrowLeft size={18} /> Voltar para Equipe
                </Button>
            </div>

            <Card className="p-6 space-y-6 shadow-xl border-slate-200">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2">
                        <Layers className="text-indigo-500" size={24} />
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Setores do Ramo</h2>
                            <p className="text-xs text-slate-500">Organize os departamentos da sua empresa.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Nome do Novo Setor</Label>
                        <Input
                            placeholder="Ex: Faturamento, Cozinha, Administrativo..."
                            value={newDept}
                            onChange={(e) => setNewDept(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            className="bg-white shadow-sm"
                        />
                    </div>
                    <Button onClick={handleSave} className="self-end gap-2 bg-indigo-600 hover:bg-indigo-700 h-10 px-6">
                        <Plus size={18} /> Cadastrar
                    </Button>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        Setores Ativos <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{departments.length}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {departments.length === 0 ? (
                            <div className="col-span-full py-10 text-center border border-dashed rounded-lg text-slate-400 text-sm italic">
                                Nenhum setor cadastrado ainda.
                            </div>
                        ) : (
                            departments.map((dept) => (
                                <div
                                    key={dept.Id} // Agora 'Id' está garantido pela normalização
                                    className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 group hover:border-indigo-300 hover:shadow-sm transition-all"
                                >
                                    <span className="font-medium text-slate-700 truncate">
                                        {dept.Name} 
                                    </span>
                                    <button
                                        onClick={() => handleDeleteAttempt(dept.Name)}
                                        className="text-slate-300 hover:text-red-500 p-1.5 rounded-md transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Card>

            <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <ShieldAlert className="text-amber-500 shrink-0" size={18} />
                <p className="text-xs text-amber-700">
                    <strong>Regra de Integridade:</strong> Setores em uso por funcionários não podem ser excluídos.
                </p>
            </div>
        </div>
    );
}