# 7iATLAS - DOCUMENTAÇÃO TÉCNICA COMPLETA
## Sistema de Redistribuição Progressiva

> **Versão:** 1.6
> **Data:** Dezembro 2025
> **Atualização:** Adicionado Jupiter Pool e Reserva Interna
> **Confidencial** - Documento para desenvolvimento interno

---

# ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Mecânica do Sistema](#2-mecânica-do-sistema)
3. [Banco de Dados](#3-banco-de-dados)
4. [API Endpoints](#4-api-endpoints)
5. [Integração Blockchain](#5-integração-blockchain)
6. [Frontend](#6-frontend)
7. [Regras de Negócio](#7-regras-de-negócio)
   - 7.2.1 [Bônus de Indicação Variável](#721-bônus-de-indicação-variável)
   - 7.4 [Funcionalidades Avançadas](#74-funcionalidades-avançadas)
     - 7.4.1 [Múltiplas Cotas por Usuário](#741-múltiplas-cotas-por-usuário)
     - 7.4.2 [Compra em Níveis Superiores](#742-compra-de-cotas-em-níveis-superiores)
     - 7.4.3 [Combinação das Funcionalidades](#743-combinação-das-funcionalidades)
     - 7.4.4 [Transferência Interna de Saldo](#744-transferência-interna-de-saldo)
     - 7.4.5 [Sistema de Notificações](#745-sistema-de-notificações)
     - 7.4.6 [Visualização de Matriz e Posição na Fila](#746-visualização-de-matriz-e-posição-na-fila)
     - 7.4.7 [Jupiter Pool (Sistema Anti-Travamento)](#747-jupiter-pool-sistema-anti-travamento)
     - 7.4.8 [Reserva Interna (Fundo Privado)](#748-reserva-interna-fundo-privado)
8. [Segurança](#8-segurança)
9. [Deploy](#9-deploy)
10. [Testes](#10-testes)
11. [Implementação Completa](#11-implementação-completa)

---

# 1. VISÃO GERAL

## 1.1 Descrição

O **7iATLAS** é um sistema de redistribuição de renda baseado em matriz progressiva 6x1 com 10 níveis. Utiliza blockchain (BSC) para pagamentos em USDT-BEP20.

## 1.2 Conceito Principal

```
ENTRADA ÚNICA ($10) → CICLOS INFINITOS → GANHOS PROGRESSIVOS

- Usuário entra com $10 no Nível 1
- Ao ciclar, ganha 2× ($20) e avança para o Nível 2
- Simultaneamente, reentra no Nível 1
- Processo se repete até o Nível 10
- Ganho potencial total: $20.460
```

## 1.3 Stack Tecnológico

```
BACKEND:
├── Node.js 18+ / Next.js 14
├── Prisma ORM
├── PostgreSQL 15+
├── Redis (cache/jobs)
└── Ethers.js (blockchain)

FRONTEND:
├── Next.js 14 (App Router)
├── Tailwind CSS
├── Zustand (estado)
└── RainbowKit (wallet)

INFRA:
├── Vercel / Railway / AWS
├── BSC (Binance Smart Chain)
└── USDT-BEP20
```

## 1.4 Arquitetura

```
┌─────────────────────────────────────────────┐
│              FRONTEND (PWA)                 │
│  Login │ Dashboard │ Indicações │ Carteira  │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│                 API REST                     │
│  Auth │ Users │ Matrix │ Payments │ Admin   │
└─────────────────────┬───────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   PostgreSQL      Redis       BSC Chain
```

---

# 2. MECÂNICA DO SISTEMA

## 2.1 A Matriz 6x1

```
              ┌─────────────────┐
              │    RECEBEDOR    │
              │   (Ganha 2×)    │
              └────────┬────────┘
                       │
    ┌──────┬──────┬────┴────┬──────┬──────┐
    ▼      ▼      ▼         ▼      ▼      ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
│ POS1 ││ POS2 ││ POS3 ││ POS4 ││ POS5 ││ POS6 │
│ DOAR ││AVANÇ ││ DOAR ││AVANÇ ││COMUN ││REENT │
└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘
```

### Função de Cada Posição

| Posição | Nome | Destino | Descrição |
|---------|------|---------|-----------|
| **Recebedor** | Topo | Wallet usuário | Recebe 2× o valor |
| **1** | Doar | Recebedor | Doa para o topo |
| **2** | Avançar | Nível +1 | Alimenta próximo nível |
| **3** | Doar | Recebedor | Doa para o topo |
| **4** | Avançar | Nível +1 | Alimenta próximo nível |
| **5** | Comunidade | Distribuição | 10%+10%+40%+40% |
| **6** | Reentrada | Mesmo nível | Ciclos perpétuos |

### Distribuição Posição 5 (CRÍTICO)

```
VALOR DA POSIÇÃO 5:
├── 10% → RESERVA (anti-travamento)
├── 10% → OPERACIONAL (custos)
├── 40% → BÔNUS INDICAÇÃO
└── 40% → LUCRO SISTEMA

* Sem indicador = 40% bônus vai para lucro (total 80%)
```

### Regra Especial do NÍVEL 10 (CRÍTICO)

```
⚠️ NO NÍVEL 10, AS POSIÇÕES 2 E 4 TÊM COMPORTAMENTO DIFERENTE!

NÍVEIS 1-9:
├── Pos 2 (Avançar 1): $X → vai para caixa do N+1
└── Pos 4 (Avançar 2): $X → vai para caixa do N+1

NÍVEL 10:
├── Pos 2 (Avançar 1): $5.120 → vai para RESERVA DO SISTEMA
└── Pos 4 (Avançar 2): $5.120 → vai para RESERVA DO SISTEMA
└── TOTAL: $10.240 por ciclo → RESERVA DO SISTEMA

MOTIVO: Não existe Nível 11, então o dinheiro é redirecionado
        para a Reserva do Sistema (fundo de sustentabilidade)
```

#### Exemplo Prático - Ciclo no Nível 10:

```
CAIXA N10: $35.840 (7 × $5.120)

┌─────────┬─────────────────┬────────────┬─────────────────────────────────┐
│ Posição │ Nome            │ Entrada    │ Destino                         │
├─────────┼─────────────────┼────────────┼─────────────────────────────────┤
│    0    │ RECEIVER        │  $5.120    │ RECEBE $10.240, entrada fica    │
│    1    │ DOAR 1          │  $5.120    │ → RECEIVER                      │
│    2    │ AVANÇAR 1       │  $5.120    │ → RESERVA SISTEMA (não há N11)  │
│    3    │ DOAR 2          │  $5.120    │ → RECEIVER                      │
│    4    │ AVANÇAR 2       │  $5.120    │ → RESERVA SISTEMA (não há N11)  │
│    5    │ COMUNIDADE      │  $5.120    │ → Distribuído (10+10+40+40%)    │
│    6    │ REENTRADA       │  $5.120    │ → Fica no caixa N10             │
└─────────┴─────────────────┴────────────┴─────────────────────────────────┘

RECEIVER no N10:
├── NÃO avança para N+1 (não existe)
├── REENTRA no N10 (ciclo perpétuo)
└── Pode ciclar infinitamente no N10
```

## 2.2 Os 10 Níveis

| Nível | Entrada | Ganho | Bônus | Acumulado |
|-------|---------|-------|-------|-----------|
| 1 | $10 | $20 | $4 | $20 |
| 2 | $20 | $40 | $8 | $60 |
| 3 | $40 | $80 | $16 | $140 |
| 4 | $80 | $160 | $32 | $300 |
| 5 | $160 | $320 | $64 | $620 |
| 6 | $320 | $640 | $128 | $1,260 |
| 7 | $640 | $1,280 | $256 | $2,540 |
| 8 | $1,280 | $2,560 | $512 | $5,100 |
| 9 | $2,560 | $5,120 | $1,024 | $10,220 |
| 10 | $5,120 | $10,240 | $2,048 | $20,460 |

### Fórmulas

```python
valor_nivel = 10 * (2 ** (nivel - 1))
ganho_ciclo = valor_nivel * 2
bonus_indicacao = valor_nivel * 0.4
```

## 2.3 Sistema de Filas

Cada nível tem sua fila. Score determina prioridade.

### 2.3.1 Fórmula do Score

```python
score = (tempo_espera × 2) + (reentradas × 1.5) + pontos_indicados
```

### 2.3.2 CAP Progressivo de Indicados

O sistema usa **rendimento decrescente** para equilibrar a competição:

| Faixa de Indicados | Multiplicador | Pontos Máximos |
|--------------------|---------------|----------------|
| 1 a 10 | ×10 pontos | 100 pts |
| 11 a 30 | ×5 pontos | 100 pts |
| 31 a 50 | ×2 pontos | 40 pts |
| 51 a 100 | ×1 ponto | 50 pts |
| 100+ | ×0 pontos | CAP atingido |

**CAP MÁXIMO TOTAL: 290 pontos**

```python
def calcular_pontos_indicados(indicados_diretos):
    pontos = 0

    # Faixa 1: 1-10 indicados (×10)
    pontos += min(10, indicados_diretos) * 10

    # Faixa 2: 11-30 indicados (×5)
    if indicados_diretos > 10:
        pontos += min(20, indicados_diretos - 10) * 5

    # Faixa 3: 31-50 indicados (×2)
    if indicados_diretos > 30:
        pontos += min(20, indicados_diretos - 30) * 2

    # Faixa 4: 51-100 indicados (×1)
    if indicados_diretos > 50:
        pontos += min(50, indicados_diretos - 50) * 1

    return pontos  # Máximo: 290 pontos
```

### 2.3.3 Tabela de Pontos por Indicados

| Indicados | Pontos | Cálculo |
|-----------|--------|---------|
| 0 | 0 | - |
| 5 | 50 | 5×10 |
| 10 | 100 | 10×10 |
| 20 | 150 | 100 + (10×5) |
| 30 | 200 | 100 + (20×5) |
| 50 | 240 | 100 + 100 + (20×2) |
| 100 | 290 | 100 + 100 + 40 + 50 (CAP) |
| 200 | 290 | CAP atingido |

### 2.3.4 Exemplos de Score

**Exemplo 1 - Usuário com 5 indicados:**
```
24h espera, 2 reentradas, 5 indicados
Score = (24×2) + (2×1.5) + 50 = 48 + 3 + 50 = 101
```

**Exemplo 2 - Líder com 100 indicados:**
```
24h espera, 0 reentradas, 100 indicados
Score = (24×2) + (0×1.5) + 290 = 48 + 0 + 290 = 338
```

**Exemplo 3 - Usuário sem indicados:**
```
24h espera, 3 reentradas, 0 indicados
Score = (24×2) + (3×1.5) + 0 = 48 + 4.5 + 0 = 52.5
```

### 2.3.5 Tempo para Alcançar Líderes

| Situação | Diferença | Tempo para Alcançar |
|----------|-----------|---------------------|
| 0 ind. vs 10 ind. | 100 pts | ~2 dias |
| 0 ind. vs 50 ind. | 240 pts | ~5 dias |
| 0 ind. vs 100 ind. | 290 pts | ~6 dias |
| 10 ind. vs 100 ind. | 190 pts | ~4 dias |

### 2.3.6 Por que CAP Progressivo?

```
BENEFÍCIOS:
├── Recompensa quem indica (290 > 240 > 100 > 0)
├── Não permite dominação (máx 290 pts, não infinito)
├── Diferencia esforço (100 ind. ≠ 10 ind. ≠ 50 ind.)
├── Dá chance a todos (máx 6 dias para alcançar líder)
└── Rendimento decrescente (incentiva crescimento sustentável)
```

### 2.3.7 Simulação Comparativa: Impacto dos Indicados

Cenário: Sistema com **10.000 usuários ativos**, analisando usuário "Caio" com diferentes quantidades de indicados diretos.

#### Comparativo: 20 vs 50 vs 100 Indicados

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    COMPARATIVO: CAIO 20 vs 50 vs 100 INDICADOS                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  INDICADOS         │    20         │    50         │    100                     │
│  Score inicial     │    150 pts    │    240 pts    │    290 pts                 │
│  Posição N1        │    #200       │    #50        │    #10                     │
│  Tempo 1º ciclo    │    ~5 dias    │    ~2 dias    │    ~1 dia                  │
│  Tempo N1→N10      │    ~25 dias   │    ~15 dias   │    ~10 dias                │
│  Ganho RECEIVER    │    $20.460    │    $20.460    │    $20.460                 │
│  Bônus indicação   │    ~$3.500    │    ~$9.500    │    ~$25.000                │
│  GANHO TOTAL       │   ~$24.260    │   ~$30.460    │   ~$46.260                 │
│  ROI (sobre $10)   │    2.426x     │    3.046x     │    4.626x                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Detalhamento por Cenário

**CAIO COM 20 INDICADOS**

| Nível | Tempo Acumulado | Ganho Ciclo | Bônus 40% | Total Nível |
|-------|-----------------|-------------|-----------|-------------|
| N1    | 5 dias          | $20         | $160      | $180        |
| N2    | 7 dias          | $40         | $320      | $360        |
| N3    | 9 dias          | $80         | $480      | $560        |
| N4    | 11 dias         | $160        | $560      | $720        |
| N5    | 14 dias         | $320        | $480      | $800        |
| N6    | 17 dias         | $640        | $400      | $1.040      |
| N7    | 19 dias         | $1.280      | $320      | $1.600      |
| N8    | 21 dias         | $2.560      | $240      | $2.800      |
| N9    | 23 dias         | $5.120      | $200      | $5.320      |
| N10   | 25 dias         | $10.240     | $200      | $10.440     |
| **TOTAL** | **25 dias** | **$20.460** | **~$3.500** | **~$24.260** |

**CAIO COM 50 INDICADOS**

| Nível | Tempo Acumulado | Ganho Ciclo | Bônus 40% | Total Nível |
|-------|-----------------|-------------|-----------|-------------|
| N1    | 2 dias          | $20         | $400      | $420        |
| N2    | 3 dias          | $40         | $800      | $840        |
| N3    | 5 dias          | $80         | $1.200    | $1.280      |
| N4    | 7 dias          | $160        | $1.280    | $1.440      |
| N5    | 9 dias          | $320        | $1.120    | $1.440      |
| N6    | 10 dias         | $640        | $960      | $1.600      |
| N7    | 11 dias         | $1.280      | $800      | $2.080      |
| N8    | 12 dias         | $2.560      | $640      | $3.200      |
| N9    | 14 dias         | $5.120      | $480      | $5.600      |
| N10   | 15 dias         | $10.240     | $400      | $10.640     |
| **TOTAL** | **15 dias** | **$20.460** | **~$9.500** | **~$30.460** |

**CAIO COM 100 INDICADOS**

| Nível | Tempo Acumulado | Ganho Ciclo | Bônus 40% | Total Nível |
|-------|-----------------|-------------|-----------|-------------|
| N1    | 1 dia           | $20         | $800      | $820        |
| N2    | 2 dias          | $40         | $1.600    | $1.640      |
| N3    | 3 dias          | $80         | $2.400    | $2.480      |
| N4    | 4 dias          | $160        | $2.880    | $3.040      |
| N5    | 5 dias          | $320        | $2.880    | $3.200      |
| N6    | 6 dias          | $640        | $2.560    | $3.200      |
| N7    | 7 dias          | $1.280      | $2.240    | $3.520      |
| N8    | 8 dias          | $2.560      | $1.920    | $4.480      |
| N9    | 9 dias          | $5.120      | $1.600    | $6.720      |
| N10   | 10 dias         | $10.240     | $1.440    | $11.680     |
| **TOTAL** | **10 dias** | **$20.460** | **~$25.000** | **~$46.260** |

#### Análise dos Resultados

```
CONCLUSÕES:
├── TEMPO: 100 ind. chega ao N10 em 10 dias vs 25 dias com 20 ind.
├── GANHO BASE: Igual para todos ($20.460) - sistema justo
├── DIFERENCIAL: Bônus de indicação é o grande multiplicador
├── ROI: Varia de 2.426x até 4.626x dependendo dos indicados
└── CAP FUNCIONA: 100 ind. não domina, apenas acelera e ganha mais bônus

EQUILÍBRIO ALCANÇADO:
├── Quem indica mais → ganha mais bônus + progride mais rápido
├── Quem indica menos → ainda ganha, apenas mais devagar
├── CAP impede dominação → max 290 pts não é infinito
└── Todos têm chance → tempo para alcançar líder é limitado (~6 dias max)
```

## 2.4 Fluxo Completo

```
1. REGISTRO → Status: PENDING
       ↓
2. DEPÓSITO $10 USDT → Verificar blockchain
       ↓
3. ATIVAÇÃO → Status: ACTIVE, entra fila Nível 1
       ↓
4. AGUARDAR → Score aumenta com tempo
       ↓
5. MATRIZ FORMA (7 pessoas) → Processar
       ↓
6. RESULTADO:
   • Recebedor: ganha 2×, avança nível, reentra
   • Pos 1-4: reentram na fila
   • Pos 5: distribui para reserva/op/bônus/lucro
   • Pos 6: reentra (valor volta ao caixa)
```

---

# 3. BANCO DE DADOS

## 3.1 Schema Prisma

```prisma
// Enums
enum UserStatus { PENDING, ACTIVE, SUSPENDED }
enum TransactionType { DEPOSIT, CYCLE_REWARD, BONUS_REFERRAL }
enum TransactionStatus { PENDING, CONFIRMED, FAILED }

// Models
model User {
  id              String      @id @default(cuid())
  email           String?     @unique
  passwordHash    String?
  walletAddress   String      @unique
  name            String?
  referrerId      String?
  referrer        User?       @relation("Referrals", fields: [referrerId], references: [id])
  referrals       User[]      @relation("Referrals")
  status          UserStatus  @default(PENDING)
  totalDeposited  Decimal     @default(0)
  totalEarned     Decimal     @default(0)
  totalBonus      Decimal     @default(0)
  createdAt       DateTime    @default(now())
  activatedAt     DateTime?
}

model Level {
  id            Int       @id @default(autoincrement())
  levelNumber   Int       @unique
  entryValue    Decimal
  rewardValue   Decimal
  bonusValue    Decimal
  cashBalance   Decimal   @default(0)
  totalCycles   Int       @default(0)
}

model QueueEntry {
  id          String      @id @default(cuid())
  userId      String
  levelId     Int
  position    Int         @default(0)
  score       Decimal     @default(0)
  reentries   Int         @default(0)
  status      String      @default("WAITING")
  enteredAt   DateTime    @default(now())
}

model CycleHistory {
  id          String    @id @default(cuid())
  userId      String
  levelId     Int
  position    Int       // 0=Recebedor, 1-6=Posições
  amount      Decimal
  txHash      String?
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
}

model BonusHistory {
  id            String    @id @default(cuid())
  referrerId    String    // Quem recebe
  referredId    String    // Quem gerou
  levelId       Int
  amount        Decimal
  txHash        String?
  status        String    @default("PENDING")
  createdAt     DateTime  @default(now())
}

model Transaction {
  id            String    @id @default(cuid())
  userId        String
  type          String
  amount        Decimal
  txHash        String?   @unique
  fromAddress   String?
  toAddress     String?
  status        String    @default("PENDING")
  createdAt     DateTime  @default(now())
}

model SystemFunds {
  id            Int       @id @default(1)
  reserve       Decimal   @default(0)
  operational   Decimal   @default(0)
  profit        Decimal   @default(0)
}
```

---

# 4. API ENDPOINTS

## 4.1 Autenticação

```
POST /api/auth/register
{
  "email": "user@email.com",      // opcional
  "password": "senha123",         // opcional
  "walletAddress": "0x...",       // obrigatório
  "referralCode": "ABC123"        // opcional
}

POST /api/auth/login
{
  "email": "user@email.com",
  "password": "senha123"
}

POST /api/auth/wallet
{
  "walletAddress": "0x...",
  "signature": "0x...",
  "message": "Login 7iATLAS: 1234567890"
}
```

## 4.2 Usuários

```
GET /api/users/me
→ Dados do usuário logado

GET /api/users/me/stats
→ Estatísticas (saldo, níveis, posição)

GET /api/users/me/referrals
→ Lista de indicados
```

## 4.3 Filas

```
GET /api/queues
→ Status de todas as filas

GET /api/queues/:level
→ Status de uma fila específica

GET /api/queues/:level/position
→ Posição do usuário
```

## 4.4 Histórico

```
GET /api/history/cycles
→ Histórico de ciclos

GET /api/history/bonus
→ Histórico de bônus

GET /api/history/transactions
→ Todas as transações
```

## 4.5 Pagamentos

```
POST /api/payments/deposit
→ Iniciar depósito (retorna endereço)

POST /api/payments/verify
{
  "txHash": "0x..."
}
→ Verificar e ativar
```

## 4.6 Admin

```
GET /api/admin/stats
→ Estatísticas gerais

POST /api/admin/process-queue
{
  "level": 1,
  "maxCycles": 10
}
→ Processar filas
```

---

# 5. INTEGRAÇÃO BLOCKCHAIN

## 5.1 Configuração BSC

```javascript
// Mainnet
{
  chainId: 56,
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  usdtContract: '0x55d398326f99059fF775485246999027B3197955',
  explorer: 'https://bscscan.com'
}

// Testnet
{
  chainId: 97,
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  usdtContract: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  explorer: 'https://testnet.bscscan.com'
}
```

## 5.2 Funções Principais

```javascript
// Verificar depósito
async verifyDeposit(txHash, expectedFrom, expectedAmount)
→ { valid: boolean, confirmations: number }

// Enviar pagamento
async sendUSDT(toAddress, amount)
→ { success: boolean, txHash: string }

// Obter saldo
async getUSDTBalance(walletAddress)
→ string (valor formatado)
```

## 5.3 Segurança de Wallet

```
RECOMENDAÇÃO:

COLD WALLET (70%)
├── Multi-sig (2 de 3)
├── Hardware wallet
└── Transferências manuais

HOT WALLET (30%)
├── Servidor (pagamentos automáticos)
├── Limite diário
└── Monitoramento 24/7
```

---

# 6. FRONTEND

## 6.1 Páginas

```
/                   → Landing Page
/login              → Login (email/MetaMask)
/register           → Registro
/dashboard          → Painel principal
/dashboard/referrals → Indicações
/dashboard/history  → Histórico
/dashboard/wallet   → Carteira
/dashboard/settings → Configurações
/admin              → Painel admin
```

## 6.2 Design System

```css
/* Cores */
--bg-dark: #0a0a0f;
--gradient-start: #2F00FF;
--gradient-mid: #8B00FF;
--gradient-end: #FF00FF;
--green-aurora: #00FFA3;
--gold: #FFD700;

/* Fontes */
Títulos: 'Orbitron'
Corpo: 'Inter'
```

## 6.3 Componentes Principais

```
├── StatsCards (4 cards de métricas)
├── LevelProgress (barra de progresso)
├── QueueList (filas por nível)
├── ActivityFeed (atividades recentes)
├── ReferralLink (link + copiar)
├── ReferralTable (lista indicados)
├── TransactionTable (histórico)
├── WalletConnect (MetaMask)
└── DepositModal (fluxo depósito)
```

---

# 7. REGRAS DE NEGÓCIO

## 7.1 Ativação

```
REQUISITOS:
1. Wallet cadastrada
2. Depósito exato $10 USDT
3. Da wallet cadastrada
4. Mínimo 3 confirmações
5. TX não usada antes

RESULTADO:
├── Status → ACTIVE
├── $10 → Caixa Nível 1
├── Usuário → Fila Nível 1
└── Score inicial = 0
```

## 7.2 Processamento de Ciclo

```python
def processar_ciclo(nivel):
    # Verificar
    if fila < 7: return ERRO
    if caixa < valor × 7: return ERRO

    # Selecionar por score
    participantes = fila.ordenar_por_score()[:7]

    # Recebedor (Posição 0)
    ganho_bruto = valor × 2
    jupiter_pool_taxa = ganho_bruto × 0.10  # 10% para Jupiter Pool
    ganho_liquido = ganho_bruto - jupiter_pool_taxa
    pagar(recebedor, ganho_liquido)
    jupiter_pool += jupiter_pool_taxa

    if nivel < 10:
        adicionar_fila(recebedor, nivel + 1)
    adicionar_fila(recebedor, nivel)  # reentrada

    # Posições 1-4: reentram

    # Posição 5: distribuir com BÔNUS VARIÁVEL
    reserva_interna += valor × 0.10    # 10% Reserva Interna (privado)
    operacional += valor × 0.10         # 10% Operacional

    # Calcular bônus variável baseado nos indicados do INDICADOR
    indicados_ativos = contar_indicados_ativos(indicador)

    if indicados_ativos >= 10:
        bonus_percent = 0.40  # 40%
    elif indicados_ativos >= 5:
        bonus_percent = 0.20  # 20%
    else:
        bonus_percent = 0.00  # 0%

    bonus_valor = valor × bonus_percent
    lucro_bonus = valor × 0.40 - bonus_valor  # Restante do bônus vai para lucro

    if bonus_valor > 0:
        pagar_bonus(indicador, bonus_valor)

    lucro += valor × 0.40 + lucro_bonus  # 40% fixo + bônus não pago

    # Posição 6: valor volta ao caixa
```

## 7.2.1 Bônus de Indicação Variável

O bônus de indicação é **variável** baseado na quantidade de indicados ativos do indicador.

### Faixas de Comissão

```
┌─────────────────┬─────────────────┬─────────────────────────────┐
│ Indicados Ativos│ % de Comissão   │ Destino                     │
├─────────────────┼─────────────────┼─────────────────────────────┤
│     0 a 4       │      0%         │ 40% → LUCRO DO SISTEMA      │
│     5 a 9       │     20%         │ 20% indicador, 20% lucro    │
│    10 ou mais   │     40%         │ 40% indicador, 0% extra     │
└─────────────────┴─────────────────┴─────────────────────────────┘

REGRA: Se indicador tem 0-4 indicados, NÃO recebe bônus.
       O valor que seria do bônus vai para LUCRO DO SISTEMA.
```

### Distribuição da Posição 5 (COMUNIDADE)

```
POSIÇÃO 5 = 100% do valor de entrada do nível

SEMPRE FIXO (20%):
├── 10% → Reserva Interna (privado)
└── 10% → Operacional

VARIÁVEL (80% - depende dos indicados do INDICADOR):

┌─────────────────────────────────────────────────────────────────┐
│ SE INDICADOR TEM 0-4 INDICADOS (0% bônus):                      │
│ ├── Indicador: $0                                               │
│ └── Lucro Sistema: 80% (40% bônus + 40% lucro)                 │
├─────────────────────────────────────────────────────────────────┤
│ SE INDICADOR TEM 5-9 INDICADOS (20% bônus):                     │
│ ├── Indicador: 20%                                              │
│ └── Lucro Sistema: 60% (20% restante bônus + 40% lucro)        │
├─────────────────────────────────────────────────────────────────┤
│ SE INDICADOR TEM 10+ INDICADOS (40% bônus):                     │
│ ├── Indicador: 40%                                              │
│ └── Lucro Sistema: 40%                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Exemplo Prático (Nível 3 - Entrada $40)

```
Posição 5 recebe: $40

FIXO:
├── Reserva Interna: $4 (10%)
├── Operacional: $4 (10%)
└── Restante: $32 (80%)

CENÁRIO A - Indicador tem 2 indicados (0%):
├── Bônus Indicador: $0
└── Lucro Sistema: $32

CENÁRIO B - Indicador tem 7 indicados (20%):
├── Bônus Indicador: $8 (20% de $40)
└── Lucro Sistema: $24 (60% de $40)

CENÁRIO C - Indicador tem 12 indicados (40%):
├── Bônus Indicador: $16 (40% de $40)
└── Lucro Sistema: $16 (40% de $40)
```

### Tabela de Bônus por Nível

```
┌────────┬──────────┬───────────────┬───────────────┬───────────────┐
│ Nível  │ Pos 5    │ 0-4 ind (0%)  │ 5-9 ind (20%) │ 10+ ind (40%) │
├────────┼──────────┼───────────────┼───────────────┼───────────────┤
│   1    │   $10    │      $0       │      $2       │      $4       │
│   2    │   $20    │      $0       │      $4       │      $8       │
│   3    │   $40    │      $0       │      $8       │     $16       │
│   4    │   $80    │      $0       │     $16       │     $32       │
│   5    │  $160    │      $0       │     $32       │     $64       │
│   6    │  $320    │      $0       │     $64       │    $128       │
│   7    │  $640    │      $0       │    $128       │    $256       │
│   8    │ $1.280   │      $0       │    $256       │    $512       │
│   9    │ $2.560   │      $0       │    $512       │  $1.024       │
│  10    │ $5.120   │      $0       │  $1.024       │  $2.048       │
└────────┴──────────┴───────────────┴───────────────┴───────────────┘
```

### Incentivo do Sistema

```
OBJETIVO:
├── Incentiva usuários a indicarem no mínimo 5 pessoas
├── Recompensa maior para quem indica 10+
└── Quem não indica, não ganha bônus (vai para o sistema)

PROGRESSÃO:
0 indicados  → 0%   (sem bônus - vai para lucro)
5 indicados  → 20%  (começa a ganhar)
10 indicados → 40%  (máximo possível)
```

## 7.3 Validações

```
REGISTRO:
├── Wallet único
├── Email único (se fornecido)
├── Formato wallet válido

DEPÓSITO:
├── Valor exato
├── Rede correta (BSC)
├── Token correto (USDT)
├── TX não duplicada

CICLO:
├── Mínimo 7 pessoas
├── Caixa suficiente
├── Usuários ativos
```

---

# 7.4 FUNCIONALIDADES AVANÇADAS

## 7.4.1 Múltiplas Cotas por Usuário

O sistema permite que um usuário compre **múltiplas cotas** no mesmo nível, cada cota sendo uma entrada independente na fila.

### Conceito

```
USUÁRIO ÚNICO → MÚLTIPLAS POSIÇÕES NA FILA

Exemplo:
├── João compra 1ª cota no Nível 1 → JOAO-L1-C1 (entra na fila)
├── João compra 2ª cota no Nível 1 → JOAO-L1-C2 (entra na fila)
├── João compra 3ª cota no Nível 1 → JOAO-L1-C3 (entra na fila)
└── João agora tem 3 posições independentes competindo

Cada cota:
• Tem seu próprio score
• Avança independentemente
• Pode ciclar em momentos diferentes
```

### Regras

```
✅ LIMITE MÁXIMO: 10 cotas por usuário por nível
✅ Cada cota é uma QueueEntry independente
✅ Cotas NÃO compartilham score
✅ Ao ciclar, cota avança para N+1 E reentra em N
✅ Bônus de indicação: pago quando cota cicla na posição 5,
   DESDE QUE o indicador atenda os requisitos do bônus variável:
   ├── 0-4 indicados: 0% (vai para lucro do sistema)
   ├── 5-9 indicados: 20% de comissão
   └── 10+ indicados: 40% de comissão

⚠️ VALIDAÇÃO DE LIMITE:
   ├── Sistema deve verificar antes de permitir compra
   ├── Mensagem: "Limite máximo de 10 cotas por nível atingido"
   └── Usuário pode ter 10 cotas em CADA nível (até 100 cotas total)
```

### Modelo de Dados

```prisma
// Cada cota é uma QueueEntry separada
model QueueEntry {
  id          String      @id @default(cuid())
  userId      String      // Mesmo usuário pode ter múltiplas entries
  levelId     Int
  position    Int         @default(0)
  score       Decimal     @default(0)
  reentries   Int         @default(0)
  status      String      @default("WAITING")
  enteredAt   DateTime    @default(now())

  // Identificador da cota (opcional, para tracking)
  quotaNumber Int?        // 1, 2, 3... para o mesmo usuário/nível
}
```

### Fluxo de Compra de Cota Adicional

```
1. VALIDAÇÃO
   ├── Usuário está ACTIVE
   ├── Tem saldo suficiente ($10 × número de cotas)
   └── Depósito verificado na blockchain

2. PROCESSAMENTO
   ├── Criar nova QueueEntry
   ├── userId = mesmo usuário
   ├── levelId = nível desejado
   └── score = 0 (inicia do zero)

3. RESULTADO
   ├── Nova posição na fila
   ├── Independente das outras cotas
   └── Compete normalmente por score
```

## 7.4.2 Compra de Cotas em Níveis Superiores

Usuários podem comprar cotas diretamente em níveis superiores, **desde que já possuam pelo menos uma cota no nível anterior**.

### Conceito

```
PROGRESSÃO OBRIGATÓRIA:

Nível 1 ($10)  → Qualquer usuário pode comprar (entrada padrão)
Nível 2 ($20)  → Só se já tiver cota no Nível 1
Nível 3 ($40)  → Só se já tiver cota no Nível 2
...
Nível 10 ($5120) → Só se já tiver cota no Nível 9

EXEMPLO VÁLIDO:
├── Maria compra Nível 1 ✅
├── Maria compra Nível 2 ✅ (tem N1)
├── Maria compra mais 5 cotas no Nível 2 ✅
└── Maria compra Nível 3 ✅ (tem N2)

EXEMPLO INVÁLIDO:
├── Pedro compra Nível 1 ✅
├── Pedro tenta comprar Nível 3 ❌ (não tem N2)
└── Sistema bloqueia a transação
```

### Regras

```
✅ Deve ter pelo menos 1 cota no nível N-1 para comprar nível N
✅ Não precisa ter CICLADO no nível anterior, apenas TER a cota
✅ Pode comprar múltiplas cotas no mesmo nível superior
✅ Valores dobram a cada nível (progressão exponencial)
✅ Ao ciclar no nível N, avança para N+1 E reentra em N

VALIDAÇÃO:
├── Verificar cotasPorNivel[N-1] > 0
├── Se N > 1 e não tem cota em N-1: BLOQUEAR
└── Se N = 1: sempre permitido (entrada)
```

### Função de Validação

```typescript
function podeComprarCota(userId: string, level: number): { pode: boolean; motivo: string } {
  const user = getUser(userId)

  // Verificar se usuário está ativo
  if (user.status !== 'ACTIVE') {
    return { pode: false, motivo: 'Usuário não está ativo' }
  }

  // Nível 1 sempre permitido
  if (level === 1) {
    return { pode: true, motivo: 'OK' }
  }

  // Para níveis > 1, verificar se tem cota no nível anterior
  const cotasNivelAnterior = contarCotasNivel(userId, level - 1)

  if (cotasNivelAnterior === 0) {
    return {
      pode: false,
      motivo: `Precisa ter pelo menos 1 cota no Nível ${level - 1} primeiro`
    }
  }

  return { pode: true, motivo: 'OK' }
}
```

### Tabela de Valores por Nível

| Nível | Valor Entrada | Requisito |
|-------|---------------|-----------|
| 1 | $10 | Nenhum (entrada) |
| 2 | $20 | Ter cota no N1 |
| 3 | $40 | Ter cota no N2 |
| 4 | $80 | Ter cota no N3 |
| 5 | $160 | Ter cota no N4 |
| 6 | $320 | Ter cota no N5 |
| 7 | $640 | Ter cota no N6 |
| 8 | $1,280 | Ter cota no N7 |
| 9 | $2,560 | Ter cota no N8 |
| 10 | $5,120 | Ter cota no N9 |

## 7.4.3 Combinação das Funcionalidades

As duas funcionalidades trabalham juntas de forma sinérgica:

```
EXEMPLO COMPLETO:

1. Ana ativa conta com $10 (1 cota N1)
2. Ana compra +9 cotas no N1 ($90)
   └── Ana tem 10 cotas no N1

3. Ana compra 5 cotas no N2 ($100)
   └── Permitido porque tem cotas no N1

4. Primeira cota de Ana cicla no N1:
   ├── Ganha $20
   ├── Avança para N2 (agora 6 cotas em N2)
   └── Reentra no N1 (continua com 10 cotas)

5. Ana pode comprar N3 ($40/cota)
   └── Permitido porque já tem cotas no N2
```

### Benefícios do Sistema

```
PARA O USUÁRIO:
├── Acelera progressão comprando mais cotas
├── Diversifica posições na fila
├── Pode pular espera comprando níveis superiores
└── Múltiplas fontes de ganho simultâneas

PARA O SISTEMA:
├── Maior entrada de capital
├── Filas mais ativas
├── Ciclos mais frequentes
└── Sistema mais dinâmico
```

### Resultados da Simulação

Teste realizado com 1.000 usuários simulados:

```
CENÁRIO 1 - Sistema Original (1 cota, só N1):
├── Ciclos: 9.670
├── Total Pago: $1.141.000
└── Média/usuário: $1.141

CENÁRIO 2 - Com Múltiplas Cotas + Níveis Superiores:
├── Ciclos: 48.345
├── Total Pago: $5.283.500
├── Média/usuário: $5.283
└── Aumento: 4.63× mais pagamentos

CONCLUSÃO: Sistema matematicamente equilibrado e sustentável
           com as novas funcionalidades.
```

## 7.4.4 Transferência Interna de Saldo

Usuários podem transferir saldo interno para outros usuários, com confirmação via **PIN de segurança**.

### Conceito

```
TRANSFERÊNCIA INTERNA:
├── Usuário A tem saldo: $500 (ganhos confirmados)
├── Usuário A transfere $100 para Usuário B
├── Confirma com PIN de 4-6 dígitos
└── Usuário B recebe $100 instantaneamente

VANTAGENS:
├── Sem taxas de blockchain (gas)
├── Transferência instantânea
├── Ajudar indicados a começar
└── Movimentação interna eficiente
```

### Sistema de PIN

```
SEGURANÇA EM CAMADAS:

SENHA (login/conta):
├── Acesso à conta
├── Alterações de perfil
├── Criar/alterar PIN
└── Mais forte (8+ caracteres)

PIN (transações):
├── Transferências internas
├── Saques (opcional)
├── 4-6 dígitos numéricos
└── Mais simples, mais rápido
```

### Modelo de Dados

```prisma
model User {
  // ... campos existentes

  // PIN de segurança
  pinHash           String?       // bcrypt do PIN
  pinAttempts       Int           @default(0)
  pinBlockedUntil   DateTime?
  pinCreatedAt      DateTime?

  // Relacionamentos de transferência
  transfersSent     InternalTransfer[]  @relation("TransfersSent")
  transfersReceived InternalTransfer[]  @relation("TransfersReceived")
}

model InternalTransfer {
  id            String    @id @default(cuid())

  fromUserId    String
  fromUser      User      @relation("TransfersSent", fields: [fromUserId], references: [id])

  toUserId      String
  toUser        User      @relation("TransfersReceived", fields: [toUserId], references: [id])

  amount        Decimal   @db.Decimal(18, 2)
  status        String    @default("COMPLETED")  // COMPLETED apenas
  description   String?

  createdAt     DateTime  @default(now())

  @@index([fromUserId])
  @@index([toUserId])
}
```

### Fluxos de PIN

```
1. CRIAR PIN (primeira vez)
   ├── Dashboard > Configurações > Criar PIN
   ├── Digita senha da conta (confirmar identidade)
   ├── Define PIN 4-6 dígitos
   ├── Confirma PIN (digitar novamente)
   └── PIN ativo!

2. ALTERAR PIN
   ├── Dashboard > Configurações > Alterar PIN
   ├── Digita senha da conta
   ├── Define novo PIN
   ├── Confirma novo PIN
   └── Atualizado!

3. ESQUECEU O PIN
   ├── Dashboard > Configurações > Resetar PIN
   ├── Digita senha da conta
   ├── Define novo PIN
   └── Pronto! (self-service, sem suporte)
```

### Fluxo de Transferência

```
1. INICIAR TRANSFERÊNCIA
   ├── Dashboard > Transferir
   ├── Buscar destinatário (código de indicação ou wallet)
   ├── Define valor a transferir
   └── Clica em "Transferir"

2. VALIDAÇÕES
   ├── Usuário tem PIN configurado?
   ├── PIN não está bloqueado?
   ├── Saldo suficiente (só CONFIRMED)?
   ├── Destinatário existe e está ACTIVE?
   ├── Dentro dos limites diários?
   └── Valor mínimo atendido?

3. CONFIRMAR COM PIN
   ├── Modal solicita PIN
   ├── Usuário digita 4-6 dígitos
   ├── Sistema valida PIN (bcrypt)
   └── PIN correto → executa transferência

4. RESULTADO
   ├── Debita saldo do remetente
   ├── Credita saldo do destinatário
   ├── Registra InternalTransfer
   └── Exibe confirmação
```

### Proteção contra Tentativas

```
BLOQUEIO PROGRESSIVO:

Tentativas erradas → Consequência
├── 3 erros → Bloqueio 15 minutos
├── 6 erros → Bloqueio 1 hora
├── 9 erros → Bloqueio 24 horas
└── Notificação por email a cada bloqueio

DESBLOQUEIO:
├── Aguardar tempo expirar
├── OU resetar PIN via senha (imediato)
└── Contador zera após reset
```

### Limites de Transferência

```
LIMITES DIÁRIOS (24h):

┌─────────────────────────────────────────┐
│ Sem verificação KYC:                    │
│ ├── Máximo: $100/dia                    │
│ ├── Transações: 3/dia                   │
│ └── Mínimo por transação: $10           │
├─────────────────────────────────────────┤
│ Com KYC verificado:                     │
│ ├── Máximo: $1.000/dia                  │
│ ├── Transações: 10/dia                  │
│ └── Mínimo por transação: $10           │
└─────────────────────────────────────────┘

TAXAS: 0% (sem taxas internas)
```

### Regras Importantes

```
✅ PERMITIDO:
├── Transferir para qualquer usuário ACTIVE
├── Transferir apenas saldo CONFIRMED (não pending)
├── Múltiplas transferências até o limite diário
└── Usar saldo recebido imediatamente

❌ NÃO PERMITIDO:
├── Transferir para si mesmo
├── Transferir saldo pending/não confirmado
├── Exceder limites diários
├── Transferir sem PIN configurado

⚠️ IRREVERSÍVEL:
├── Transferências NÃO podem ser revertidas
├── Sistema NÃO resolve disputas entre usuários
├── Usuário assume total responsabilidade
└── Termos de uso devem ser aceitos
```

### API Endpoints

```
POST /api/users/pin/create
{
  "password": "senha_da_conta",
  "pin": "1234",
  "confirmPin": "1234"
}

POST /api/users/pin/change
{
  "password": "senha_da_conta",
  "newPin": "5678",
  "confirmPin": "5678"
}

POST /api/transfers/internal
{
  "toUserCode": "ABC123",      // código de indicação ou
  "toWallet": "0x...",         // wallet address
  "amount": 100,
  "pin": "1234",
  "description": "Ajuda para cotas"  // opcional
}

GET /api/transfers/internal/history
→ Lista de transferências enviadas/recebidas
```

### Observações de Segurança

```
⚠️ RISCOS MITIGADOS COM PIN:
├── Acesso não autorizado à conta logada
├── Transferências acidentais
└── Uso por terceiros com acesso ao dispositivo

⚠️ RISCOS QUE AINDA EXISTEM:
├── Engenharia social ("me passa seu PIN")
├── Golpes entre usuários
├── Contas falsas (criar conta → transferir)
└── Phishing

RECOMENDAÇÕES:
├── Nunca compartilhar PIN
├── Verificar destinatário antes de transferir
├── Usar PIN diferente da senha
└── Monitorar histórico de transferências
```

## 7.4.5 Sistema de Notificações

Sistema de notificações multicanal para manter usuários informados sobre eventos importantes da plataforma.

### Canais de Notificação

```
1. EMAIL
   ├── Funciona em qualquer dispositivo
   ├── Usuário não precisa estar online
   ├── Histórico permanente
   └── Serviços: SendGrid, Resend, AWS SES

2. PUSH BROWSER (Web Push API)
   ├── Notificação instantânea no navegador
   ├── Funciona mesmo com aba fechada
   ├── Gratuito (API nativa)
   └── Chrome, Firefox, Edge, Safari (16.4+)

3. PUSH MOBILE (PWA)
   ├── Android: suporte completo
   ├── iOS: suporte a partir do 16.4
   ├── Sem necessidade de app nativo
   └── Service Worker required
```

### Eventos Notificáveis

```
PROGRESSÃO NA FILA:
├── "Você avançou para posição #3 no Nível 1"
├── "Faltam 2 pessoas para completar a matriz"
└── "Você está próximo de ciclar!"

CICLO COMPLETADO:
├── "Parabéns! Você ciclou no Nível 1"
├── "Ganho: +$20 creditado na sua conta"
├── "Você avançou para o Nível 2"
└── "Sua cota reentrou automaticamente no Nível 1"

BÔNUS DE INDICAÇÃO:
├── "Seu indicado João ciclou no Nível 1!"
├── "Bônus: +$4 creditado"
└── "Total de bônus este mês: $120"

TRANSFERÊNCIAS:
├── "Você recebeu $100 de Maria"
├── "Transferência de $50 enviada com sucesso"
└── "Alerta: PIN bloqueado por tentativas excedidas"

SISTEMA:
├── "Novo nível desbloqueado: Nível 3!"
├── "Manutenção programada em 2 horas"
└── "Nova funcionalidade: Múltiplas cotas disponível"
```

### Modelo de Dados

```prisma
model User {
  // ... campos existentes

  // Preferências de notificação
  notifyEmail           Boolean   @default(true)
  notifyPush            Boolean   @default(false)
  notifyOnQueueAdvance  Boolean   @default(true)
  notifyOnCycle         Boolean   @default(true)
  notifyOnBonus         Boolean   @default(true)
  notifyOnTransfer      Boolean   @default(true)
  notifyFrequency       String    @default("realtime")  // realtime, daily, weekly

  // Relacionamentos
  pushSubscriptions     PushSubscription[]
  notifications         NotificationLog[]
}

model PushSubscription {
  id          String    @id @default(cuid())

  userId      String
  user        User      @relation(fields: [userId], references: [id])

  endpoint    String    // URL do push service
  p256dh      String    // Chave pública VAPID
  auth        String    // Token de autenticação
  device      String?   // "Chrome Windows", "Safari iOS", etc.

  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?

  @@unique([userId, endpoint])
  @@index([userId])
}

model NotificationLog {
  id          String    @id @default(cuid())

  userId      String
  user        User      @relation(fields: [userId], references: [id])

  channel     String    // "email", "push"
  event       String    // "cycle", "bonus", "transfer", "queue", "system"
  title       String
  body        String
  data        Json?     // Dados extras (levelId, amount, etc.)

  status      String    @default("pending")  // pending, sent, failed, clicked
  sentAt      DateTime?
  clickedAt   DateTime?
  errorMsg    String?

  createdAt   DateTime  @default(now())

  @@index([userId])
  @@index([event])
  @@index([status])
}
```

### Interface no Dashboard

```
CONFIGURAÇÕES > NOTIFICAÇÕES
┌─────────────────────────────────────────────────────────┐
│ 🔔 Configurar Notificações                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ CANAIS DE NOTIFICAÇÃO:                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📧 Email                    [████████████] ATIVO    │ │
│ │    usuario@email.com                                │ │
│ │    Verificado ✓                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔔 Notificações Push        [            ] INATIVO  │ │
│ │    Clique para ativar no navegador                  │ │
│ │    [Ativar Notificações]                            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ QUAIS EVENTOS DESEJA RECEBER:                           │
│ ├── [✓] Avanço na fila (quando minha posição muda)     │
│ ├── [✓] Ciclo completado (quando eu ciclar)            │
│ ├── [✓] Bônus de indicação (quando indicado ciclar)    │
│ ├── [✓] Transferências (envios e recebimentos)         │
│ └── [✓] Novidades do sistema                           │
│                                                         │
│ FREQUÊNCIA:                                             │
│ ○ Tempo real (notificar cada evento)                   │
│ ● Resumo diário (1 email por dia às 20h)               │
│ ○ Resumo semanal (1 email por semana)                  │
│                                                         │
│                              [Salvar Preferências]      │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Ativação Push

```
1. USUÁRIO CLICA "ATIVAR NOTIFICAÇÕES"
   ├── Frontend solicita permissão do navegador
   ├── Notification.requestPermission()
   └── Usuário clica "Permitir"

2. GERAR SUBSCRIPTION
   ├── Service Worker registrado
   ├── pushManager.subscribe() com VAPID key
   └── Retorna endpoint + keys

3. SALVAR NO BACKEND
   ├── POST /api/notifications/subscribe
   ├── Salva PushSubscription no banco
   └── Associa ao userId

4. ENVIAR PUSH (quando evento ocorre)
   ├── Backend usa web-push library
   ├── Envia para endpoint do usuário
   └── Navegador exibe notificação
```

### API Endpoints

```
GET /api/notifications/preferences
→ Retorna preferências atuais do usuário

PUT /api/notifications/preferences
{
  "notifyEmail": true,
  "notifyPush": true,
  "notifyOnQueueAdvance": true,
  "notifyOnCycle": true,
  "notifyOnBonus": true,
  "notifyOnTransfer": true,
  "notifyFrequency": "realtime"
}

POST /api/notifications/subscribe
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "BNcRd...",
    "auth": "tBHI..."
  },
  "device": "Chrome Windows"
}

DELETE /api/notifications/subscribe
{
  "endpoint": "https://fcm.googleapis.com/..."
}

GET /api/notifications/history
→ Lista de notificações enviadas ao usuário

POST /api/notifications/test
→ Envia notificação de teste (para verificar configuração)
```

### Serviço de Email

```typescript
// Serviços recomendados (por ordem de preferência)
RESEND:
├── Gratuito: 100 emails/dia
├── Developer-friendly
├── Fácil integração
└── Custo: $20/mês para 50k emails

SENDGRID:
├── Gratuito: 100 emails/dia
├── Muito estabelecido
├── Templates visuais
└── Custo: $15/mês para 40k emails

AWS SES:
├── Mais barato em escala
├── $0.10 por 1000 emails
├── Requer mais configuração
└── Melhor para alto volume
```

### Templates de Email

```
CICLO COMPLETADO:
┌─────────────────────────────────────────────┐
│ 🎉 Parabéns! Você ciclou no Nível 1!        │
├─────────────────────────────────────────────┤
│                                             │
│ Olá, João!                                  │
│                                             │
│ Sua cota no Nível 1 completou o ciclo.      │
│                                             │
│ ✅ Ganho: +$20.00                           │
│ ⬆️ Avanço: Nível 2                          │
│ 🔄 Reentrada: Nível 1                       │
│                                             │
│ Saldo atual: $320.00                        │
│                                             │
│ [Ver Meu Dashboard]                         │
│                                             │
└─────────────────────────────────────────────┘

BÔNUS RECEBIDO:
┌─────────────────────────────────────────────┐
│ 💰 Bônus de Indicação Recebido!             │
├─────────────────────────────────────────────┤
│                                             │
│ Olá, Maria!                                 │
│                                             │
│ Seu indicado Pedro ciclou no Nível 2!       │
│                                             │
│ 💵 Bônus: +$8.00                            │
│ 📊 Total de bônus este mês: $156.00         │
│                                             │
│ Continue indicando para ganhar mais!        │
│                                             │
│ Seu link: 7iatlas.com/ref/MARIA001          │
│                                             │
│ [Copiar Link] [Ver Indicados]               │
│                                             │
└─────────────────────────────────────────────┘
```

### Custos Estimados

```
FASE INICIAL (até 1.000 usuários):
├── Email: $0-15/mês (Resend/SendGrid free tier)
├── Push: $0 (Web Push API gratuito)
└── Total: ~$0-15/mês

CRESCIMENTO (1.000-10.000 usuários):
├── Email: $20-50/mês
├── Push: $0 (ainda gratuito)
└── Total: ~$20-50/mês

ESCALA (10.000+ usuários):
├── Email: $50-200/mês (AWS SES mais econômico)
├── Push: $0-50/mês (se usar serviço terceiro)
└── Total: ~$50-250/mês
```

### Boas Práticas

```
✅ FAZER:
├── Permitir opt-out fácil (unsubscribe em 1 clique)
├── Respeitar frequência escolhida pelo usuário
├── Incluir link direto para ação no email
├── Testar emails em múltiplos clientes
└── Monitorar taxa de abertura e cliques

❌ EVITAR:
├── Enviar muitas notificações (spam)
├── Notificar eventos irrelevantes
├── Emails sem opção de cancelar
├── Push sem permissão explícita
└── Notificar de madrugada (respeitar timezone)

⚠️ COMPLIANCE:
├── LGPD: Consentimento explícito para marketing
├── CAN-SPAM: Link de unsubscribe obrigatório
├── GDPR: Direito de exclusão de dados
└── Guardar logs de consentimento
```

## 7.4.6 Visualização de Matriz e Posição na Fila

Sistema de visualização transparente que permite aos usuários ver sua posição real na fila, estatísticas do nível e localizar-se na lista completa.

### Conceito

```
TRANSPARÊNCIA TOTAL:
├── Usuário sabe EXATAMENTE onde está na fila
├── Vê quantas pessoas estão na frente
├── Estatísticas do nível (ciclos, tempo médio)
├── Pode ver fila completa e se encontrar
└── Aumenta CREDIBILIDADE e CONFIANÇA
```

### Funcionalidades

```
FASE 1 - POSIÇÃO E ESTATÍSTICAS:
├── Posição real na fila
│   └── "Você está na posição #23 de 156 pessoas"
├── Estatísticas básicas do nível
│   ├── Total de ciclos completados
│   ├── Ciclos nas últimas 24h
│   ├── Tempo médio de espera
│   └── Matriz mais antiga (credibilidade)
└── Botão "Ir para minha posição"

FASE 2 - FILA COMPLETA:
├── Lista paginada de toda a fila
├── Busca por nome ou código
├── Destaque visual do usuário logado
└── Ordenação por score (prioridade real)
```

### Modelo de Dados

```prisma
model LevelStats {
  id              Int       @id @default(autoincrement())
  levelId         Int       @unique
  level           Level     @relation(fields: [levelId], references: [id])

  // Estatísticas de ciclos
  totalCycles     Int       @default(0)
  cyclesToday     Int       @default(0)
  avgCyclesPerDay Decimal   @default(0) @db.Decimal(10, 2)

  // Tempo de espera
  avgWaitTime     Int       @default(0)  // em minutos
  minWaitTime     Int?
  maxWaitTime     Int?

  // Datas importantes
  firstCycleAt    DateTime?  // Matriz mais antiga
  lastCycleAt     DateTime?  // Último ciclo

  updatedAt       DateTime   @updatedAt
}

// Adicionar ao model Level existente:
model Level {
  // ... campos existentes

  stats           LevelStats?
}
```

### Interface Visual

```
DASHBOARD > MINHA POSIÇÃO
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Sua Posição no Nível 1                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │     🏆 VOCÊ ESTÁ NA POSIÇÃO                              │   │
│  │                                                          │   │
│  │              #23 de 156                                  │   │
│  │                                                          │   │
│  │     ████████████░░░░░░░░░░░░░░░░  15%                    │   │
│  │                                                          │   │
│  │     Estimativa: ~2 dias para ciclar                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ESTATÍSTICAS DO NÍVEL 1                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   2,450     │ │    23       │ │   ~48h      │ │   156       ││
│  │   Ciclos    │ │   Hoje      │ │   Média     │ │   Na Fila   ││
│  │   Totais    │ │   (24h)     │ │   Espera    │ │   Agora     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  MATRIZ MAIS ANTIGA: há 15 dias (entrada: 27/Nov/2025)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

FILA COMPLETA DO NÍVEL 1
┌─────────────────────────────────────────────────────────────────┐
│  🔍 [Buscar por nome ou código...         ]  [Ir para mim]     │
├─────────────────────────────────────────────────────────────────┤
│  #   │ USUÁRIO        │ SCORE  │ TEMPO NA FILA  │ REENTRADAS   │
│ ─────┼────────────────┼────────┼────────────────┼────────────── │
│  1   │ Carlos S.      │ 245.5  │ 15 dias        │ 3            │
│  2   │ Maria L.       │ 201.2  │ 12 dias        │ 2            │
│  3   │ João P.        │ 198.7  │ 11 dias        │ 2            │
│  ... │ ...            │ ...    │ ...            │ ...          │
│ ─────┼────────────────┼────────┼────────────────┼────────────── │
│  23  │ ⭐ VOCÊ (Ana)  │ 98.3   │ 5 dias         │ 1            │  ← DESTAQUE
│ ─────┼────────────────┼────────┼────────────────┼────────────── │
│  24  │ Pedro M.       │ 95.1   │ 5 dias         │ 1            │
│  ... │ ...            │ ...    │ ...            │ ...          │
│  156 │ Roberto K.     │ 12.0   │ 6 horas        │ 0            │
├─────────────────────────────────────────────────────────────────┤
│        [◀ Anterior]  Página 3 de 16  [Próxima ▶]               │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints

```
GET /api/matrix/position/:level
→ Retorna posição do usuário no nível

Response:
{
  "position": 23,
  "totalInQueue": 156,
  "percentile": 15,
  "estimatedWait": "2 dias",
  "score": 98.3,
  "enteredAt": "2025-12-07T10:30:00Z",
  "reentries": 1
}

GET /api/matrix/stats/:level
→ Retorna estatísticas do nível

Response:
{
  "levelId": 1,
  "totalCycles": 2450,
  "cyclesToday": 23,
  "avgCyclesPerDay": 18.5,
  "avgWaitTime": 2880,  // minutos
  "totalInQueue": 156,
  "oldestEntry": {
    "enteredAt": "2025-11-27T08:00:00Z",
    "daysAgo": 15
  }
}

GET /api/matrix/queue/:level
→ Retorna fila completa paginada

Query params:
- page: número da página (default: 1)
- limit: itens por página (default: 10, max: 50)
- search: busca por nome ou código
- highlight: boolean para destacar usuário logado

Response:
{
  "items": [
    {
      "position": 1,
      "userId": "clx123...",
      "name": "Carlos S.",
      "code": "CAR001",
      "score": 245.5,
      "timeInQueue": "15 dias",
      "reentries": 3,
      "isCurrentUser": false
    },
    // ...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16
  },
  "currentUserPosition": 23  // incluído se highlight=true
}

GET /api/matrix/queue/:level/find-me
→ Retorna a página onde o usuário está

Response:
{
  "position": 23,
  "page": 3,
  "limit": 10
}
```

### Cálculos e Lógica

```typescript
// Calcular posição do usuário na fila
async function getUserPosition(userId: string, levelId: number): Promise<number> {
  // Buscar a entrada do usuário
  const userEntry = await prisma.queueEntry.findFirst({
    where: { userId, levelId, status: 'WAITING' }
  })

  if (!userEntry) return -1

  // Contar quantos têm score maior (estão na frente)
  const aheadCount = await prisma.queueEntry.count({
    where: {
      levelId,
      status: 'WAITING',
      score: { gt: userEntry.score }
    }
  })

  return aheadCount + 1  // Posição é quantidade na frente + 1
}

// Calcular tempo estimado para ciclar
function estimateWaitTime(
  position: number,
  avgCyclesPerDay: number
): string {
  if (avgCyclesPerDay === 0) return "Calculando..."

  // Cada ciclo processa 7 pessoas
  const cyclesNeeded = Math.ceil(position / 7)
  const daysNeeded = cyclesNeeded / avgCyclesPerDay

  if (daysNeeded < 1) {
    const hours = Math.round(daysNeeded * 24)
    return `~${hours} horas`
  } else if (daysNeeded < 7) {
    return `~${Math.round(daysNeeded)} dias`
  } else {
    const weeks = Math.round(daysNeeded / 7)
    return `~${weeks} semanas`
  }
}

// Atualizar estatísticas do nível (executar após cada ciclo)
async function updateLevelStats(levelId: number): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Contar ciclos
  const [totalCycles, cyclesToday] = await Promise.all([
    prisma.cycleHistory.count({
      where: { levelId, position: 0, status: 'COMPLETED' }
    }),
    prisma.cycleHistory.count({
      where: {
        levelId,
        position: 0,
        status: 'COMPLETED',
        createdAt: { gte: today }
      }
    })
  ])

  // Matriz mais antiga
  const oldestEntry = await prisma.queueEntry.findFirst({
    where: { levelId, status: 'WAITING' },
    orderBy: { enteredAt: 'asc' }
  })

  // Calcular média de ciclos por dia (últimos 30 dias)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const cyclesLast30Days = await prisma.cycleHistory.count({
    where: {
      levelId,
      position: 0,
      status: 'COMPLETED',
      createdAt: { gte: thirtyDaysAgo }
    }
  })

  const avgCyclesPerDay = cyclesLast30Days / 30

  // Calcular tempo médio de espera (dos últimos 100 ciclos)
  const recentCycles = await prisma.cycleHistory.findMany({
    where: { levelId, position: 0, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: true }
  })

  // ... cálculo do tempo médio

  await prisma.levelStats.upsert({
    where: { levelId },
    update: {
      totalCycles,
      cyclesToday,
      avgCyclesPerDay,
      avgWaitTime,
      firstCycleAt: oldestEntry?.enteredAt
    },
    create: {
      levelId,
      totalCycles,
      cyclesToday,
      avgCyclesPerDay,
      avgWaitTime,
      firstCycleAt: oldestEntry?.enteredAt
    }
  })
}
```

### Privacidade

```
DADOS VISÍVEIS NA FILA PÚBLICA:
├── Posição na fila (#1, #2, #3...)
├── Primeiro nome + inicial do sobrenome (João S.)
├── Código de usuário (JOA001)
├── Score calculado
├── Tempo na fila
└── Número de reentradas

DADOS OCULTOS:
├── Email
├── Wallet completa
├── Valor do saldo
├── Histórico de transações
└── Dados pessoais completos

NOTA: Usuário pode escolher aparecer como "Anônimo"
      no lugar do nome (configuração no perfil)
```

### Componentes Frontend

```
/src/components/
├── MatrixPosition/
│   ├── PositionCard.tsx        // Card principal da posição
│   ├── LevelStatsCards.tsx     // 4 cards de estatísticas
│   ├── QueueList.tsx           // Lista paginada
│   ├── QueueSearch.tsx         // Busca por nome/código
│   └── PositionHighlight.tsx   // Destaque do usuário
│
├── hooks/
│   ├── useMatrixPosition.ts    // Hook para posição
│   ├── useLevelStats.ts        // Hook para estatísticas
│   └── useQueueList.ts         // Hook para fila paginada
```

### Benefícios

```
PARA O USUÁRIO:
├── Sabe exatamente onde está
├── Entende como funciona o sistema
├── Pode planejar baseado em estimativas
├── Confiança na transparência
└── Motivação ao ver progresso

PARA O SISTEMA:
├── Reduz tickets de suporte ("onde estou?")
├── Aumenta credibilidade
├── Diferencial competitivo
├── Usuários mais engajados
└── Prova de funcionamento
```

---

# 8. SEGURANÇA

## 8.1 Autenticação

```
JWT:
├── Access Token: 1h
├── Refresh Token: 7d
├── Rotação de refresh

Senha:
├── Mínimo 8 chars
├── bcrypt (cost 12)
├── Rate limit: 5/15min

MetaMask:
├── Assinatura de mensagem
├── Timestamp (5min válido)
├── Verificar no backend
```

## 8.2 Proteções

```
1. Múltiplas Wallets → KYC, limite IP
2. Score Manipulation → Só contar ativos
3. Rate Limiting → Por IP/usuário
4. SQL Injection → ORM + validação
5. CORS → Domínios permitidos
```

## 8.3 Rate Limits

```
Geral: 100 req / 15min
Login: 5 tentativas / 15min
Registro: 3 / hora / IP
Depósito: 10 verificações / min
```

---

# 9. DEPLOY

## 9.1 Variáveis de Ambiente

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="..."
JWT_EXPIRES_IN="1h"

# Blockchain
BLOCKCHAIN_NETWORK="mainnet"
SYSTEM_WALLET_ADDRESS="0x..."
SYSTEM_WALLET_PRIVATE_KEY="0x..."  # ⚠️ CRÍTICO

# Admin
ADMIN_API_KEY="..."
```

## 9.2 Checklist Lançamento

```
SEGURANÇA:
☐ Variáveis configuradas
☐ Private key segura
☐ HTTPS ativo
☐ Rate limiting

BANCO:
☐ Migrations rodadas
☐ Seed executado
☐ Backups configurados

BLOCKCHAIN:
☐ Wallet com BNB (gas)
☐ Wallet com USDT
☐ Contrato correto
☐ RPC mainnet

FRONTEND:
☐ Build produção
☐ PWA manifest
☐ Meta tags

MONITORAMENTO:
☐ Logs centralizados
☐ Alertas de erro
☐ Health checks
```

---

# 10. TESTES

## 10.1 Casos de Teste

```
UNITÁRIOS:
├── Cálculo de score
├── Valores por nível
├── Validações de input

INTEGRAÇÃO:
├── Fluxo registro → ativação
├── Fluxo de ciclo completo
├── Pagamentos blockchain

CONTABILIDADE:
├── Entrada = Saída + Fundos
├── Distribuição Pos 5 correta
├── Bônus calculado certo
```

## 10.2 Resultados Esperados

```
100 usuários:   ~19 ciclos,  ~13.6% lucro
1.000 usuários: ~206 ciclos, ~12.8% lucro
10.000 usuários: ~2.070 ciclos, ~14% lucro

IMPORTANTE: Balanço deve SEMPRE fechar ($0 diferença)
```

---

# RESUMO EXECUTIVO

## Arquivos para Criar

```
/prisma
  └── schema.prisma     # Schema do banco

/src
  /app
    /api               # Endpoints
    /(auth)            # Páginas auth
    /(dashboard)       # Páginas dashboard
  /components          # Componentes React
  /services
    ├── matrix.service.ts
    ├── payment.service.ts
    └── blockchain.service.ts
  /hooks               # Hooks React
  /lib                 # Utilitários
```

## Fluxo Principal

```
1. Usuário registra (email/wallet)
2. Deposita $10 USDT
3. Sistema verifica na blockchain
4. Ativa usuário, adiciona à fila
5. Quando 7 pessoas: processa matriz
6. Recebedor ganha 2×, avança, reentra
7. Bônus pago ao indicador
8. Lucro vai para empresa
9. Ciclo se repete infinitamente
```

## Pontos Críticos

```
⚠️ Private key NUNCA no código
⚠️ Verificar TX antes de ativar
⚠️ Transações atômicas no banco
⚠️ Rate limiting em todos endpoints
⚠️ Monitorar saldo do sistema
⚠️ Testar MUITO em testnet primeiro
```

---

---

# 11. IMPLEMENTAÇÃO COMPLETA

## 11.1 Estrutura de Arquivos Implementados

Todos os arquivos abaixo foram criados e estão funcionais:

```
nextjs-app/
├── prisma/
│   └── schema.prisma                          # Schema atualizado com novos models
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   └── wallet/route.ts
│   │   │   │
│   │   │   ├── quotas/                        # API de Cotas
│   │   │   │   ├── route.ts                   # GET lista, POST compra cota
│   │   │   │   └── check/route.ts             # GET verifica se pode comprar
│   │   │   │
│   │   │   ├── transfers/                     # API de Transferências
│   │   │   │   └── route.ts                   # GET histórico, POST transferir
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── me/route.ts
│   │   │   │   └── pin/route.ts               # GET/POST gerenciar PIN
│   │   │   │
│   │   │   ├── matrix/                        # API de Visualização
│   │   │   │   ├── position/[level]/route.ts  # GET posição no nível
│   │   │   │   ├── stats/route.ts             # GET stats todos níveis
│   │   │   │   ├── stats/[level]/route.ts     # GET stats nível específico
│   │   │   │   └── queue/[level]/
│   │   │   │       ├── route.ts               # GET fila paginada
│   │   │   │       └── find-me/route.ts       # GET página do usuário
│   │   │   │
│   │   │   ├── notifications/                 # API de Notificações
│   │   │   │   ├── route.ts                   # GET/PUT preferências
│   │   │   │   └── subscribe/route.ts         # POST/DELETE push subscription
│   │   │   │
│   │   │   ├── payments/
│   │   │   │   └── verify/route.ts
│   │   │   │
│   │   │   └── queues/route.ts
│   │   │
│   │   └── dashboard/
│   │       ├── page.tsx                       # Dashboard principal (atualizado)
│   │       ├── quotas/page.tsx                # Página de compra de cotas
│   │       ├── matrix/page.tsx                # Página de visualização matriz
│   │       ├── transfers/page.tsx             # Página de transferências
│   │       └── notifications/page.tsx         # Página de notificações
│   │
│   ├── components/
│   │   ├── matrix/                            # Componentes de Matriz
│   │   │   ├── index.ts
│   │   │   ├── PositionCard.tsx               # Card de posição na fila
│   │   │   ├── LevelStatsCard.tsx             # Estatísticas de um nível
│   │   │   ├── AllLevelsStats.tsx             # Visão geral 10 níveis
│   │   │   └── QueueList.tsx                  # Lista paginada da fila
│   │   │
│   │   ├── quotas/                            # Componentes de Cotas
│   │   │   ├── index.ts
│   │   │   ├── QuotaCard.tsx                  # Card para comprar cota
│   │   │   └── QuotaList.tsx                  # Lista de cotas do usuário
│   │   │
│   │   ├── transfer/                          # Componentes de Transferência
│   │   │   ├── index.ts
│   │   │   ├── TransferForm.tsx               # Formulário com PIN
│   │   │   └── TransferHistory.tsx            # Histórico de transferências
│   │   │
│   │   └── notifications/                     # Componentes de Notificações
│   │       ├── index.ts
│   │       ├── NotificationSettings.tsx       # Configurações de preferências
│   │       └── NotificationHistory.tsx        # Histórico de notificações
│   │
│   ├── services/
│   │   ├── blockchain.service.ts
│   │   ├── matrix.service.ts                  # Atualizado com funções de cotas
│   │   ├── transfer.service.ts                # NOVO - Transferências com PIN
│   │   ├── queue.service.ts                   # NOVO - Posição e estatísticas
│   │   └── notification.service.ts            # NOVO - Email e Push
│   │
│   ├── types/
│   │   └── index.ts                           # Atualizado com novos tipos
│   │
│   └── lib/
│       └── auth.ts
│
└── package.json
```

## 11.2 Banco de Dados - Novos Models

### Enums Adicionados

```prisma
enum NotificationChannel {
  EMAIL
  PUSH
}

enum NotificationEvent {
  QUEUE_ADVANCE
  CYCLE_COMPLETED
  BONUS_RECEIVED
  TRANSFER_RECEIVED
  TRANSFER_SENT
  WELCOME
  SYSTEM
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  READ
}
```

### TransactionType Atualizado

```prisma
enum TransactionType {
  DEPOSIT
  CYCLE_REWARD
  BONUS_REFERRAL
  WITHDRAWAL
  INTERNAL_TRANSFER_IN   # NOVO
  INTERNAL_TRANSFER_OUT  # NOVO
  QUOTA_PURCHASE         # NOVO
}
```

### User Model Atualizado

```prisma
model User {
  // ... campos existentes

  // Saldo interno
  balance             Decimal     @default(0) @db.Decimal(18, 2)

  // PIN de segurança
  pinHash             String?
  pinAttempts         Int         @default(0)
  pinBlockedUntil     DateTime?

  // Preferências de notificação
  notifyEmail           Boolean   @default(true)
  notifyPush            Boolean   @default(false)
  notifyOnQueueAdvance  Boolean   @default(true)
  notifyOnCycle         Boolean   @default(true)
  notifyOnBonus         Boolean   @default(true)
  notifyOnTransfer      Boolean   @default(true)
  notifyFrequency       String    @default("INSTANT")

  // Relacionamentos
  transfersSent       InternalTransfer[] @relation("TransfersSent")
  transfersReceived   InternalTransfer[] @relation("TransfersReceived")
  pushSubscriptions   PushSubscription[]
  notificationLogs    NotificationLog[]
}
```

### QueueEntry Atualizado

```prisma
model QueueEntry {
  // ... campos existentes
  quotaNumber  Int  @default(1)  // Para múltiplas cotas
}
```

### Novos Models

```prisma
model InternalTransfer {
  id            String    @id @default(cuid())
  fromUserId    String
  fromUser      User      @relation("TransfersSent", fields: [fromUserId], references: [id])
  toUserId      String
  toUser        User      @relation("TransfersReceived", fields: [toUserId], references: [id])
  amount        Decimal   @db.Decimal(18, 2)
  status        String    @default("COMPLETED")
  createdAt     DateTime  @default(now())

  @@index([fromUserId])
  @@index([toUserId])
}

model LevelStats {
  id              Int       @id @default(autoincrement())
  levelId         Int       @unique
  totalCycles     Int       @default(0)
  cyclesToday     Int       @default(0)
  avgCycleTime    Float     @default(0)
  updatedAt       DateTime  @updatedAt
}

model PushSubscription {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  endpoint    String
  p256dh      String
  auth        String
  device      String?
  createdAt   DateTime  @default(now())

  @@unique([userId, endpoint])
}

model NotificationLog {
  id          String              @id @default(cuid())
  userId      String
  user        User                @relation(fields: [userId], references: [id])
  channel     NotificationChannel
  event       NotificationEvent
  title       String
  message     String
  status      NotificationStatus  @default(PENDING)
  sentAt      DateTime?
  readAt      DateTime?
  createdAt   DateTime            @default(now())

  @@index([userId])
}
```

## 11.3 APIs Implementadas

### API de Cotas

```
GET  /api/quotas           → Lista todas as cotas do usuário
POST /api/quotas           → Compra nova cota { level: number }
GET  /api/quotas/check     → Verifica se pode comprar ?level=N
```

### API de Transferências

```
GET  /api/transfers        → Histórico de transferências
POST /api/transfers        → Nova transferência
     Body: { recipientWallet, amount, pin }
```

### API de PIN

```
GET  /api/users/pin        → Verifica se tem PIN
POST /api/users/pin        → Cria/altera PIN { pin, currentPin? }
```

### API de Matriz

```
GET  /api/matrix/position/:level    → Posição do usuário no nível
GET  /api/matrix/stats              → Estatísticas de todos os níveis
GET  /api/matrix/stats/:level       → Estatísticas de um nível
GET  /api/matrix/queue/:level       → Fila paginada ?page=1&limit=10
GET  /api/matrix/queue/:level/find-me → Encontra página do usuário
```

### API de Notificações

```
GET  /api/notifications             → Preferências ou histórico
PUT  /api/notifications             → Atualiza preferências
POST /api/notifications/subscribe   → Registra push subscription
DELETE /api/notifications/subscribe → Remove push subscription
```

## 11.4 Services Implementados

### transfer.service.ts

```typescript
export const transferService = {
  // PIN
  createPin(userId, pin)              // Cria PIN com bcrypt
  changePin(userId, currentPin, newPin)
  verifyPin(userId, pin)              // Valida e gerencia bloqueios
  hasPin(userId)

  // Transferências
  transfer(fromId, toWallet, amount, pin)  // Transferência com validação
  getTransferHistory(userId, page, limit)
  getTransferLimits(userId)           // Limites diários
}
```

### queue.service.ts

```typescript
export const queueService = {
  // Posição
  getUserPosition(userId, level)
  getAllUserPositions(userId)
  findUserPage(userId, level, limit)

  // Estatísticas
  getLevelStats(level)
  getAllLevelsStats()
  calculateLevelStats(level)

  // Fila
  getQueueList(level, page, limit, currentUserId?, search?)
}
```

### notification.service.ts

```typescript
export const notificationService = {
  // Envio
  sendNotification(userId, event, title, message, data?)

  // Push
  subscribePush(userId, subscription)
  unsubscribePush(userId, endpoint)

  // Preferências
  updatePreferences(userId, prefs)
  getPreferences(userId)
  getNotificationHistory(userId, limit, offset)

  // Eventos específicos
  notifyQueueAdvance(userId, level, oldPos, newPos)
  notifyCycleCompleted(userId, level, amount)
  notifyBonusReceived(userId, referredName, level, amount)
  notifyTransferReceived(userId, senderName, amount)
  notifyTransferSent(userId, recipientName, amount)
}
```

### matrix.service.ts (Atualizado)

```typescript
// Novas funções adicionadas
countUserQuotas(userId, level)        // Conta cotas no nível
canPurchaseQuota(userId, level)       // Valida regras de compra
purchaseQuota(userId, level)          // Processa compra
getUserQuotas(userId, level)          // Lista cotas do nível
getAllUserQuotas(userId)              // Lista todas as cotas
```

## 11.5 Componentes Frontend

### Matrix Components

| Componente | Descrição |
|------------|-----------|
| `PositionCard` | Exibe posição do usuário em um nível com score e estimativas |
| `LevelStatsCard` | Card com estatísticas de um nível (ciclos, tempo médio, etc) |
| `AllLevelsStats` | Grid com visão geral dos 10 níveis |
| `QueueList` | Lista paginada da fila com busca e "ir para minha posição" |

### Quota Components

| Componente | Descrição |
|------------|-----------|
| `QuotaCard` | Card para comprar cota com valor, lucro e validação |
| `QuotaList` | Lista todas as cotas do usuário agrupadas por nível |

### Transfer Components

| Componente | Descrição |
|------------|-----------|
| `TransferForm` | Formulário completo com setup de PIN e transferência |
| `TransferHistory` | Histórico de transferências enviadas/recebidas |

### Notification Components

| Componente | Descrição |
|------------|-----------|
| `NotificationSettings` | Configuração de canais, eventos e frequência |
| `NotificationHistory` | Lista de notificações recebidas |

## 11.6 Páginas do Dashboard

### `/dashboard` (Atualizado)

- 5 cards de estatísticas (saldo, bônus, cotas, ciclos, indicados)
- 4 ações rápidas (Comprar Cotas, Ver Matriz, Transferir, Indicar)
- Visualização das posições em todos os 10 níveis
- Link de indicação com resumo de cotas

### `/dashboard/quotas`

- Grid de 10 níveis para compra de cotas
- Validação em tempo real (requisitos, saldo)
- Lista de cotas ativas do usuário
- Mensagens de erro/sucesso

### `/dashboard/matrix`

- Estatísticas gerais da matriz
- Cards de posição em todos os níveis
- Seletor de nível para ver fila
- Lista paginada com busca e destaque

### `/dashboard/transfers`

- Formulário de transferência
- Setup de PIN (primeira vez)
- Histórico de transferências
- Informações de segurança

### `/dashboard/notifications`

- Configuração de canais (email, push)
- Seleção de eventos para notificar
- Frequência de notificações
- Histórico de notificações

## 11.7 Navegação Atualizada

```
Dashboard
├── 🏠 Dashboard (principal)
├── 🎫 Cotas (compra múltiplas cotas)
├── 📊 Matriz (visualização filas)
├── 💸 Transferências (envio saldo)
├── 👥 Indicações (referrals)
├── 🔔 Notificações (configurações)
└── ⚙️ Configurações
```

## 11.8 Comandos para Deploy

```bash
# Instalar dependências
npm install

# Gerar cliente Prisma
npx prisma generate

# Rodar migrations
npx prisma migrate dev

# Build produção
npm run build

# Iniciar
npm start
```

## 11.9 Dependências Adicionais

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",      // Hash de PIN
    "web-push": "^3.6.6",       // Push notifications
    "nodemailer": "^6.9.7"      // Emails (ou @sendgrid/mail, resend)
  }
}
```

## 11.10 Variáveis de Ambiente Adicionais

```bash
# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:suporte@7iatlas.com"

# Email (escolher um)
SENDGRID_API_KEY="..."
# ou
RESEND_API_KEY="..."
# ou
SMTP_HOST="..."
SMTP_PORT="..."
SMTP_USER="..."
SMTP_PASS="..."
```

---

## 7.4.7 Jupiter Pool (Sistema Anti-Travamento)

O **Jupiter Pool** é um fundo de liquidez **PÚBLICO** que garante que o sistema nunca trave por falta de liquidez. É separado da Reserva Interna.

### Conceito

```
DOIS FUNDOS SEPARADOS:

┌─────────────────────────────────────────────────────────────────┐
│  JUPITER POOL (PÚBLICO)                                         │
│  ├── Fonte: 10% do GANHO DO RECEBEDOR (todos os níveis)        │
│  ├── Visibilidade: PÚBLICO (usuários veem no dashboard)        │
│  └── Uso: EXTREMA URGÊNCIA, de forma INTELIGENTE               │
├─────────────────────────────────────────────────────────────────┤
│  RESERVA INTERNA (PRIVADO)                                      │
│  ├── Fonte: 10% da Posição 5 (COMUNIDADE)                      │
│  ├── Visibilidade: PRIVADO (apenas admin)                      │
│  └── Uso: EXTREMA NECESSIDADE (último recurso)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fonte de Recursos do Jupiter Pool

```
10% do GANHO DO RECEBEDOR (posição 0) em TODOS os níveis

┌────────┬──────────────────┬─────────────────┬─────────────────┐
│ Nível  │ Ganho Recebedor  │ Jupiter Pool    │ Recebe Líquido  │
├────────┼──────────────────┼─────────────────┼─────────────────┤
│   1    │      $20         │     $2 (10%)    │      $18        │
│   2    │      $40         │     $4 (10%)    │      $36        │
│   3    │      $80         │     $8 (10%)    │      $72        │
│   4    │     $160         │    $16 (10%)    │     $144        │
│   5    │     $320         │    $32 (10%)    │     $288        │
│   6    │     $640         │    $64 (10%)    │     $576        │
│   7    │   $1.280         │   $128 (10%)    │   $1.152        │
│   8    │   $2.560         │   $256 (10%)    │   $2.304        │
│   9    │   $5.120         │   $512 (10%)    │   $4.608        │
│  10    │  $10.240         │ $1.024 (10%)    │   $9.216        │
└────────┴──────────────────┴─────────────────┴─────────────────┘
```

### Critérios de Uso (Por Ordem de Prioridade)

```
QUANDO USAR O JUPITER POOL:

1º PRIORIDADE: Filas que LIBERAM CASCATA
   └── Destravar um nível que destrava outros níveis
   └── Ex: N3 travado bloqueia avanço de N2 → priorizar N3

2º PRIORIDADE: Tempo de espera (fila mais antiga)
   └── Pessoas esperando há MAIS DE 10 DIAS
   └── Fila mais antiga = maior prioridade

3º PRIORIDADE: Ter pessoas esperando
   └── Só injeta se tiver gente na fila aguardando
```

### Regras de Injeção

```
REGRAS DO JUPITER POOL:

✅ QUANDO USAR:
├── EXTREMA URGÊNCIA apenas
├── Pessoas esperando há mais de 10 dias
├── De forma INTELIGENTE (priorizar cascata)
└── Quando realmente necessário

✅ LIMITE DE USO:
├── SEM LIMITE - usa TUDO se precisar
└── SEM RESERVA MÍNIMA - pode zerar o pool

✅ VISIBILIDADE:
└── PÚBLICO - usuários veem saldo em tempo real
```

### Algoritmo de Priorização

```python
def calcular_prioridade_injecao(nivel):
    prioridade = 0

    # 1. Cascata: níveis que destravam outros
    niveis_bloqueados = contar_niveis_esperando_avancar_para(nivel)
    prioridade += niveis_bloqueados * 100  # Peso alto

    # 2. Tempo de espera
    dias_espera_max = max_dias_espera_na_fila(nivel)
    if dias_espera_max > 10:
        prioridade += dias_espera_max * 10

    # 3. Pessoas esperando
    pessoas_na_fila = contar_pessoas_na_fila(nivel)
    prioridade += pessoas_na_fila * 1

    return prioridade

def deve_injetar(nivel):
    # Só injeta se tiver pessoas esperando há mais de 10 dias
    dias_espera_max = max_dias_espera_na_fila(nivel)
    return dias_espera_max > 10 and contar_pessoas_na_fila(nivel) > 0
```

### Diferença: Jupiter Pool vs Reserva Interna

| Aspecto | Jupiter Pool | Reserva Interna |
|---------|--------------|-----------------|
| **Fonte** | 10% do ganho do RECEBEDOR | 10% da Posição 5 |
| **Visibilidade** | PÚBLICO | PRIVADO |
| **Uso** | Extrema urgência | Extrema necessidade (último recurso) |
| **Quem decide** | Algoritmo automático | Admin manual |
| **Transparência** | Usuários veem saldo | Apenas admin |

### Modelo de Dados

```prisma
// Adicionar ao enum TransactionType
enum TransactionType {
  // ... existentes
  JUPITER_POOL_DEPOSIT       // Entrada: 10% do ganho do recebedor
  JUPITER_POOL_WITHDRAWAL    // Saída: injeção em nível travado
}

// Tabela para tracking do Jupiter Pool
model JupiterPoolTransaction {
  id            String    @id @default(cuid())

  type          String    // "DEPOSIT" ou "WITHDRAWAL"
  amount        Decimal   @db.Decimal(18, 2)

  // Para depósitos
  cycleId       String?   // ID do ciclo que gerou
  levelId       Int?      // Nível do ciclo

  // Para saques (injeções)
  targetLevelId Int?      // Nível que recebeu injeção
  reason        String?   // "CASCADE_PRIORITY", "WAIT_TIME_EXCEEDED"

  balanceAfter  Decimal   @db.Decimal(18, 2)  // Saldo após transação

  createdAt     DateTime  @default(now())

  @@index([type])
  @@index([createdAt])
}

// Saldo atual do Jupiter Pool (cache)
model JupiterPoolBalance {
  id            Int       @id @default(1)
  balance       Decimal   @default(0) @db.Decimal(18, 2)
  totalDeposits Decimal   @default(0) @db.Decimal(18, 2)
  totalWithdrawals Decimal @default(0) @db.Decimal(18, 2)
  lastUpdated   DateTime  @updatedAt
}
```

### API Endpoints

```
GET /api/jupiter-pool/balance
→ Retorna saldo atual (PÚBLICO)
{
  "balance": 15420.50,
  "totalDeposits": 25000.00,
  "totalWithdrawals": 9579.50,
  "todayDeposits": 320.00,
  "todayWithdrawals": 70.00
}

GET /api/jupiter-pool/history
→ Histórico de transações (PÚBLICO)
{
  "transactions": [
    { "type": "DEPOSIT", "amount": 2.00, "level": 1, "createdAt": "..." },
    { "type": "WITHDRAWAL", "amount": 50.00, "targetLevel": 3, "reason": "WAIT_TIME_EXCEEDED", "createdAt": "..." }
  ]
}

GET /api/jupiter-pool/stats
→ Estatísticas (PÚBLICO)
{
  "avgDailyDeposits": 320.00,
  "avgDailyWithdrawals": 70.00,
  "interventionsThisMonth": 12,
  "levelsHelped": [3, 5, 7]
}
```

### Interface do Dashboard

```
DASHBOARD > JUPITER POOL (Público)
┌─────────────────────────────────────────────────────────────────┐
│ 🪐 Jupiter Pool - Fundo de Liquidez                              │
│ Saldo: $15,420.50                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  📈 Acumulado   │  │  💫 Injetado    │  │  🎯 Intervenções│  │
│  │  $25,000        │  │  $9,579.50      │  │  127 este mês   │  │
│  │  (total)        │  │  (total)        │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  COMO FUNCIONA:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ① COLETA: 10% do ganho de cada Recebedor vai para o Pool   ││
│  │ ② ACUMULA: O pool cresce com cada ciclo em todos os níveis ││
│  │ ③ INJETA: Quando necessário, destrava filas paradas        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  CRITÉRIOS DE USO:                                              │
│  • Prioriza filas que liberam cascata (destravam outros níveis) │
│  • Só usa quando pessoas esperam há mais de 10 dias             │
│  • Usa de forma inteligente, apenas em extrema urgência         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Coleta (a cada ciclo)

```
PROCESSAMENTO DE CICLO:

1. Recebedor (posição 0) ganha 2× valor de entrada
2. Sistema calcula 10% do ganho
3. Deduz do pagamento ao recebedor
4. Credita no Jupiter Pool
5. Registra transação JUPITER_POOL_DEPOSIT

EXEMPLO (Nível 3):
├── Valor entrada: $40
├── Ganho bruto: $80
├── Jupiter Pool: $8 (10%)
├── Ganho líquido: $72
└── Jupiter Pool += $8
```

### Fluxo de Injeção (quando necessário)

```
VERIFICAÇÃO DE INJEÇÃO (executar periodicamente):

1. Para cada nível, verificar:
   ├── Tem pessoas na fila?
   ├── Alguém espera há mais de 10 dias?
   └── Liberaria cascata?

2. Calcular prioridade de cada nível elegível

3. Ordenar por prioridade (maior primeiro)

4. Para o nível mais prioritário:
   ├── Calcular quanto precisa para destravar
   ├── Se Jupiter Pool tem saldo suficiente:
   │   ├── Injetar no caixa do nível
   │   ├── Registrar JUPITER_POOL_WITHDRAWAL
   │   └── Processar ciclos desbloqueados
   └── Se não tem saldo: aguardar acumulação

5. Repetir até não haver mais níveis elegíveis
   ou Jupiter Pool zerar
```

### Simulação de Acumulação

```
CENÁRIO: 1.000 ciclos/dia distribuídos nos níveis

Distribuição estimada:
├── N1: 500 ciclos × $2 = $1.000/dia
├── N2: 200 ciclos × $4 = $800/dia
├── N3: 100 ciclos × $8 = $800/dia
├── N4: 80 ciclos × $16 = $1.280/dia
├── N5: 50 ciclos × $32 = $1.600/dia
├── N6: 30 ciclos × $64 = $1.920/dia
├── N7: 20 ciclos × $128 = $2.560/dia
├── N8: 10 ciclos × $256 = $2.560/dia
├── N9: 7 ciclos × $512 = $3.584/dia
├── N10: 3 ciclos × $1.024 = $3.072/dia
└── TOTAL: ~$19.176/dia acumulados no Jupiter Pool

Em 30 dias: ~$575.000 acumulados (se nenhuma injeção)
```

### Benefícios do Sistema

```
PARA O USUÁRIO:
├── Transparência total (vê o saldo do pool)
├── Confiança (sabe que existe proteção)
├── Filas não travam indefinidamente
└── Sistema justo (prioriza quem espera mais)

PARA O SISTEMA:
├── Anti-travamento automático
├── Sustentabilidade de longo prazo
├── Credibilidade e confiança
└── Reduz reclamações de suporte
```

---

## 7.4.8 Reserva Interna (Fundo Privado)

A **Reserva Interna** é um fundo **PRIVADO** separado do Jupiter Pool, usado apenas em **extrema necessidade** como último recurso.

### Conceito

```
RESERVA INTERNA:
├── Fonte: 10% da Posição 5 (COMUNIDADE)
├── Visibilidade: PRIVADO (apenas admin)
├── Uso: EXTREMA NECESSIDADE (último recurso)
└── Decisão: Manual pelo administrador
```

### Quando Usar

```
A Reserva Interna só deve ser usada quando:

1. Jupiter Pool está ZERADO
2. E ainda há filas travadas há muito tempo
3. E não há previsão de recuperação natural
4. Decisão manual do administrador

É o ÚLTIMO RECURSO do sistema.
```

### Diferença Prática

```
EXEMPLO DE CRISE:

Dia 1-30: Sistema normal
├── Jupiter Pool acumula recursos
└── Reserva Interna acumula recursos

Dia 31-60: Crise (poucos novos usuários)
├── Filas começam a travar
├── Jupiter Pool começa a injetar (automaticamente)
└── Reserva Interna não é tocada

Dia 61-90: Crise severa
├── Jupiter Pool ZERA
├── Filas ainda travadas
├── Admin avalia situação
└── Admin decide usar Reserva Interna (manual)

Dia 91+: Recuperação
├── Novos usuários entram
├── Jupiter Pool volta a acumular
└── Reserva Interna volta a acumular
```

---

**Documento completo para desenvolvimento.**

**Arquivos de referência disponíveis:**
- Apresentação: `/7iatlas-apresentacao/`
- Dashboard Demo: `/7iatlas-dashboard/`
- Projeto Next.js: `/7iatlas-nextjs.zip`
- Testes: `/teste_completo_7iatlas.py`

**Status da Implementação:**

Funcionalidades documentadas (7.4.1 a 7.4.8):
- ✅ Múltiplas cotas por usuário
- ✅ Compra em níveis superiores
- ✅ Transferência interna com PIN
- ✅ Sistema de notificações (email + push)
- ✅ Visualização de matriz e posição na fila
- ✅ Frontend completo com todas as páginas
- ⏳ Jupiter Pool (documentado, aguardando implementação backend)
- ⏳ Reserva Interna (documentado, aguardando implementação backend)

*Atualizado: Dezembro 2025*
