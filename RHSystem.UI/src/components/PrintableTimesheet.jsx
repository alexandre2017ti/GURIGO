import React from 'react';

// ✨ ADICIONAMOS A PROP "isFromModal" AQUI (o padrão é false)
export default function PrintableTimesheet({ report, onRowClick, year, isFromModal = false }) {
    if (!report) return null;

    return (
        <> 
<style dangerouslySetInnerHTML={{ __html: `
    @media print {
        @page { 
            size: A4 portrait; 
            margin: 0 60px !important; 
        }

        /* ✨ O SEGREDO PARA MATAR O BURACO GIGANTE ✨ */
        /* Zera o alinhamento que o Modal usa para ficar no meio da tela */
        div[role="dialog"], [data-state="open"] {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important; /* Isso puxa o documento pro topo da folha */
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
        }

        /* ✨ A MÁGICA AQUI: Só esconde o #root se vier de um Modal (Rescisão) */
        ${isFromModal ? `
        #root {
            display: none !important;
        }
        ` : ''}

        html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
        }

        .print-container {
            padding-top: 15px !important;
            width: 100% !important;
        }

        /* ✨ TUDO PRETO E TRANSPARENTE */
        *, table, tr, td, th, span, h1, h2, h3, p {
            background-color: transparent !important;
            color: #000000 !important;
            border-color: #000000 !important;
            box-shadow: none !important;
        }

        table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin-bottom: 5px !important;
        }

        td, th {
            font-size: 8.5pt !important;
            padding: 3px 2px !important; 
            line-height: 1 !important;
            border: 1px solid #000 !important;
        }

        /* Esconde os botões de fechar/imprimir */
        nav, aside, header, footer, button, .no-print { 
            display: none !important; 
            height: 0 !important;
        }

        .signatures-container {
            margin-top: 10px !important;
        }
    }
`}} />

            <div className="print-container bg-white text-black font-sans w-full max-w-[21cm] mx-auto p-10 border-2 border-slate-100 print:p-0 print:border-none relative shadow-2xl">
                
                {/* ALERTA DE BENEFÍCIO LACTANTE */}
                {report.isBreastfeeding && (
                    <div className="mb-2 p-2 border-l-4 border-rose-500 bg-rose-50 flex items-center gap-2 print:border-black print:bg-transparent">
                        <span className="text-lg">👶</span>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-rose-600 print:text-black leading-none">Benefício Amamentação Ativo</span>
                            <span className="text-[7px] font-bold text-rose-800 print:text-black leading-tight mt-0.5">
                                Jornada reduzida em 1 hora diária conforme Art. 396 da CLT.
                            </span>
                        </div>
                    </div>
                )}

                {/* ALERTA DE RESCISÃO */}
                {report.resignationDate && report.resignationDate !== "---" && (
                    <div className="mb-2 text-center border-b-2 border-red-500 pb-2">
                        <h2 className="text-xl font-black text-red-600 uppercase">Espelho de Ponto - Rescisão</h2>
                        <p className="font-bold text-red-800">Desligamento em: {report.resignationDate}</p>
                    </div>
                )}

                {/* CABEÇALHO DO DOCUMENTO */}
                <div className="border-b-2 border-black pb-2 mb-2">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Folha de Ponto</h1>
                            <p className="text-[10px] font-bold uppercase mt-1">{report.razaoSocial}</p>
                            <p className="text-[8px] font-bold text-slate-600 print:text-black mt-0.5">CNPJ: {report.cnpj}</p>
                            {report.isServiceProvider && (
                                <p className="text-[7px] font-black text-slate-500 print:text-black uppercase mt-0.5 leading-none">
                                    LOTAÇÃO: {report.storeName}
                                </p>
                            )}
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <span className="text-[5px] font-black text-slate-400 uppercase leading-none mb-1">Competência</span>
                            <span className="text-lg font-mono font-black border-2 border-black px-2 py-0.5 rounded-md inline-block leading-none">
                                {report.month}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-[7px] uppercase font-bold">
                        <div className="col-span-2 border-l-2 border-slate-200 pl-2">
                            <span className="text-[6px] text-slate-400 block leading-none">Colaborador</span>
                            <span className="text-[9px] leading-tight">{report.employeeName}</span>
                        </div>
                        <div className="border-l-2 border-slate-200 pl-2">
                            <span className="text-[6px] text-slate-400 block leading-none">CPF</span>
                            <span className="text-[9px] leading-tight">{report.cpf || "---"}</span>
                        </div>
                        <div className="border-l-2 border-slate-200 pl-2">
                            <span className="text-[6px] text-slate-400 block leading-none font-black">CTPS / SÉRIE</span>
                            <span className="text-[9px] leading-tight font-bold">{report.ctps} / {report.serie}</span>
                        </div>
                        <div className="border-l-2 border-slate-200 pl-2">
                            <span className="text-[6px] text-slate-400 block leading-none">Admissão</span>
                            <span className="text-[9px] leading-tight">{report.admissionDate}</span>
                        </div>
                        <div className="col-span-1 border-l-2 border-slate-200 pl-2">
                            <span className="text-[6px] text-slate-400 block leading-none">Cargo</span>
                            <span className="text-[9px] leading-tight font-black">{report.role}</span>
                        </div>
                        <div className="col-span-3 border-l-2 border-indigo-500 pl-2 print:border-slate-300">
                            <span className="text-indigo-600 block text-[6px] leading-none print:text-black font-black">Escala Prevista</span>
                            <span className="text-[8px] font-mono leading-tight">{report.scheduleHeader}</span>
                        </div>
                    </div>
                </div>

                {/* TABELA DE PONTO */}
{/* TABELA DE PONTO */}
                <div className="w-full mb-2">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-900 text-[6px] uppercase font-black text-slate-400 print:text-black">
                                <th className="py-1 px-1 text-center w-[7%]">Data</th>
                                <th className="py-1 px-1 text-left w-[7%]">Dia</th>
                                <th className="py-1 px-1 text-left w-[27%]">Marcações</th>
                                <th className="py-1 px-1 text-right w-[7%]">Prev.</th>
                                <th className="py-1 px-1 text-right w-[7%]">Trab.</th>
                                <th className="py-1 px-1 text-right w-[7%]">Extra</th>
                                <th className="py-1 px-1 text-right w-[7%]">Falta</th>
                                <th className="py-1 px-1 text-right w-[7%]">Atraso</th>
                                <th className="py-1 px-1 text-right w-[7%]">Feriado</th>
                                <th className="py-1 px-1 text-right w-[7%]">Abono</th> 
                                <th className="py-1 px-1 text-right w-[10%]">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="text-[7px]">
                            {report.lines?.map((line, idx) => {
                                
                                const isFolga = line.observation === "FOLGA" || line.observation === "FOLGA ESCALA";
                                const isFolgaComp = line.observation === "FOLGA COMPENSATÓRIA";
                                const isLactante = line.observation === "LACTANTE";
                                const isFerias = line.observation === "FÉRIAS"; 
                                const isLicenca = line.observation === "LICENÇA MATERNIDADE"; 
                                const isAtestado = line.observation?.startsWith("ATESTADO");
                                const isFaltaJust = line.observation?.startsWith("FALTA JUSTIFICADA");
                                const isFeriadoOff = line.observation === "FERIADO"; 
                                const isFeriadoTrab = line.observation === "FERIADO TRABALHADO";
                                const isAbono = line.observation?.startsWith("ABONO");
                                
                                // ✨ LÓGICA DE PRÉ-ADMISSÃO
                                let isNaoAdmitido = false;
                                if (report.admissionDate && report.admissionDate !== "---" && year) {
                                    const [admDia, admMes, admAno] = report.admissionDate.split('/');
                                    const dataAdmissao = new Date(admAno, admMes - 1, admDia);
                                    
                                    const [linhaDia, linhaMes] = line.dateFormatted.split('/');
                                    let anoLinha = year;
                                    if (linhaMes === "12" && report.month?.startsWith("01/")) anoLinha = year - 1;
                                    
                                    const dataLinha = new Date(anoLinha, linhaMes - 1, linhaDia);

                                    if (dataLinha < dataAdmissao) {
                                        isNaoAdmitido = true;
                                        line.observation = "NÃO ADMITIDO";
                                        line.expectedDaily = "---";
                                        line.totalHours = "---";
                                        line.extraHours = "---";
                                        line.absenceHours = "---";
                                        line.lateHours = "---";
                                        line.holidayHours = "---";
                                        line.abonoHours = "---";
                                        line.dailyBalance = "---";
                                    }
                                }

                                const isManualZero = isFolga || isFolgaComp || isFeriadoOff || isFerias || isLicenca || isNaoAdmitido;

                                let rowClass = "border-b border-slate-100 cursor-pointer transition-colors hover:bg-indigo-50/50 ";
                                let obsColor = "text-rose-600 font-black"; 

                                if (isNaoAdmitido) {
                                    rowClass += "bg-slate-100 opacity-60"; 
                                    obsColor = "text-[9px] text-slate-500 font-black tracking-widest";
                                } else if (isFerias) {
                                    rowClass += "bg-emerald-50/70 border-emerald-100 bg-ferias-print";
                                    obsColor = "text-[8px] text-emerald-600 font-black tracking-widest";
                                } else if (isLicenca) {
                                    rowClass += "bg-pink-50/70 border-pink-100 bg-licenca-print";
                                    obsColor = "text-[8px] text-pink-600 font-black tracking-widest";
                                } else if (isAtestado) {
                                    rowClass += "bg-teal-50 border-teal-100";
                                    obsColor = "text-[8px] text-teal-600 font-black tracking-widest";
                                } else if (isFaltaJust) {
                                    rowClass += "bg-lime-50/70 border-lime-100";
                                    obsColor = "text-[8px] text-lime-700 font-black tracking-widest";
                                } else if (isAbono) {
                                    rowClass += "bg-fuchsia-50/70 border-fuchsia-100";
                                    obsColor = "text-[8px] text-fuchsia-600 font-black tracking-widest";
                                } else if (isLactante) {
                                    rowClass += "bg-rose-50/40 bg-lactante-print";
                                    obsColor = "text-[8px] text-rose-500 font-black italic";
                                } else if (isFolga) {
                                    rowClass += "bg-sky-50 opacity-90 bg-folga-print";
                                    obsColor = "text-[10px] text-sky-600 italic font-bold";
                                } else if (isFolgaComp) {
                                    rowClass += "bg-amber-100";
                                    obsColor = "text-[8px] text-amber-900 font-black";
                                } else if (isFeriadoOff) {
                                    rowClass += "bg-blue-50/60";
                                    obsColor = "text-[8px] text-blue-600 font-black";
                                } else if (isFeriadoTrab) {
                                    rowClass += "bg-blue-100 border-blue-200";
                                    obsColor = "text-[8px] text-blue-800 font-black underline decoration-2 decoration-blue-400";
                                } else if (line.weekDayShort === "DOM") {
                                    rowClass += "bg-slate-50/30"; 
                                }

                                return (
                                    <tr 
                                        key={idx} 
                                        onClick={() => onRowClick && onRowClick(line.dateFormatted)} 
                                        className={rowClass}
                                    >
                                        <td className="py-[5px] px-1 text-center font-bold text-slate-400 print:text-black">{line.dateFormatted}</td>
                                        <td className="py-[5px] px-1 font-bold text-slate-600 uppercase print:text-black">{line.weekDayShort}</td>
                                        <td className="py-[5px] px-1 font-mono font-bold text-indigo-600 print:text-black">
                                            {isManualZero ? (
                                                <span className={obsColor}>{line.observation}</span>
                                            ) : line.observation ? (
                                                <span className="flex items-center gap-1.5 flex-wrap">
                                                    {line.punches?.length > 0 && <span className="text-indigo-600 print:text-black">{line.punches.join(" | ")}</span>}
                                                    {line.punches?.length > 0 && <span className="text-slate-800 font-black print:hidden"> / </span>}
                                                    <span className={obsColor}>{line.observation}</span>
                                                </span>
                                            ) : (
                                                line.punches?.length > 0 ? line.punches.join(" | ") : "---"
                                            )}
                                        </td>
                                        <td className="py-[3px] px-1 text-right font-mono text-slate-400 print:text-black leading-tight">{line.expectedDaily}</td>
                                        <td className="py-[3px] px-1 text-right font-mono font-black">{line.totalHours}</td>
                                        <td className="py-[3px] px-1 text-right font-mono text-emerald-600 print:text-black">{line.extraHours}</td>
                                        {/* ✨ AQUI ESTÃO AS COLUNAS SEPARADAS */}
                                        <td className="py-[3px] px-1 text-right font-mono text-rose-600 print:text-black">{line.absenceHours || ""}</td>
                                        <td className="py-[3px] px-1 text-right font-mono text-orange-500 print:text-black">{line.lateHours || ""}</td>
                                        <td className="py-[3px] px-1 text-right font-mono text-blue-600 print:text-black">{line.holidayHours || ""}</td>
                                        <td className="py-[3px] px-1 text-right font-mono text-fuchsia-600 print:text-black">{line.abonoHours || ""}</td>
                                        
                                        <td className={`py-[3px] px-1 text-right font-mono font-bold ${line.isPositive ? 'text-emerald-600' : 'text-rose-500'} print:text-black`}>
                                            {line.dailyBalance}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* BOX DE TOTAIS */}
                {/* BOX DE TOTAIS */}
                <div className="totals-box p-3 border-2 border-black rounded-xl grid grid-cols-9 gap-1 text-center bg-white print:break-inside-avoid print:mt-1">
                    <div>
                        <p className="text-[5px] uppercase font-black text-slate-800 print:text-black">Previsto</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black print:text-[10px]">{report.totalExpected}</p>
                    </div>
                    <div className="border-l border-slate-200">
                        <p className="text-[5px] uppercase font-black text-slate-800 print:text-black">Trabalhado</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black print:text-[10px]">{report.totalWorked}</p>
                    </div>
                    <div className="border-l border-slate-200 bg-indigo-50/30 print:bg-transparent">
                        <p className="text-[5px] uppercase font-black text-indigo-500 print:text-black">HE (Até 2h)</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black text-indigo-700 print:text-black">{report.totalExtras50}</p>
                    </div>
                    <div className="border-l border-slate-200 bg-amber-50/30 print:bg-transparent">
                        <p className="text-[5px] uppercase font-black text-amber-900 print:text-black">HE (&gt; 2h)</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black text-amber-800 print:text-black">{report.totalExtras100}</p>
                    </div>
                    <div className="border-l border-slate-200 bg-blue-50/30 print:bg-transparent">
                        <p className="text-[5px] uppercase font-black text-blue-800 print:text-black">Feriado</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black text-blue-950 print:text-black">{report.totalHoliday}</p>
                    </div>
                    <div className="border-l border-slate-200">
                        <p className="text-[5px] uppercase font-black text-slate-400 print:text-black">Faltas</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black text-rose-600 print:text-black">{report.totalAbsences}</p>
                    </div>
                    
                    {/* ✨ NOVO: BOX DE ATRASOS */}
                    <div className="border-l border-slate-200 bg-orange-50/30 print:bg-transparent">
                        <p className="text-[5px] uppercase font-black text-orange-600 print:text-black">Atrasos</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black text-orange-700 print:text-black">{report.totalLates || "00:01"}</p>
                    </div>

                    <div className="border-l border-slate-200 bg-fuchsia-50/30 print:bg-transparent">
                        <p className="text-[5px] uppercase font-black text-fuchsia-700 print:text-black">Abonado</p>
                        <p className="text-[10px] sm:text-sm font-mono font-black text-fuchsia-900 print:text-black">{report.totalAbono || "00:00"}</p>
                    </div>
                    
                    <div className="bg-slate-50 print:bg-white border-l border-slate-200">
                        <p className="text-[5px] uppercase font-black">Saldo Mensal</p>
                        <p className={`text-[10px] sm:text-base font-mono font-black ${report.monthlyBalance?.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'} print:text-black`}>
                            {report.monthlyBalance}
                        </p>
                    </div>
                </div>

                {/* ASSINATURAS FIXADAS NO RODAPÉ */}
                <div className="footer-signatures w-full mt-20 mb-2 print:break-inside-avoid">
                    <div className="px-10 grid grid-cols-2 gap-20 text-[9px] font-bold uppercase text-center">
                        <div>
                            <div className="border-t-2 border-black pt-1 mb-1">
                                {report.razaoSocial}
                            </div>
                            <span className="text-[6px] text-slate-500 print:text-black font-normal">Assinatura do Empregador</span>
                        </div>
                        <div>
                            <div className="border-t-2 border-black pt-1 mb-1">
                                {report.employeeName}
                            </div>
                            <span className="text-[6px] text-slate-500 print:text-black font-normal">Assinatura do Colaborador</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}