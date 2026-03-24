/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  BarChart3, 
  TrendingUp, 
  Search, 
  Bell,
  MessageSquare,
  ChevronRight,
  Target,
  Award,
  Briefcase,
  ExternalLink,
  Globe,
  ShieldCheck,
  FileText,
  Building2,
  MapPin,
  Linkedin,
  ShieldAlert,
  Plus,
  Trash2,
  AlertCircle,
  History,
  Eye,
  Pencil,
  Upload,
  Download,
  File,
  Image as ImageIcon,
  Paperclip,
  DollarSign,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { fetchHighlightsOfMonth, HighlightData, fetchHighlightHistory, HistoryItem } from './services/googleSheetsService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock Data
const kpiData = [
  { name: 'Seg', analises: 45, aprovadas: 32 },
  { name: 'Ter', analises: 52, aprovadas: 38 },
  { name: 'Qua', analises: 48, aprovadas: 35 },
  { name: 'Qui', analises: 61, aprovadas: 42 },
  { name: 'Sex', analises: 55, aprovadas: 40 },
];

const teamStats = [
  { label: 'Análises Pendentes', value: '124', color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Ticket Médio PJ', value: 'R$ 450k', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Tempo Médio', value: '4.2h', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Taxa de Aprovação', value: '72%', color: 'text-teal-600', bg: 'bg-teal-50' },
];

const highlightEmployee = {
  name: 'Mariana Silva',
  role: 'Analista Sênior PJ',
  achievement: 'Maior volume de análises complexas aprovadas no mês.',
  image: 'https://picsum.photos/seed/mariana/200/200'
};

const recentActivities = [
  { id: 1, user: 'João Paulo', action: 'concluiu análise da Empresa X', time: '10 min atrás' },
  { id: 2, user: 'Carla Dias', action: 'solicitou documentos adicionais - Grupo Y', time: '25 min atrás' },
  { id: 3, user: 'Sistema', action: 'Meta semanal atingida em 85%', time: '1 hora atrás' },
];

interface Pendencia {
  id: string;
  valor: number;
  vencimento: string;
}

interface BlockListItem {
  id: string;
  cnpj: string;
  nome: string;
  status: 'Bloqueado Permanente' | 'Bloqueado Atrasos Atual' | 'Em Análise' | 'Liberado';
  historico: string;
  dataCriacao: string;
  pendencias: Pendencia[];
}

interface Recado {
  id: string;
  title: string;
  message: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  date: string;
  pdfUrl?: string;
  pdfName?: string;
  imageUrl?: string;
}

const initialBlockList: BlockListItem[] = [
  { 
    id: '1', 
    cnpj: '12.345.678/0001-90', 
    nome: 'Empresa Exemplo A', 
    status: 'Bloqueado Permanente', 
    historico: 'Histórico de inadimplência recorrente.', 
    dataCriacao: '15/01/2024',
    pendencias: [
      { id: 'p1', valor: 1500.50, vencimento: '2024-03-10' },
      { id: 'p2', valor: 2300.00, vencimento: '2024-03-20' }
    ]
  },
  { 
    id: '2', 
    cnpj: '98.765.432/0001-10', 
    nome: 'Comércio de Alimentos B', 
    status: 'Em Análise', 
    historico: 'Aguardando documentação complementar.', 
    dataCriacao: '10/02/2024',
    pendencias: []
  },
  { 
    id: '3', 
    cnpj: '45.678.901/0001-22', 
    nome: 'Indústria Metalúrgica C', 
    status: 'Bloqueado Atrasos Atual', 
    historico: 'Processo judicial em andamento.', 
    dataCriacao: '05/03/2024',
    pendencias: [
      { id: 'p3', valor: 50000.00, vencimento: '2024-02-15' }
    ]
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('awards');
  const [highlightsData, setHighlightsData] = useState<HighlightData[]>([]);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [loadingHighlight, setLoadingHighlight] = useState(false);
  
  // Block List State
  const [blockList, setBlockList] = useState<BlockListItem[]>(() => {
    const saved = localStorage.getItem('portal_credito_blocklist');
    return saved ? JSON.parse(saved) : initialBlockList;
  });

  // Persist Block List
  React.useEffect(() => {
    localStorage.setItem('portal_credito_blocklist', JSON.stringify(blockList));
  }, [blockList]);

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState<Omit<BlockListItem, 'id' | 'dataCriacao'>>({
    cnpj: '',
    nome: '',
    status: 'Bloqueado Permanente',
    historico: '',
    pendencias: []
  });

  const [newPendencia, setNewPendencia] = useState({ valor: '', vencimento: '' });

  const addPendenciaToNewItem = () => {
    if (!newPendencia.valor || !newPendencia.vencimento) return;
    setNewItem({
      ...newItem,
      pendencias: [
        ...newItem.pendencias,
        {
          id: Math.random().toString(36).substr(2, 9),
          valor: parseFloat(newPendencia.valor),
          vencimento: newPendencia.vencimento
        }
      ]
    });
    setNewPendencia({ valor: '', vencimento: '' });
  };

  const removePendenciaFromNewItem = (id: string) => {
    setNewItem({
      ...newItem,
      pendencias: newItem.pendencias.filter(p => p.id !== id)
    });
  };

  const [newEditPendencia, setNewEditPendencia] = useState({ valor: '', vencimento: '' });

  const addPendenciaToEditItem = () => {
    if (!itemToEdit || !newEditPendencia.valor || !newEditPendencia.vencimento) return;
    setItemToEdit({
      ...itemToEdit,
      pendencias: [
        ...itemToEdit.pendencias,
        {
          id: Math.random().toString(36).substr(2, 9),
          valor: parseFloat(newEditPendencia.valor),
          vencimento: newEditPendencia.vencimento
        }
      ]
    });
    setNewEditPendencia({ valor: '', vencimento: '' });
  };

  const removePendenciaFromEditItem = (id: string) => {
    if (!itemToEdit) return;
    setItemToEdit({
      ...itemToEdit,
      pendencias: itemToEdit.pendencias.filter(p => p.id !== id)
    });
  };

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemToView, setItemToView] = useState<BlockListItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<BlockListItem | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Recados State
  const [recados, setRecados] = useState<Recado[]>(() => {
    const saved = localStorage.getItem('portal_credito_recados');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Documentação Obrigatória', message: 'Lembre-se de verificar todos os documentos obrigatórios antes de enviar a análise para aprovação final.', priority: 'Alta', date: '23/03/2026' },
      { id: '2', title: 'Novas Regras de Faturamento', message: 'A partir de hoje, empresas com faturamento acima de R$ 1M devem apresentar o balanço patrimonial dos últimos 2 anos.', priority: 'Média', date: '22/03/2026' },
      { id: '3', title: 'Manutenção Preventiva', message: 'O Portal do Crédito passará por uma manutenção preventiva no próximo domingo, das 02:00 às 06:00.', priority: 'Baixa', date: '21/03/2026' }
    ];
  });

  // Persist Recados
  React.useEffect(() => {
    localStorage.setItem('portal_credito_recados', JSON.stringify(recados));
  }, [recados]);

  const [isAddingRecado, setIsAddingRecado] = useState(false);
  const [newRecado, setNewRecado] = useState<Omit<Recado, 'id' | 'date'>>({
    title: '',
    message: '',
    priority: 'Média',
    pdfUrl: '',
    pdfName: '',
    imageUrl: ''
  });
  const [recadoToEdit, setRecadoToEdit] = useState<Recado | null>(null);

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAddRecado = () => {
    if (!newRecado.message || !newRecado.title) return;
    
    const recado: Recado = {
      ...newRecado,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('pt-BR')
    };
    
    setRecados([recado, ...recados]);
    setNewRecado({ title: '', message: '', priority: 'Média', pdfUrl: '', pdfName: '', imageUrl: '' });
    setIsAddingRecado(false);
  };

  const handleUpdateRecado = () => {
    if (!recadoToEdit) return;
    setRecados(recados.map(r => r.id === recadoToEdit.id ? recadoToEdit : r));
    setRecadoToEdit(null);
  };

  const handleDeleteRecado = (id: string) => {
    setRecados(recados.filter(r => r.id !== id));
  };

  const sortedRecados = [...recados].sort((a, b) => {
    const priorityOrder = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const handleAddItem = () => {
    if (!newItem.cnpj || !newItem.nome) return;
    
    const item: BlockListItem = {
      ...newItem,
      id: Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toLocaleDateString('pt-BR')
    };
    
    setBlockList([item, ...blockList]);
    setNewItem({ cnpj: '', nome: '', status: 'Bloqueado Permanente', historico: '' });
    setIsAddingItem(false);
  };

  const handleUpdateItem = () => {
    if (!itemToEdit) return;
    setBlockList(blockList.map(item => item.id === itemToEdit.id ? itemToEdit : item));
    setItemToEdit(null);
    setNewEditPendencia({ valor: '', vencimento: '' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          alert('O arquivo está vazio.');
          return;
        }

        // Helper to find value by flexible key name
        const getValue = (row: any, possibleKeys: string[]) => {
          const keys = Object.keys(row);
          const foundKey = keys.find(k => 
            possibleKeys.some(pk => 
              k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
              pk.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            )
          );
          return foundKey ? String(row[foundKey]).trim() : '';
        };

        const newItems: BlockListItem[] = jsonData.map((row: any) => {
          const cnpj = getValue(row, ['CNPJ', 'C.N.P.J', 'Cadastro Nacional', 'Documento']);
          const nome = getValue(row, ['Nome', 'Empresa', 'Razao Social', 'Nome Fantasia', 'Cliente', 'Fornecedor']);
          const statusRaw = getValue(row, ['Status', 'Situacao', 'Estado']);
          const historico = getValue(row, ['Historico', 'Motivo', 'Observacao', 'Obs', 'Descricao', 'Comentario']);
          const valorRaw = getValue(row, ['Valor', 'Montante', 'Debito', 'Preco']);
          const vencimentoRaw = getValue(row, ['Vencimento', 'Data Vencimento', 'Prazo']);

          // Normalize status
          let status: 'Bloqueado Permanente' | 'Bloqueado Atrasos Atual' | 'Em Análise' | 'Liberado' = 'Bloqueado Permanente';
          const lowerStatus = statusRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          if (lowerStatus.includes('permanente')) {
            status = 'Bloqueado Permanente';
          } else if (lowerStatus.includes('atraso')) {
            status = 'Bloqueado Atrasos Atual';
          } else if (lowerStatus.includes('analise')) {
            status = 'Em Análise';
          } else if (lowerStatus.includes('liberado') || lowerStatus.includes('livre')) {
            status = 'Liberado';
          } else if (lowerStatus.includes('bloqueado')) {
            status = 'Bloqueado Permanente'; // Default for "bloqueado"
          }

          const pendencias: Pendencia[] = [];
          if (valorRaw && !isNaN(parseFloat(valorRaw.replace(',', '.')))) {
            pendencias.push({
              id: Math.random().toString(36).substr(2, 9),
              valor: parseFloat(valorRaw.replace(',', '.')),
              vencimento: vencimentoRaw || new Date().toISOString().split('T')[0]
            });
          }

          return {
            id: Math.random().toString(36).substr(2, 9),
            cnpj,
            nome,
            status,
            historico,
            dataCriacao: new Date().toLocaleDateString('pt-BR'),
            pendencias
          };
        }).filter(item => item.cnpj && item.nome);

        if (newItems.length > 0) {
          setBlockList(prev => [...newItems, ...prev]);
          alert(`${newItems.length} empresas importadas com sucesso!`);
        } else {
          // Debug info for the user
          const firstRowKeys = Object.keys(jsonData[0]).join(', ');
          alert(`Nenhuma empresa válida encontrada. \n\nColunas detectadas no seu arquivo: [${firstRowKeys}]\n\nCertifique-se de ter colunas como "CNPJ" e "Nome" ou "Empresa".`);
        }
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        alert('Erro ao ler o arquivo. Verifique se o formato (Excel ou CSV) está correto.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'CNPJ': '00.000.000/0001-00',
        'Nome': 'Exemplo de Empresa LTDA',
        'Status': 'Bloqueado Permanente',
        'Valor': 1500.00,
        'Vencimento': '2024-03-25',
        'Historico': 'Motivo do bloqueio aqui'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_blocklist.xlsx");
  };

  const handleRemoveItem = (id: string) => {
    setBlockList(blockList.filter(item => item.id !== id));
    setItemToDelete(null);
  };

  const filteredBlockList = blockList.filter(item => 
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cnpj.includes(searchTerm) ||
    item.historico.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ['CNPJ', 'Nome', 'Status', 'Valor Total', 'Qtd Pendências', 'Histórico', 'Data de Criação'];
    const csvContent = [
      headers.join(','),
      ...blockList.map(item => [
        `"${item.cnpj}"`,
        `"${item.nome}"`,
        `"${item.status}"`,
        `"${item.pendencias.reduce((acc, p) => acc + p.valor, 0)}"`,
        `"${item.pendencias.length}"`,
        `"${item.historico.replace(/"/g, '""')}"`,
        `"${item.dataCriacao}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `blocklist_credito_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTab === 'awards') {
      loadHighlight();
      // Atualização em tempo real: busca novos dados a cada 60 segundos
      interval = setInterval(() => {
        loadHighlight(true); // Passamos true para indicar que é um refresh silencioso (opcional)
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const loadHighlight = async (isRefresh = false) => {
    if (!isRefresh) setLoadingHighlight(true);
    try {
      const [data, history] = await Promise.all([
        fetchHighlightsOfMonth(),
        fetchHighlightHistory()
      ]);
      setHighlightsData(data);
      setHistoryData(history);
    } catch (error) {
      console.error("Error loading highlights:", error);
    } finally {
      if (!isRefresh) setLoadingHighlight(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <TrendingUp size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">Portal do Crédito</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavItem 
            icon={<Trophy size={20} />} 
            label="Destaques" 
            active={activeTab === 'awards'} 
            onClick={() => setActiveTab('awards')}
          />
          <NavItem 
            icon={<Globe size={20} />} 
            label="Link Consultas" 
            active={activeTab === 'links'} 
            onClick={() => setActiveTab('links')}
          />
          <NavItem 
            icon={<ShieldAlert size={20} />} 
            label="Block List - Não Liberar" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem 
            icon={<Bell size={20} />} 
            label="Recados - Atenção" 
            active={activeTab === 'team'} 
            onClick={() => setActiveTab('team')}
          />
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label="Resultados Gestão" 
            active={activeTab === 'results'} 
            onClick={() => setActiveTab('results')}
          />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-bottom border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar análises, empresas ou analistas..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800 leading-none">Gestor de Crédito</p>
                <p className="text-xs text-slate-500 mt-1">Análise PJ</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold">
                GC
              </div>
            </div>
          </div>
        </header>

        {/* Block List Content */}
        <div className="p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="blocklist"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                {/* Header Section */}
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                      <ShieldAlert className="text-rose-600" size={32} />
                      Block List - Não Liberar
                    </h2>
                    <p className="text-slate-500 mt-1">Gerenciamento de restrições e bloqueios de empresas.</p>
                  </div>
                  <div className="flex gap-3">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <button 
                      onClick={handleDownloadTemplate}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                      title="Baixar modelo de arquivo"
                    >
                      <Download size={18} />
                      Modelo
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Upload size={18} />
                      Importar (Excel/CSV)
                    </button>
                    <button 
                      onClick={handleExportCSV}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                      <FileText size={18} />
                      Exportar CSV
                    </button>
                    <button 
                      onClick={() => setIsAddingItem(true)}
                      className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all shadow-md shadow-rose-200 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Adicionar Empresa
                    </button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por Nome ou CNPJ..." 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <AlertCircle size={16} />
                    {filteredBlockList.length} empresas listadas
                  </div>
                </div>

                {/* Add Item Form (Conditional) */}
                <AnimatePresence>
                  {isAddingItem && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white p-8 rounded-3xl border-2 border-rose-100 shadow-lg space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Plus className="text-rose-600" size={20} />
                            Nova Restrição
                          </h3>
                          <button 
                            onClick={() => setIsAddingItem(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            Cancelar
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ</label>
                            <input 
                              type="text" 
                              placeholder="00.000.000/0000-00"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                              value={newItem.cnpj}
                              onChange={(e) => setNewItem({...newItem, cnpj: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Empresa</label>
                            <input 
                              type="text" 
                              placeholder="Razão Social ou Nome Fantasia"
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                              value={newItem.nome}
                              onChange={(e) => setNewItem({...newItem, nome: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                            <select 
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                              value={newItem.status}
                              onChange={(e) => setNewItem({...newItem, status: e.target.value as any})}
                            >
                              <option value="Bloqueado Permanente">Bloqueado Permanente</option>
                              <option value="Bloqueado Atrasos Atual">Bloqueado Atrasos Atual</option>
                              <option value="Em Análise">Em Análise</option>
                              <option value="Liberado">Liberado</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico / Motivo</label>
                          <textarea 
                            placeholder="Descreva o motivo do bloqueio ou histórico relevante..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            value={newItem.historico}
                            onChange={(e) => setNewItem({...newItem, historico: e.target.value})}
                          />
                        </div>

                        {/* Pendências Financeiras Section */}
                        <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <DollarSign size={16} className="text-rose-600" />
                              Pendências Financeiras
                            </h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                              <input 
                                type="number" 
                                placeholder="0,00"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                value={newPendencia.valor}
                                onChange={(e) => setNewPendencia({...newPendencia, valor: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Vencimento</label>
                              <input 
                                type="date" 
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                value={newPendencia.vencimento}
                                onChange={(e) => setNewPendencia({...newPendencia, vencimento: e.target.value})}
                              />
                            </div>
                            <div className="flex items-end">
                              <button 
                                onClick={addPendenciaToNewItem}
                                className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                              >
                                <Plus size={14} />
                                Adicionar Valor
                              </button>
                            </div>
                          </div>

                          {newItem.pendencias.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {newItem.pendencias.map((p) => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-700">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                                      </span>
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Calendar size={10} />
                                        Vencimento: {new Date(p.vencimento).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => removePendenciaFromNewItem(p.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Total em Aberto:</span>
                                <span className="text-sm font-bold text-rose-600">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    newItem.pendencias.reduce((acc, p) => acc + p.valor, 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={handleAddItem}
                          className="w-full py-3 bg-rose-600 text-white rounded-2xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                        >
                          Confirmar Inclusão na Block List
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Table Section */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor em Aberto</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBlockList.map((item) => (
                          <motion.tr 
                            layout
                            key={item.id} 
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800">{item.nome}</div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-600">
                              {item.cnpj}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-rose-600">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    item.pendencias.reduce((acc, p) => acc + p.valor, 0)
                                  )}
                                </span>
                                {item.pendencias.length > 0 && (
                                  <span className="text-[10px] text-slate-400">
                                    {item.pendencias.length} {item.pendencias.length === 1 ? 'pendência' : 'pendências'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                item.status === 'Bloqueado Permanente' ? "bg-rose-50 text-rose-600" :
                                item.status === 'Bloqueado Atrasos Atual' ? "bg-amber-50 text-amber-600" :
                                item.status === 'Em Análise' ? "bg-indigo-50 text-indigo-600" :
                                "bg-emerald-50 text-emerald-600"
                              )}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-start gap-3 max-w-xs group/history">
                                <div className="flex-shrink-0 mt-0.5">
                                  <button 
                                    onClick={() => setItemToView(item)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="Ver histórico completo"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2">{item.historico}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">
                              {item.dataCriacao}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setItemToEdit(item)}
                                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                  title="Editar registro"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button 
                                  onClick={() => setItemToDelete(item.id)}
                                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Excluir da lista"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                        {filteredBlockList.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                              Nenhuma empresa encontrada com os critérios de busca.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Confirmation Modal */}
                <AnimatePresence>
                  {itemToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
                      >
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                          <AlertCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Exclusão</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                          Tem certeza que deseja remover esta empresa da Block List? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setItemToDelete(null)}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => handleRemoveItem(itemToDelete)}
                            className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                          >
                            Sim, Excluir
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* View Details Modal (Second Screen) */}
                <AnimatePresence>
                  {itemToView && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-white w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                      >
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                              <ShieldAlert size={24} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">Resumo do Histórico</h3>
                              <p className="text-sm text-slate-500">Detalhes completos do registro na Block List</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setItemToView(null)}
                            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
                          >
                            <Plus size={24} className="rotate-45" />
                          </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                          {/* Info Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Empresa</p>
                              <p className="font-bold text-slate-800 truncate">{itemToView.nome}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CNPJ</p>
                              <p className="font-mono text-slate-600">{itemToView.cnpj}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data de Inclusão</p>
                              <p className="font-bold text-slate-800">{itemToView.dataCriacao}</p>
                            </div>
                          </div>

                          {/* Status Banner */}
                          <div className={cn(
                            "p-4 rounded-2xl flex items-center justify-between border",
                            itemToView.status === 'Bloqueado Permanente' ? "bg-rose-50 border-rose-100 text-rose-700" :
                            itemToView.status === 'Bloqueado Atrasos Atual' ? "bg-amber-50 border-amber-100 text-amber-700" :
                            itemToView.status === 'Em Análise' ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                            "bg-emerald-50 border-emerald-100 text-emerald-700"
                          )}>
                            <div className="flex items-center gap-3">
                              <AlertCircle size={20} />
                              <span className="font-bold">Status: {itemToView.status}</span>
                            </div>
                          </div>

                          {/* Pendências Section */}
                          {itemToView.pendencias.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-slate-800">
                                <DollarSign size={20} className="text-rose-600" />
                                <h4 className="font-bold">Pendências Financeiras</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {itemToView.pendencias.map((p) => (
                                  <div key={p.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-800">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                                      </span>
                                      <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar size={12} />
                                        Vencimento: {new Date(p.vencimento).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex justify-between items-center">
                                <span className="text-sm font-bold text-rose-700 uppercase tracking-wider">Total Acumulado:</span>
                                <span className="text-xl font-black text-rose-600">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    itemToView.pendencias.reduce((acc, p) => acc + p.valor, 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Main History Content */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-800">
                              <History size={20} className="text-indigo-600" />
                              <h4 className="font-bold">Histórico Completo</h4>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm min-h-[200px]">
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-lg">
                                {itemToView.historico || "Nenhum histórico detalhado registrado para esta empresa."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                          <button 
                            onClick={() => setItemToView(null)}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                          >
                            Fechar Detalhes
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Edit Item Modal */}
                <AnimatePresence>
                  {itemToEdit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-100"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <Pencil className="text-amber-600" size={28} />
                            Editar Empresa
                          </h3>
                          <button 
                            onClick={() => setItemToEdit(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Plus size={24} className="rotate-45" />
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ</label>
                              <input 
                                type="text" 
                                placeholder="00.000.000/0000-00"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={itemToEdit.cnpj}
                                onChange={(e) => setItemToEdit({...itemToEdit, cnpj: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Empresa</label>
                              <input 
                                type="text" 
                                placeholder="Razão Social ou Nome Fantasia"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={itemToEdit.nome}
                                onChange={(e) => setItemToEdit({...itemToEdit, nome: e.target.value})}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                            <select 
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              value={itemToEdit.status}
                              onChange={(e) => setItemToEdit({...itemToEdit, status: e.target.value as any})}
                            >
                              <option value="Bloqueado Permanente">Bloqueado Permanente</option>
                              <option value="Bloqueado Atrasos Atual">Bloqueado Atrasos Atual</option>
                              <option value="Em Análise">Em Análise</option>
                              <option value="Liberado">Liberado</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico / Motivo</label>
                            <textarea 
                              placeholder="Atualize o motivo do bloqueio ou histórico..."
                              rows={4}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              value={itemToEdit.historico}
                              onChange={(e) => setItemToEdit({...itemToEdit, historico: e.target.value})}
                            />
                          </div>

                          {/* Pendências Financeiras Section (Edit) */}
                          <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <DollarSign size={16} className="text-amber-600" />
                                Pendências Financeiras
                              </h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                                <input 
                                  type="number" 
                                  placeholder="0,00"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                  value={newEditPendencia.valor}
                                  onChange={(e) => setNewEditPendencia({...newEditPendencia, valor: e.target.value})}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Vencimento</label>
                                <input 
                                  type="date" 
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                  value={newEditPendencia.vencimento}
                                  onChange={(e) => setNewEditPendencia({...newEditPendencia, vencimento: e.target.value})}
                                />
                              </div>
                              <div className="flex items-end">
                                <button 
                                  onClick={addPendenciaToEditItem}
                                  className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                                >
                                  <Plus size={14} />
                                  Adicionar
                                </button>
                              </div>
                            </div>

                            {itemToEdit.pendencias.length > 0 && (
                              <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                {itemToEdit.pendencias.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                          <Calendar size={10} />
                                          Vencimento: {new Date(p.vencimento).toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => removePendenciaFromEditItem(p.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                                <div className="pt-2 border-t border-slate-200 flex justify-between items-center sticky bottom-0 bg-slate-50">
                                  <span className="text-xs font-bold text-slate-500 uppercase">Total:</span>
                                  <span className="text-sm font-bold text-amber-600">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                      itemToEdit.pendencias.reduce((acc, p) => acc + p.valor, 0)
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button 
                              onClick={() => setItemToEdit(null)}
                              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={handleUpdateItem}
                              className="flex-1 py-3 bg-amber-600 text-white rounded-2xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-200"
                            >
                              Salvar Alterações
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'links' && (
              <motion.div 
                key="links"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Link Consultas 🌐</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Ferramentas essenciais para a operação de Crédito PJ.</p>
                  </div>
                </div>

                {/* Interno Magalu */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building2 size={16} />
                    Sistemas Internos & Magalu
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <ConsultationCard 
                      title="Portal Luiza" 
                      description="Intranet e comunicações."
                      icon={<Globe className="text-emerald-600" />}
                      url="http://www.portal-luiza.intranet/main.jsp?lumPageId=8A488A68296CDAC701296CEACAB303EA"
                    />
                    <ConsultationCard 
                      title="Zendesk" 
                      description="Suporte e Helpdesk."
                      icon={<MessageSquare className="text-blue-600" />}
                      url="https://helpdesk.magalu.com.br/hc/pt-br"
                    />
                    <ConsultationCard 
                      title="Magacred" 
                      description="Gestão de crédito."
                      icon={<TrendingUp className="text-indigo-600" />}
                      url="https://baap-sso-login.magazineluiza.com.br/auth/?state=eabccd3341b581a5d0013cb64badac5327c8255bb1c872146a25a1f6e62f7df4&url_callback=https://baap-console.magazineluiza.com.br&application_id=5f219910654eff5d0e5790ae&message=Sess%C3%A3o%20expirou.%20Realize%20um%20novo%20login."
                    />
                    <ConsultationCard 
                      title="Magacob" 
                      description="Portal de cobrança."
                      icon={<Briefcase className="text-rose-600" />}
                      url="https://magacob.magazineluiza.com.br/login"
                    />
                    <ConsultationCard 
                      title="Cobransaas" 
                      description="Recuperação de crédito."
                      icon={<Target className="text-teal-600" />}
                      url="https://magalu.cobransaas.com.br/#/"
                    />
                    <ConsultationCard 
                      title="ML Admin" 
                      description="SisCob Admin."
                      icon={<ShieldCheck className="text-slate-600" />}
                      url="#"
                    />
                    <ConsultationCard 
                      title="Margem" 
                      description="Controle de empréstimos."
                      icon={<BarChart3 className="text-amber-600" />}
                      url="http://www.ferramentas-sp.intranet/website_controle_emprestimo/default.aspx"
                    />
                    <ConsultationCard 
                      title="Listagem de Filiais" 
                      description="Planilha oficial de filiais."
                      icon={<FileText className="text-emerald-600" />}
                      url="https://docs.google.com/spreadsheets/d/1-VC1erjYdxfwULXog5nKK9_6qhbDcc5qcuxPpj0_Nzk/edit?gid=553992869#gid=553992869"
                    />
                    <ConsultationCard 
                      title="Kirk" 
                      description="Gestão de atendimentos e tarefas."
                      icon={<MessageSquare className="text-emerald-600" />}
                      url="https://kirk.magazineluiza.com.br/attendance/to-do"
                    />
                  </div>
                </section>

                {/* Consultas Externas & Biometria */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Crédito & Biometria
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <ConsultationCard 
                      title="Link Serasa" 
                      description="Bureau e Score."
                      icon={<Search className="text-emerald-600" />}
                      url="https://empresas.serasaexperian.com.br/meus-produtos/login"
                    />
                    <ConsultationCard 
                      title="Link Biometria Unico" 
                      description="Biometria facial Unico."
                      icon={<ShieldCheck className="text-blue-600" />}
                      url="https://www2.acesso.io/MagazineLuiza/Default.aspx"
                    />
                    <ConsultationCard 
                      title="Status Sistema Unico" 
                      description="Estabilidade Unico."
                      icon={<TrendingUp className="text-amber-600" />}
                      url="https://status.unico.io/"
                    />
                    <ConsultationCard 
                      title="Chamado Help Unico" 
                      description="Suporte via Chat."
                      icon={<MessageSquare className="text-indigo-600" />}
                      url="https://empresas.unico.io/hc/pt-br/p/chat-para-empresas"
                    />
                    <ConsultationCard 
                      title="CAF Biometria" 
                      description="Análise CAF."
                      icon={<Target className="text-rose-600" />}
                      url="https://auth.caf.io/?service=management&env=prod&continue=https%3A%2F%2Ftrust.caf.io%2Fexecutions%3FcreatedDate%3DanyDate%26page%3D1&domain=caf&disconnectedReason="
                    />
                    <ConsultationCard 
                      title="Receita Federal" 
                      description="Situação Cadastral CNPJ."
                      icon={<Building2 className="text-blue-600" />}
                      url="https://servicos.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp"
                    />
                    <ConsultationCard 
                      title="CND Federal" 
                      description="Certidão de Débitos."
                      icon={<ShieldAlert className="text-rose-600" />}
                      url="https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Consultar"
                    />
                    <ConsultationCard 
                      title="Portal Empreendedor" 
                      description="Consultas MEI."
                      icon={<Users className="text-emerald-600" />}
                      url="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor"
                    />
                  </div>
                </section>

                {/* Verificação & Segurança */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Search size={16} />
                    Verificação & Segurança
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <ConsultationCard 
                      title="E-mail Checker" 
                      description="Validador de e-mails."
                      icon={<Globe className="text-blue-600" />}
                      url="https://email-checker.net/"
                    />
                    <ConsultationCard 
                      title="E-mail Hunterio" 
                      description="Hunter.io Verifier."
                      icon={<Search className="text-indigo-600" />}
                      url="https://hunter.io/email-verifier"
                    />
                    <ConsultationCard 
                      title="Check Site - Google" 
                      description="Safe Browsing Google."
                      icon={<ShieldCheck className="text-emerald-600" />}
                      url="https://transparencyreport.google.com/safe-browsing/search"
                    />
                    <ConsultationCard 
                      title="Whois Lookup" 
                      description="Propriedade de domínios."
                      icon={<Globe className="text-slate-600" />}
                      url="https://who.is/"
                    />
                    <ConsultationCard 
                      title="Google Maps" 
                      description="Localização e Fachada."
                      icon={<MapPin className="text-rose-500" />}
                      url="https://www.google.com.br/maps"
                    />
                    <ConsultationCard 
                      title="LinkedIn" 
                      description="Perfil Profissional/Empresa."
                      icon={<Linkedin className="text-blue-700" />}
                      url="https://www.linkedin.com/"
                    />
                    <ConsultationCard 
                      title="Escavador" 
                      description="Processos Judiciais."
                      icon={<Search className="text-slate-700" />}
                      url="https://www.escavador.com/"
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'awards' && (
              <motion.div 
                key="awards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto space-y-12"
              >
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Destaques da Equipe 🏆</h2>
                  <p className="text-slate-500 mt-1">Reconhecendo a excelência e o compromisso dos nossos analistas.</p>
                </div>

                {/* Destaques do Mês */}
                <section className="space-y-8">
                  {loadingHighlight ? (
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[2.5rem] p-12 text-white shadow-2xl animate-pulse flex items-center justify-center min-h-[400px]">
                      <Trophy size={64} className="opacity-20" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-8">
                      {highlightsData.length > 0 ? highlightsData.map((highlight, hIdx) => (
                        <div key={hIdx} className="space-y-8">
                          <div className={cn(
                            "bg-gradient-to-br rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden",
                            hIdx === 0 ? "from-indigo-600 to-violet-800 shadow-indigo-200" : 
                            hIdx === 1 ? "from-emerald-600 to-teal-800 shadow-emerald-200" :
                            "from-amber-500 to-orange-700 shadow-amber-200"
                          )}>
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                              <Trophy size={240} />
                            </div>
                            
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                              <div className="relative">
                                <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full"></div>
                                <img 
                                  src={highlight.photoUrl || 'https://picsum.photos/seed/highlight/400/400'} 
                                  alt={highlight.name}
                                  className="w-64 h-64 rounded-3xl object-cover border-8 border-white/20 shadow-2xl relative z-10"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${highlight.name}/400/400`;
                                  }}
                                />
                                <div className={cn(
                                  "absolute -bottom-4 -right-4 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl rotate-12",
                                  hIdx === 0 ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-900"
                                )}>
                                  <Award size={32} />
                                </div>
                              </div>

                              <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
                                  <Trophy size={16} className={hIdx === 0 ? "text-amber-400" : "text-slate-100"} />
                                  {highlight.rank || (hIdx === 0 ? '🥇 1º Lugar' : '🥈 2º Lugar')} - Destaque do Mês
                                </div>
                                
                                <h3 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
                                  {highlight.name}
                                </h3>
                                
                                <p className="text-xl text-white/90 max-w-xl leading-relaxed font-medium">
                                  Parabéns pelo excelente desempenho e dedicação! Sua contribuição é fundamental para o sucesso da nossa equipe de Crédito PJ.
                                </p>

                                <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-start">
                                  <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10">
                                    <p className="text-xs uppercase tracking-wider text-white/60 font-bold mb-1">Período</p>
                                    <p className="font-bold">Março 2026</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Mensagens Recebidas para este destaque */}
                          {highlight.messages && highlight.messages.length > 0 && (
                            <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                <MessageSquare className="text-indigo-600" size={24} />
                                <h3 className="text-2xl font-bold text-slate-800">Mensagens de Carinho para {highlight.name} 💌</h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {highlight.messages.map((msg, idx) => (
                                  <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all"
                                  >
                                    <div className="absolute -top-3 -left-3 bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">
                                      {idx + 1}
                                    </div>
                                    <p className="text-slate-700 italic leading-relaxed">
                                      "{msg}"
                                    </p>
                                    <div className="mt-4 flex justify-end">
                                      <div className="w-8 h-1 bg-indigo-100 rounded-full"></div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center">
                          <Trophy size={48} className="mx-auto text-slate-200 mb-4" />
                          <h3 className="text-xl font-bold text-slate-800">Nenhum destaque encontrado</h3>
                          <p className="text-slate-500">Aguardando a atualização dos resultados do mês.</p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Histórico de Destaques */}
                {historyData.length > 0 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <FileText className="text-indigo-600" size={24} />
                      <h3 className="text-2xl font-bold text-slate-800">Histórico de Destaques 📜</h3>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mês</th>
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Destaque</th>
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historyData.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-4">
                                  <span className="text-sm font-semibold text-slate-600 capitalize">{item.month}</span>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                      {item.highlight.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-sm font-bold text-slate-800">{item.highlight}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-4 text-right">
                                  {item.isDestacao ? (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight shadow-sm border border-amber-200">
                                      <Trophy size={12} />
                                      ⭐ DESTACÃO
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destaque</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {/* Seção Nossos Valores (Estilizada) */}
                <section className="mt-20 pt-16 border-t border-slate-200">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Nossos Valores 💙</h3>
                    <p className="text-slate-500 font-medium">O que nos move todos os dias</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
                    {[
                      { title: "Gente que gosta de gente", icon: "🧡", color: "bg-orange-50 text-orange-600 border-orange-100" },
                      { title: "Atitude de dono", icon: "🎯", color: "bg-rose-50 text-rose-600 border-rose-100" },
                      { title: "Mão na Massa", icon: "⚙️", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
                      { title: "Simplicidade e Inovação", icon: "💡", color: "bg-sky-50 text-sky-600 border-sky-100" },
                      { title: "Cliente em 1° Lugar", icon: "⭐", color: "bg-emerald-50 text-emerald-600 border-emerald-100" }
                    ].map((valor, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className={cn(
                          "p-8 rounded-[2.5rem] border-2 flex flex-col items-center text-center transition-all shadow-sm hover:shadow-xl",
                          valor.color
                        )}
                      >
                        <div className="text-4xl mb-4 drop-shadow-sm">{valor.icon}</div>
                        <h4 className="font-black text-sm uppercase leading-tight tracking-wide">
                          {valor.title}
                        </h4>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'team' && (
              <motion.div 
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                      <Bell className="text-amber-500" size={32} />
                      Recados - Atenção
                    </h2>
                    <p className="text-slate-500 mt-1">Comunicados importantes e avisos gerais para a equipe.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingRecado(true)}
                    className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-all shadow-md shadow-amber-200 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Novo Recado
                  </button>
                </div>

                {/* Add Recado Form */}
                <AnimatePresence>
                  {isAddingRecado && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white p-8 rounded-3xl border-2 border-amber-100 shadow-lg space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Plus className="text-amber-600" size={20} />
                            Novo Comunicado
                          </h3>
                          <button 
                            onClick={() => setIsAddingRecado(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            Cancelar
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="md:col-span-3 space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título</label>
                              <input 
                                type="text"
                                placeholder="Título do recado..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={newRecado.title}
                                onChange={(e) => setNewRecado({...newRecado, title: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensagem</label>
                              <textarea 
                                placeholder="Digite o comunicado aqui..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={newRecado.message}
                                onChange={(e) => setNewRecado({...newRecado, message: e.target.value})}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                  <File size={14} /> Anexar PDF
                                </label>
                                <input 
                                  type="file"
                                  accept=".pdf"
                                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const base64 = await handleFileToBase64(file);
                                      setNewRecado({...newRecado, pdfUrl: base64, pdfName: file.name});
                                    }
                                  }}
                                />
                                {newRecado.pdfName && <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1"><ShieldCheck size={10}/> {newRecado.pdfName}</p>}
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                  <ImageIcon size={14} /> Anexar Print/Imagem
                                </label>
                                <input 
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const base64 = await handleFileToBase64(file);
                                      setNewRecado({...newRecado, imageUrl: base64});
                                    }
                                  }}
                                />
                                {newRecado.imageUrl && <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1"><ShieldCheck size={10}/> Imagem selecionada</p>}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</label>
                            <select 
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              value={newRecado.priority}
                              onChange={(e) => setNewRecado({...newRecado, priority: e.target.value as any})}
                            >
                              <option value="Baixa">Baixa</option>
                              <option value="Média">Média</option>
                              <option value="Alta">Alta</option>
                            </select>
                            <button 
                              onClick={handleAddRecado}
                              className="w-full mt-4 py-3 bg-amber-600 text-white rounded-2xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-200"
                            >
                              Publicar Recado
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Edit Recado Modal */}
                <AnimatePresence>
                  {recadoToEdit && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
                      >
                        <div className="p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">Editar Recado</h3>
                            <button onClick={() => setRecadoToEdit(null)} className="text-slate-400 hover:text-slate-600">
                              <Plus className="rotate-45" size={24} />
                            </button>
                          </div>

                          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título</label>
                              <input 
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={recadoToEdit.title}
                                onChange={(e) => setRecadoToEdit({...recadoToEdit, title: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensagem</label>
                              <textarea 
                                rows={4}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={recadoToEdit.message}
                                onChange={(e) => setRecadoToEdit({...recadoToEdit, message: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</label>
                              <select 
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                value={recadoToEdit.priority}
                                onChange={(e) => setRecadoToEdit({...recadoToEdit, priority: e.target.value as any})}
                              >
                                <option value="Baixa">Baixa</option>
                                <option value="Média">Média</option>
                                <option value="Alta">Alta</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                  <File size={14} /> Alterar PDF
                                </label>
                                <input 
                                  type="file"
                                  accept=".pdf"
                                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const base64 = await handleFileToBase64(file);
                                      setRecadoToEdit({...recadoToEdit, pdfUrl: base64, pdfName: file.name});
                                    }
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                  <ImageIcon size={14} /> Alterar Print/Imagem
                                </label>
                                <input 
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const base64 = await handleFileToBase64(file);
                                      setRecadoToEdit({...recadoToEdit, imageUrl: base64});
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button 
                              onClick={() => setRecadoToEdit(null)}
                              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={handleUpdateRecado}
                              className="flex-1 py-3 bg-amber-600 text-white rounded-2xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-200"
                            >
                              Salvar Alterações
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedRecados.map((recado) => (
                    <motion.div 
                      key={recado.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            recado.priority === 'Alta' ? "bg-rose-50 text-rose-600" :
                            recado.priority === 'Média' ? "bg-amber-50 text-amber-600" :
                            "bg-emerald-50 text-emerald-600"
                          )}>
                            {recado.priority === 'Alta' ? <AlertCircle size={24} /> : 
                             recado.priority === 'Média' ? <Bell size={24} /> : 
                             <ShieldCheck size={24} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 line-clamp-1">{recado.title}</h4>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                              recado.priority === 'Alta' ? "bg-rose-100 text-rose-700" :
                              recado.priority === 'Média' ? "bg-amber-100 text-amber-700" :
                              "bg-emerald-100 text-emerald-700"
                            )}>
                              {recado.priority}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setRecadoToEdit(recado)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRecado(recado.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {recado.message}
                        </p>

                        {recado.imageUrl && (
                          <div className="relative group rounded-2xl overflow-hidden border border-slate-100">
                            <img 
                              src={recado.imageUrl} 
                              alt="Anexo" 
                              className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                              <button 
                                onClick={() => window.open(recado.imageUrl, '_blank')}
                                className="opacity-0 group-hover:opacity-100 bg-white/90 p-2 rounded-full text-slate-700 shadow-lg transition-all"
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </div>
                        )}

                        {recado.pdfUrl && (
                          <a 
                            href={recado.pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-amber-50 hover:border-amber-100 transition-all group"
                          >
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-rose-500 shadow-sm">
                              <File size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{recado.pdfName || 'Documento PDF'}</p>
                              <p className="text-[10px] text-slate-400">Clique para visualizar</p>
                            </div>
                            <ExternalLink size={14} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                          </a>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium">Postado em {recado.date}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'results' && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                      <BarChart3 className="text-indigo-600" size={32} />
                      Resultados Gestão
                    </h2>
                    <p className="text-slate-500 mt-1">Acompanhamento de metas e indicadores de desempenho.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {teamStats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
                      <p className={cn("text-3xl font-black", stat.color)}>{stat.value}</p>
                      <div className="mt-4 w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", stat.bg.replace('bg-', 'bg-').replace('-50', '-500'))} style={{ width: '70%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Volume de Análises por Dia</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kpiData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="analises" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="aprovadas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
        active 
          ? "bg-emerald-50 text-emerald-700 shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ManagementItem({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className="text-sm font-black text-slate-900">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-2.5 rounded-full", color)}
        ></motion.div>
      </div>
    </div>
  );
}

function ConsultationCard({ title, description, icon, url }: { title: string, description: string, icon: React.ReactNode, url: string }) {
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl group-hover:bg-emerald-50 transition-colors shrink-0">
          {icon}
        </div>
        <ExternalLink size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
      </div>
      <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{title}</h4>
      <p className="text-xs text-slate-500 leading-tight line-clamp-2">{description}</p>
    </a>
  );
}
