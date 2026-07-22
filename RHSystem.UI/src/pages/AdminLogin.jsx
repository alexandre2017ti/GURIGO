import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Card, Input, Button } from "@/components/ui";
import { Lock, ShieldAlert } from "lucide-react"; // Removi Terminal e Copy

export default function AdminLogin() {
    const [pass, setPass] = useState("");
    const [error, setError] = useState(false);

    // --- REMOVIDO: Estados e Funções de DevTools ---

    const handleLogin = (e) => {
        e.preventDefault();
        api.send("REQUEST_ADMIN_UNLOCK", { password: pass });
    };

    useEffect(() => {
        const handleData = (res) => {
            if (res.type === "admin-unlock-success") {
                window.location.reload();
            }
            else if (res.type === "admin-unlock-error") {
                setError(true);
                setPass("");
            }
        };

        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 gap-8">

            {/* --- CARD DE LOGIN PRINCIPAL --- */}
            <Card className="w-full max-w-md p-8 bg-white border-t-4 border-red-500 shadow-2xl relative">
                <div className="text-center mb-6">
                    <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-red-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        Sistema bloqueado por segurança.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <Input
                            type="password"
                            placeholder="Senha de Administrador"
                            value={pass}
                            onChange={(e) => { setPass(e.target.value); setError(false); }}
                            className="text-center text-lg h-12"
                            autoFocus
                        />
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm mt-2 justify-center animate-pulse">
                                <ShieldAlert size={16} /> Senha incorreta
                            </div>
                        )}
                    </div>
                    <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-lg">
                        Destravar Sistema
                    </Button>
                </form>
            </Card>
        </div>
    );
}