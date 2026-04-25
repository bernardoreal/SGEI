# Convenções de Desenvolvimento e Stack de Ferramentas - LATAM Cargo

Este documento descreve as decisões arquitetônicas, stack tecnológica e convenções de desenvolvimento para o sistema de Gestão de Escalas da LATAM Cargo. Siga estas diretrizes ao adicionar novas funcionalidades ou modificar o sistema.

## Stack Tecnológica

- **Framework Principal:** Next.js 15+ (App Router, Server e Client Components)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS v4
- **Ícones:** lucide-react
- **Animações:** motion (Framer Motion)
- **Gráficos e Visualização de Dados:** recharts
- **Backend & Banco de Dados:** Supabase (PostgreSQL, Authentication via `@supabase/ssr` e `@supabase/supabase-js`)
- **Manipulação de Dados e Arquivos:** jspdf, jspdf-autotable, xlsx e pdf-parse

## Convenções de Estilização e UI/UX (Design System)

- **Cores Oficiais:** Utilize a paleta de cores da marca, referenciada nas classes Tailwind via variáveis customizadas, se presentes (ex: indigo, crimson).
- **Comportamento Responsivo:** Siga o padrão mobile-first do Tailwind, porém desenhe os painéis primariamente para **desktop/telas grandes**, já que se trata de uma ferramenta operacional de controle de malha. Maximize a utilização de grids e sidebars expansivas.
- **Modo Escuro (Dark Mode):** O sistema suporta dark mode utilizando classes do Tailwind (ex: `dark:bg-slate-900`, `dark:text-white`). Valide o contraste em ambos os temas ao criar qualquer novo componente.
- **Fronteiras e Sombras:** O design utiliza interfaces limpas, arredondadas (frequentemente `rounded-2xl` ou `rounded-3xl` e `border-slate-100 dark:border-slate-700`) e efeitos subtis de sombra para profundidade nos painéis e gráficos.

## Arquitetura de Componentes e Next.js

- **Server vs Client Components:** 
  - Prefira **Server Components** por padrão na pasta `app/`.
  - Utilize a diretiva `'use client'` estritamente no topo dos arquivos cujos componentes exigem interatividade imediata (`useState`, `useEffect`, Eventos de onClick/onChange), consumo de formulário ou instâncias como os gráficos de `recharts`.
- **Roteamento Autenticado:** Utilize a pasta `app/dashboard/` para conter as telas relativas à área logada com validação automática de estado.
- Utilize a lib de utilidades (geralmente com o helper `cn()`) para compor dinamicamente as classes do Tailwind ao condicionar estilos (`clsx` / `tailwind-merge`).

## Estrutura de Diretórios e Integração (Supabase)

- **`/app`:** Estruturação de Rotas e Telas UI em arquitetura de árvore do Next.js.
- **`/components`:** Componentes reutilizáveis isolados (Modais, Cartões, Listas, Tabelas).
- **`/lib` & `/utils`:** Utilitários de setup, formatação e clientes HTTP / BD.
- A aplicação utiliza o **Supabase** para controle de Autenticação, Roles e consultas no Postgres.
- Regra de ouro de DB: Ao instanciar clientes de conexão com Supabase dentro de server actions e layouts/renderização no servidor, utilize o construtor correto adaptado para SSR. No cliente, invoque apenas instâncias seguras geradas para front-end. Nunca exporte `NEXT_PUBLIC_SUPABASE_ANON_KEY` para usos indiscriminados sem passar pelos helpers apropriados.
