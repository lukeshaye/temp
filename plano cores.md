Okay, aqui está um plano detalhado que você pode fornecer a outra LLM, explicando o objetivo e as tarefas restantes para finalizar o sistema de temas do seu projeto SalonFlow:

---

### **Plano para LLM: Finalização do Sistema de Temas Dinâmicos (SalonFlow)**

**1. Objetivo Principal:**
O objetivo é completar a implementação de um sistema de temas dinâmicos numa aplicação React (SalonFlow) que usa Tailwind CSS e variáveis CSS. O sistema deve permitir que toda a identidade visual da aplicação (cores de fundo, texto, botões, cards, modais, etc.) seja alterada de forma consistente apenas modificando uma classe CSS na tag `<html>`. A base do sistema já está implementada (variáveis CSS, configuração Tailwind, temas definidos em `index.css`), mas alguns componentes ainda contêm cores estáticas que precisam ser refatoradas.

**2. Contexto Técnico:**
* **Tecnologias:** React, TypeScript, Tailwind CSS, PrimeReact.
* **Sistema de Temas:** Baseado em variáveis CSS semânticas (e.g., `--background`, `--foreground`, `--primary`, `--card`, `--border`, `--destructive`) definidas em `src/react-app/index.css`.
* **Tailwind:** Configurado em `tailwind.config.js` para usar essas variáveis, criando classes como `bg-card`, `text-foreground`, `border-border`.
* **PrimeReact:** Estilos customizados em `src/react-app/pages/primereact-calendar-styles.css` foram parcialmente adaptados para usar as variáveis CSS.
* **Refatoração Parcial:** Muitas páginas e componentes já foram atualizados para usar as classes semânticas.

**3. Tarefa Principal:**
Identificar e substituir **todas** as ocorrências restantes de **cores estáticas** (hardcoded, e.g., `text-gray-500`, `bg-white`, `border-red-300`, `focus:ring-pink-500`) pelos seus equivalentes **semânticos** baseados nas variáveis CSS (e.g., `text-muted-foreground`, `bg-card`, `border-destructive`, `focus:ring-ring`). O objetivo é garantir que *nenhum* elemento visual utilize uma cor fixa que não responda à mudança de tema.

**4. Ficheiros a Editar (Aproximadamente 12):**
Os seguintes ficheiros `.tsx` contêm ocorrências de cores estáticas que precisam ser refatoradas:

1.  `src/react-app/pages/Appointments.tsx`
2.  `src/react-app/pages/Clients.tsx`
3.  `src/react-app/pages/Financial.tsx`
4.  `src/react-app/pages/Products.tsx`
5.  `src/react-app/pages/ProfessionalDetail.tsx` *(Nota: Contém um bloco `<style>` com cores fixas que precisa ser tratado)*
6.  `src/react-app/pages/Professionals.tsx`
7.  `src/react-app/pages/Services.tsx`
8.  `src/react-app/pages/Settings.tsx`
9.  `src/react-app/components/ClientFormModal.tsx`
10. `src/react-app/components/ProfessionalFormModal.tsx`
11. `src/react-app/components/LoadingSpinner.tsx`
12. `src/react-app/components/ErrorBoundary.tsx`

**5. Guia de Substituição (Exemplos Comuns):**

* `text-gray-900`/`800`/`700` (textos principais) -> `text-foreground`
* `text-gray-600`/`500`/`400` (textos secundários, ícones, placeholders) -> `text-muted-foreground`
* `bg-white` (em cards, modais, popups) -> `bg-card`
* `bg-gray-50`/`100` (fundos sutis, hovers) -> `bg-muted` ou `bg-accent` / `hover:bg-accent`
* `border-gray-XXX` -> `border-border`
* `text-red-XXX`, `bg-red-XXX`, `border-red-XXX` (erros, exclusão) -> `text-destructive`, `bg-destructive/10`, `border-destructive`
* `text-green-XXX`, `bg-green-XXX` (sucesso) -> `text-success`, `bg-success/10`
* `text-amber-XXX`, `bg-amber-XXX` (avisos) -> `text-warning`, `bg-warning/10`
* `ring-gray-300` -> `ring-border`
* `focus:ring-pink-500`, `focus:border-pink-500` -> `focus:ring-ring`, `focus:border-ring`
* `bg-gradient-to-r from-pink-500 to-violet-500` -> `bg-gradient-to-r from-primary to-secondary`
* `text-white` (em botões primários/secundários) -> `text-primary-foreground` / `text-secondary-foreground`
* Gradientes decorativos claros (e.g., `from-pink-50`) -> `bg-primary/10`, `bg-secondary/10`, `bg-muted` ou `bg-accent`
* **Especial:** No bloco `<style>` de `ProfessionalDetail.tsx`, substituir cores fixas (e.g., `#d1d5db`) por `hsl(var(--border))` ou refatorar para usar classes Tailwind.

**6. Verificação:**
Após a refatoração, testar a aplicação mudando a classe na tag `<html>` em `index.html` para `theme-light`, `theme-yellow-dark`, etc. Verificar se **todos** os elementos visuais (textos, fundos, bordas, ícones, formulários, modais, toasts) se adaptam corretamente às cores do tema ativo, sem inconsistências.

**7. Resultado Esperado:**
Uma aplicação React completamente "tematizável", onde a alteração de uma única classe CSS resulta na aplicação consistente de uma nova paleta de cores em toda a interface do utilizador, sem a necessidade de modificar código nos componentes.

---