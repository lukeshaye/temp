// src/react-app/pages/Financial.tsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { supabase } from '../supabaseClient';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToastHelpers } from '../contexts/ToastContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  X,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  File as FileIcon
} from 'lucide-react';
import type { FinancialEntryType } from '../../shared/types';
import { CreateFinancialEntrySchema } from '../../shared/types';
import { formatCurrency, formatDate } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';

// --- PrimeReact Imports ---
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import 'primereact/resources/themes/tailwind-light/theme.css'; // Mantenha, pois pode conter estilos base não cobertos
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './primereact-calendar-styles.css'; // Estilos customizados que usam variáveis CSS

// --- Interfaces e Tipos ---
interface FinancialFormData {
    description: string;
    amount: number | null;
    type: 'receita' | 'despesa';
    entry_type: 'pontual' | 'fixa';
    entry_date: Date | string;
}

const defaultFormValues: FinancialFormData = {
    description: '',
    amount: null,
    type: 'receita',
    entry_type: 'pontual',
    entry_date: new Date(),
};

// --- Opções para os Dropdowns ---
const typeOptions = [
  { label: 'Receita', value: 'receita' },
  { label: 'Despesa', value: 'despesa' },
];

const frequencyOptions = [
  { label: 'Pontual', value: 'pontual' },
  { label: 'Fixa', value: 'fixa' },
];

const typeFilterOptions = [
  { label: 'Todos os Tipos', value: 'all' },
  { label: 'Receitas', value: 'receita' },
  { label: 'Despesas', value: 'despesa' },
];

const frequencyFilterOptions = [
  { label: 'Todas as Frequências', value: 'all' },
  { label: 'Pontual', value: 'pontual' },
  { label: 'Fixa', value: 'fixa' },
];


