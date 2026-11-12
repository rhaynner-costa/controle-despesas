# Especificação Técnica: Aplicativo Android de Controle de Despesas (Offline-First)

## 0. Diretrizes de Execução e Governança (Regras Estritas para a IA)
* **Postura:** Seja estritamente técnico, direto e objetivo. Vá direto ao ponto sem introduções longas ou explicações redundantes.
* **Arquitetura e Boas Práticas (OOP / Clean Code):**
  * Aplique **Programação Orientada a Objetos (OOP/POO)** com TypeScript (classes, encapsulamento, interfaces/contratos e métodos coesos).
  * Separe claramente as responsabilidades: **Domain/Models** (regras e validações), **Repositories** (SQLite), **Services** (casos de uso e cálculos) e **UI/Screens** (apenas apresentação).
  * Mantenha o equilíbrio: aplique princípios SOLID onde agregarem clareza, mas **sem excesso de engenharia (KISS / YAGNI)** — evite fábricas abstratas desnecessárias ou hierarquias profundas.
* **Sem Fallbacks Desnecessários:** Implemente exatamente a stack e os fluxos definidos. Não crie lógicas alternativas silenciosas ou camadas de compatibilidade não solicitadas. Se algo falhar, lance/retorne o erro real de forma explícita.
* **Fluxo de Aprovação Obrigatório (Workflow):**
  1. Leia e compreenda a demanda (e consulte o progresso atual em `PLANO_ETAPAS.md`).
  2. Apresente **apenas** a proposta técnica / plano de ação de forma objetiva.
  3. **PARE e aguarde.** Você está proibido de criar, editar ou gerar blocos de código de implementação antes da minha aprovação explícita da solução apresentada.
  4. Ao concluir qualquer etapa ou subetapa aprovada, atualize imediatamente o status no arquivo `PLANO_ETAPAS.md`.

---

## 1. Visão Geral e Ambiente
* **Objetivo:** Desenvolver um aplicativo mobile nativo para Android focado no controle financeiro pessoal e categorização de despesas.
* **Arquitetura:** 100% Offline-First (todos os dados residem localmente no dispositivo).
* **Distribuição:** O projeto deve ser estruturado para permitir a compilação de um arquivo `.apk` standalone para instalação direta em dispositivos Android.
* **Ambiente de Desenvolvimento Local (macOS Apple Silicon M3, 16GB RAM + SSD Externo `/Volumes/extFiles`):**
  * **Arquivo de Perfil do Shell:** `/Users/rc/.zprofile` (não utilizar `~/.zshrc`).
  * **Java JDK (`JAVA_HOME`):** OpenJDK 17 em `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` (exigido pelo Gradle do React Native / Expo).
  * **Android SDK (`ANDROID_HOME`):** `/Volumes/extFiles/Android/sdk` (binários em `$ANDROID_HOME/platform-tools`, `$ANDROID_HOME/emulator` e `$ANDROID_HOME/cmdline-tools/latest/bin`).
  * **Android Studio:** `/Volumes/extFiles/Aplicativos/Android Studio.app`.
  * **Caches no SSD Externo (SSD interno com pouco espaço — manter caches em `/Volumes/extFiles`):**
    * `GRADLE_USER_HOME="/Volumes/extFiles/Android/.gradle"`
    * `npm_config_cache="/Volumes/extFiles/Android/.npm-cache"`

## 2. Stack Tecnológica Obrigatória
* **Framework Mobile:** React Native com Expo (SDK mais recente).
* **Linguagem:** TypeScript (uso obrigatório de Classes, Interfaces, Modificadores de Acesso `private`/`public`/`readonly` e tipagem estrita).
* **Interface e Design System:** `react-native-paper` (Material Design para Android) + `@expo/vector-icons` e `@react-native-community/datetimepicker` (para seleção nativa de datas retroativas).
* **Navegação:** `@react-navigation/native`, `@react-navigation/native-stack` e `@react-navigation/bottom-tabs`.
* **Banco de Dados Local:** SQLite (`expo-sqlite`).
* **Gerenciamento de Arquivos / Backup:** `expo-file-system`, `expo-sharing` e `expo-document-picker` (para exportação e importação de JSON).
* **Gráficos:** `react-native-gifted-charts` (compatível com Expo).
* **Identificadores Únicos:** `expo-crypto` para geração de UUID v4.

