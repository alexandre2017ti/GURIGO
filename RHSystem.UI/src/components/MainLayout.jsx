import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { toast } from "sonner"; 
import {
    LayoutDashboard, Users, Clock, Building2,
    Calendar, Palmtree, FileText, ChevronDown, ChevronRight, LayoutGrid, AlertCircle,
    ShieldCheck, Settings as SettingsIcon
} from "lucide-react";
import GuriGoLogo from "./ui/RhLogo"; // Import corrigido

const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Funcionários", icon: Users, path: "/employees" },
    { name: "Lojas", icon: Building2, path: "/stores" },
    { name: "Histórico de Ponto", icon: Clock, path: "/ponto" },
    { name: "Gestão de Atestados", icon: ShieldCheck, path: "/admin/atestados" },
    { name: "Espelho Mensal", icon: FileText, path: "/espelho-ponto" },
    { name: "Férias", icon: Palmtree, path: "/vacations" },
    { name: "Configurações", icon: SettingsIcon, path: "/settings" },
];

export default function MainLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [scalesOpen, setScalesOpen] = useState(location.pathname.includes("/schedules"));

        // --- LÓGICA DE MONITORAMENTO DE ATRASOS (Toast) ---
    useEffect(() => {
        const handlePunctuality = (res) => {
            if (res.type === "delay-notification") {
                // Se a lista vier vazia, não faz nada ou apenas loga
                if (!res.data || res.data.length === 0) return;

                res.data.forEach(emp => {
                    toast.error("Alerta de Atraso", {
                        description: `${emp.Name} deveria ter entrado às ${emp.Expected}.`,
                        icon: <AlertCircle className="text-red-500" />,
                        action: {
                            label: "Ver Ponto",
                            onClick: () => navigate("/ponto") // Agora o RH clica e já vai corrigir
                        },
                        duration: 8000,
                    });
                });
            }
        };

        const cleanup = api.onDataReceived(handlePunctuality);
        
        // Roda a checagem automática
        //api.send("CHECK_DELAYS");
        const interval = setInterval(() => api.send("CHECK_DELAYS"), 300000); // 5 min

        return () => {
            cleanup();
            clearInterval(interval);
        };
    }, [navigate]);

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {/* Sidebar Fixa */}
            <aside className="w-64 md:w-72 bg-white border-r border-slate-200 p-4 flex flex-col shrink-0 z-10 shadow-sm relative">
                <div className="px-6 py-8 flex justify-center">
                    <GuriGoLogo size={50} showText={true} />
                </div>

                <nav className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Itens Estáticos */}
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                                    isActive
                                        ? "bg-indigo-50 text-indigo-600 font-bold shadow-sm ring-1 ring-indigo-100"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <item.icon
                                    size={20}
                                    className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}
                                />
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        );
                    })}

                    {/* Submenu Escalas (Diferenciado) */}
                    <div className="space-y-1 pt-2 border-t border-slate-100 mt-2">
                        <button
                            onClick={() => setScalesOpen(!scalesOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                                location.pathname.includes("/schedules")
                                    ? "bg-slate-50 text-indigo-700 font-bold"
                                    : "text-slate-500 hover:bg-slate-50"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Calendar size={20} className={location.pathname.includes("/schedules") ? "text-indigo-600" : "text-slate-400"} />
                                <span className="text-sm">Gestão de Escalas</span>
                            </div>
                            {scalesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {scalesOpen && (
                            <div className="ml-9 flex flex-col gap-1 border-l-2 border-slate-100 pl-2 animate-in slide-in-from-top-2">
                                <Link
                                    to="/schedules"
                                    className={`text-sm py-2 px-3 rounded-lg transition-colors flex items-center gap-2 ${
                                        location.pathname === "/schedules"
                                            ? "text-indigo-600 bg-indigo-50/50 font-bold"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                                >
                                    <Clock size={14} /> Configurar Horários
                                </Link>
                                <Link
                                    to="/schedules/grade"
                                    className={`text-sm py-2 px-3 rounded-lg transition-colors flex items-center gap-2 ${
                                        location.pathname === "/schedules/grade"
                                            ? "text-indigo-600 bg-indigo-50/50 font-bold"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                                >
                                    <LayoutGrid size={14} /> Grade Semanal
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="text-[10px] uppercase tracking-tighter text-slate-400 text-center mt-auto pt-4 border-t border-slate-100">
                    RH Eficiente v1.1.0
                </div>
            </aside>

            {/* Área de Conteúdo */}
            {/* Aqui o 'w-full' força o conteúdo a crescer todo o espaço disponível restante */}
            <main className="flex-1 w-full overflow-y-auto h-full relative">
                {children}
            </main>
        </div>
    );
}