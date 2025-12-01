// src/react-app/pages/ProfessionalDetail.tsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { supabase } from '../supabaseClient';
import {
    BarChart, Calendar, XCircle, DollarSign, ArrowLeft, Plus, Trash2, Save,
    Users, TrendingUp, Scissors, X
} from 'lucide-react';
import type { ProfessionalType } from '../../shared/types';
import { useToastHelpers } from '../contexts/ToastContext';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { formatCurrency } from '../utils';
import moment from 'moment';

// --- Tipos para os dados do componente ---

interface OverviewData {
    totalAppointments: number;
    totalRevenue: number;
    topServices: { service: string; count: number }[];
    topClients: { client_name: string; count: number }[];
}

interface ProfessionalAbsence {
  id: number;
  date: string;
  reason: string | null;
}

interface ProfessionalException {
    id: number;
    start_date: string;
    end_date: string;
    description: string;
}

interface AbsenceFormData {
    date: string;
    reason: string;
}

interface ExceptionFormData {
    start_date: string;
    end_date: string;
    description: string;
}

interface ScheduleFormData {
  schedules: {
    day_of_week: number;
    start_time: string | null;
    end_time: string | null;
    lunch_start_time: string | null;
    lunch_end_time: string | null;
  }[];
}

interface FinancialSummary {
    commissionEarnings: number;
    totalAppointments: number;
}