## 3. Arquitetura de Interface (UI) e Navegação
* **Desacoplamento:** Componentes React funcionais atuam exclusivamente como camada de visualização. Toda regra de negócio, cálculo percentual ou query SQL deve estar encapsulada nas classes `Service` e `Repository`.
* **Fluxo de Navegação:**
  1. **AuthStack (Não autenticado):** Tela de Login e Tela de Cadastro de Usuário.
  2. **AppTabs (Autenticado - Barra Inferior):**
     * **Aba 1 - Resultados (Dashboard):** Seletor de Mês/Ano, gráfico de distribuição por categoria, total geral do mês e lista resumida (categoria, valor total e %).
     * **Aba 2 - Despesas:** Listagem cronológica das despesas ativas do mês selecionado + botão de ação flutuante (FAB) para novo lançamento (modal/tela de cadastro) + ação de exclusão lógica com confirmação.
     * **Aba 3 - Categorias:** Listagem e formulário simples para criar/editar categorias do usuário.
     * **Aba 4 - Dados/Perfil:** Botões para Exportar JSON, Importar JSON, Limpar Dados (com diálogo de confirmação dupla) e Sair (Logout).

## 4. Modelagem de Dados (Schema SQLite)
Banco relacional com integridade referencial e isolamento estrito por usuário:

1. **Tabela `users`:**
   * `id` (TEXT, Primary Key) - Formato UUID v4.
   * `username` (TEXT, Unique, Not Null).
   * `password` (TEXT, Not Null) - Hash SHA-256 via `expo-crypto`.
   * `created_at` (TEXT, Not Null) - Timestamp ISO 8601.

2. **Tabela `categories`:**
   * `id` (TEXT, Primary Key) - Formato UUID v4.
   * `user_id` (TEXT, Foreign Key -> `users.id`, Not Null).
   * `name` (TEXT, Not Null).
   * `color` (TEXT, Optional) - Código Hexadecimal para exibição nos gráficos.

3. **Tabela `expenses`:**
   * `id` (TEXT, Primary Key) - Formato UUID v4.
   * `user_id` (TEXT, Foreign Key -> `users.id`, Not Null).
   * `category_id` (TEXT, Foreign Key -> `categories.id`, Not Null) - Relacionamento 1:1 (uma despesa pertence a apenas uma categoria).
   * `amount` (REAL, Not Null) - Valor monetário da despesa.
   * `description` (TEXT, Not Null) - Descrição curta.
   * `expense_date` (TEXT, Not Null) - Data em que o gasto ocorreu (ISO 8601 `YYYY-MM-DD`). Permite lançamentos retroativos.
   * `created_at` (TEXT, Not Null) - Data/hora do registro no sistema.
   * `notes` (TEXT, Nullable) - Campo `OBS` para informações adicionais (único campo opcional).
   * `is_deleted` (INTEGER, Not Null, Default `0`) - Exclusão Lógica / Soft Delete (`0` = ativo, `1` = excluído).

## 5. Requisitos Funcionais e Regras de Negócio

### 5.1. Autenticação Local
* Login e Cadastro de usuário (usuário e senha).
* Gerar UUID v4 único na criação do usuário.
* Todas as queries devem filtrar pelo `user_id` do usuário autenticado.

### 5.2. Gestão de Categorias
* CRUD básico (criar, listar, editar) de categorias vinculadas ao `user_id` logado.

### 5.3. Lançamento e Gestão de Despesas
* **Campos obrigatórios:** Valor (`amount`), Descrição (`description`), Categoria (`category_id` - seleção única) e Data da Despesa (`expense_date`).
* **Campo opcional:** Observações (`notes` / OBS).
* **Datas:** Permitir seleção de data passada (retroativa) ou atual para `expense_date` via DatePicker nativo, gravando `created_at` automaticamente no momento do insert.
* **Exclusão Lógica (Soft Delete):** Proibido usar `DELETE` SQL. Executar `UPDATE expenses SET is_deleted = 1 WHERE id = ?`. Ignorar registros com `is_deleted = 1` nas listagens e relatórios.

### 5.4. Tela de Resultados e Dashboard
* **Filtro Temporal:** Seletor de Mês/Ano (padrão no mês vigente, permitindo navegar entre meses).
* **Resumo por Categoria:** Lista consolidada com nome da categoria, soma dos valores no mês selecionado e percentual sobre o total do mês.
* **Visualização Gráfica:** Gráfico (Pizza/Donut ou Barras) refletindo a distribuição financeira e percentual das categorias no mês filtrado.

### 5.5. Manutenção de Dados (Backup e Reset)
* **Exportar Dados (JSON):** Gerar `.json` com categorias e despesas do `user_id` logado e abrir o compartilhamento nativo do Android.
* **Importar Dados (JSON):** Ler `.json` do aparelho e inserir no SQLite usando `INSERT OR IGNORE` (baseado no UUID) para evitar duplicação.
* **Limpar Dados:** Ação com confirmação dupla para apagar os dados do usuário logado no banco local.

## 6. Arquitetura Aprovada: Estrutura de Pastas e Plano de Classes (OOP)

