# 7iATLAS - Guia de Testes

## Visão Geral dos Testes

| Tipo | Comando | Banco | Descrição |
|------|---------|-------|-----------|
| Unitários | `npm test` | Mock | Testa funções isoladas |
| Integração | `npm run test:integration` | Mock | Testa com Prisma mockado |
| E2E | `npm run test:e2e` | **Real** | Testa sistema completo |

## 1. Testes Unitários e de Integração (Sem Banco)

```bash
# Rodar todos os testes (sem E2E)
npm test

# Rodar só testes unitários
npm run test:unit

# Rodar só testes de integração (com mocks)
npm run test:integration

# Modo watch
npm run test:watch

# Com cobertura
npm run test:coverage
```

## 2. Testes E2E (Com Banco de Dados Real)

### Pré-requisitos

1. **PostgreSQL instalado e rodando**
   - Windows: Baixe de https://www.postgresql.org/download/
   - Ou use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`

2. **Criar banco de teste**
   ```sql
   CREATE DATABASE "7iatlas_test";
   ```

### Configurar e Executar

```bash
# 1. Criar tabelas no banco de teste
npm run db:push:test

# 2. Popular banco com dados de teste
npm run test:e2e:setup

# 3. Rodar testes E2E
npm run test:e2e

# OU rodar tudo de uma vez (unitários + E2E)
npm run test:all
```

### Estrutura do Arquivo .env.test

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/7iatlas_test?schema=public"
JWT_SECRET="test-jwt-secret-key"
CRON_SECRET="test-cron-secret"
```

## 3. Estrutura dos Testes

```
__tests__/
├── mocks/
│   └── prisma.ts              # Mock do Prisma Client
├── unit/
│   ├── matrix.service.test.ts # 57 testes de cálculo
│   ├── auth.test.ts           # 32 testes de autenticação
│   ├── validation.test.ts     # 53 testes de validação
│   └── security.test.ts       # 35 testes de segurança
├── integration/
│   └── matrix.integration.test.ts # 20 testes com Prisma mock
└── e2e/
    └── matrix.e2e.test.ts     # Testes com banco real
```

## 4. O Que Cada Tipo Testa

### Unitários (197 testes)
- `calculateLevelValue()` - Valores por nível
- `calculateScore()` - Cálculo de score na fila
- `calculateReferralPoints()` - CAP progressivo
- `hashPassword()`, `verifyToken()` - Autenticação
- Validações de wallet, email, PIN

### Integração (20 testes)
- `addToQueue()` - Adicionar à fila
- `canPurchaseQuota()` - Verificar permissão
- `purchaseQuota()` - Comprar cota
- `canProcessCycle()` - Verificar ciclo

### E2E (20+ testes)
- Criação de usuários no banco real
- Compra de cotas reais
- Processamento de ciclos completos
- Pagamento de bônus
- Validação contábil (entrada = saída)

## 5. Dicas

### Resetar Banco de Teste
```bash
npm run test:e2e:setup
```

### Ver Logs Detalhados
```bash
npm run test:e2e -- --verbose
```

### Rodar Um Teste Específico
```bash
npm test -- -t "deve retornar \$10 para nível 1"
```

## 6. Cobertura Esperada

- Unitários: 100% das funções de cálculo
- Integração: 100% das funções de fila/cota
- E2E: Fluxos completos de usuário

## 7. CI/CD

Para rodar em CI (sem banco), use apenas:
```bash
npm test
```

Para rodar com banco em CI, configure PostgreSQL no pipeline.