// --- Componente Principal ---
export default function Financial() {
  const { user } = useSupabaseAuth();
  const { showSuccess, showError } = useToastHelpers();

  // --- Estados ---
  const [entries, setEntries] = useState<FinancialEntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntryType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntryType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'pontual' | 'fixa'>('all');

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const [kpis, setKpis] = useState({
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    netProfit: 0,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinancialFormData>({
    resolver: zodResolver(CreateFinancialEntrySchema),
    defaultValues: defaultFormValues,
  });

  // --- Funções de Busca de Dados ---
  const fetchEntries = useCallback(async (date: Date) => {
    if (!user) return [];
    const startOfMonth = moment(date).startOf('month').format('YYYY-MM-DD');
    const endOfMonth = moment(date).endOf('month').format('YYYY-MM-DD');

    const { data: pontualData, error: pontualError } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_type', 'pontual')
      .gte('entry_date', startOfMonth)
      .lte('entry_date', endOfMonth);

    if (pontualError) throw pontualError;

    const { data: fixaData, error: fixaError } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_type', 'fixa')
      .lte('entry_date', endOfMonth);

    if (fixaError) throw fixaError;

    return [...(pontualData || []), ...(fixaData || [])];
  }, [user]);

  const calculateKPIs = useCallback((entriesForKpi: FinancialEntryType[], date: Date) => {
    const currentMonth = moment(date);

    const kpisResult = entriesForKpi.reduce((acc, entry) => {
        const entryDate = moment(entry.entry_date);

        const shouldInclude =
            (entry.entry_type === 'pontual' && entryDate.isSame(currentMonth, 'month')) ||
            (entry.entry_type === 'fixa' && entryDate.isSameOrBefore(currentMonth, 'month'));

        if (shouldInclude) {
            if (entry.type === 'receita') {
                acc.monthlyRevenue += entry.amount;
            } else if (entry.type === 'despesa') {
                acc.monthlyExpenses += entry.amount;
            }
        }
        return acc;
    }, { monthlyRevenue: 0, monthlyExpenses: 0 });

    return kpisResult;
  }, []);

  const fetchEntriesAndKPIs = useCallback(async (date: Date) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const allEntries = await fetchEntries(date);
      const kpisData = calculateKPIs(allEntries, date);

      setEntries(allEntries);
      setKpis({ ...kpisData, netProfit: kpisData.monthlyRevenue - kpisData.monthlyExpenses });

    } catch (err: any) {
      setError("Falha ao carregar dados financeiros. Tente novamente mais tarde.");
      showError("Erro ao carregar dados", err.message);
      console.error("Erro ao carregar dados financeiros:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user, fetchEntries, calculateKPIs, showError]);


  useEffect(() => {
    if (user) {
      fetchEntriesAndKPIs(currentDate);
    }
  }, [user, currentDate, fetchEntriesAndKPIs]);

  const filteredEntries = useMemo(() => {
    const currentMonth = moment(currentDate);
    return entries
      .filter(entry => {
        const entryDate = moment(entry.entry_date);
        const isPontualDoMes = entry.entry_type === 'pontual' && entryDate.isSame(currentMonth, 'month');
        const isFixaRecorrente = entry.entry_type === 'fixa' && entryDate.isSameOrBefore(currentMonth, 'month');
        return isPontualDoMes || isFixaRecorrente;
      })
      .filter(entry => typeFilter === 'all' || entry.type === typeFilter)
      .filter(entry => frequencyFilter === 'all' || entry.entry_type === frequencyFilter)
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
  }, [entries, typeFilter, frequencyFilter, currentDate]);


  // --- Manipuladores de Eventos ---
  const handlePreviousMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleCurrentMonth = () => setCurrentDate(new Date());

  const onSubmit = async (formData: FinancialFormData) => {
    if (!user || formData.amount === null) return;
    setError(null);
    const entryData = {
        ...formData,
        amount: Math.round(formData.amount * 100),
        entry_date: moment(formData.entry_date).format('YYYY-MM-DD')
    };

    try {
      if (editingEntry) {
        await supabase.from('financial_entries').update(entryData).eq('id', editingEntry.id);
        showSuccess('Entrada atualizada!');
      } else {
        await supabase.from('financial_entries').insert([{ ...entryData, user_id: user.id }]);
        showSuccess('Entrada adicionada!');
      }
      await fetchEntriesAndKPIs(currentDate);
      handleCloseModal();
    } catch (err: any) {
      setError("Erro ao salvar a entrada financeira. Verifique os dados e tente novamente.");
      showError('Erro ao salvar.');
      console.error('Erro ao salvar entrada financeira:', err.message);
    }
  };

  const handleDeleteClick = (entry: FinancialEntryType) => {
    setEntryToDelete(entry);
    setIsConfirmModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !entryToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('financial_entries').delete().eq('id', entryToDelete.id!);
      showSuccess('Entrada removida!');
      setIsConfirmModalOpen(false);
      setEntryToDelete(null);
      await fetchEntriesAndKPIs(currentDate);
    } catch (error) {
      showError('Erro ao remover entrada.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditEntry = (entry: FinancialEntryType) => {
    setEditingEntry(entry);
    reset({
        ...entry,
        amount: entry.amount / 100,
        entry_date: new Date(entry.entry_date + 'T00:00:00')
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    reset(defaultFormValues);
    setError(null);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    doc.text(`Relatório Financeiro - ${monthName}`, 14, 16);

    const tableBody = filteredEntries.map((e: FinancialEntryType) => [
      formatDate(e.entry_date),
      e.description,
      e.type === 'receita' ? 'Receita' : 'Despesa',
      e.entry_type === 'pontual' ? 'Pontual' : 'Fixa',
      formatCurrency(e.amount)
    ]);

    autoTable(doc, {
      startY: 20,
      head: [['Data', 'Descrição', 'Tipo', 'Frequência', 'Valor']],
      body: tableBody,
      didParseCell: function (data) {
        if (data.column.index === 4) {
          if (data.cell.raw && data.row.raw[2] === 'Receita') {
            data.cell.styles.textColor = [0, 128, 0]; // Cor verde para receita
          } else if (data.cell.raw && data.row.raw[2] === 'Despesa') {
            data.cell.styles.textColor = [255, 0, 0]; // Cor vermelha para despesa
          }
        }
      },
      didDrawPage: function (data) {
        const finalY = data.cursor?.y;
        if (finalY) {
            const startY = finalY + 10;
            const labelX = 14;
            const valueX = 55;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0); // Cor preta para rótulos
            doc.text('Receita Total:', labelX, startY);
            doc.setTextColor(0, 128, 0); // Cor verde
            doc.text(formatCurrency(kpis.monthlyRevenue), valueX, startY);

            doc.setTextColor(0, 0, 0);
            doc.text('Despesa Total:', labelX, startY + 5);
            doc.setTextColor(255, 0, 0); // Cor vermelha
            doc.text(formatCurrency(kpis.monthlyExpenses), valueX, startY + 5);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Lucro Líquido:', labelX, startY + 12);
            const netProfitColor = kpis.netProfit >= 0 ? [0, 128, 0] : [255, 0, 0];
            doc.setTextColor(netProfitColor[0], netProfitColor[1], netProfitColor[2]);
            doc.text(formatCurrency(kpis.netProfit), valueX, startY + 12);

            doc.setTextColor(0, 0, 0); // Resetar cor
        }
      },
    });

    doc.save(`relatorio_financeiro_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.pdf`);
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Data', 'Descrição', 'Tipo', 'Frequência', 'Valor (R$)'],
      ...filteredEntries.map((e: FinancialEntryType) => [
        formatDate(e.entry_date),
        e.description,
        e.type === 'receita' ? 'Receita' : 'Despesa',
        e.entry_type === 'pontual' ? 'Pontual' : 'Fixa',
        (e.amount / 100).toFixed(2).replace('.', ',')
      ])
    ].map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(';')).join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !isModalOpen) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  const formattedMonth = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        {/* --- CABEÇALHO --- */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="mt-2 text-muted-foreground">Controle completo das suas finanças</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 flex items-center space-x-3">
             <button type="button" onClick={handleExportPDF} className="hidden lg:inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent">
              <FileText className="w-4 h-4 mr-2" /> Exportar PDF
            </button>
            <button type="button" onClick={handleExportCSV} className="hidden lg:inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent">
              <FileIcon className="w-4 h-4 mr-2" /> Exportar CSV
            </button>
            <button type="button" onClick={() => setIsModalOpen(true)} className="hidden sm:inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110">
              <Plus className="w-4 h-4 mr-2" /> Nova Entrada
            </button>
          </div>
        </div>

        {/* --- ALERTA DE ERRO --- */}
        {error && !isModalOpen && (
          <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-md my-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-destructive mr-3" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* --- CARDS DE KPIS --- */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card overflow-hidden shadow-sm rounded-xl border border-border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-success/10 rounded-lg p-3">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Receitas do Mês</dt>
                    <dd className="text-2xl font-bold text-success">{formatCurrency(kpis.monthlyRevenue)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card overflow-hidden shadow-sm rounded-xl border border-border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Despesas do Mês</dt>
                    <dd className="text-2xl font-bold text-destructive">{formatCurrency(kpis.monthlyExpenses)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card overflow-hidden shadow-sm rounded-xl border border-border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground truncate">Lucro Líquido</dt>
                    <dd className={`text-2xl font-bold ${kpis.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(kpis.netProfit)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- TABELA E FILTROS --- */}
        <div className="mt-8">
            <div className="bg-card shadow-sm rounded-lg border border-border">
                {/* --- Cabeçalho da Tabela com Filtros --- */}
                <div className="px-4 sm:px-6 py-4 border-b border-border bg-background">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <h3 className="text-lg font-medium text-foreground whitespace-nowrap">
                      Lançamentos do Mês
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 flex-wrap">
                      {/* Navegação de Mês */}
                      <div className="flex items-center justify-center bg-card p-1 rounded-lg border border-border">
                        <button onClick={handlePreviousMonth} className="p-2 rounded-md hover:bg-accent transition-colors flex-shrink-0">
                          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </button>
                        <div className="text-center mx-2">
                          <h2 className="text-base font-semibold text-foreground capitalize whitespace-nowrap">{formattedMonth}</h2>
                          <button onClick={handleCurrentMonth} className="text-xs text-primary hover:underline">Mês Atual</button>
                        </div>
                        <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-accent transition-colors flex-shrink-0">
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </div>
                      {/* Filtros */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Dropdown
                          value={typeFilter}
                          options={typeFilterOptions}
                          onChange={(e) => setTypeFilter(e.value)}
                          className="w-full min-w-[150px]" /* PrimeReact usa suas classes */
                        />
                        <Dropdown
                          value={frequencyFilter}
                          options={frequencyFilterOptions}
                          onChange={(e) => setFrequencyFilter(e.value)}
                          className="w-full min-w-[150px]" /* PrimeReact usa suas classes */
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- Conteúdo da Tabela ou Estado Vazio --- */}
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-6">
                      <CalendarIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {typeFilter !== 'all' || frequencyFilter !== 'all'
                        ? 'Nenhuma entrada encontrada'
                        : 'Nenhum lançamento financeiro'
                      }
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {typeFilter !== 'all' || frequencyFilter !== 'all'
                        ? 'Não há lançamentos para os filtros selecionados neste mês.'
                        : 'Comece registrando suas receitas e despesas para ter um controle financeiro completo.'
                      }
                    </p>
                    {(typeFilter === 'all' && frequencyFilter === 'all') && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Nova Entrada
                      </button>
                    )}
                  </div>
                ) : (
                    <>
                        {/* --- Lista Mobile --- */}
                        <div className="lg:hidden p-4 space-y-4">
                            {filteredEntries.map((entry) => (
                                <div key={entry.id} className="bg-background p-5 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start gap-3 mb-4">
                                        <div className="flex-1">
                                          <h4 className="text-foreground font-semibold break-words">{entry.description}</h4>
                                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${entry.type === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                              {entry.type === 'receita' ? 'Receita' : 'Despesa'}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                                              {entry.entry_type}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <span className={`font-bold text-xl whitespace-nowrap ${entry.type === 'receita' ? 'text-success' : 'text-destructive'}`}>
                                            {entry.type === 'receita' ? '+' : '-'}{formatCurrency(entry.amount)}
                                          </span>
                                          <p className="text-xs text-muted-foreground mt-1">{formatDate(entry.entry_date)}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                                        <button
                                          onClick={() => handleEditEntry(entry)}
                                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-foreground bg-muted hover:bg-accent transition-colors"
                                        >
                                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => handleDeleteClick(entry)}
                                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                          Excluir
                                        </button>
                                      </div>
                                </div>
                            ))}
                        </div>
                        {/* --- Tabela Desktop --- */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Frequência</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {filteredEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-accent transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(entry.entry_date)}</td>
                                            <td className="px-6 py-4 text-sm text-foreground">{entry.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${entry.type === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                                {entry.type === 'receita' ? 'Receita' : 'Despesa'}
                                              </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                                                {entry.entry_type}
                                              </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${entry.type === 'receita' ? 'text-success' : 'text-destructive'}`}>
                                              {entry.type === 'receita' ? '+' : '-'}{formatCurrency(entry.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                              <div className="flex items-center justify-end gap-2">
                                                <button
                                                  onClick={() => handleEditEntry(entry)}
                                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg text-foreground bg-muted hover:bg-accent transition-colors"
                                                >
                                                  <Edit className="w-3.5 h-3.5 mr-1" />
                                                  Editar
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteClick(entry)}
                                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                  Excluir
                                                </button>
                                              </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* --- MENU FAB --- */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        {isFabMenuOpen && (
          <div
            className="fixed inset-0 bg-overlay/50" // Usando variável CSS para overlay
            onClick={() => setIsFabMenuOpen(false)}
            aria-hidden="true"
          ></div>
        )}
        <div className="relative flex flex-col items-end">
            <div
                className={`flex flex-col items-end gap-y-3 transition-all duration-300 ease-in-out absolute bottom-full right-0 mb-4 ${
                    isFabMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            >
                {/* Ações do FAB */}
                <div className="flex items-center gap-x-3">
                    <span className="bg-card text-foreground text-sm font-semibold px-3 py-1.5 rounded-md shadow-sm border border-border">
                        Nova Entrada
                    </span>
                    <button
                        onClick={() => { setIsModalOpen(true); setIsFabMenuOpen(false); }}
                        className="bg-card text-foreground rounded-full p-3 shadow-lg hover:bg-accent transition-colors border border-border"
                        aria-label="Nova Entrada"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex items-center gap-x-3">
                     <span className="bg-card text-foreground text-sm font-semibold px-3 py-1.5 rounded-md shadow-sm border border-border">
                        Exportar PDF
                    </span>
                    <button
                        onClick={() => { handleExportPDF(); setIsFabMenuOpen(false); }}
                        className="bg-card text-foreground rounded-full p-3 shadow-lg hover:bg-accent transition-colors border border-border"
                        aria-label="Exportar PDF"
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex items-center gap-x-3">
                    <span className="bg-card text-foreground text-sm font-semibold px-3 py-1.5 rounded-md shadow-sm border border-border">
                        Exportar CSV
                    </span>
                    <button
                        onClick={() => { handleExportCSV(); setIsFabMenuOpen(false); }}
                        className="bg-card text-foreground rounded-full p-3 shadow-lg hover:bg-accent transition-colors border border-border"
                        aria-label="Exportar CSV"
                    >
                        <FileIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {/* Botão Principal do FAB */}
            <button
                onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                className="relative z-10 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-all duration-300"
                aria-label={isFabMenuOpen ? "Fechar menu de ações" : "Abrir menu de ações"}
                aria-expanded={isFabMenuOpen}
            >
                <Plus className={`w-6 h-6 transition-transform duration-300 ${isFabMenuOpen ? 'rotate-45' : ''}`} />
            </button>
        </div>
      </div>

      {/* --- MODAL DE NOVA/EDIÇÃO DE ENTRADA --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div className="fixed inset-0 bg-overlay/75 transition-opacity" onClick={handleCloseModal}></div>
            {/* Conteúdo do Modal */}
            <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-border">
              <form onSubmit={handleSubmit(onSubmit as any)}>
                {/* Cabeçalho do Modal */}
                <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">{editingEntry ? 'Editar Entrada' : 'Nova Entrada'}</h3>
                    <button type="button" onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button>
                  </div>
                </div>
                {/* Corpo do Modal */}
                <div className="px-4 py-5 sm:p-6">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-md mb-4 flex items-center">
                      <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {/* Campos do formulário */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">Descrição *</label>
                      <Controller
                          name="description"
                          control={control}
                          rules={{ required: 'Descrição é obrigatória' }}
                          render={({ field }) => (
                            <input {...field} id="description" type="text" placeholder="Ex: Venda de produto X" className="p-inputtext p-component w-full bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring" />
                          )}
                      />
                      {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1">Valor (R$) *</label>
                      <Controller
                          name="amount"
                          control={control}
                          rules={{ required: 'Valor é obrigatório' }}
                          render={({ field, fieldState }) => (
                            <InputNumber
                                id={field.name}
                                ref={field.ref}
                                value={field.value}
                                onBlur={field.onBlur}
                                onValueChange={(e) => field.onChange(e.value)}
                                mode="currency"
                                currency="BRL"
                                locale="pt-BR"
                                placeholder="R$ 150,00"
                                className={`w-full ${fieldState.error ? 'p-invalid' : ''}`} /* Classes PrimeReact */
                                inputClassName="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring" /* Adaptação */
                            />
                          )}
                      />
                      {errors.amount && <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">Tipo *</label>
                      <Controller
                          name="type"
                          control={control}
                          render={({ field }) => (
                            <Dropdown
                                id={field.name}
                                value={field.value}
                                options={typeOptions}
                                onChange={(e) => field.onChange(e.value)}
                                placeholder="Selecione o tipo"
                                className="w-full" /* Classe PrimeReact */
                                // Os estilos internos são controlados pelo primereact-calendar-styles.css
                            />
                          )}
                      />
                       {errors.type && <p className="mt-1 text-sm text-destructive">{errors.type.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="entry_type" className="block text-sm font-medium text-foreground mb-1">Frequência *</label>
                       <Controller
                          name="entry_type"
                          control={control}
                          render={({ field }) => (
                            <Dropdown
                                id={field.name}
                                value={field.value}
                                options={frequencyOptions}
                                onChange={(e) => field.onChange(e.value)}
                                placeholder="Selecione a frequência"
                                className="w-full" /* Classe PrimeReact */
                            />
                          )}
                      />
                      {errors.entry_type && <p className="mt-1 text-sm text-destructive">{errors.entry_type.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="entry_date" className="block text-sm font-medium text-foreground mb-1">Data *</label>
                      <Controller
                          name="entry_date"
                          control={control}
                          render={({ field }) => (
                             <Calendar
                                id={field.name}
                                value={field.value ? new Date(field.value) : null}
                                onChange={(e) => field.onChange(e.value)}
                                dateFormat="dd/mm/yy"
                                className="w-full" /* Classe PrimeReact */
                                inputClassName="w-full bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring" /* Adaptação */
                                showIcon
                                icon={<CalendarIcon className="w-5 h-5 text-muted-foreground" />} // Ícone Lucide
                             />
                          )}
                      />
                      {errors.entry_date && <p className="mt-1 text-sm text-destructive">{errors.entry_date.message}</p>}
                    </div>
                  </div>
                </div>
                {/* Rodapé do Modal */}
                <div className="bg-muted px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-border">
                  <button type="submit" disabled={isSubmitting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-primary to-secondary text-base font-medium text-primary-foreground hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                    {isSubmitting ? 'Salvando...' : (editingEntry ? 'Atualizar' : 'Criar')}
                  </button>
                  <button type="button" onClick={handleCloseModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-border shadow-sm px-4 py-2 bg-background text-base font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Entrada Financeira"
        message={`Tem certeza que deseja excluir a entrada "${entryToDelete?.description}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
}