### 6.1. Estrutura de Diretórios
```text
controle-despesas/
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── src/
    ├── database/
    │   └── DatabaseConnection.ts       # Inicialização do SQLite, PRAGMA foreign_keys = ON e criação de tabelas/índices
    ├── models/                         # Entidades de domínio, interfaces/contratos e validações
    │   ├── User.ts
    │   ├── Category.ts
    │   └── Expense.ts
    ├── repositories/                   # Persistência e queries SQLite isoladas por user_id
    │   ├── UserRepository.ts
    │   ├── CategoryRepository.ts
    │   └── ExpenseRepository.ts
    ├── services/                       # Regras de negócio, criptografia, cálculos e manipulação de arquivos
    │   ├── AuthService.ts
    │   ├── CategoryService.ts
    │   ├── ExpenseService.ts
    │   ├── DashboardService.ts
    │   └── BackupService.ts
    ├── context/                        # Estado global mínimo para sessão e filtro temporal
    │   └── AuthContext.tsx
    ├── navigation/                     # Configuração do React Navigation
    │   ├── RootNavigator.tsx
    │   ├── AuthStack.tsx
    │   └── AppTabs.tsx
    └── screens/                        # Camada estritamente visual (React Native Paper / Android Nativo)
        ├── auth/
        │   ├── LoginScreen.tsx
        │   └── RegisterScreen.tsx
        ├── dashboard/
        │   └── DashboardScreen.tsx
        ├── expenses/
        │   ├── ExpenseListScreen.tsx
        │   └── ExpenseFormModal.tsx
        ├── categories/
        │   └── CategoryScreen.tsx
        └── profile/
            └── DataProfileScreen.tsx
```

### 6.2. Plano de Classes e Responsabilidades
* **Database (`src/database/DatabaseConnection.ts`):**
  * Gerencia a instância do `SQLiteDatabase` (`expo-sqlite`), habilita `PRAGMA foreign_keys = ON;` e executa o script DDL das tabelas (`users`, `categories`, `expenses`) e índices (`idx_categories_user` em `categories(user_id)` e `idx_expenses_user_date_active` em `expenses(user_id, is_deleted, expense_date)`).
* **Domain / Models (`src/models/`):**
  * Classes com propriedades `private`/`readonly`, getters e validações de domínio no construtor:
    * `User`: `id`, `username`, `passwordHash`, `createdAt`.
    * `Category`: `id`, `userId`, `name`, `color`.
    * `Expense`: `id`, `userId`, `categoryId`, `amount`, `description`, `expenseDate`, `createdAt`, `notes`, `isDeleted`. Valida `amount > 0`, `description` não vazia e `expenseDate` no formato `YYYY-MM-DD`.
* **Repositories (`src/repositories/`):**
  * Recebem a conexão via construtor e executam queries parametrizadas filtradas por `user_id`:
    * `UserRepository`: `create(user)`, `findByUsername(username)`.
    * `CategoryRepository`: `create(category)`, `update(category)`, `findAllByUser(userId)`, `findById(id, userId)`, `deleteAllByUser(userId)`.
    * `ExpenseRepository`: `create(expense)`, `softDelete(id, userId)` (`UPDATE expenses SET is_deleted = 1 WHERE id = ? AND user_id = ?`), `findActiveByMonth(userId, yearMonth)` (`is_deleted = 0`), `findAllByUser(userId)`, `deleteAllByUser(userId)`.
* **Services (`src/services/`):**
  * `AuthService`: Gera UUID v4 (`expo-crypto`), gera hash SHA-256 da senha (`Crypto.digestStringAsync`), registra e autentica usuários.
  * `CategoryService`: Orquestra criação, edição e listagem de categorias do usuário logado.
  * `ExpenseService`: Orquestra criação (UUID v4 + `created_at` ISO 8601), listagem mensal ativa e exclusão lógica (soft delete).
  * `DashboardService`: Calcula o total do mês/ano filtrado, consolida soma por categoria, calcula percentual (`(somaCategoria / totalMes) * 100`) e formata dados para o gráfico (`react-native-gifted-charts`).
  * `BackupService`: Exporta `.json` via `expo-file-system` + `expo-sharing`, importa `.json` via `expo-document-picker` com `INSERT OR IGNORE` em transação e executa limpeza de dados do usuário logado.

---

## 7. Especificação de Front-end (UI/UX Nativo Android e Material Design 3)

