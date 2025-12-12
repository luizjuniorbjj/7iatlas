# 7iATLAS - DOCUMENTAÇÃO TÉCNICA COMPLETA
## Sistema de Redistribuição Progressiva

> **Versão:** 1.0  
> **Data:** Dezembro 2025  
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
8. [Segurança](#8-segurança)
9. [Deploy](#9-deploy)
10. [Testes](#10-testes)

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

Cada nível tem sua fila. Score determina prioridade:

```python
score = (tempo_espera × 2) + (reentradas × 1.5) + (indicados × 10)

# Exemplo:
# 24h espera, 2 reentradas, 5 indicados
# Score = 48 + 3 + 50 = 101
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
    
    # Recebedor
    pagar(recebedor, valor × 2)
    if nivel < 10:
        adicionar_fila(recebedor, nivel + 1)
    adicionar_fila(recebedor, nivel)  # reentrada
    
    # Posições 1-4: reentram
    
    # Posição 5: distribuir
    reserva += valor × 0.10
    operacional += valor × 0.10
    if indicador:
        pagar_bonus(indicador, valor × 0.40)
    else:
        lucro += valor × 0.40
    lucro += valor × 0.40
    
    # Posição 6: valor volta ao caixa
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

**Documento completo para desenvolvimento.**

**Arquivos de referência disponíveis:**
- Apresentação: `/7iatlas-apresentacao/`
- Dashboard Demo: `/7iatlas-dashboard/`
- Projeto Next.js: `/7iatlas-nextjs.zip`
- Testes: `/teste_completo_7iatlas.py`

*Atualizado: Dezembro 2025*
