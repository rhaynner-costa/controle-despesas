# Plano de Execução e Controle de Etapas — Controle de Despesas (Android Offline-First)

> **Instrução para IAs:** Mantenha este arquivo sempre atualizado ao concluir qualquer item ou subetapa. Marque com `[x]` o que foi finalizado e validado, e mantenha `[ ]` no que ainda está pendente.

---

## Etapa 0: Preparação e Validação do Ambiente Local (`/Volumes/extFiles`)
**Status:** ✅ Concluída

- [x] Mapear ferramentas instaladas no SSD externo (`/Volumes/extFiles/Android/sdk` e `/Volumes/extFiles/Aplicativos/Android Studio.app`).
- [x] Instalar `OpenJDK 17` compatível com o Gradle do React Native / Expo.
- [x] Remover `JDK 27` (`368 MB`) do SSD interno para liberar espaço.
- [x] Corrigir sintaxe do `PATH` no `/Users/rc/.zprofile` (`platform-tools`, `emulator`, `cmdline-tools/latest/bin`).
- [x] Configurar caches no SSD externo (`GRADLE_USER_HOME` e `npm_config_cache` em `/Volumes/extFiles/Android/`).
- [x] Documentar regras de arquitetura OOP, Front-end Android nativo e ambiente local no `AGENTS.md`.

---

## Etapa 1: Camada de Banco de Dados, Domínio (Models), Repositórios e Serviços (OOP)
**Status:** ✅ Concluída

- [x] **Database (`src/database/`):**
  - [x] `DatabaseConnection.ts`: Singleton com `expo-sqlite`, `PRAGMA foreign_keys = ON`, tabelas (`users`, `app_settings`, `categories`, `expenses`) e índices (`idx_categories_user`, `idx_expenses_user_date_active`).
- [x] **Models (`src/models/`):**
  - [x] `User.ts`: Encapsulamento e validação de domínio (`id`, `username`, `passwordHash`, `createdAt`).
  - [x] `Category.ts`: Encapsulamento e validação de nome e cor hexadecimal (`#RRGGBB`).
  - [x] `Expense.ts`: Encapsulamento, validação de valor (`> 0`), descrição obrigatória, data ISO (`YYYY-MM-DD`), campo opcional `notes` (OBS) e flag `isDeleted`.
- [x] **Repositories (`src/repositories/`):**
  - [x] `UserRepository.ts`: `create`, `findByUsername`, `findById`, `saveRememberedUserId`, `getRememberedUser` e `clearRememberedUser`.
  - [x] `CategoryRepository.ts`: `create`, `insertOrIgnore`, `update`, `findAllByUser`, `findById`, `deleteAllByUser`.
  - [x] `ExpenseRepository.ts`: `create`, `insertOrIgnore`, `findById`, `update`, `softDelete` (`UPDATE expenses SET is_deleted = 1`), `findActiveByMonth`, `findAllByUser`, `deleteAllByUser`.
- [x] **Services (`src/services/`):**
  - [x] `AuthService.ts`: Geração de UUID v4 (`expo-crypto`), hash SHA-256 de senha, login, cadastro, persistência do último usuário lembrado e autenticação biométrica nativa do Android (`expo-local-authentication`).
  - [x] `CategoryService.ts`: Regras de criação, edição e listagem por usuário.
  - [x] `ExpenseService.ts`: Criação e edição de despesas (com data atual ou retroativa), listagem ativa mensal e exclusão lógica (Soft Delete).
  - [x] `DashboardService.ts`: Consolidação mensal por categoria, cálculo de percentual (`%`) e formatação para o gráfico.
  - [x] `BackupService.ts`: Exportação JSON (`expo-file-system` + `expo-sharing`), importação JSON (`expo-document-picker` + transação `INSERT OR IGNORE`) e limpeza de dados do usuário.

---

## Etapa 2: Configuração Expo, Navegação e Front-end Nativo Android (Material Design 3)
**Status:** ✅ Concluída

- [x] **Configuração Base e Dependências (`Expo SDK 58` / `React Native 0.88.1`):**
  - [x] Criar `package.json`, `app.json` (`package: "com.controledespesas.app"`), `tsconfig.json`, `index.ts` e `App.tsx`.
  - [x] Instalar dependências (`expo-sqlite`, `expo-crypto`, `expo-local-authentication`, `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-linear-gradient`, `react-native-paper`, `@react-navigation/*`, `@react-native-community/datetimepicker`, `react-native-gifted-charts`, `react-native-svg`).
- [x] **Contexto e Navegação (`src/context/` e `src/navigation/`):**
  - [x] `AuthContext.tsx`: Gerenciamento de sessão, bloqueio automático ao sair do app (`onPause`), estado de usuário lembrado e biometria, injeção dos serviços OOP e sincronização do filtro `Mês/Ano`.
  - [x] `AuthStack.tsx`, `AppTabs.tsx` e `RootNavigator.tsx`.