### 7.1. Diretrizes de Componentes Nativos Android
* **Top AppBar (`Appbar.Header`):** Cabeçalho nativo Android em todas as telas integrado à `StatusBar`.
* **Navegação Inferior (`BottomNavigation` / Material Bottom Tabs):** Barra inferior no padrão Material Design 3 com ícones `MaterialCommunityIcons` (`@expo/vector-icons`) e efeito ripple nativo.
* **Toque e Feedback (`TouchableRipple` e `Snackbar`):** Ondulação nativa do Android em itens interativos e `Snackbar` inferior para feedbacks de sucesso/erro.
* **Inputs (`TextInput mode="outlined"` + `HelperText`):** Caixas de texto padrão Material com label flutuante e teclados nativos (`decimal-pad` para valores monetários, `default` para textos).
* **Calendário Nativo (`@react-native-community/datetimepicker`):** Invocado com `mode="date"` e `display="default"`, abrindo o seletor de data nativo do Android para datas atuais ou retroativas.
* **Diálogos (`Portal` + `Dialog`):** Caixas de diálogo padrão Material Design para confirmações e formulários rápidos.
* **Integrações Nativas do Sistema:**
  * **Share Sheet (`expo-sharing`):** Gaveta nativa de compartilhamento do Android para exportar o backup `.json`.
  * **Storage Access Framework (`expo-document-picker`):** Seletor de arquivos nativo do Android para importar o backup `.json`.

### 7.2. Detalhamento das Telas
1. **`LoginScreen` (`AuthStack`):**
   * `Appbar.Header` ("Controle de Despesas").
   * `TextInput` (outlined) para Usuário (`autoCapitalize="none"`) e Senha (`secureTextEntry` com ícone de exibir/ocultar).
   * `Button` (`mode="contained"`) "Entrar" e `Button` (`mode="text"`) "Criar nova conta".
   * `Snackbar` inferior para erros de credenciais.
2. **`RegisterScreen` (`AuthStack`):**
   * `Appbar.Header` com `Appbar.BackAction` e título "Novo Usuário".
   * `TextInput` (outlined) para Usuário, Senha e Confirmar Senha + `HelperText`.
   * `Button` (`mode="contained"`) "Cadastrar".
3. **`DashboardScreen` (Aba 1 - Resultados | Ícone: `chart-donut`):**
   * **Seletor de Mês/Ano:** Barra superior com `IconButton` (`chevron-left`), mês/ano centralizado e `IconButton` (`chevron-right`).
   * **Card de Total do Mês:** `Card` (`mode="elevated"`) exibindo o somatório das despesas ativas do mês (`R$ 0,00`).
   * **Gráfico (`PieChart` / Donut):** Gráfico centralizado com as cores hexadecimais de cada categoria.
   * **Lista Consolidada por Categoria:** `FlatList` com `List.Item` e `Divider`, contendo indicador colorido à esquerda, nome + `ProgressBar` ao centro, e valor (`R$`) + percentual (`XX,X%`) à direita.
4. **`ExpenseListScreen` + `ExpenseFormModal` (Aba 2 - Despesas | Ícone: `format-list-bulleted`):**
   * **Filtro Mensal:** Seletor de Mês/Ano no topo sincronizado para listar despesas ativas (`is_deleted = 0`) em ordem cronológica.
   * **Listagem (`FlatList`):** `List.Item` com `Divider` exibindo cor da categoria à esquerda, `description` + categoria + `expense_date` (`DD/MM/YYYY`) + `notes` (OBS) ao centro, e valor (`R$`) + `IconButton` (`delete-outline`) à direita (abre `Dialog` de confirmação para Soft Delete).
   * **`FAB` (`icon="plus"`):** Canto inferior direito para abrir `ExpenseFormModal`.
   * **`ExpenseFormModal`:** `Appbar.Header` (fechar/salvar), `TextInput` para Valor (`decimal-pad`) e Descrição, seletor de Categoria (`Dialog` com `RadioButton.Group` para seleção única 1:1), seletor de Data (`DateTimePicker` nativo do Android permitindo datas retroativas), `TextInput` multiline opcional para Observações (`notes` / OBS) e botão "Salvar Despesa".
5. **`CategoryScreen` (Aba 3 - Categorias | Ícone: `tag-multiple-outline`):**
   * `FlatList` com `List.Item` exibindo círculo colorido, nome da categoria e `IconButton` (`pencil-outline`) para edição.
   * `FAB` (`icon="plus"`) para abrir `Dialog` de criação/edição com `TextInput` para nome e grade de cores hexadecimais Material Design.
6. **`DataProfileScreen` (Aba 4 - Dados/Perfil | Ícone: `database-cog-outline`):**
   * Identificação do `username` autenticado.
   * `List.Section` com `List.Item` e `TouchableRipple`:
     * **Exportar Backup (JSON):** Aciona Share Sheet nativa do Android.
     * **Importar Backup (JSON):** Aciona Document Picker nativo e insere com `INSERT OR IGNORE`.
     * **Limpar Dados:** Dois `Dialog` sequenciais de confirmação dupla antes de apagar os dados do usuário.
     * **Sair (Logout):** Encerra a sessão e retorna ao `AuthStack`.
