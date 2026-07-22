import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam"; // ✨ A NOSSA CÂMERA
import { api } from "@/services/api";
import { 
    Button, Input, Label, Dialog, 
    DialogContent, DialogHeader, DialogTitle, 
    DialogDescription,
    Popover, PopoverContent, PopoverTrigger, Checkbox
} from "@/components/ui";
import { Calendar } from "@/components/ui"; 
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Save, RefreshCw, User, Phone, MapPin, ShieldAlert, Calendar as CalendarIcon, Camera, CheckCircle } from "lucide-react"; // ✨ NOVOS ÍCONES

export default function EmployeeForm({ employee, stores, departments, onCancel }) {
    const [formData, setFormData] = useState({
        Id: 0,
        Name: "",
        Cpf: "",
        Phone: "",
        Address: "",
        EmergencyContact: "",
        Role: "",
        Pin: "",
        StoreId: "",
        IsActive: true,
        AdmissionDate: new Date().toISOString(), 
        SendToAccounting: true,
        canPunchInAnyStore: false,
        ctps: "",
        serie: "",
        // ✨ AS DUAS VARIÁVEIS NOVAS PARA A INTELIGÊNCIA ARTIFICIAL
        requireFacialAuth: false, 
        facialReferenceData: ""
    });
    
    const [isResigning, setIsResigning] = useState(false);
    const [resignationDate, setResignationDate] = useState(employee?.resignationDate || "");
    const [resignationText, setResignationText] = useState(
        employee?.resignationDate ? format(new Date(employee.resignationDate), "dd/MM/yyyy") : ""
    );
    const [admissionText, setAdmissionText] = useState("");

    // ✨ ESTADOS DA CÂMERA
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const webcamRef = useRef(null);

    // ✨ FUNÇÕES DA BIOMETRIA
    const captureFace = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            const base64Limpo = imageSrc.split(',')[1]; 
            setFormData(prev => ({ ...prev, facialReferenceData: base64Limpo }));
            setIsCameraOpen(false); // Fecha a câmera
        }
    };

    const resetFace = () => {
        setFormData(prev => ({ ...prev, facialReferenceData: "" }));
        setIsCameraOpen(true); // Abre a câmera de novo
    };
    
    const handleConfirmResignation = () => {
        if (!resignationDate) {
            alert("Por favor, selecione a data do último dia de trabalho.");
            return;
        }
        
        const dateToUtc = new Date(resignationDate + "T12:00:00Z").toISOString();

        const updatedData = {
            ...formData,
            Id: Number(formData.Id),
            StoreId: Number(formData.StoreId),
            ResignationDate: dateToUtc, 
            IsActive: false
        };

        api.send("SAVE_EMPLOYEE", updatedData);
        setIsResigning(false);
    };

    useEffect(() => {
        if (employee) {
            setFormData({ 
                Id: employee.Id ?? employee.id ?? 0,
                Name: employee.Name ?? employee.name ?? "",
                Cpf: employee.Cpf ?? employee.cpf ?? "",
                Phone: employee.Phone ?? employee.phone ?? "",
                Address: employee.Address ?? employee.address ?? "",
                EmergencyContact: employee.EmergencyContact ?? employee.emergencyContact ?? "",
                Role: employee.Role ?? employee.role ?? "",
                Pin: employee.Pin ?? employee.pin ?? "",
                StoreId: String(employee.StoreId ?? employee.storeId ?? ""),
                IsActive: employee.IsActive ?? employee.isActive ?? true,
                AdmissionDate: employee.AdmissionDate ?? employee.admissionDate ?? new Date().toISOString(),
                SendToAccounting: employee.SendToAccounting ?? employee.sendToAccounting ?? true,
                canPunchInAnyStore: employee.CanPunchInAnyStore ?? employee.canPunchInAnyStore ?? false,
                ctps: employee.Ctps ?? employee.ctps ?? "",
                serie: employee.Serie ?? employee.serie ?? "",
                // ✨ LÊ DO BANCO SE ELE JÁ TEM FOTO E CHAVINHA
                requireFacialAuth: employee.RequireFacialAuth ?? employee.requireFacialAuth ?? false,
                facialReferenceData: employee.FacialReferenceData ?? employee.facialReferenceData ?? ""
            });
            if (employee.resignationDate) setResignationDate(employee.resignationDate);
            const admDate = employee.AdmissionDate ?? employee.admissionDate;
            setAdmissionText(admDate ? format(new Date(admDate), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy"));
        } 
        else {
            setFormData({
                Id: 0, Name: "", Cpf: "", Phone: "", Address: "", 
                EmergencyContact: "", Role: "", Pin: "", StoreId: "", 
                IsActive: true, SendToAccounting: true, canPunchInAnyStore: false,
                AdmissionDate: new Date().toISOString(), ctps: "", serie: "",
                requireFacialAuth: false, facialReferenceData: "" // Zera pro novo
            });
            setAdmissionText(format(new Date(), "dd/MM/yyyy"));
            const newPin = Math.floor(1000 + Math.random() * 9000).toString();
            setFormData(prev => ({ ...prev, Pin: newPin }));
        }

        const handleData = (res) => {
            if (res.type === "db-config-success") onCancel();
            if (res.type === "db-config-error") alert("❌ " + res.data);
        };
        const cleanup = api.onDataReceived(handleData);
        return () => cleanup();
    }, [employee, onCancel]);

    const generatePin = () => {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        setFormData(prev => ({ ...prev, Pin: pin }));
    };

    const maskCPF = (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
    const maskPhone = (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.Name || !formData.StoreId) return alert("Nome e Unidade são obrigatórios!");
        
        api.send("SAVE_EMPLOYEE", {
            ...formData,
            StoreId: parseInt(formData.StoreId),
            Id: formData.Id || 0,
            ResignationDate: resignationDate ? new Date(resignationDate + "T12:00:00Z").toISOString() : null
        });
    };
    
    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <User className="text-indigo-600" />
                                {formData.Id > 0 ? "Editar" : "Cadastrar"} Colaborador
                            </DialogTitle>
                            <DialogDescription>
                                Preencha as informações pessoais e profissionais abaixo.
                            </DialogDescription>
                        </div>

                        {formData.Id > 0 && !isResigning && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-[10px] font-black uppercase flex items-center gap-1 h-8 px-3 rounded-lg transition-all"
                                onClick={() => setIsResigning(true)}
                            >
                                <ShieldAlert size={12} />
                                Desligar Funcionário
                            </Button>
                        )}
                    </div>

                    {isResigning && (
                        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-end gap-3">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-red-400 ml-1">
                                        Último dia de trabalho
                                    </Label>
                                    <div className="flex relative">
                                        <Input 
                                            value={resignationText}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, "");
                                                if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2);
                                                if (val.length > 5) val = val.substring(0, 5) + "/" + val.substring(5, 9);
                                                setResignationText(val);

                                                if (val.length === 10) {
                                                    const [d, m, y] = val.split("/");
                                                    if (d <= 31 && m <= 12 && y > 1900) {
                                                        setResignationDate(`${y}-${m}-${d}`);
                                                    }
                                                }
                                            }}
                                            placeholder="DD/MM/AAAA"
                                            maxLength={10}
                                            className="h-9 w-full pr-10 bg-white border-red-200 focus:ring-red-500 rounded-lg text-sm"
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button type="button" variant="ghost" className="absolute right-0 top-0 h-9 px-3 text-red-500 hover:bg-transparent hover:text-red-700">
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end">
                                                <Calendar 
                                                    mode="single" 
                                                    selected={resignationDate ? new Date(resignationDate + "T12:00:00Z") : undefined} 
                                                    onSelect={(d) => {
                                                        if(d) {
                                                            setResignationDate(d.toISOString().substring(0, 10));
                                                            setResignationText(format(d, "dd/MM/yyyy")); 
                                                        }
                                                    }} 
                                                    locale={ptBR} 
                                                    initialFocus 
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleConfirmResignation}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-3 text-xs"
                                    >
                                        Confirmar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsResigning(false)}
                                        className="h-9 px-2 text-slate-500 text-xs"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase text-slate-400 border-b pb-1">Identificação</h4>
                        <div className="space-y-1.5">
                            <Label>Nome Completo</Label>
                            <Input 
                                value={formData.Name} 
                                onChange={e => setFormData({...formData, Name: e.target.value})} 
                                placeholder="Nome completo do funcionário"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>CPF</Label>
                                <Input 
                                    value={formData.Cpf} 
                                    onChange={e => setFormData({...formData, Cpf: maskCPF(e.target.value)})} 
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Telefone Principal</Label>
                                <Input 
                                    value={formData.Phone} 
                                    onChange={e => setFormData({...formData, Phone: maskPhone(e.target.value)})} 
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ctps">CTPS</Label>
                                <Input 
                                    id="ctps" 
                                    value={formData.ctps} 
                                    onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
                                    placeholder="Nº da Carteira"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="serie">Série</Label>
                                <Input 
                                    id="serie" 
                                    value={formData.serie} 
                                    onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                                    placeholder="Série/UF"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase text-slate-400 border-b pb-1">Endereço e Emergência</h4>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1"><MapPin size={14}/> Endereço Residencial</Label>
                            <Input 
                                value={formData.Address} 
                                onChange={e => setFormData({...formData, Address: e.target.value})} 
                                placeholder="Rua, número, bairro e cidade"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1"><ShieldAlert size={14}/> Contato de Emergência</Label>
                            <Input 
                                value={formData.EmergencyContact} 
                                onChange={e => setFormData({...formData, EmergencyContact: e.target.value})} 
                                placeholder="Ex: Maria (Esposa) - (11) 99999-9999"
                                maxLength={50}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1.5 flex flex-col">
                                <Label>Data de Admissão</Label>
                                <div className="flex relative">
                                    <Input 
                                        value={admissionText}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, "");
                                            if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2);
                                            if (val.length > 5) val = val.substring(0, 5) + "/" + val.substring(5, 9);
                                            setAdmissionText(val);

                                            if (val.length === 10) {
                                                const [d, m, y] = val.split("/");
                                                if (d <= 31 && m <= 12 && y > 1900) {
                                                    setFormData({ ...formData, AdmissionDate: new Date(`${y}-${m}-${d}T12:00:00Z`).toISOString() });
                                                }
                                            }
                                        }}
                                        placeholder="DD/MM/AAAA"
                                        maxLength={10}
                                        className="w-full pr-10 bg-white border-slate-200"
                                    />
                                    
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button type="button" variant="ghost" className="absolute right-0 top-0 h-10 px-3 text-indigo-600 hover:bg-transparent hover:text-indigo-800">
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar 
                                                mode="single" 
                                                selected={formData.AdmissionDate ? new Date(formData.AdmissionDate) : new Date()} 
                                                onSelect={(d) => {
                                                    if(d) {
                                                        setFormData({ ...formData, AdmissionDate: d.toISOString() });
                                                        setAdmissionText(format(d, "dd/MM/yyyy")); 
                                                    }
                                                }} 
                                                locale={ptBR} 
                                                initialFocus 
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center space-x-2 p-2 border rounded-md bg-slate-50 h-10">
                                    <input 
                                        type="checkbox" id="accounting" className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        checked={formData.SendToAccounting} onChange={e => setFormData({...formData, SendToAccounting: e.target.checked})}
                                    />
                                    <Label htmlFor="accounting" className="text-sm font-medium cursor-pointer">Contabilizar Folha</Label>
                                </div>
                                <div className="flex items-center space-x-2 p-2 border rounded-md bg-blue-50/50 h-10 border-blue-100">
                                    <input 
                                        type="checkbox" id="globalAccess" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={formData.canPunchInAnyStore} onChange={e => setFormData({...formData, canPunchInAnyStore: e.target.checked})}
                                    />
                                    <Label htmlFor="globalAccess" className="text-sm font-medium cursor-pointer text-blue-900">Acesso Rede</Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase text-slate-400 border-b pb-1">Alocação</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Setor / Cargo</Label>
                                <select 
                                    className="w-full h-10 border rounded-md px-2 bg-white text-sm" 
                                    value={formData.Role} 
                                    onChange={e => setFormData({...formData, Role: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {departments.map(d => (
                                        <option key={d.Id || d.id} value={d.Name || d.name}>
                                            {d.Name || d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unidade de Trabalho</Label>
                                <select 
                                    className="w-full h-10 border rounded-md px-2 bg-white text-sm" 
                                    value={formData.StoreId} 
                                    onChange={e => setFormData({...formData, StoreId: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {stores.map(s => (
                                        <option key={s.Id || s.id} value={s.Id || s.id}>
                                            {s.Name || s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* ✨ PAINEL DE SEGURANÇA BIOMÉTRICA (IA) FICA AQUI */}
                    {/* ========================================================= */}
                    <div className="mt-6 p-5 border-2 border-slate-100 rounded-2xl bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Camera size={16} className="text-indigo-600" /> Segurança Biométrica
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold mt-1">
                                    Exigir validação facial da Inteligência Artificial no Kiosk.
                                </p>
                            </div>
                            
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={formData.requireFacialAuth}
                                    onChange={(e) => setFormData({...formData, requireFacialAuth: e.target.checked})}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {formData.requireFacialAuth && (
                            <div className="mt-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-300">
                                {formData.facialReferenceData && !isCameraOpen ? (
                                    <div className="flex flex-col items-center">
                                        <div className="relative">
                                            <img 
                                                src={`data:image/jpeg;base64,${formData.facialReferenceData}`} 
                                                alt="Gabarito" 
                                                className="w-32 h-32 rounded-full object-cover border-4 border-emerald-100 shadow-md"
                                            />
                                            <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                                                <CheckCircle size={16} />
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-3">Rosto Cadastrado</span>
                                        <button type="button" onClick={resetFace} className="mt-3 text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 uppercase transition-colors">
                                            <RefreshCw size={12} /> Refazer Foto
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center w-full">
                                        {!isCameraOpen ? (
                                            <button type="button" onClick={() => setIsCameraOpen(true)} className="px-6 py-3 bg-indigo-50 text-indigo-700 font-black text-xs uppercase rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                                                Abrir Câmara para Cadastrar
                                            </button>
                                        ) : (
                                            <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
                                                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-indigo-200 shadow-inner relative bg-slate-100 mb-4">
                                                    <Webcam
                                                        ref={webcamRef}
                                                        audio={false}
                                                        screenshotFormat="image/jpeg"
                                                        screenshotQuality={0.8}
                                                        videoConstraints={{ facingMode: "user" }}
                                                        className="object-cover w-full h-full"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setIsCameraOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-black text-[10px] uppercase rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                                                    <button type="button" onClick={captureFace} className="px-6 py-2 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"><Camera size={14}/> Capturar Rosto</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* ========================================================= */}

                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                        <div>
                            <Label className="text-[10px] text-indigo-400 uppercase font-black">PIN de Acesso Ponto</Label>
                            <p className="text-2xl font-mono font-bold text-indigo-700 tracking-[0.3em]">{formData.Pin}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={generatePin} className="bg-white hover:bg-indigo-100">
                            <RefreshCw size={16} className="mr-2" /> Novo PIN
                        </Button>
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 shadow-lg transition-all active:scale-95">
                        <Save size={18} className="mr-2" /> 
                        {formData.Id > 0 ? "Atualizar Dados" : "Efetuar Cadastro"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    ); 
}