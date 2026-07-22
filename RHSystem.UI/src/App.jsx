import React, { useState, useEffect, useCallback, useRef } from "react";
import { HashRouter as Router, Routes, Route, useNavigate, Link } from "react-router-dom";
import { api } from "@/services/api";
import { GlobalProvider } from "@/contexts/GlobalContext";

// Layouts e Páginas
import MainLayout from "@/components/MainLayout";
import DebugTools from "@/components/DebugTools";
import Dashboard from "@/pages/Dashboard";
import Setup from "@/pages/Setup";
import Stores from "@/pages/Stores";
import Employees from "@/pages/Employees";
import DepartmentsConfig from "@/pages/DepartmentsConfig";
import TimeTracking from "@/pages/TimeTracking";
import Timesheet from "@/pages/Timesheet";
import Vacations from "@/pages/Vacations";
import Schedules from "@/pages/Schedules";
import JustificationAdmin from "@/pages/JustificationAdmin";
import Kiosk from "@/pages/Kiosk";
import WeeklyGrid from "@/pages/WeeklyGrid";
import Settings from "@/pages/Settings";

// UI Components
import LoadingScreen from "@/components/ui/LoadingScreen"; 

function AppRoutes() {
    const navigate = useNavigate();
    const [kioskConfig, setKioskConfig] = useState({ name: "", code: "" });
    const [isSyncing, setIsSyncing] = useState(true);
    const [syncMessage, setSyncMessage] = useState("Iniciando sistema...");
    
    // Refs para controle sem re-render
    const initialized = useRef(false);
    const listenerRegistered = useRef(false);

    const handleNavigation = useCallback((data) => {
        // Se já navegamos, não faz nada
        if (initialized.current) return;
        
        const { dbConfigured, appMode, storeName, storeCode } = data;
        
        if (!dbConfigured) {
            navigate("/setup");
        } else if (appMode === "Kiosk") {
            setKioskConfig({ name: storeName, code: storeCode });
            navigate("/kiosk");
        } else {
            const currentHash = window.location.hash;
            if (currentHash.includes("kiosk") || currentHash.includes("setup") || currentHash === "#/") {
                navigate("/");
            }
        }
        
        initialized.current = true; // MARCA COMO FINALIZADO
        setIsSyncing(false); 
    }, [navigate]);

    useEffect(() => {
        // Bloqueio para não registrar o listener mais de uma vez
        if (listenerRegistered.current) return;
        listenerRegistered.current = true;

        console.log("🛠️ Registrando listener único de sistema...");

        // Consolidamos toda a escuta aqui
        const handleData = (res) => {
            
            // 1. O C# avisou expressamente que falta o banco!
            if (res.type === "db-not-configured") {
                console.warn("⚠️ Banco não configurado! Redirecionando para a tela de Setup...");
                initialized.current = true; // Marca como inicializado para o setInterval parar
                setIsSyncing(false); // Desliga a tela de loading
                navigate('/setup'); // Força a rota do React Router
                return;
            }

            // 2. Status de carregamento do C#
            if (res.type === "loading-status" && !initialized.current) {
                setSyncMessage(res.data);
                return;
            }

            // 3. Sistema pronto ou enviando status completo
            if (res.type === "app-ready" || res.type === "system-status") {
                if (!initialized.current) {
                    if (res.type === "system-status") {
                        handleNavigation(res.data);
                    } else {
                        // Se mandou app-ready, pedimos o status completo para o handleNavigation
                        api.send("CHECK_SYSTEM_STATUS");
                    }
                }
                return;
            }

            // 4. Alertas gerais do sistema
            if (res.type === "employees-late-alert") {
                const names = res.data?.names || [];
                if (names.length > 0) alert(`⏰ ALERTA: ${names.join(', ')}`);
            }
        };

        // Registra o nosso handler unificado
        const cleanup = api.onDataReceived(handleData);
        

        // Handshake: tenta até o back-end responder ou o sistema inicializar
        const interval = setInterval(() => {
            if (!initialized.current) {
                api.send("CHECK_SYSTEM_STATUS");
            } else {
                clearInterval(interval);
            }
        }, 3000);

        return () => {
            cleanup();
            clearInterval(interval);
        };
    }, [handleNavigation, navigate]); // Adicionado navigate nas dependências

    // Renderização da Tela de Carregamento
    if (isSyncing) {
        return <LoadingScreen message={syncMessage} />;
    }
    return (
        <GlobalProvider>
            <Routes>
                <Route path="/setup" element={<Setup />} />
                <Route
                    path="/kiosk"
                    element={
                        <Kiosk 
                            storeName={kioskConfig.name} 
                            storeCode={kioskConfig.code} 
                            storeId={kioskConfig.id} />}
                            />

                <Route path="*" element={
                    <MainLayout>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/employees" element={<Employees />} />
                            <Route path="/employees/departments" element={<DepartmentsConfig />} />
                            <Route path="/stores" element={<Stores />} />
                            <Route path="/ponto" element={<TimeTracking />} />
                            <Route path="/espelho-ponto" element={<Timesheet />} />
                            <Route path="/vacations" element={<Vacations />} />
                            <Route path="/admin/atestados" element={<JustificationAdmin />} />
                            <Route path="/schedules" element={<Schedules />} />
                            <Route path="/schedules/grade" element={<WeeklyGrid />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </GlobalProvider>
    );
}

function App() {
    return (
        <Router> 
            <AppRoutes />
            <DebugTools />
        </Router>
    );
}

export default App;