const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira' }, { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' }, { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' }, { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

type Period = 'weekly' | 'monthly' | 'yearly';

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { professionals, fetchProfessionals } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  const [professional, setProfessional] = useState<ProfessionalType | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [absences, setAbsences] = useState<ProfessionalAbsence[]>([]);
  const [exceptions, setExceptions] = useState<ProfessionalException[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isDeleteAbsenceModalOpen, setIsDeleteAbsenceModalOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<ProfessionalAbsence | null>(null);
  const [isDeleteExceptionModalOpen, setIsDeleteExceptionModalOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<ProfessionalException | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<'absence' | 'exception' | null>(null);

  const absenceForm = useForm<AbsenceFormData>({ defaultValues: { date: new Date().toISOString().split('T')[0], reason: '' } });
  const exceptionForm = useForm<ExceptionFormData>({ defaultValues: { start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], description: '' }});
  const scheduleForm = useForm<ScheduleFormData>({ defaultValues: { schedules: DAYS_OF_WEEK.map(day => ({ day_of_week: day.value, start_time: null, end_time: null, lunch_start_time: null, lunch_end_time: null }))}});
  const { fields } = useFieldArray({ control: scheduleForm.control, name: "schedules" });

    const loadProfessionalData = useCallback(async (currentPeriod: Period) => {
        const professionalId = Number(id);
        if (!user || !id || isNaN(professionalId)) {
            navigate('/professionals');
            return;
        }

        setLoading(true);
        try {
            let foundProfessional = professionals.find(p => p.id === professionalId);
            if (!foundProfessional) {
                await fetchProfessionals(user.id);
                foundProfessional = useAppStore.getState().professionals.find(p => p.id === professionalId);
            }
            if (!foundProfessional) throw new Error("Profissional não encontrado");
            setProfessional(foundProfessional);

            let startDate: moment.Moment;
            const endDate = moment().endOf('day');

            switch (currentPeriod) {
                case 'weekly':
                    startDate = moment().startOf('week');
                    break;
                case 'yearly':
                    startDate = moment().startOf('year');
                    break;
                case 'monthly':
                default:
                    startDate = moment().startOf('month');
                    break;
            }

            const [appointmentsRes, absencesRes, exceptionsRes, schedulesRes] = await Promise.all([
                supabase.from('appointments').select('price, service, client_name').eq('professional_id', professionalId).eq('attended', true).gte('appointment_date', startDate.toISOString()).lte('appointment_date', endDate.toISOString()),
                supabase.from('professional_absences').select('*').eq('professional_id', professionalId).order('date', { ascending: false }),
                supabase.from('professional_exceptions').select('*').eq('professional_id', professionalId).order('start_date', { ascending: false }),
                supabase.from('professional_schedules').select('*').eq('professional_id', professionalId),
            ]);

            if (appointmentsRes.error) throw appointmentsRes.error;
            if (absencesRes.error) throw absencesRes.error;
            if (exceptionsRes.error) throw exceptionsRes.error;
            if (schedulesRes.error) throw schedulesRes.error;

            const attendedAppointments = appointmentsRes.data || [];
            const totalRevenue = attendedAppointments.reduce((sum, app) => sum + app.price, 0);

            const serviceCounts = attendedAppointments.reduce((acc, app) => {
                acc[app.service] = (acc[app.service] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const topServices = Object.entries(serviceCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([service, count]) => ({ service, count }));

            const clientCounts = attendedAppointments.reduce((acc, app) => {
                acc[app.client_name] = (acc[app.client_name] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const topClients = Object.entries(clientCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([client_name, count]) => ({ client_name, count }));

            setOverviewData({
                totalAppointments: attendedAppointments.length,
                totalRevenue,
                topServices,
                topClients,
            });

            const commissionEarnings = totalRevenue * (foundProfessional.commission_rate || 0);
            setFinancialSummary({ commissionEarnings, totalAppointments: attendedAppointments.length });

            const scheduleData = DAYS_OF_WEEK.map(day => {
                const existing = schedulesRes.data?.find(s => s.day_of_week === day.value);
                return existing || { day_of_week: day.value, start_time: null, end_time: null, lunch_start_time: null, lunch_end_time: null };
            });
            scheduleForm.reset({ schedules: scheduleData });

            setAbsences(absencesRes.data || []);
            setExceptions(exceptionsRes.data || []);

        } catch (error) {
            showError('Erro ao carregar detalhes', (error as Error).message);
            navigate('/professionals');
        } finally {
            setLoading(false);
        }
    }, [id, user, professionals, navigate, showError, fetchProfessionals, scheduleForm]);

    useEffect(() => {
        loadProfessionalData(period);
    }, [period, loadProfessionalData]);

    const openAddModal = (type: 'absence' | 'exception') => {
        setModalContent(type);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setModalContent(null);
        absenceForm.reset({ date: new Date().toISOString().split('T')[0], reason: '' });
        exceptionForm.reset({ start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], description: '' });
    };

    const onAddAbsence = async (formData: AbsenceFormData) => {
        if (!user || !professional) return;
        try {
            const { data, error } = await supabase.from('professional_absences').insert({ professional_id: professional.id, user_id: user.id, date: formData.date, reason: formData.reason }).select();
            if (error) throw error;
            if (data) setAbsences(prev => [data[0], ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            showSuccess("Falta registrada!");
            closeAddModal();
        } catch (error) { showError("Erro ao registrar falta", (error as Error).message); }
    };

    const onAddException = async (formData: ExceptionFormData) => {
        if (!user || !professional) return;
        try {
            const { data, error } = await supabase.from('professional_exceptions').insert({ professional_id: professional.id, user_id: user.id, ...formData }).select();
            if (error) throw error;
            if (data) setExceptions(prev => [data[0], ...prev].sort((a,b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
            showSuccess("Exceção registrada!");
            closeAddModal();
        } catch (error) { showError("Erro ao registrar exceção", (error as Error).message); }
    };

    const handleDeleteAbsenceConfirm = async () => {
        if (!user || !absenceToDelete) return;
        try {
            const { error } = await supabase.from('professional_absences').delete().eq('id', absenceToDelete.id);
            if (error) throw error;
            setAbsences(prev => prev.filter(a => a.id !== absenceToDelete.id));
            showSuccess("Falta removida!");
        } catch (error) { showError("Erro ao remover falta", (error as Error).message);
        } finally {
            setIsDeleteAbsenceModalOpen(false);
            setAbsenceToDelete(null);
        }
    };

    const handleDeleteExceptionConfirm = async () => {
        if (!user || !exceptionToDelete) return;
        try {
            const { error } = await supabase.from('professional_exceptions').delete().eq('id', exceptionToDelete.id);
            if (error) throw error;
            setExceptions(prev => prev.filter(e => e.id !== exceptionToDelete.id));
            showSuccess("Exceção removida!");
        } catch (error) { showError("Erro ao remover exceção", (error as Error).message);
        } finally {
            setIsDeleteExceptionModalOpen(false);
            setExceptionToDelete(null);
        }
    };

    const onSaveSchedule = async (formData: ScheduleFormData) => {
        if (!user || !professional) return;
        try {
            const schedulesToUpsert = formData.schedules.map(s => ({
                professional_id: professional.id,
                user_id: user.id,
                day_of_week: s.day_of_week,
                start_time: s.start_time || null,
                end_time: s.end_time || null,
                lunch_start_time: s.lunch_start_time || null,
                lunch_end_time: s.lunch_end_time || null,
            }));

            const { error } = await supabase.from('professional_schedules').upsert(schedulesToUpsert, { onConflict: 'professional_id, day_of_week' });
            if (error) throw error;
            showSuccess("Horários salvos com sucesso!");
        } catch (error) {
            showError("Erro ao salvar horários", (error as Error).message);
        }
    };

  if (loading && !professional) return <Layout><LoadingSpinner /></Layout>;
  if (!professional) return <Layout><p className="text-center py-10 text-foreground">Profissional não encontrado.</p></Layout>;

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart }, { id: 'absences', label: 'Faltas', icon: XCircle },
    { id: 'financial', label: 'Financeiro', icon: DollarSign }, { id: 'schedule', label: 'Horários', icon: Calendar },
  ];

  const renderContent = () => {
    switch (activeTab) {
        case 'overview':
            const maxServiceCount = Math.max(...overviewData?.topServices.map(s => s.count) || [1]);
            const maxClientCount = Math.max(...overviewData?.topClients.map(c => c.count) || [1]);
            return (
                <div className="space-y-6">
                    {/* Seletor de período melhorado */}
                    <div className="flex justify-center sm:justify-end">
                        <div className="bg-card rounded-lg shadow-sm border border-border p-1">
                            <div className="flex items-center">
                                <button
                                    onClick={() => setPeriod('weekly')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                        period === 'weekly'
                                            ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    }`}
                                >
                                    Semanal
                                </button>
                                <button
                                    onClick={() => setPeriod('monthly')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                        period === 'monthly'
                                            ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    }`}
                                >
                                    Mensal
                                </button>
                                <button
                                    onClick={() => setPeriod('yearly')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                        period === 'yearly'
                                            ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    }`}
                                >
                                    Anual
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <LoadingSpinner/>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Card de desempenho principal */}
                            <div className="lg:col-span-1">
                                <div className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
                                    <div className="flex items-center mb-6">
                                        <div className="bg-accent rounded-lg p-3 mr-4">
                                            <TrendingUp className="h-6 w-6 text-accent-foreground" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-foreground">Desempenho</h4>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-success/10 rounded-lg p-4 border border-success/20"> {/* Added border */}
                                            <p className="text-sm font-medium text-success mb-1">Total Faturado</p>
                                            <p className="text-3xl font-bold text-success">{formatCurrency(overviewData?.totalRevenue || 0)}</p>
                                        </div>
                                        <div className="bg-accent rounded-lg p-4 border border-border"> {/* Added border */}
                                            <p className="text-sm font-medium text-foreground mb-1">Atendimentos</p>
                                            <p className="text-3xl font-bold text-primary">{overviewData?.totalAppointments || 0}</p>
                                        </div>
                                        <div className="bg-accent rounded-lg p-4 border border-border"> {/* Added border */}
                                            <p className="text-sm font-medium text-foreground mb-1">Ticket Médio</p>
                                            <p className="text-3xl font-bold text-secondary">
                                                {formatCurrency((overviewData?.totalAppointments || 0) > 0 ? (overviewData?.totalRevenue || 0) / overviewData!.totalAppointments : 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cards de rankings */}
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <RankingCard title="Serviços Mais Realizados" icon={Scissors} data={overviewData?.topServices} labelKey="service" valueKey="count" maxCount={maxServiceCount} />
                                <RankingCard title="Clientes Mais Frequentes" icon={Users} data={overviewData?.topClients} labelKey="client_name" valueKey="count" maxCount={maxClientCount} />
                            </div>
                        </div>
                    )}
                </div>
            );
        case 'absences':
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="hidden md:block md:col-span-1">
                        <h4 className="text-lg font-medium text-foreground mb-4">Registrar Nova Falta</h4>
                        <form onSubmit={absenceForm.handleSubmit(onAddAbsence)} className="space-y-4 bg-background p-4 rounded-lg border border-border">
                            <div> <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">Data *</label> <Controller name="date" control={absenceForm.control} render={({ field }) => (<input type="date" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm"/>)}/> </div> {/* Added rounded-md shadow-sm */}
                            <div> <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1">Motivo (opcional)</label> <Controller name="reason" control={absenceForm.control} render={({ field }) => (<textarea {...field} rows={3} className="input bg-input text-foreground border-border rounded-md shadow-sm" placeholder="Ex: Consulta médica"/>)}/> </div> {/* Added rounded-md shadow-sm */}
                            <button type="submit" disabled={absenceForm.formState.isSubmitting} className="w-full btn-primary rounded-lg shadow-sm"> <Plus className="w-4 h-4 mr-2"/> {absenceForm.formState.isSubmitting ? 'Registrando...' : 'Registrar'} </button> {/* Added rounded-lg shadow-sm */}
                        </form>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-lg font-medium text-foreground mb-4">Histórico de Faltas ({absences.length})</h4>
                        {absences.length === 0 ? (<p className="text-center py-10 text-muted-foreground bg-background rounded-lg border border-border">Nenhuma falta registrada.</p>) : (<ul className="space-y-3 max-h-96 overflow-y-auto pr-2"> {absences.map(absence => (<li key={absence.id} className="bg-card p-3 rounded-md border border-border flex justify-between items-center hover:bg-accent transition-colors"> <div> <p className="font-medium text-foreground">{new Date(absence.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p> <p className="text-sm text-muted-foreground italic">{absence.reason || 'Sem motivo especificado'}</p> </div> <button onClick={() => { setAbsenceToDelete(absence); setIsDeleteAbsenceModalOpen(true); }} className="text-destructive hover:text-destructive p-1 rounded-full hover:bg-destructive/10"> <Trash2 className="w-4 h-4"/> </button> </li>))} </ul>)}
                    </div>
                </div>
            );
        case 'financial':
            const salary = professional.salary || 0;
            const commission = financialSummary?.commissionEarnings || 0;
            const totalEarnings = salary + commission;
            return <div className="max-w-2xl mx-auto"> <h4 className="text-lg font-medium text-foreground mb-4"> Resumo Financeiro - {moment().format('MMMM [de] YYYY')} </h4> <div className="bg-card border border-border rounded-lg shadow-sm divide-y divide-border"> <div className="p-4 flex justify-between items-center"> <p className="text-muted-foreground">Salário Base</p> <p className="font-semibold text-foreground">{formatCurrency(salary)}</p> </div> <div className="p-4 flex justify-between items-center"> <p className="text-muted-foreground">Taxa de Comissão</p> <p className="font-semibold text-foreground">{(professional.commission_rate || 0) * 100}%</p> </div> <div className="p-4 flex justify-between items-center bg-background"> <p className="text-muted-foreground"> Ganhos com Comissão ({financialSummary?.totalAppointments} atendimentos) </p> <p className="font-semibold text-success">{formatCurrency(commission)}</p> </div> <div className="p-4 flex justify-between items-center text-lg bg-muted rounded-b-lg"> <p className="font-bold text-foreground">Ganhos Totais no Mês</p> <p className="font-bold text-primary">{formatCurrency(totalEarnings)}</p> </div> </div> </div>; // Added rounded-b-lg
        case 'schedule':
            return (
                <div className="space-y-8">
                    <form onSubmit={scheduleForm.handleSubmit(onSaveSchedule)}>
                        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                            <h4 className="text-lg font-medium text-foreground mb-6">Horário Padrão de Trabalho</h4>
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center bg-background p-3 rounded-md border border-border">
                                        <label className="text-sm font-medium text-foreground md:col-span-1">{DAYS_OF_WEEK.find(d => d.value === field.day_of_week)?.label}</label>
                                        <div className="col-span-2 md:col-span-2 flex items-center gap-2"> <input type="time" {...scheduleForm.register(`schedules.${index}.start_time`)} className="input-time bg-input text-foreground border-border rounded-md shadow-sm"/> <span className="text-muted-foreground">-</span> <input type="time" {...scheduleForm.register(`schedules.${index}.end_time`)} className="input-time bg-input text-foreground border-border rounded-md shadow-sm"/> </div> {/* Added rounded-md shadow-sm */}
                                        <div className="col-span-2 md:col-span-2 flex items-center gap-2"> <input type="time" {...scheduleForm.register(`schedules.${index}.lunch_start_time`)} className="input-time bg-input text-foreground border-border rounded-md shadow-sm" placeholder="Almoço Início"/> <span className="text-muted-foreground">-</span> <input type="time" {...scheduleForm.register(`schedules.${index}.lunch_end_time`)} className="input-time bg-input text-foreground border-border rounded-md shadow-sm" placeholder="Almoço Fim"/> </div> {/* Added rounded-md shadow-sm */}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button type="submit" disabled={scheduleForm.formState.isSubmitting} className="btn-primary rounded-lg shadow-sm"> {/* Added rounded-lg shadow-sm */}
                                    <Save className="w-4 h-4 mr-2"/> {scheduleForm.formState.isSubmitting ? 'Salvando...' : 'Salvar Horários'}
                                </button>
                            </div>
                        </div>
                    </form>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="hidden md:block md:col-span-1">
                             <h4 className="text-lg font-medium text-foreground mb-4">Registrar Férias/Folga</h4>
                             <form onSubmit={exceptionForm.handleSubmit(onAddException)} className="space-y-4 bg-background p-4 rounded-lg border border-border">
                                <div> <label className="label text-foreground mb-1">Descrição *</label> <Controller name="description" control={exceptionForm.control} render={({ field }) => (<input type="text" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm" placeholder="Ex: Férias de Verão"/>)}/> </div> {/* Added rounded-md shadow-sm */}
                                <div className="grid grid-cols-2 gap-4"> <div> <label className="label text-foreground mb-1">Data Início *</label> <Controller name="start_date" control={exceptionForm.control} render={({ field }) => (<input type="date" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm"/>)}/> </div> <div> <label className="label text-foreground mb-1">Data Fim *</label> <Controller name="end_date" control={exceptionForm.control} render={({ field }) => (<input type="date" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm"/>)}/> </div> </div> {/* Added rounded-md shadow-sm */}
                                <button type="submit" disabled={exceptionForm.formState.isSubmitting} className="w-full btn-primary rounded-lg shadow-sm"> <Plus className="w-4 h-4 mr-2"/> {exceptionForm.formState.isSubmitting ? 'Registrando...' : 'Registrar Exceção'} </button> {/* Added rounded-lg shadow-sm */}
                             </form>
                        </div>
                        <div className="md:col-span-2">
                            <h4 className="text-lg font-medium text-foreground mb-4">Histórico de Exceções ({exceptions.length})</h4>
                            {exceptions.length === 0 ? (<p className="text-center py-10 text-muted-foreground bg-background rounded-lg border border-border">Nenhuma exceção registrada.</p>) : (<ul className="space-y-3 max-h-72 overflow-y-auto pr-2"> {exceptions.map(exception => (<li key={exception.id} className="bg-card p-3 rounded-md border border-border flex justify-between items-center hover:bg-accent transition-colors"> <div> <p className="font-medium text-foreground">{exception.description}</p> <p className="text-sm text-muted-foreground">{moment(exception.start_date).format('DD/MM/YY')} - {moment(exception.end_date).format('DD/MM/YY')}</p> </div> <button onClick={() => { setExceptionToDelete(exception); setIsDeleteExceptionModalOpen(true); }} className="text-destructive hover:text-destructive p-1 rounded-full hover:bg-destructive/10"> <Trash2 className="w-4 h-4"/> </button> </li>))} </ul>)}
                        </div>
                    </div>
                </div>
            );
      default: return null;
    }
  };

  return (
    <Layout>
        {/* REMOVED INLINE STYLE BLOCK - Classes moved to elements */}
        <div className="px-4 sm:px-6 lg:px-8 pb-24">
            {/* Header melhorado */}
            <div className="mb-8">
                <Link to="/professionals" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 group transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Voltar para todos os profissionais
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg"
                            style={{ backgroundColor: professional.color || 'hsl(var(--secondary))' }} // Use secondary as fallback
                        >
                            {professional.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{professional.name}</h1>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                {professional.commission_rate && (
                                    <span className="flex items-center">
                                        <TrendingUp className="w-4 h-4 mr-1" />
                                        {(professional.commission_rate * 100).toFixed(1)}% comissão
                                    </span>
                                )}
                                {professional.salary && (
                                    <span className="flex items-center">
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        R$ {(professional.salary / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navegação das abas melhorada */}
            <div className="bg-card rounded-lg shadow-sm border border-border mb-6">
                <div className="sm:hidden">
                    <nav className="flex space-x-1 p-1" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-md font-medium text-sm transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                }`}
                            >
                                <tab.icon className="mr-2 h-4 w-4" />
                                <span className="hidden xs:inline">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="hidden sm:block">
                    <nav className="flex space-x-1 p-1" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                }`}
                            >
                                <tab.icon className="mr-2 h-5 w-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="mt-8">{renderContent()}</div>
        </div>

        {(activeTab === 'absences' || activeTab === 'schedule') && (
            <div className="lg:hidden fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => openAddModal(activeTab === 'absences' ? 'absence' : 'exception')}
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-transform duration-200"
                    aria-label={activeTab === 'absences' ? 'Registrar Falta' : 'Registrar Exceção'}
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>
        )}

        {isAddModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen p-4 text-center">
                    <div className="fixed inset-0 bg-overlay/75" onClick={closeAddModal}></div>
                    <div className="inline-block bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full border border-border">
                        {modalContent === 'absence' && (
                            <form onSubmit={absenceForm.handleSubmit(onAddAbsence)}>
                                <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                  <div className="flex items-center justify-between mb-4">
                                      <h3 className="text-lg font-medium text-foreground">Registrar Nova Falta</h3>
                                      <button type="button" onClick={closeAddModal} className="text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button>
                                  </div>
                                   <div className="space-y-4">
                                      <div> <label htmlFor="date" className="label text-foreground mb-1">Data *</label> <Controller name="date" control={absenceForm.control} render={({ field }) => (<input type="date" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm"/>)}/> </div> {/* Added rounded-md shadow-sm */}
                                      <div> <label htmlFor="reason" className="label text-foreground mb-1">Motivo (opcional)</label> <Controller name="reason" control={absenceForm.control} render={({ field }) => (<textarea {...field} rows={3} className="input bg-input text-foreground border-border rounded-md shadow-sm" placeholder="Ex: Consulta médica"/>)}/> </div> {/* Added rounded-md shadow-sm */}
                                  </div>
                                </div>
                                <div className="bg-background px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button type="submit" disabled={absenceForm.formState.isSubmitting} className="btn-primary w-full sm:w-auto rounded-lg shadow-sm"> {absenceForm.formState.isSubmitting ? 'Registrando...' : 'Registrar'} </button> {/* Added rounded-lg shadow-sm */}
                                    <button type="button" onClick={closeAddModal} className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-border shadow-sm px-4 py-2 bg-card text-base font-medium text-foreground hover:bg-accent sm:mr-3">Cancelar</button>
                                </div>
                            </form>
                        )}
                        {modalContent === 'exception' && (
                            <form onSubmit={exceptionForm.handleSubmit(onAddException)}>
                                <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <h3 className="text-lg font-medium text-foreground">Registrar Férias/Folga</h3>
                                      <button type="button" onClick={closeAddModal} className="text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button>
                                  </div>
                                   <div className="space-y-4">
                                      <div> <label className="label text-foreground mb-1">Descrição *</label> <Controller name="description" control={exceptionForm.control} render={({ field }) => (<input type="text" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm" placeholder="Ex: Férias de Verão"/>)}/> </div> {/* Added rounded-md shadow-sm */}
                                      <div className="grid grid-cols-2 gap-4"> <div> <label className="label text-foreground mb-1">Data Início *</label> <Controller name="start_date" control={exceptionForm.control} render={({ field }) => (<input type="date" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm"/>)}/> </div> <div> <label className="label text-foreground mb-1">Data Fim *</label> <Controller name="end_date" control={exceptionForm.control} render={({ field }) => (<input type="date" {...field} className="input bg-input text-foreground border-border rounded-md shadow-sm"/>)}/> </div> </div> {/* Added rounded-md shadow-sm */}
                                  </div>
                                </div>
                                <div className="bg-background px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button type="submit" disabled={exceptionForm.formState.isSubmitting} className="btn-primary w-full sm:w-auto rounded-lg shadow-sm"> {exceptionForm.formState.isSubmitting ? 'Registrando...' : 'Registrar Exceção'} </button> {/* Added rounded-lg shadow-sm */}
                                    <button type="button" onClick={closeAddModal} className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-border shadow-sm px-4 py-2 bg-card text-base font-medium text-foreground hover:bg-accent sm:mr-3">Cancelar</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        )}

      <ConfirmationModal isOpen={isDeleteAbsenceModalOpen} onClose={() => setIsDeleteAbsenceModalOpen(false)} onConfirm={handleDeleteAbsenceConfirm} title="Excluir Registro de Falta" message={`Tem certeza que deseja remover o registro de falta do dia ${absenceToDelete ? new Date(absenceToDelete.date + 'T00:00:00').toLocaleDateString('pt-BR') : ''}?`} confirmText="Excluir" variant="danger" />
      <ConfirmationModal isOpen={isDeleteExceptionModalOpen} onClose={() => setIsDeleteExceptionModalOpen(false)} onConfirm={handleDeleteExceptionConfirm} title="Excluir Exceção" message={`Tem certeza que deseja remover o registro de "${exceptionToDelete?.description}"?`} confirmText="Excluir" variant="danger" />
    </Layout>
  );
}

// Added type annotation for props
interface RankingCardProps {
    title: string;
    icon: React.ElementType;
    data: any[] | null | undefined; // More specific type if possible
    labelKey: string;
    valueKey: string;
    maxCount: number;
}

const RankingCard = ({ title, icon: Icon, data, labelKey, valueKey, maxCount }: RankingCardProps) => ( // Destructured props
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center mb-6">
            <div className="bg-primary/10 rounded-lg p-3 mr-4 border border-primary/20"> {/* Added border */}
                <Icon className="h-6 w-6 text-primary" /> {/* Use primary color */}
            </div>
            <h4 className="text-lg font-semibold text-foreground">{title}</h4>
        </div>
        {data && data.length > 0 ? (
            <ul className="space-y-4">
                {data.map((item: any, index: number) => {
                    const percentage = maxCount > 0 ? (item[valueKey] / maxCount) * 100 : 0;
                    // Simplified colors using chart variables
                    const chartColors = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];
                    const bgColor = `bg-${chartColors[index % chartColors.length]}/10`;
                    const gradientColor = `from-${chartColors[index % chartColors.length]} to-${chartColors[(index + 1) % chartColors.length]}`; // Cycle through chart colors

                    return (
                        <li key={index} className={`${bgColor} rounded-lg p-3 border border-border`}> {/* Added border */}
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-semibold text-foreground truncate pr-2">
                                    {item[labelKey]}
                                </p>
                                <div className="flex items-center">
                                    <span className="text-lg font-bold text-foreground mr-2">{item[valueKey]}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {percentage.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                            <div className="bg-muted rounded-full h-2 shadow-inner border border-border"> {/* Added border */}
                                <div
                                    className={`bg-gradient-to-r ${gradientColor} h-2 rounded-full transition-all duration-500 ease-out`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>
        ) : (
            <div className="text-center py-12">
                <div className="bg-accent rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-border"> {/* Added border */}
                    <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground font-medium">Nenhum dado disponível</p>
                <p className="text-xs text-muted-foreground mt-1">para o período selecionado</p>
            </div>
        )}
    </div>
);