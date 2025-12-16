# 7iATLAS - Sistema de Carteira

## Visão Geral

O sistema de Carteira é o centro financeiro do 7iATLAS, unificando todas as operações de saldo, doações, compra de cotas, transferências e acompanhamento de recebimentos.

## Terminologia Oficial

| Termo Correto | Não Usar |
|--------------|----------|
| Recebimento | Ganho |
| IEC (Índice de Execução de Ciclos) | ROI |
| Doação / Doar | Depósito / Depositar |

## Estrutura

### Página Principal: `/dashboard/wallet`

A página de Carteira possui 5 abas:

1. **Visão Geral** - Saldo, ações rápidas, resumo mensal
2. **Comprar Cotas** - Seleção de nível e quantidade com validação de saldo
3. **Transferir** - Enviar saldo para outros usuários
4. **Recebimentos** - Detalhamento de ciclos e bônus
5. **Extrato** - Histórico completo de movimentações

## APIs

### GET `/api/wallet/balance`
Retorna saldo atual do usuário.

**Response:**
```json
{
  "balance": 1550.00,
  "totalDonated": 500.00,
  "totalReceived": 1760.00,
  "totalWithdrawn": 0
}
```

### GET `/api/wallet/summary`
Retorna resumo financeiro completo.

**Response:**
```json
{
  "balance": 1550.00,
  "totalDonated": 500.00,
  "totalReceived": 1760.00,
  "totalReceivedCycles": 1240.00,
  "totalReceivedBonus": 520.00,
  "totalInvested": 310.00,
  "totalWithdrawn": 0,
  "iec": 567.74,
  "totalCyclesCompleted": 32,
  "monthlyReceived": 480.00
}
```

### GET `/api/wallet/receipts`
Retorna recebimentos detalhados (ciclos + bônus).

**Query Params:**
- `type`: all | cycles | bonus
- `period`: all | month | week
- `limit`: número (default: 50)
- `page`: número (default: 1)

**Response:**
```json
{
  "summary": {
    "totalReceived": 1760.00,
    "totalFromCycles": 1240.00,
    "totalFromBonus": 520.00,
    "totalCyclesCompleted": 32,
    "totalBonusReceived": 15
  },
  "cyclesByLevel": [
    {
      "level": 1,
      "cycles": 6,
      "valuePerCycle": 20,
      "total": 120,
      "lastReceived": "2025-12-16T10:00:00Z"
    }
  ],
  "bonusReceipts": [...],
  "recentCycles": [...],
  "pagination": {...}
}
```

### GET `/api/wallet/transactions`
Retorna extrato completo de movimentações.

**Query Params:**
- `type`: all | receipts | expenses | CYCLE_REWARD | BONUS_REFERRAL | etc
- `period`: all | today | week | month
- `limit`: número (default: 20, max: 100)
- `page`: número (default: 1)

**Response:**
```json
{
  "transactions": [
    {
      "id": "...",
      "type": "CYCLE_REWARD",
      "typeLabel": "Ciclo",
      "icon": "🔄",
      "color": "green",
      "amount": 40.00,
      "description": "Ciclo completado - Nível 2",
      "balanceAfter": 1550.00,
      "date": "2025-12-16T10:00:00Z"
    }
  ],
  "grouped": {...},
  "pagination": {...},
  "currentBalance": 1550.00
}
```

### POST `/api/wallet/donate`
Realizar doação para o sistema.

**Body:**
```json
{
  "amount": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Doação realizada com sucesso",
  "transaction": {
    "id": "...",
    "amount": 100.00,
    "status": "CONFIRMED",
    "confirmedAt": "..."
  }
}
```

### POST `/api/wallet/withdraw`
Solicitar saque.

**Body:**
```json
{
  "amount": 50.00,
  "walletAddress": "0x..." // opcional, usa wallet do usuário se não fornecido
}
```

**Response:**
```json
{
  "success": true,
  "message": "Solicitação de saque criada",
  "transaction": {...},
  "note": "Seu saque será processado em até 24 horas"
}
```

### GET `/api/quotas/purchase`
Verificar disponibilidade para compra de cotas.

**Response:**
```json
{
  "balance": 1550.00,
  "isActive": true,
  "levels": [
    {
      "level": 1,
      "entryValue": 10,
      "rewardValue": 20,
      "currentQuotas": 3,
      "maxQuotas": 10,
      "availableSlots": 7,
      "canAfford": true,
      "canBuy": true,
      "maxCanBuy": 7
    }
  ]
}
```

### POST `/api/quotas/purchase`
Comprar cota(s) com saldo.

**Body:**
```json
{
  "level": 3,
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 cota(s) comprada(s) com sucesso",
  "purchase": {
    "level": 3,
    "quantity": 2,
    "totalCost": 80,
    "transactionId": "..."
  },
  "quotas": [...],
  "newBalance": 1470.00
}
```

### GET `/api/users/search`
Buscar usuário para transferência.

**Query Params:**
- `q`: código de referência ou email (mínimo 3 caracteres)

**Response:**
```json
{
  "user": {
    "id": "...",
    "name": "João Silva",
    "email": "joa***@email.com",
    "referralCode": "ABC123",
    "status": "ACTIVE"
  }
}
```

## Regras de Negócio

### Compra de Cotas
- Usuário deve estar ATIVO
- Saldo deve ser >= valor total (nível × quantidade)
- Máximo 10 cotas por nível
- Cota entra na fila imediatamente após compra
- Atualiza nível atual do usuário se comprou nível maior

### Transferências
- Saldo deve ser >= valor da transferência
- Não pode transferir para si mesmo
- Usuário destino deve existir e estar válido

### Doações
- Valor mínimo: $10
- Confirmação automática (em produção: via gateway de pagamento)
- Atualiza saldo e totalDeposited do usuário

### Saques
- Valor mínimo: $10
- Saldo deve ser >= valor solicitado
- Saldo é debitado imediatamente (reserva)
- Processamento em até 24 horas

## IEC - Índice de Execução de Ciclos

O IEC é calculado como:

```
IEC = (Total Recebido / Total Investido em Cotas) × 100
```

Exemplo:
- Investiu $310 em cotas
- Recebeu $1,760 (ciclos + bônus)
- IEC = (1760 / 310) × 100 = 567.74%

## Estrutura de Arquivos

```
src/
├── app/
│   ├── api/
│   │   ├── wallet/
│   │   │   ├── balance/route.ts
│   │   │   ├── summary/route.ts
│   │   │   ├── receipts/route.ts
│   │   │   ├── transactions/route.ts
│   │   │   ├── donate/route.ts
│   │   │   └── withdraw/route.ts
│   │   ├── quotas/
│   │   │   └── purchase/route.ts
│   │   └── users/
│   │       └── search/route.ts
│   └── dashboard/
│       └── wallet/
│           └── page.tsx
└── components/
    └── layout/
        └── Sidebar.tsx
```

## Menu de Navegação

O menu lateral foi atualizado para refletir a nova estrutura:

- 🏠 Dashboard
- 🎫 Cotas
- 📊 Matriz
- 💰 **Carteira** (substituiu Transferências)
- 👥 Indicados
- ⚙️ Configurações

## Credenciais de Teste

- **Admin**: admin@7iatlas.com / admin123
- **Usuários**: usuario1@teste.com até usuario31@teste.com / teste123
