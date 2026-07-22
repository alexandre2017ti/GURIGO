const listeners = new Set();

const eventNames = [
    'data-received', 'stores-loaded', 'employees-loaded', 
    'time-records-loaded', 'timesheet-report-loaded', 
    'kiosk-set-success', 'db-config-success', 'db-config-error', 
    'force-setup-screen', 'app-ready', 'weekly-grid-loaded',
    'justifications-loaded', 'justification-image-loaded',
    'dashboard-stats-loaded', 'departments-loaded', 
    'status-updated-success', 'error-occurred'
];

const masterHandler = (event) => {
    const response = event.detail;
    if (response) {
        listeners.forEach(callback => callback(response));
    }
};

eventNames.forEach(eventName => {
    window.addEventListener(eventName, masterHandler);
});

export const api = {
    send: (actionName, data = null) => {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
                action: actionName,
                data: data
            });
        } else {
            console.warn(`🖥️ [Modo Web] Mensagem: ${actionName}`, data);
        }
    },

    onDataReceived: (callback) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
    }
};