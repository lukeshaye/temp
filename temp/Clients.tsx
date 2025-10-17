// src/react-app/pages/Clients.tsx

import { useState, useEffect, useMemo } from 'react';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToastHelpers } from '../contexts/ToastContext';
import { Users, Plus, Edit, Trash2, Phone, Mail, Search, Cake, UserSquare } from 'lucide-react'; // Ícones adicionados
import { FaWhatsapp } from 'react-icons/fa';
import type { ClientType } from '../../shared/types';
import ClientFormModal from '../components/ClientFormModal';
import { differenceInYears } from 'date-fns'; // Import para calcular a idade

/**
 * Página para gerir os clientes (Criar, Ler, Atualizar, Apagar).
 */
export default function Clients() {
  const { user } = useSupabaseAuth();
  const {
    clients,
    loading,
    fetchClients,
    deleteClient
  } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClients(user.id);
    }
  }, [user, fetchClients]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) {
      return clients;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return clients.filter((client: ClientType) =>
      client.name.toLowerCase().includes(lowercasedTerm) ||
      client.email?.toLowerCase().includes(lowercasedTerm) ||
      client.phone?.toLowerCase().includes(lowercasedTerm)
    );
  }, [clients, searchTerm]);

  const handleDeleteClick = (client: ClientType) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !clientToDelete) return;

    setIsDeleting(true);
    try {
      await deleteClient(clientToDelete.id!);
      showSuccess('Cliente removido!', 'O cliente foi removido da sua base de dados.');
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', (error as Error).message);
      showError('Erro ao remover cliente', 'Tente novamente ou contacte o suporte se o problema persistir.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const handleEditClient = (client: ClientType) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const sendWhatsAppMessage = (client: ClientType) => {
    if (!client.phone) return;
    const message = `Olá, ${client.name}! Tudo bem?`;
    const phoneNumber = client.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const calculateAge = (birthDate: Date | string | null | undefined) => {
    if (!birthDate) return null;
    const date = birthDate instanceof Date ? birthDate : new Date(birthDate);
    return differenceInYears(new Date(), date);
  };

  if (loading.clients) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
       <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="mt-2 text-muted-foreground">Gerencie a sua base de clientes</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={handleNewClient}
            className="hidden sm:inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md shadow-sm focus:ring-ring focus:border-ring bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-8">
          {filteredClients.length === 0 ? (
            <div className="text-center py-16">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <Users className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {searchTerm
                    ? 'Tente ajustar os termos de busca para encontrar o que procura.'
                    : 'Comece adicionando clientes à sua base de dados para gerenciar agendamentos e histórico.'
                    }
                </p>
                {!searchTerm && (
                    <button
                        type="button"
                        onClick={handleNewClient}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:brightness-110 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Adicionar Primeiro Cliente
                    </button>
                )}
            </div>
          ) : (
            <>
              {/* --- VISÃO DESKTOP (GRID) --- */}
              <div className="hidden lg:grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {filteredClients.map((client) => {
                  const age = calculateAge(client.birth_date);
                  return (
                    <div
                      key={client.id}
                      className="bg-card text-foreground overflow-hidden shadow-sm rounded-xl border border-border hover:shadow-lg hover:border-ring transition-all duration-200 flex flex-col group"
                    >
                      {/* Header com avatar */}
                      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4"> {/* MUDADO: bg-gradient */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{client.name}</h3> {/* MUDADO: group-hover:text-primary */}
                              {client.gender && (
                                <p className="text-sm text-muted-foreground capitalize">{client.gender}</p>
                              )}
                            </div>
                          </div>
                          {client.phone && (
                              <button
                                  onClick={() => sendWhatsAppMessage(client)}
                                  title="Enviar mensagem no WhatsApp"
                                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-success/30 text-xs font-medium rounded-lg text-success bg-background hover:bg-success/5 transition-all duration-200 shadow-sm hover:shadow-md" // MUDADO: bg-background, hover:bg-success/5
                              >
                                  <FaWhatsapp className="w-4 h-4" />
                                  <span>WhatsApp</span>
                              </button>
                          )}
                        </div>
                      </div>

                      <div className="px-6 py-4 flex-grow">
                        <div className="grid grid-cols-2 gap-3">
                          {client.phone && (
                            <div className="bg-background rounded-lg p-3"> {/* MUDADO: bg-background */}
                              <div className="flex items-center mb-1">
                                <Phone className="w-4 h-4 mr-2 text-primary" /> {/* MUDADO: text-primary */}
                                <span className="text-xs font-medium text-muted-foreground">Telefone</span>
                              </div>
                              <p className="text-sm font-semibold text-foreground">{client.phone}</p>
                            </div>
                          )}
                          {client.email && (
                            <div className="bg-background rounded-lg p-3"> {/* MUDADO: bg-background */}
                              <div className="flex items-center mb-1">
                                <Mail className="w-4 h-4 mr-2 text-success" />
                                <span className="text-xs font-medium text-muted-foreground">Email</span>
                              </div>
                              <p className="text-sm font-semibold text-foreground truncate">{client.email}</p>
                            </div>
                          )}
                          {age !== null && (
                            <div className="bg-background rounded-lg p-3"> {/* MUDADO: bg-background */}
                              <div className="flex items-center mb-1">
                                <Cake className="w-4 h-4 mr-2 text-primary" /> {/* MUDADO: text-primary (era pink) */}
                                <span className="text-xs font-medium text-muted-foreground">Idade</span>
                              </div>
                              <p className="text-sm font-semibold text-foreground">{age} anos</p>
                            </div>
                          )}
                          {client.gender && (
                            <div className="bg-background rounded-lg p-3"> {/* MUDADO: bg-background */}
                              <div className="flex items-center mb-1">
                                <UserSquare className="w-4 h-4 mr-2 text-secondary" /> {/* MUDADO: text-secondary (era violet) */}
                                <span className="text-xs font-medium text-muted-foreground">Gênero</span>
                              </div>
                              <p className="text-sm font-semibold text-foreground capitalize">{client.gender}</p>
                            </div>
                          )}
                        </div>
                        {client.notes && (
                          <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning"> {/* MUDADO: border-warning */}
                            <div className="flex items-center mb-1">
                              <span className="text-xs font-medium text-warning">Observações</span>
                            </div>
                            <p className="text-sm text-warning italic">"{client.notes}"</p>
                          </div>
                        )}
                      </div>
                      <div className="px-6 py-4 bg-background border-t border-border flex items-center gap-3"> {/* MUDADO: bg-background */}
                        <button
                          onClick={() => handleEditClient(client)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-border shadow-sm text-sm font-medium rounded-lg text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200" // MUDADO: bg-background
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-destructive/30 shadow-sm text-sm font-medium rounded-lg text-destructive bg-background hover:bg-destructive/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive transition-all duration-200" // MUDADO: bg-background, hover:bg-destructive/5
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* --- VISÃO MOBILE (LISTA DE CARDS) --- */}
              <div className="lg:hidden space-y-4">
                {filteredClients.map((client) => {
                  const age = calculateAge(client.birth_date);
                  return (
                    <div key={client.id} className="bg-card text-foreground overflow-hidden p-4 rounded-lg shadow-sm border border-border flex flex-col">
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-foreground break-words pr-2">{client.name}</h3>
                            {client.phone && (
                                <button
                                    onClick={() => sendWhatsAppMessage(client)}
                                    title="Enviar mensagem no WhatsApp"
                                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 border border-success/30 text-xs font-medium rounded-md text-success bg-background hover:bg-success/5 transition-colors" // MUDADO: bg-background, hover:bg-success/5
                                >
                                    <FaWhatsapp className="w-4 h-4" />
                                    <span>Wpp</span>
                                </button>
                            )}
                        </div>
                        {client.phone && (
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                            <Phone className="w-3 h-3 flex-shrink-0"/> {client.phone}
                          </p>
                        )}
                        {client.email && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Mail className="w-3 h-3 flex-shrink-0"/> {client.email}
                          </p>
                        )}
                        {age !== null && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Cake className="w-3 h-3 flex-shrink-0"/> {age} anos
                          </p>
                        )}
                        {client.gender && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 capitalize">
                            <UserSquare className="w-3 h-3 flex-shrink-0"/> {client.gender}
                          </p>
                        )}
                        {client.notes && (
                          <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border italic">"{client.notes}"</p> {/* MUDADO: border-border */}
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2"> {/* MUDADO: border-border */}
                        <button
                          onClick={() => handleEditClient(client)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-border text-xs font-medium rounded-md text-foreground bg-background hover:bg-accent" // MUDADO: bg-background
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-destructive/30 text-xs font-medium rounded-md text-destructive bg-background hover:bg-destructive/5" // MUDADO: bg-background, hover:bg-destructive/5
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <ClientFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          editingClient={editingClient}
          onClientCreated={() => {}}
        />

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Excluir Cliente"
          message={`Tem certeza que deseja excluir o cliente "${clientToDelete?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          isLoading={isDeleting}
        />

        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={handleNewClient}
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-transform duration-200"
            aria-label="Novo Cliente"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </Layout>
  );
}