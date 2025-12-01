import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { TimeSlotPicker } from '../components/TimeSlotPicker';
import { useToastHelpers } from '../contexts/ToastContext';
import { Plus, X, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Scissors } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br'; // Import locale for moment
import type { AppointmentType, ProfessionalType, ClientType, ServiceType } from '../../shared/types';
import { AppointmentFormSchema } from '../../shared/types';
import ClientFormModal from '../components/ClientFormModal';

// --- PrimeReact Imports ---
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import 'primereact/resources/themes/tailwind-light/theme.css'; // Consider adjusting if PrimeReact theme doesn't match Tailwind themes
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './primereact-calendar-styles.css'; // Ensure this uses CSS variables

// Set moment locale globally
moment.locale('pt-br');

// --- Definição de Tipos ---
interface AppointmentFormData {
  client_id: number;
  professional_id: number;
  service_id: number;
  price: number;
  appointment_date: Date;
  end_date: Date;
  attended?: boolean;
}

const defaultFormValues: Partial<AppointmentFormData> = {
  client_id: undefined,
  professional_id: undefined,
  service_id: undefined,
  price: undefined,
  appointment_date: new Date(),
  end_date: new Date(),
  attended: false,
};

// --- Componente Principal ---
export default function Appointments() {
  const { user } = useSupabaseAuth();
  const { showSuccess, showError } = useToastHelpers();

  const {
    appointments, clients, professionals, services, loading,
    fetchAppointments, fetchClients, fetchProfessionals, fetchServices,
    addAppointment, updateAppointment, deleteAppointment
  } = useAppStore();

  const [selectedDate, setSelectedDate] = useState<Date | Date[] | undefined>(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<AppointmentType | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const {
    handleSubmit, reset, setValue, watch, control,
    formState: { errors }
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: defaultFormValues,
  });

  const watchedServiceId = watch('service_id');
  const watchedStartDate = watch('appointment_date');
  const watchedClientId = watch('client_id');
  const watchedProfessionalId = watch('professional_id');

  const selectedService = useMemo(() => {
    return services.find(s => s.id === Number(watchedServiceId));
  }, [watchedServiceId, services]);
  const serviceDuration = selectedService?.duration || 30;

  const selectedProfessional = useMemo(() => {
    return professionals.find(p => p.id === watchedProfessionalId) || null;
  }, [watchedProfessionalId, professionals]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchClients(user.id),
        fetchProfessionals(user.id),
        fetchServices(user.id),
        fetchAppointments(user.id),
      ]);
    }
  }, [user, fetchClients, fetchProfessionals, fetchServices, fetchAppointments]);

  useEffect(() => {
    if (selectedService) {
      setValue('price', selectedService.price / 100);
      if (watchedStartDate) {
        const newEndDate = moment(watchedStartDate).add(selectedService.duration, 'minutes').toDate();
        setValue('end_date', newEndDate, { shouldValidate: true });
      }
    }
  }, [watchedServiceId, watchedStartDate, services, setValue, selectedService]);

  const handleClientCreated = (newClient: ClientType) => {
    if (newClient && newClient.id) {
      setIsClientModalOpen(false);
      setValue('client_id', newClient.id, { shouldValidate: true });
      showSuccess(`Cliente "${newClient.name}" selecionado!`);
    }
  };

  const professionalOptions = useMemo(() => {
    const allOption = { id: null, name: 'Todos os Profissionais', user_id: '' };
    return [allOption, ...professionals];
  }, [professionals]);

  const currentDate = Array.isArray(selectedDate) ? selectedDate[0] : selectedDate;

  const formatHeaderDate = (date: Date | undefined) => {
    if (!date) return 'Selecione uma data';
    return moment(date).format('dddd, D [de] MMMM'); // Using moment with locale
  };


  const filteredAppointments = useMemo(() => {
    if (!currentDate) return [];

    return appointments
      .filter(app => {
        const isSameDay = moment(app.appointment_date).isSame(currentDate, 'day');
        const professionalMatch = selectedProfessionalId === null || app.professional_id === selectedProfessionalId;
        return isSameDay && professionalMatch;
      })
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  }, [appointments, currentDate, selectedProfessionalId]);

  const groupedAppointments = useMemo(() => {
    return filteredAppointments.reduce((acc, app) => {
      const time = moment(app.appointment_date).format('HH:mm');
      if (!acc[time]) acc[time] = [];
      acc[time].push(app);
      return acc;
    }, {} as Record<string, AppointmentType[]>);
  }, [filteredAppointments]);

  const handleDayNavigation = (direction: 'prev' | 'next') => {
      const newDate = moment(currentDate || new Date()).add(direction === 'prev' ? -1 : 1, 'day').toDate();
      setSelectedDate(newDate);
  }

  const handleOpenModal = (appointment?: AppointmentType, slotDate?: Date) => {
    if (appointment) {
      setEditingAppointment(appointment);
      reset({
        client_id: appointment.client_id,
        professional_id: appointment.professional_id,
        service_id: appointment.service_id,
        price: appointment.price / 100,
        appointment_date: new Date(appointment.appointment_date),
        end_date: new Date(appointment.end_date),
        attended: appointment.attended,
      });
    } else {
      setEditingAppointment(null);

      const initialDate = slotDate || (currentDate && moment(currentDate).isAfter(moment()) ? currentDate : new Date());

      reset({
          client_id: undefined,
          professional_id: selectedProfessionalId ?? undefined,
          service_id: undefined,
          price: undefined,
          attended: false,
          appointment_date: moment(initialDate).hour(9).minute(0).second(0).toDate(),
          end_date: moment(initialDate).hour(9).minute(30).second(0).toDate(),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);
    reset(defaultFormValues);
  };

  const onSubmit = async (data: AppointmentFormData) => {
     if (!user) return;
     const newStart = moment(data.appointment_date);
     const newEnd = moment(data.end_date);
     const professionalId = Number(data.professional_id);
     const conflictingAppointment = appointments.find(app => {
         if (editingAppointment && app.id === editingAppointment.id) return false;
         if (app.professional_id !== professionalId) return false;
         const existingStart = moment(app.appointment_date);
         const existingEnd = moment(app.end_date);
         return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
     });
     if (conflictingAppointment) {
         showError("Conflito de Horário", "O profissional já tem um agendamento neste horário.");
         return;
     }
     const client = clients.find(c => c.id === Number(data.client_id));
     const professional = professionals.find(p => p.id === Number(data.professional_id));
     const service = services.find(s => s.id === Number(data.service_id));
     if (!client || !professional || !service) {
         showError("Dados inválidos.", "Cliente, profissional ou serviço não encontrado.");
         return;
     }
     const appointmentData = {
       ...data,
       appointment_date: newStart.format("YYYY-MM-DD HH:mm:ss"),
       end_date: newEnd.format("YYYY-MM-DD HH:mm:ss"),
       price: Math.round(Number(data.price) * 100),
       client_id: Number(data.client_id),
       professional_id: professionalId,
       service_id: Number(data.service_id),
       client_name: client.name,
       professional: professional.name,
       service: service.name,
       attended: data.attended ?? false,
     };
     try {
       if (editingAppointment) {
         await updateAppointment({ ...editingAppointment, ...appointmentData });
         showSuccess("Agendamento atualizado!");
       } else {
         await addAppointment(appointmentData, user.id);
         showSuccess("Agendamento criado!");
       }
       handleCloseModal();
     } catch (error) {
       showError("Não foi possível salvar", "Verifique os dados e tente novamente.");
     }
  };

  const handleDeleteClick = (appointment: AppointmentType) => {
    setAppointmentToDelete(appointment);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !appointmentToDelete) return;
    try {
      await deleteAppointment(appointmentToDelete.id!);
      showSuccess("Agendamento removido!");
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
    } catch (err: any) {
      showError("Falha ao remover agendamento.");
    }
  };

  // --- Templates para Dropdowns ---
  const professionalOptionTemplate = (option: ProfessionalType | { id: null, name: string }) => {
    const isAllProfessionals = option.id === null;

    const circleStyle = isAllProfessionals
      ? { backgroundImage: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)))' } // Use variables
      : { backgroundColor: (option as ProfessionalType).color || 'hsl(var(--muted-foreground))' }; // Use variable fallback

    return (
        <div className="flex items-center">
            <div
                className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                style={circleStyle}
            />
            {/* text-foreground implicitly applied by PrimeReact styles */}
            <span>{option.name}</span>
        </div>
    );
  };

  const selectedProfessionalTemplate = (option: ProfessionalType | null, props: any) => {
      if (!option || option.id === null) return <span className="text-muted-foreground">{props.placeholder}</span>; // Use muted-foreground for placeholder
      return professionalOptionTemplate(option);
  };

  const clientOptionTemplate = (option: ClientType) => (
    <div className="flex items-center">
        <User className="w-4 h-4 mr-2 text-muted-foreground" /> {/* Use muted-foreground */}
        {/* text-foreground implicitly applied by PrimeReact styles */}
        <span>{option.name}</span>
    </div>
  );

  const serviceOptionTemplate = (option: ServiceType) => (
    <div className="flex items-center">
        <Scissors className="w-4 h-4 mr-2 text-muted-foreground" /> {/* Use muted-foreground */}
         {/* text-foreground implicitly applied by PrimeReact styles */}
        <span>{option.name}</span>
    </div>
  );

  if (loading.clients || loading.professionals || loading.services || loading.appointments) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="mt-2 text-muted-foreground">Visualize e gerencie os seus agendamentos</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
             <Dropdown
                value={professionalOptions.find(p => p.id === selectedProfessionalId) || professionalOptions[0]}
                options={professionalOptions}
                onChange={(e) => setSelectedProfessionalId(e.value ? e.value.id : null)}
                optionLabel="name"
                placeholder="Todos os Profissionais"
                valueTemplate={selectedProfessionalTemplate}
                itemTemplate={professionalOptionTemplate}
                className="w-full md:w-56" // PrimeReact class, styles applied via CSS
             />

             <Calendar
                value={currentDate}
                onChange={(e) => setSelectedDate(e.value as Date)}
                touchUI
                locale="pt-BR"
                dateFormat="dd/mm/yy"
                showIcon
                icon={<CalendarIcon className="w-5 h-5 text-muted-foreground" />} // Use muted-foreground
                inputClassName="hidden"
                // Panel styles are handled by primereact-calendar-styles.css
             />

            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="hidden sm:inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agendar
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="lg:col-span-12">
            <div className="bg-card rounded-xl shadow-sm border border-border min-h-[60vh] overflow-hidden">
              {/* Header */}
              <div className="bg-background p-6 border-b border-border"> {/* Use bg-background, border-border */}
                <div className="flex justify-between items-center">
                    <button
                    onClick={() => handleDayNavigation('prev')}
                    className="p-3 rounded-full bg-card hover:bg-accent transition-all duration-200 shadow-sm hover:shadow-md" // Use bg-card, hover:bg-accent
                  >
                    <ChevronLeft className="w-5 h-5 text-muted-foreground"/> {/* Use muted-foreground */}
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground capitalize"> {/* Use text-foreground */}
                      {formatHeaderDate(currentDate)}
                    </h2>
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="text-sm text-primary hover:underline transition-colors" // Use text-primary
                    >
                      Hoje
                    </button>
                  </div>
                    <button
                    onClick={() => handleDayNavigation('next')}
                    className="p-3 rounded-full bg-card hover:bg-accent transition-all duration-200 shadow-sm hover:shadow-md" // Use bg-card, hover:bg-accent
                  >
                    <ChevronRight className="w-5 h-5 text-muted-foreground"/> {/* Use muted-foreground */}
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {Object.keys(groupedAppointments).length === 0 ? (
                  <div className="text-center py-20">
                    <div className="bg-accent rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center"> {/* Use bg-accent */}
                      <CalendarIcon className="h-12 w-12 text-accent-foreground" /> {/* Use accent-foreground */}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum agendamento</h3> {/* Use text-foreground */}
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto"> {/* Use muted-foreground */}
                      Não há agendamentos para este dia. Que tal criar um novo agendamento?
                    </p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:brightness-110 shadow-lg hover:shadow-xl transition-all duration-200" // Use primary/secondary, primary-foreground
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Novo Agendamento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedAppointments).map(([time, apps]) => (
                      <div key={time} className="relative flex gap-x-3">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg px-3 py-1 mb-2"> {/* Use primary/secondary, primary-foreground */}
                            <p className="text-xs font-semibold">{time}</p>
                          </div>
                          <div className="relative flex h-full w-6 justify-center items-center">
                            <div className="h-full w-1 bg-gradient-to-b from-primary/20 to-secondary/20 rounded-full"></div> {/* Use primary/secondary lighter shades or accent */}
                            <div className="absolute top-0 w-5 h-5 rounded-full bg-gradient-to-r from-primary to-secondary border-2 border-card shadow-sm"></div> {/* Use border-card */}
                          </div>
                        </div>
                        <div className="flex-grow pb-6">
                          <div className="space-y-3">
                            {apps.map(app => {
                                const professional = professionals.find(p => p.id === app.professional_id);
                                const service = services.find(s => s.id === app.service_id);
                                const client = clients.find(c => c.id === app.client_id);
                                return (
                                <div
                                    key={app.id}
                                    className="bg-card p-4 rounded-xl border border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 group" // Use bg-card, border-border, hover:border-primary/20
                                    onClick={() => handleOpenModal(app)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-3">
                                          <div
                                            className="w-3 h-12 rounded-full mt-1"
                                            style={{ backgroundColor: professional?.color || 'hsl(var(--secondary))' }} // Use secondary as fallback
                                          />
                                          <div>
                                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors"> {/* Use text-foreground, group-hover:text-primary */}
                                              {service?.name || 'Serviço não encontrado'}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">{client?.name || 'Cliente não encontrado'}</p> {/* Use muted-foreground */}
                                            <div className="flex items-center mt-2">
                                              <div
                                                className="w-6 h-6 rounded-full mr-2 flex items-center justify-center text-primary-foreground text-xs font-semibold" // Use primary-foreground
                                                style={{ backgroundColor: professional?.color || 'hsl(var(--secondary))' }} // Use secondary as fallback
                                              >
                                                {professional?.name?.charAt(0) || 'P'}
                                              </div>
                                              <p className="text-xs text-muted-foreground">{professional?.name || 'Profissional não encontrado'}</p> {/* Use muted-foreground */}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                          <div className="bg-muted rounded-lg px-3 py-1"> {/* Use bg-muted */}
                                            <p className="text-sm font-medium text-foreground">{moment(app.end_date).diff(moment(app.appointment_date), 'minutes')} min</p> {/* Use text-foreground */}
                                          </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && (
           <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-overlay/75 transition-opacity" onClick={handleCloseModal}></div> {/* Use bg-overlay */}
              <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-border"> {/* Add border */}
                <form onSubmit={handleSubmit(onSubmit)}>
                   <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4"> {/* Use bg-card */}
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-medium text-foreground">{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</h3> {/* Use text-foreground */}
                       <button type="button" onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button> {/* Use muted-foreground, hover:text-foreground */}
                     </div>
                     <div className="space-y-4">
                        {/* BOTÃO MODIFICADO */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Cliente *</label> {/* Use text-foreground */}
                          <div className="flex items-center gap-2">
                            <Dropdown value={clients.find(c => c.id === watchedClientId) || null} options={clients} onChange={(e) => setValue('client_id', e.value?.id)} optionLabel="name" placeholder="Selecione um cliente" itemTemplate={clientOptionTemplate} className="w-full" filter filterPlaceholder="Buscar cliente..."/> {/* PrimeReact class */}
                            <button
                              type="button"
                              onClick={() => setIsClientModalOpen(true)}
                              className="flex-shrink-0 rounded-full bg-gradient-to-r from-primary to-secondary p-2 text-primary-foreground shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" // Use primary/secondary, primary-foreground, focus:ring-ring
                              title="Adicionar Novo Cliente"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {errors.client_id && <p className="mt-1 text-sm text-destructive">{errors.client_id.message}</p>} {/* Use text-destructive */}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Profissional *</label> {/* Use text-foreground */}
                          <Dropdown value={professionals.find(p => p.id === watchedProfessionalId) || null} options={professionals} onChange={(e) => setValue('professional_id', e.value?.id)} optionLabel="name" placeholder="Selecione um profissional" valueTemplate={selectedProfessionalTemplate} itemTemplate={professionalOptionTemplate} className="w-full" filter filterPlaceholder="Buscar profissional..." /> {/* PrimeReact class */}
                          {errors.professional_id && <p className="mt-1 text-sm text-destructive">{errors.professional_id.message}</p>} {/* Use text-destructive */}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Serviço *</label> {/* Use text-foreground */}
                          <Dropdown value={services.find(s => s.id === watchedServiceId) || null} options={services} onChange={(e) => setValue('service_id', e.value?.id)} optionLabel="name" placeholder="Selecione um serviço" itemTemplate={serviceOptionTemplate} className="w-full" filter filterPlaceholder="Buscar serviço..." /> {/* PrimeReact class */}
                           {errors.service_id && <p className="mt-1 text-sm text-destructive">{errors.service_id.message}</p>} {/* Use text-destructive */}
                        </div>

                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-foreground">Preço (R$) *</label> {/* Use text-foreground */}
                          <Controller
                              name="price"
                              control={control}
                              rules={{ required: 'O preço é obrigatório.' }}
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
                                      placeholder="R$ 50,00"
                                      className={`w-full ${fieldState.error ? 'p-invalid' : ''}`} // p-invalid handled by PrimeReact theme
                                      inputClassName="p-inputtext" // Ensure PrimeReact base style
                                  />
                              )}
                          />
                          {errors.price && <p className="mt-1 text-sm text-destructive">{errors.price.message}</p>} {/* Use text-destructive */}
                        </div>

                       <div>
                          <label htmlFor="appointment_date_date" className="block text-sm font-medium text-foreground mb-1">Data *</label> {/* Use text-foreground */}
                          <Controller
                              name="appointment_date"
                              control={control}
                              render={({ field }) => (
                                  <Calendar
                                      id="appointment_date_date"
                                      value={field.value}
                                      onChange={(e) => {
                                          const newDate = moment(e.value as Date);
                                          const currentDate = moment(field.value);
                                          currentDate.year(newDate.year()).month(newDate.month()).date(newDate.date());
                                          field.onChange(currentDate.toDate());
                                      }}
                                      minDate={!editingAppointment ? new Date() : undefined}
                                      dateFormat="dd/mm/yy"
                                      className="w-full" // PrimeReact class
                                      placeholder="DD/MM/AAAA"
                                      locale="pt-BR"
                                      showIcon
                                      // Styles handled by primereact-calendar-styles.css
                                  />
                              )}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Horário *</label> {/* Use text-foreground */}
                          <Controller
                              name="appointment_date"
                              control={control}
                              render={({ field }) => (
                                  <TimeSlotPicker
                                      selectedDate={field.value}
                                      appointments={appointments}
                                      professional={selectedProfessional}
                                      serviceDuration={serviceDuration}
                                      value={field.value}
                                      onChange={(newTimeValue: Date) => {
                                        field.onChange(newTimeValue);
                                      }}
                                  />
                              )}
                          />
                          {errors.appointment_date && <p className="mt-1 text-sm text-destructive">{errors.appointment_date.message}</p>} {/* Use text-destructive */}
                        </div>
                     </div>
                   </div>
                   <div className="bg-muted px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse items-center"> {/* Use bg-muted */}
                      <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-primary to-secondary text-base font-medium text-primary-foreground hover:brightness-110 sm:ml-3 sm:w-auto sm:text-sm"> {/* Use primary/secondary, primary-foreground */}
                       {editingAppointment ? 'Atualizar' : 'Criar'}
                     </button>
                     <button type="button" onClick={handleCloseModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-border shadow-sm px-4 py-2 bg-card text-base font-medium text-foreground hover:bg-accent sm:mt-0 sm:w-auto sm:text-sm"> {/* Use border-border, bg-card, text-foreground, hover:bg-accent */}
                       Cancelar
                     </button>
                      {editingAppointment && (
                         <button
                         type="button"
                         onClick={() => handleDeleteClick(editingAppointment)}
                         className="mt-3 sm:mt-0 mr-auto w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-destructive text-base font-medium text-destructive-foreground hover:bg-destructive/90 sm:w-auto sm:text-sm" // Use destructive colors
                         >
                         Excluir
                         </button>
                     )}
                   </div>
                </form>
              </div>
            </div>
           </div>
        )}

        <ClientFormModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onClientCreated={handleClientCreated}
          editingClient={null}
        />

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Excluir Agendamento"
          message={`Tem certeza que deseja excluir o agendamento para "${appointmentToDelete?.client_name}"?`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
        />

        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-transform duration-200" // Use primary/secondary, primary-foreground
            aria-label="Novo Agendamento"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </Layout>
  );
}