import React, { useMemo } from 'react';
import { Clock, AlertTriangle, Coffee } from 'lucide-react';

export default function ShiftCalculator({ h1, h2, h3, h4 }) {
    // Função interna de cálculo de minutos
    const calculateMinutes = (start, end) => {
        if (!start || !end || start === "" || end === "") return 0;
        try {
            const [h1, m1] = start.split(':').map(Number);
            const [h2, m2] = end.split(':').map(Number);
            let startMins = h1 * 60 + m1;
            let endMins = h2 * 60 + m2;
            if (endMins < startMins) endMins += 24 * 60; // Trata virada de noite
            return endMins - startMins;
        } catch (e) { return 0; }
    };

    const formatDisplay = (totalMinutes) => {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Cálculos reativos
    const p1 = useMemo(() => calculateMinutes(h1, h2), [h1, h2]);
    const p2 = useMemo(() => calculateMinutes(h3, h4), [h3, h4]);
    const interval = useMemo(() => calculateMinutes(h2, h3), [h2, h3]);
    const total = p1 + p2;

    // Alerta de jornada excessiva (> 08:48)
    const isOvertime = total > 528;

    return (
        <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="grid grid-cols-3 gap-3">
                {/* Período 1 */}
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Período 1</span>
                    <span className="text-sm font-black text-slate-700">{formatDisplay(p1)}</span>
                </div>

                {/* Intervalo */}
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                        <Coffee size={10} /> Intervalo
                    </span>
                    <span className="text-sm font-black text-slate-500">{formatDisplay(interval)}</span>
                </div>

                {/* Período 2 */}
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Período 2</span>
                    <span className="text-sm font-black text-slate-700">{formatDisplay(p2)}</span>
                </div>
            </div>

            {/* Somatória Total com Destaque */}
            <div className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                isOvertime ? 'bg-rose-50 border-rose-200 shadow-rose-100' : 'bg-indigo-600 border-indigo-700 shadow-indigo-100'
            }`}>
                <div className="flex items-center gap-2">
                    <Clock size={16} className={isOvertime ? 'text-rose-600' : 'text-indigo-200'} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                        isOvertime ? 'text-rose-700' : 'text-white'
                    }`}>Jornada Total</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-black ${isOvertime ? 'text-rose-700' : 'text-white'}`}>
                        {formatDisplay(total)}
                    </span>
                    <span className={`text-[10px] font-bold ${isOvertime ? 'text-rose-400' : 'text-indigo-300'}`}>h</span>
                </div>
            </div>

            {isOvertime && (
                <div className="flex items-center gap-2 px-3 py-2 bg-rose-600 rounded-xl animate-in slide-in-from-top-2">
                    <AlertTriangle size={14} className="text-white" />
                    <p className="text-[9px] font-black text-white uppercase tracking-tight">
                        Carga horária excede o limite padrão (08:48)
                    </p>
                </div>
            )}
        </div>
    );
}