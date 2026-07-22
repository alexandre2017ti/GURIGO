import React, { useState } from 'react';

const ImportPointModal = ({ employees, onClose }) => {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [rawText, setRawText] = useState('');
    const [loading, setLoading] = useState(false);

    const handleImport = () => {
        if (!selectedEmployee || !rawText) {
            alert("Selecione um funcionário e cole os dados!");
            return;
        }

        setLoading(true);
        
        // Envia para o C# (MainWindow.xaml.cs)
        window.chrome.webview.postMessage({
            type: "IMPORT_PONTO_TEXTO",
            employeeId: parseInt(selectedEmployee),
            texto: rawText
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Importar Histórico de Ponto</h2>
                
                <label>Selecione o Colaborador:</label>
                <select 
                    value={selectedEmployee} 
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                    <option value="">Selecione...</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                </select>

                <label>Cole aqui os dados da folha (Texto Bruto):</label>
                <textarea 
                    rows="10" 
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Ex: 02/02 segunda-feira 06:30 11:15..."
                />

                <div className="modal-actions">
                    <button onClick={onClose} disabled={loading}>Cancelar</button>
                    <button onClick={handleImport} disabled={loading}>
                        {loading ? 'Processando...' : 'Iniciar Importação'}
                    </button>
                </div>
            </div>
        </div>
    );
};