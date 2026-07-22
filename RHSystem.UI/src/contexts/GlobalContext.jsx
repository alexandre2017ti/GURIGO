import React, { createContext, useState, useEffect } from 'react';
import { api } from '@/services/api';

// Cria o reservatório
export const GlobalContext = createContext();

export function GlobalProvider({ children }) {
    const [employees, setEmployees] = useState([]);
    const [stores, setStores] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Busca tudo apenas UMA VEZ quando o sistema abre
    useEffect(() => {
        const handleData = (res) => {
            const unpack = (d) => Array.isArray(d) ? d : (d?.data || []);

            if (res.type === "employees-loaded") {
                const normalized = unpack(res.data).map(emp => ({
                    ...emp,
                    Id: emp.id ?? emp.Id,
                    Name: emp.name ?? emp.Name,
                    StoreId: emp.storeId ?? emp.StoreId,
                    Role: emp.role ?? emp.Role
                }));
                setEmployees(normalized);
            }
            
            if (res.type === "stores-loaded") {
                setStores(unpack(res.data).map(s => ({
                    ...s, Id: s.Id ?? s.id, Name: s.Name ?? s.name 
                })));
            }

            if (res.type === "departments-loaded") {
                setDepartments(unpack(res.data).map(d => ({
                    ...d, Id: d.Id ?? d.id, Name: d.Name ?? d.name
                })));
            }
        };

        const cleanup = api.onDataReceived(handleData);

        // Dispara os pedidos iniciais
        api.send("GET_STORES");
        api.send("GET_DEPARTMENTS");
        api.send("GET_EMPLOYEES");

        return () => cleanup();
    }, []);

    // A função refresh permite que uma tela force a atualização (ex: ao cadastrar alguém novo)
    const refreshData = () => {
        api.send("GET_EMPLOYEES");
    };

    return (
        <GlobalContext.Provider value={{ employees, stores, departments, refreshData }}>
            {children}
        </GlobalContext.Provider>
    );
}