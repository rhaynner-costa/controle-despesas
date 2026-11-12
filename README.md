# Controle de Despesas (Android Offline-First)

Aplicativo mobile nativo para Android focado no controle financeiro pessoal e categorização de despesas. Projetado com arquitetura **100% Offline-First**, mantendo todos os dados armazenados exclusivamente no dispositivo via banco de dados relacional SQLite.

---

## Funcionalidades Principais

- **Autenticação Local e Biometria Nativa:**
  - Cadastro e login local multiusuário com senhas criptografadas em SHA-256 (`expo-crypto`) e isolamento estrito de dados por `user_id` (UUID v4).
  - Opção **"Lembrar meu usuário"** integrada ao prompt biométrico nativo do Android (`expo-local-authentication`).
  - Bloqueio automático de sessão ao minimizar ou sair do aplicativo, exigindo autenticação biométrica ou senha ao retornar.
- **Dashboard Mensal (Aba Resultados):**
  - Filtro de navegação por **Mês/Ano**.
  - Card com totalizador geral de despesas ativas do período.
  - Gráfico Donut (`react-native-gifted-charts`) com distribuição proporcional e cores das categorias.
  - Lista consolidada por categoria com barra de progresso, valor acumulado (`R$`) e percentual sobre o total do mês (`%`).
- **Gestão de Despesas (Aba Despesas):**
  - Listagem cronológica das despesas ativas do mês selecionado.
  - Cadastro e edição de lançamentos com máscara monetária automática em centavos (`R$99,99`, até 10 dígitos), descrição, seleção única de categoria (`1:1`), seletor de data nativo do Android (permitindo lançamentos na data atual ou retroativa) e campo opcional de observações (`OBS`).
  - **Exclusão Lógica (Soft Delete):** Remoção segura via `is_deleted = 1` com diálogo de confirmação, preservando a integridade referencial no banco.
- **Gestão de Categorias (Aba Categorias):**
  - Criação, listagem e edição de categorias personalizadas com paleta de cores Material Design 3.
- **Manutenção e Backup de Dados (Aba Dados/Perfil):**
  - **Exportar Backup (JSON):** Gera arquivo `.json` com todas as categorias e despesas do usuário logado e aciona a gaveta nativa de compartilhamento do Android (*Share Sheet*).
  - **Importar Backup (JSON):** Seleciona arquivo `.json` via *Storage Access Framework* e importa registros em transação utilizando `INSERT OR IGNORE` (baseado no UUID v4) para evitar duplicidade.
  - **Limpar Dados:** Exclusão total dos registros do usuário logado protegida por confirmação dupla em dois diálogos sequenciais.

---

## Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Framework Mobile** | React Native `0.88.1` + Expo `SDK 58` |
| **Linguagem** | TypeScript `~6.0.3` (Tipagem estrita + Orientação a Objetos) |
| **UI / Design System** | `react-native-paper` (Material Design 3) + `@expo/vector-icons` |
| **Navegação** | `@react-navigation/native`, `native-stack` e `bottom-tabs` |
| **Banco de Dados Local** | SQLite (`expo-sqlite`) |
| **Criptografia e UUID** | `expo-crypto` (UUID v4 + SHA-256) |
| **Biometria** | `expo-local-authentication` |
| **Gráficos** | `react-native-gifted-charts` + `react-native-svg` + `expo-linear-gradient` |
| **Datas Nativas** | `@react-native-community/datetimepicker` |
| **Arquivos e Backup** | `expo-file-system`, `expo-sharing`, `expo-document-picker` |

---

## Arquitetura do Projeto (OOP / Clean Architecture Simplificada)

O projeto segue Programação Orientada a Objetos (OOP) com separação estrita de responsabilidades:

```text
controle-despesas/
├── App.tsx                             # Ponto de entrada visual, tema MD3 e providers
├── index.ts                            # Registro do root component no Expo
├── app.json                            # Manifesto Expo e configurações Android
├── package.json                        # Dependências e scripts
├── tsconfig.json                       # Configuração TypeScript estrita
├── android/                            # Projeto nativo Android (Gradle)
└── src/
    ├── database/
    │   └── DatabaseConnection.ts       # Singleton SQLite, PRAGMA foreign_keys = ON, DDL e índices
    ├── models/                         # Entidades de domínio encapsuladas e validações
    │   ├── User.ts
    │   ├── Category.ts
    │   └── Expense.ts
    ├── repositories/                   # Persistência e queries SQLite parametrizadas por user_id
    │   ├── UserRepository.ts
    │   ├── CategoryRepository.ts
    │   └── ExpenseRepository.ts
    ├── services/                       # Casos de uso, cálculos, biometria e backup JSON
    │   ├── AuthService.ts
    │   ├── CategoryService.ts
    │   ├── ExpenseService.ts
    │   ├── DashboardService.ts
    │   └── BackupService.ts
    ├── context/
    │   └── AuthContext.tsx             # Estado de sessão, bloqueio em background e injeção de serviços
    ├── navigation/
    │   ├── RootNavigator.tsx
    │   ├── AuthStack.tsx
    │   └── AppTabs.tsx
    └── screens/                        # Camada de apresentação (React Native Paper)
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

---

## Modelagem de Dados (SQLite)

1. **`users`**: `id` (UUID v4, PK), `username` (UNIQUE), `password` (Hash SHA-256), `created_at` (ISO 8601).
2. **`app_settings`**: `key` (PK), `value` (armazenamento local de preferências como `remembered_user_id`).
3. **`categories`**: `id` (UUID v4, PK), `user_id` (FK -> `users.id`), `name`, `color` (Hex `#RRGGBB`).
4. **`expenses`**: `id` (UUID v4, PK), `user_id` (FK -> `users.id`), `category_id` (FK -> `categories.id`), `amount` (REAL), `description`, `expense_date` (`YYYY-MM-DD`), `created_at` (ISO 8601), `notes` (Nullable), `is_deleted` (`0` = ativo, `1` = excluído).

---

## Como Rodar no VS Code e Ambiente Local

### 1. Configuração do Ambiente Local (macOS + SSD Externo `/Volumes/extFiles`)
As ferramentas e caches estão configurados no arquivo `/Users/rc/.zprofile` apontando para o SSD externo para economizar espaço no disco interno:
- **Java JDK 17 (`JAVA_HOME`):** `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
- **Android SDK (`ANDROID_HOME`):** `/Volumes/extFiles/Android/sdk`
- **Cache do Gradle (`GRADLE_USER_HOME`):** `/Volumes/extFiles/Android/.gradle`
- **Cache do NPM (`npm_config_cache`):** `/Volumes/extFiles/Android/.npm-cache`

### 2. Abrindo e Configurando o Terminal no VS Code
1. Abra a pasta `/Volumes/extFiles/workspace/controle-despesas` no **VS Code**.
2. Abra o Terminal Integrado do VS Code (`Ctrl + \`` ou `Cmd + J`).
3. **Importante — Versão do Node.js (`>= 22.13.0`):**
   - Caso sua máquina possua o NVM configurado com o Node 20 como padrão em terminais não-login, o Expo SDK 58 exigirá o Node do Homebrew (`/opt/homebrew/bin/node`, `v26.12.0`).
   - Para definir permanentemente o Node do Homebrew como padrão no NVM (execute uma única vez):
     ```bash
     nvm alias default system
     ```
   - Ou exporte na sessão atual do terminal:
     ```bash
     export PATH="/opt/homebrew/bin:$PATH"
     node -v   # Deve exibir v26.12.0
     ```

### 3. Comandos Principais no Terminal do VS Code

- **Instalar dependências:**
  ```bash
  npm install
  ```

- **Validar tipagem TypeScript (sem emitir arquivos):**
  ```bash
  npm run typecheck
  ```

- **Iniciar o Metro Bundler (Modo Desenvolvimento):**
  ```bash
  npm start
  ```

- **Compilar e rodar diretamente no Emulador ou Dispositivo USB (Debug):**
  ```bash
  npm run android
  ```

- **Gerar o `.apk` Standalone de Produção (Release):**
  Limpa o bundle JS anterior, compila o APK assinado via Gradle usando o cache no SSD externo e copia o arquivo final para `./controle-despesas.apk` na raiz do projeto:
  ```bash
  npm run build:apk
  ```
  *(O APK será disponibilizado em `./controle-despesas.apk` e em `android/app/build/outputs/apk/release/app-release.apk`).*
