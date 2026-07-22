import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import { 
    Button, Input, Label, Card, 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui";
import { Monitor, Store, Edit2, Trash2, Plus, Building2, MapPin, Loader2, Building } from "lucide-react";

// --- UTILITÁRIOS DE MÁSCARA ---
const maskCNPJ = (v) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 14) {
        v = v.replace(/^(\d{2})(\d)/, "$1.$2");
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v.substring(0, 18);
};

const maskCEP = (v) => v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);

export default function Stores() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProviderModalOpen, setIsProviderModalOpen] = useState(false); // ✨ NOVO: Modal da Prestadora
    
    const [stores, setStores] = useState([]);
    const [providersList, setProvidersList] = useState([]);
    const [loadingCep, setLoadingCep] = useState(false);

    const initialForm = {
        id: 0, 
        name: "",
        razaoSocialCustom: "",
        cnpjCustom: "",
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "MS",
        accessCode: "",
        useServiceProvider: false,
        serviceProviderId: ""
    };

    const initialProviderForm = {
        razaoSocial: "",
        cnpj: ""
    };

    const [formData, setFormData] = useState(initialForm);
    const [providerData, setProviderData] = useState(initialProviderForm); // ✨ NOVO: Dados da Prestadora

    useEffect(() => {
        const handleData = (res) => {
            if (res.type === "stores-loaded") {
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setStores(data.map(s => ({
                    ...s,
                    id: s.Id ?? s.id,
                    name: s.Name ?? s.name,
                    cnpjCustom: s.CnpjCustom ?? s.cnpjCustom,
                    accessCode: s.AccessCode ?? s.accessCode,
                    useServiceProvider: s.UseServiceProvider ?? s.useServiceProvider,
                    serviceProviderId: s.ServiceProviderId ?? s.serviceProviderId
                })));
            }
            if (res.type === "service-providers-loaded") {
                setProvidersList(res.data);
            }
            if (res.type === "db-config-success") {
                setIsModalOpen(false);
                setIsProviderModalOpen(false);
                api.send("GET_STORES");
            }
            if (res.type === "db-config-error") {
                alert("❌ Erro: " + res.data);
            }
        };

        const cleanup = api.onDataReceived(handleData);
        api.send("GET_STORES");
        api.send("GET_SERVICE_PROVIDERS"); 
        return () => cleanup();
    }, []);

    const handleCEPChange = async (e) => {
        const cepValue = maskCEP(e.target.value);
        setFormData(prev => ({ ...prev, cep: cepValue }));

        if (cepValue.replace(/\D/g, "").length === 8) {
            setLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cepValue.replace(/\D/g, "")}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        logradouro: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        estado: data.uf
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP", error);
            } finally {
                setLoadingCep(false);
            }
        }
    };

    const handleSaveStore = () => {
        if (!formData.name || !formData.cnpjCustom || !formData.logradouro) {
            return alert("Preencha Nome, CNPJ e Logradouro!");
        }
        api.send("SAVE_STORE", formData);
    };

    // ✨ NOVO: Função para salvar a Prestadora
    const handleSaveProvider = () => {
        if (!providerData.razaoSocial || !providerData.cnpj) {
            return alert("Preencha a Razão Social e o CNPJ da empresa!");
        }
        api.send("SAVE_SERVICE_PROVIDER", providerData);
        setProviderData(initialProviderForm);
    };

    const handleSetKiosk = (store) => {
        const confirmacao = confirm(`Deseja transformar este computador em um terminal exclusivo para: ${store.name}?`);
        if (confirmacao) {
            api.send("SET_KIOSK_MODE", {
                StoreId: store.id,
                StoreName: store.name,
                StoreCode: store.accessCode
            });
        }
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            {/* CABEÇALHO */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="text-indigo-600" />
                        Gestão de Unidades
                    </h1>
                    <p className="text-sm text-slate-500 italic">{stores.length} unidades cadastradas</p>
                </div>
                <Button 
                    onClick={() => { setFormData(initialForm); setIsModalOpen(true); }} 
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-sm"
                >
                    <Plus size={18} /> Nova Unidade
                </Button>
            </div>

            {/* LISTAGEM EM GRIDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl border-slate-200 bg-slate-50/50">
                        <p className="text-slate-400 font-medium italic">Nenhuma unidade encontrada.</p>
                    </div>
                ) : (
                    stores.map(store => (
                        <Card key={store.id} className="group relative p-5 border-t-4 border-indigo-600 space-y-4 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
                            <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg text-slate-800 truncate" title={store.name}>
                                        {store.name}
                                    </h3>
                                    <p className="text-[10px] font-mono text-slate-400 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                                        ID: {store.id} | CODE: {store.accessCode}
                                    </p>
                                    {store.useServiceProvider && (
                                        <p className="text-[9px] font-black text-indigo-500 uppercase mt-1">Usa CNPJ de Terceiros</p>
                                    )}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => { 
                                        setFormData({ ...initialForm, ...store }); 
                                        setIsModalOpen(true); 
                                    }}
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600"
                                >
                                    <Edit2 size={16} />
                                </Button>
                            </div>

                            <div className="text-xs space-y-1.5">
                                <p className="font-bold text-indigo-700 uppercase truncate text-[10px] tracking-wider">
                                    {store.razaoSocialCustom || "Razão Social não definida"}
                                </p>
                                <p className="text-slate-600 font-semibold">{store.cnpjCustom}</p>
                                
                                <div className="flex items-start gap-2 pt-1 text-slate-500">
                                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                    <div className="leading-relaxed">
                                        <p>{store.logradouro}, {store.numero}</p>
                                        <p className="text-[11px] opacity-80">{store.bairro} - {store.cidade}/{store.estado}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-50">
                                <Button 
                                    onClick={() => handleSetKiosk(store)} 
                                    variant="outline"
                                    className="w-full justify-center text-xs h-9 text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                >
                                    <Monitor className="mr-2" size={14} /> 
                                    Definir como Kiosk
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* MODAL DE CADASTRO/EDIÇÃO DA LOJA */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Configuração da Unidade</DialogTitle>
                        <DialogDescription>
                            Preencha os dados cadastrais e de localização da unidade abaixo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-6 gap-4 py-4 text-sm overflow-y-auto max-h-[70vh] px-1">
                        <div className="col-span-3 space-y-1.5">
                            <Label>Nome Comercial (Exibição)</Label>
                            <Input 
                                value={formData.name} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                maxLength={30}
                                placeholder="Ex: Loja Centro"
                            />
                        </div>
                        <div className="col-span-3 space-y-1.5">
                            <Label>CNPJ (Da Unidade Física)</Label>
                            <Input 
                                value={formData.cnpjCustom} 
                                maxLength={30} 
                                onChange={e => setFormData({ ...formData, cnpjCustom: maskCNPJ(e.target.value) })} 
                                placeholder="00.000.000/0000-00" 
                            />
                        </div>

                        <div className="col-span-6 space-y-1.5">
                            <Label>Razão Social Completa</Label>
                            <Input 
                                value={formData.razaoSocialCustom} 
                                maxLength={70} 
                                onChange={e => setFormData({ ...formData, razaoSocialCustom: e.target.value })} 
                                placeholder="NOME EMPRESARIAL LTDA" 
                            />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label className="flex items-center gap-1">
                                CEP {loadingCep && <Loader2 size={12} className="animate-spin text-indigo-600" />}
                            </Label>
                            <Input value={formData.cep} onChange={handleCEPChange} placeholder="00000-000" />
                        </div>
                        <div className="col-span-3 space-y-1.5">
                            <Label>Logradouro (Rua/Av)</Label>
                            <Input value={formData.logradouro} maxLength={90} onChange={e => setFormData({ ...formData, logradouro: e.target.value })} />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                            <Label>Número</Label>
                            <Input value={formData.numero} maxLength={8} onChange={e => setFormData({ ...formData, numero: e.target.value })} />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label>Bairro</Label>
                            <Input value={formData.bairro} maxLength={30} onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
                        </div>
                        <div className="col-span-3 space-y-1.5">
                            <Label>Cidade</Label>
                            <Input value={formData.cidade} maxLength={15} onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                            <Label>UF</Label>
                            <Input value={formData.estado} maxLength={2} onChange={e => setFormData({ ...formData, estado: e.target.value.toUpperCase() })} />
                        </div>

                        {/* BLOCO DA PRESTADORA DE SERVIÇOS */}
                        <div className="col-span-6 p-4 bg-slate-50 border border-slate-200 rounded-xl mt-2 space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.useServiceProvider || false}
                                    onChange={(e) => setFormData({...formData, useServiceProvider: e.target.checked})}
                                    className="w-5 h-5 accent-indigo-600 cursor-pointer"
                                />
                                <span className="text-sm font-bold text-slate-700">Esta unidade utiliza CNPJ de Prestadora de Serviço?</span>
                            </label>

                            {formData.useServiceProvider && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-[10px] uppercase font-black text-slate-400">Selecione a Empresa Contratante (Holding/Matriz)</Label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={formData.serviceProviderId || ""} 
                                            onChange={(e) => setFormData({...formData, serviceProviderId: e.target.value ? parseInt(e.target.value) : null})}
                                            className="flex-1 h-10 rounded-lg border-2 border-slate-200 font-bold text-slate-700 px-3 outline-none focus:border-indigo-500 bg-white"
                                        >
                                            <option value="">Selecione uma empresa...</option>
                                            {providersList.map(prov => (
                                                <option key={prov.id} value={prov.id}>{prov.razaoSocial} ({prov.cnpj})</option>
                                            ))}
                                        </select>
                                        
                                        {/* ✨ BOTÃO MÁGICO PARA ADICIONAR PRESTADORA */}
                                        <Button 
                                            variant="outline" 
                                            className="h-10 px-3 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                            onClick={(e) => { e.preventDefault(); setIsProviderModalOpen(true); }}
                                        >
                                            <Plus size={18} /> Nova Empresa
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-6 pt-4">
                            <Button 
                                onClick={handleSaveStore} 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-bold shadow-lg gap-2"
                            >
                                Finalizar e Salvar Unidade
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ✨ MODAL DE CADASTRO DA NOVA PRESTADORA */}
            <Dialog open={isProviderModalOpen} onOpenChange={setIsProviderModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building size={20} className="text-indigo-600" /> Nova Empresa Prestadora
                        </DialogTitle>
                        <DialogDescription>
                            Cadastre a Razão Social principal (Holding) que assinará a folha desta unidade.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <Label>Razão Social da Prestadora/Matriz</Label>
                            <Input 
                                value={providerData.razaoSocial} 
                                onChange={e => setProviderData({ ...providerData, razaoSocial: e.target.value })}
                                placeholder="EX: HOLDING GESTAO DE PESSOAS LTDA"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>CNPJ</Label>
                            <Input 
                                value={providerData.cnpj} 
                                onChange={e => setProviderData({ ...providerData, cnpj: maskCNPJ(e.target.value) })}
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <Button 
                            onClick={handleSaveProvider} 
                            className="w-full bg-slate-900 hover:bg-black mt-2"
                        >
                            Salvar Empresa
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}