- [x] **Telas Android / Material Design 3 (`src/screens/`):**
  - [x] `LoginScreen.tsx` (com opção "Lembrar meu usuário" marcada por padrão, disparo automático da Biometria nativa do Android ao iniciar/reabrir o app, `KeyboardAvoidingView` e `ScrollView` com barra de rolagem persistente) e `RegisterScreen.tsx` (com `KeyboardAvoidingView` e `ScrollView` com barra de rolagem persistente).
  - [x] `DashboardScreen.tsx` (Aba 1 - Resultados: seletor de mês/ano, card de total, gráfico Donut e lista consolidada com `ProgressBar`, `%`, borda divisória de `1.5dp` e barra de rolagem persistente).
  - [x] `ExpenseListScreen.tsx` e `ExpenseFormModal.tsx` (Aba 2 - Despesas: listagem mensal com borda divisória de `1.5dp` e barra de rolagem persistente, criação e edição de despesas com `KeyboardAvoidingView` e `ScrollView` com barra de rolagem persistente, campo de valor exclusivo com máscara monetária em centavos `R$99,99` e limite de 10 dígitos sem rótulo duplicado, `DateTimePicker` nativo para datas retroativas, seleção de categoria `1:1` iniciando em branco com `RadioButton.Group` sobre `Portal.Host` e `dismissable={false}`, espaçamento vertical uniforme `16px`, botão único "Salvar Despesa" com `keyboardShouldPersistTaps="handled"` e `Keyboard.dismiss()`, campo opcional `OBS` e Soft Delete com confirmação).
  - [x] `CategoryScreen.tsx` (Aba 3 - Categorias: listagem com borda divisória de `1.5dp` e barra de rolagem persistente, modal `Dialog` de criação e edição com `dismissable={false}`, `dismissableBackButton={false}`, `Dialog.ScrollArea` e paleta de cores Material Design).
  - [x] `DataProfileScreen.tsx` (Aba 4 - Dados/Perfil: Exportar JSON, Importar JSON, Limpar Dados com confirmação dupla em 2 diálogos com `dismissable={false}`, Logout e `Divider` de `1dp`).
- [x] **Identidade Visual e Ícones Nativos Android (`assets/` e `android/app/src/main/res/`):**
  - [x] Geração dos ícones Adaptive Icon Material Design 3 (`icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png`) e recursos `.webp` em todas as densidades (`mipmap-mdpi` a `xxxhdpi`).
- [x] **Validação Estática:**
  - [x] Compilação TypeScript (`./node_modules/.bin/tsc --noEmit`) sem erros.

---

## Etapa 3: Geração Nativa Android (`prebuild`), Testes e Compilação do `.apk` Standalone
**Status:** ✅ Concluída

- [x] **3.1. Ajuste da versão do Node.js (Opcional / Recomendado para SDK 58):**
  - [x] Priorizar o Node `v26.12.0` do Homebrew (`/opt/homebrew/bin/node`) sobre o Node `v20.20.2` do NVM (e opcionalmente remover o NVM antigo para liberar espaço no SSD interno).
- [x] **3.2. Geração do Projeto Nativo Android (`npx expo prebuild --platform android`):**
  - [x] Gerar a pasta `android/` nativa do React Native.
  - [x] Configurar `android/local.properties` (`sdk.dir=/Volumes/extFiles/Android/sdk`) e `android/gradle.properties` (`org.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`).
- [x] **3.3. Compilação do `.apk` Standalone:**
  - [x] Verificar/aceitar licenças do Android SDK e plataformas exigidas pelo Gradle no `/Volumes/extFiles/Android/sdk`.
  - [x] Executar `./gradlew assembleRelease` (ou `assembleDebug`) utilizando o cache em `/Volumes/extFiles/Android/.gradle`.
  - [x] Validar o arquivo `.apk` gerado em `android/app/build/outputs/apk/`.
- [x] **3.4. Teste Funcional no Emulador / Dispositivo Android:**
  - [x] Validar fluxo completo: Cadastro -> Login -> Criar Categorias -> Lançar Despesas (atuais e retroativas) -> Verificar Gráfico/Dashboard -> Exclusão Lógica -> Exportar/Importar JSON -> Limpar Dados.
- [x] **3.5. Documentação e Controle de Versão:**
  - [x] Criar `README.md` com documentação técnica, arquitetura OOP, modelagem SQLite, guia de execução no VS Code (Node 26 vs NVM e variáveis do SSD externo) e instruções de build.
  - [x] Adicionar scripts utilitários (`typecheck` e `build:apk`) no `package.json`.
  - [x] Atualizar `.gitignore` mantendo o código nativo `android/` versionado e ignorando artefatos de build (`android/build/`, `android/app/build/`, `android/.gradle/`, `android/local.properties`, `*.apk`).
