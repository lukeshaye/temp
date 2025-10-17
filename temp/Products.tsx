import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseAuth } from '@/react-app/auth/SupabaseAuthProvider';
import { useAppStore } from '@/shared/store';
import Layout from '@/react-app/components/Layout';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import ConfirmationModal from '@/react-app/components/ConfirmationModal';
import { useToastHelpers } from '@/react-app/contexts/ToastContext';
import { Package, Plus, Edit, Trash2, AlertTriangle, X, Search, DollarSign, Hash, Link as LinkIcon } from 'lucide-react';
import type { ProductType } from '@/shared/types';
import { CreateProductSchema } from '@/shared/types';
import { formatCurrency } from '@/react-app/utils';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';

// --- Definição de Tipos ---
interface ProductFormData {
  name: string;
  description?: string;
  price: number | null;
  quantity?: number | null;
  image_url?: string;
}

// Valores padrão para o formulário
const defaultFormValues: ProductFormData = {
  name: '',
  description: '',
  price: null,
  quantity: null,
  image_url: '',
};

/**
 * Página para gerir os produtos do catálogo.
 */
export default function Products() {
  const { user } = useSupabaseAuth();
  const {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(CreateProductSchema) as any,
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (user) {
      fetchProducts(user.id);
    }
  }, [user, fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return products.filter((product: ProductType) =>
      product.name.toLowerCase().includes(lowercasedTerm) ||
      product.description?.toLowerCase().includes(lowercasedTerm)
    );
  }, [products, searchTerm]);

  const onSubmit = async (formData: ProductFormData) => {
    if (!user) return;

    const productData = {
      ...formData,
      price: Math.round(Number(formData.price) * 100),
      quantity: formData.quantity ?? 0,
    };

    try {
      if (editingProduct) {
        await updateProduct({ ...editingProduct, ...productData });
        showSuccess('Produto atualizado!', 'As alterações foram salvas com sucesso.');
      } else {
        await addProduct(productData, user.id);
        showSuccess('Produto adicionado!', 'O novo produto foi adicionado ao seu catálogo.');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar produto:', (error as Error).message);
      showError('Erro ao salvar produto', 'Tente novamente ou contacte o suporte se o problema persistir.');
    }
  };

  const handleDeleteClick = (product: ProductType) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !productToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id!);
      showSuccess('Produto removido!', 'O produto foi removido do seu catálogo.');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir produto:', (error as Error).message);
      showError('Erro ao remover produto', 'Tente novamente ou contacte o suporte se o problema persistir.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const handleEditProduct = (product: ProductType) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      description: product.description || '',
      price: product.price / 100,
      quantity: product.quantity || 0,
      image_url: product.image_url || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    reset(defaultFormValues);
  };



  const isLowStock = (quantity: number | null | undefined) => (quantity ?? 0) <= 5;

  if (loading.products) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
            <p className="mt-2 text-muted-foreground">Gerencie o seu catálogo de produtos</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
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
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md shadow-sm focus:ring-ring focus:border-ring bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>


        <div className="mt-8">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm
                  ? 'Tente ajustar os termos de busca.'
                  : 'Comece adicionando produtos ao seu catálogo.'
                }
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-gradient-to-r from-primary to-secondary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Produto
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* --- VISÃO DESKTOP (GRID) --- */}
              <div className="hidden lg:grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product: ProductType) => (
                  <div
                    key={product.id}
                    className="bg-card overflow-hidden shadow-sm rounded-xl border border-border hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="h-48 w-full overflow-hidden bg-muted">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                          {product.description && (
                            <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                          )}
                        </div>
                        {isLowStock(product.quantity) && (
                          <div className="flex items-center ml-3">
                            {/* Mudado: text-amber-500 para text-warning */}
                            <AlertTriangle className="w-5 h-5 text-warning" />
                             {/* Mudado: text-amber-700 para text-warning */}
                            <span className="text-xs text-warning ml-1">Estoque baixo</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-success">
                          {formatCurrency(product.price)}
                        </div>
                        {/* Mudado: condicional text-warning e text-muted-foreground */}
                        <div className={`text-sm ${isLowStock(product.quantity) ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                          Estoque: {product.quantity || 0}
                        </div>
                      </div>
                    </div>

                    {/* Mudado: bg-gray-50 para bg-background */}
                    <div className="px-6 py-4 bg-background border-t border-border flex justify-between space-x-3">
                      <button
                        onClick={() => handleEditProduct(product)}
                        // Mudado: text-gray-700 bg-white hover:bg-gray-50 para text-foreground bg-card hover:bg-accent
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-border shadow-sm text-sm font-medium rounded-lg text-foreground bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Editar
                      </button>

                      <button
                        onClick={() => handleDeleteClick(product)}
                        // Mudado: border-red-300 text-red-700 hover:bg-red-50 focus:ring-red-500 para border-destructive text-destructive bg-card hover:bg-destructive/10 focus:ring-destructive
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-destructive shadow-sm text-sm font-medium rounded-lg text-destructive bg-card hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- VISÃO MOBILE (LISTA DE CARDS) --- */}
              <div className="lg:hidden space-y-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-card p-5 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
                    <div className="h-32 w-full overflow-hidden rounded-md mb-4 bg-muted">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center">
                                <Package className="w-12 h-12 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground break-words">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-lg text-success">{formatCurrency(product.price)}</p>
                         {/* Mudado: condicional text-warning e text-muted-foreground */}
                        <div className={`text-sm mt-1 ${isLowStock(product.quantity) ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                          Estoque: {product.quantity || 0}
                        </div>
                      </div>
                    </div>
                     {/* Mudado: border-gray-100 para border-border */}
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        // Mudado: text-gray-700 bg-white hover:bg-gray-50 para text-foreground bg-card hover:bg-accent
                        className="inline-flex items-center px-3 py-2 border border-border text-xs font-medium rounded-lg text-foreground bg-card hover:bg-accent transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product)}
                        // Mudado: border-red-300 text-red-700 hover:bg-red-50 para border-destructive text-destructive bg-card hover:bg-destructive/10
                        className="inline-flex items-center px-3 py-2 border border-destructive text-xs font-medium rounded-lg text-destructive bg-card hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Mudado: bg-gray-500 para bg-overlay */}
              <div className="fixed inset-0 bg-overlay/75 transition-opacity" onClick={handleCloseModal}></div>

              <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit(onSubmit as any)}>
                  <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-foreground">
                        {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                      </h3>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        // Mudado: text-gray-400 hover:text-gray-500 para text-muted-foreground hover:text-foreground
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        {/* Mudado: text-gray-700 para text-foreground */}
                        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                          Nome *
                        </label>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    {/* Mudado: text-gray-400 para text-muted-foreground */}
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                    <InputText
                                        id={field.name}
                                        {...field}
                                        placeholder="Ex: Shampoo Hidratante"
                                        className={`w-full pl-10 ${fieldState.error ? 'p-invalid' : ''}`}
                                    />
                                </span>
                            )}
                        />
                         {/* Mudado: text-red-600 para text-destructive */}
                        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
                      </div>

                      <div>
                        {/* Mudado: text-gray-700 para text-foreground */}
                        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                          Descrição
                        </label>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState }) => (
                                <InputTextarea
                                    id={field.name}
                                    {...field}
                                    value={field.value ?? ''}
                                    rows={3}
                                    placeholder="Shampoo para cabelos secos, 250ml"
                                    className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                />
                            )}
                        />
                         {/* Mudado: text-red-600 para text-destructive */}
                        {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           {/* Mudado: text-gray-700 para text-foreground */}
                          <label htmlFor="price" className="block text-sm font-medium text-foreground mb-1">
                            Preço (R$) *
                          </label>
                          <Controller
                            name="price"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    {/* Mudado: text-gray-400 para text-muted-foreground */}
                                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                                    <InputNumber
                                        id={field.name}
                                        ref={field.ref}
                                        value={field.value}
                                        onBlur={field.onBlur}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        placeholder="R$ 45,50"
                                        className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                        inputClassName="w-full pl-10"
                                    />
                                </span>
                            )}
                          />
                           {/* Mudado: text-red-600 para text-destructive */}
                          {errors.price && <p className="mt-1 text-sm text-destructive">{errors.price.message}</p>}
                        </div>

                        <div>
                           {/* Mudado: text-gray-700 para text-foreground */}
                          <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-1">
                            Quantidade *
                          </label>
                          <Controller
                            name="quantity"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    {/* Mudado: text-gray-400 para text-muted-foreground */}
                                    <Hash className="h-5 w-5 text-muted-foreground" />
                                    <InputNumber
                                        id={field.name}
                                        ref={field.ref}
                                        value={field.value}
                                        onBlur={field.onBlur}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        placeholder="20"
                                        className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                        inputClassName="w-full pl-10"
                                    />
                                </span>
                            )}
                          />
                           {/* Mudado: text-red-600 para text-destructive */}
                          {errors.quantity && <p className="mt-1 text-sm text-destructive">{errors.quantity.message}</p>}
                        </div>
                      </div>

                      <div>
                         {/* Mudado: text-gray-700 para text-foreground */}
                        <label htmlFor="image_url" className="block text-sm font-medium text-foreground mb-1">
                          URL da Imagem
                        </label>
                        <Controller
                            name="image_url"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    {/* Mudado: text-gray-400 para text-muted-foreground */}
                                    <LinkIcon className="h-5 w-5 text-muted-foreground" />
                                    <InputText
                                        id={field.name}
                                        {...field}
                                        value={field.value ?? ''}
                                        className={`w-full pl-10 ${fieldState.error ? 'p-invalid' : ''}`}
                                        placeholder="https://exemplo.com/imagem.jpg"
                                    />
                                </span>
                            )}
                        />
                         {/* Mudado: text-red-600 para text-destructive */}
                        {errors.image_url && <p className="mt-1 text-sm text-destructive">{errors.image_url.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Mudado: bg-gray-50 para bg-background */}
                  <div className="bg-background px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      // Mudado: gradiente, text-white, hover, focus
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-primary to-secondary text-base font-medium text-primary-foreground hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : (editingProduct ? 'Atualizar' : 'Criar')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      // Mudado: border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-pink-500
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-border shadow-sm px-4 py-2 bg-card text-base font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Excluir Produto"
          message={`Tem certeza que deseja excluir o produto "${productToDelete?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          isLoading={isDeleting}
        />

        {/* --- BOTÃO DE AÇÃO FLUTUANTE (FAB) PARA MOBILE --- */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsModalOpen(true)}
            // Mudado: gradiente, text-white
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-transform duration-200"
            aria-label="Novo Produto"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </Layout>
  );
}