# 7iATLAS - Guia de Testes Completo

## 1. Setup do Ambiente

### 1.1 Instalar Dependências
```bash
cd nextjs-app
npm install
```

### 1.2 Configurar Banco de Dados

Crie um arquivo `.env` na raiz do projeto:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/7iatlas_test"
JWT_SECRET="sua-chave-secreta-aqui-minimo-32-caracteres"
CRON_SECRET="chave-para-cron-jobs"
```

### 1.3 Popular o Banco com Dados de Teste
```bash
# Aplicar schema
npm run db:push

# Popular com dados de teste
npm run db:seed:test

# OU fazer tudo de uma vez (reset + seed)
npm run db:reset
```

---

## 2. Credenciais de Teste

| Usuário | Email | Senha | PIN |
|---------|-------|-------|-----|
| Admin | admin@7iatlas.com | Test@123 | 1234 |
| Líder | leader@7iatlas.com | Test@123 | 1234 |
| User 1-10 | user1@test.com até user10@test.com | Test@123 | 1234 |
| Pendentes | pending11@test.com até pending15@test.com | Test@123 | - |
| Matrix | matrix16@test.com até matrix20@test.com | Test@123 | - |

---

## 3. Cenários de Teste

### 3.1 Autenticação

#### Login com Email/Senha
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@7iatlas.com", "password": "Test@123"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "admin@7iatlas.com", ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### Login com Wallet (simulado)
```bash
curl -X POST http://localhost:3000/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xAdmin0000000000000000000000000000000001",
    "signature": "...",
    "message": "Login 7iATLAS: 1234567890"
  }'
```

---

### 3.2 Dashboard - Dados do Usuário

```bash
# Substitua {TOKEN} pelo accessToken obtido no login
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer {TOKEN}"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@7iatlas.com",
      "walletAddress": "0x...",
      "name": "Administrador",
      "referralCode": "ADMIN001",
      "status": "ACTIVE",
      "currentLevel": 1
    },
    "stats": {
      "balance": 1000,
      "totalEarned": 0,
      "totalBonus": 0,
      "totalDeposited": 100,
      "referralsCount": 0,
      "cyclesCompleted": 0,
      "queuePosition": 1,
      "totalInQueue": 18
    }
  }
}
```

---

### 3.3 Visualização de Filas

#### Status de todas as filas
```bash
curl -X GET http://localhost:3000/api/queues \
  -H "Authorization: Bearer {TOKEN}"
```

#### Posição em um nível específico
```bash
curl -X GET http://localhost:3000/api/matrix/position/1 \
  -H "Authorization: Bearer {TOKEN}"
```

#### Estatísticas do nível
```bash
curl -X GET http://localhost:3000/api/matrix/stats/1 \
  -H "Authorization: Bearer {TOKEN}"
```

#### Fila completa paginada
```bash
curl -X GET "http://localhost:3000/api/matrix/queue/1?page=1&limit=10" \
  -H "Authorization: Bearer {TOKEN}"
```

---

### 3.4 Múltiplas Cotas

#### Verificar se pode comprar cota
```bash
curl -X GET "http://localhost:3000/api/quotas/check?level=2" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Listar cotas do usuário
```bash
curl -X GET http://localhost:3000/api/quotas \
  -H "Authorization: Bearer {TOKEN}"
```

#### Comprar nova cota (usando saldo interno)
```bash
curl -X POST http://localhost:3000/api/quotas \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"levelNumber": 1}'
```

**Validações esperadas:**
- Nível 1: Sempre permitido para usuário ACTIVE
- Níveis 2-10: Precisa ter cota no nível anterior
- Saldo insuficiente: Erro retornado

---

### 3.5 Sistema de PIN

#### Verificar se tem PIN configurado
```bash
curl -X GET http://localhost:3000/api/users/pin \
  -H "Authorization: Bearer {TOKEN}"
```

#### Criar PIN
```bash
curl -X POST http://localhost:3000/api/users/pin \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "Test@123",
    "pin": "1234",
    "confirmPin": "1234"
  }'
```

#### Alterar PIN
```bash
curl -X POST http://localhost:3000/api/users/pin \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "Test@123",
    "pin": "5678",
    "confirmPin": "5678",
    "action": "change"
  }'
```

---

### 3.6 Transferências Internas

#### Histórico de transferências
```bash
curl -X GET http://localhost:3000/api/transfers \
  -H "Authorization: Bearer {TOKEN}"
```

#### Realizar transferência (por código)
```bash
curl -X POST http://localhost:3000/api/transfers \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "toUserCode": "USR001",
    "amount": 20,
    "pin": "1234",
    "description": "Ajuda para cotas"
  }'
```

#### Realizar transferência (por wallet)
```bash
curl -X POST http://localhost:3000/api/transfers \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "toWallet": "0xUser00000000000000000000000000000000001",
    "amount": 15,
    "pin": "1234"
  }'
```

**Validações esperadas:**
- PIN correto: Sucesso
- PIN incorreto: Erro + contador de tentativas
- 3+ erros: Bloqueio temporário
- Saldo insuficiente: Erro
- Limite diário excedido: Erro

---

### 3.7 Processamento de Ciclos (CRÍTICO)

#### Executar processamento
```bash
curl -X GET http://localhost:3000/api/cron/process-cycles \
  -H "Authorization: Bearer {CRON_SECRET}"
```

**Com dados de teste:**
- Nível 1 tem 18 pessoas na fila e $180 no caixa
- Isso permite processar 2 ciclos completos
- Após processamento:
  - 1º usuário (maior score) recebe $20
  - Bônus de $4 pago ao indicador (Líder)
  - 7 pessoas reentram na fila
  - 1 avança para nível 2

#### Verificar resultado
```bash
# Ver histórico de ciclos
curl -X GET http://localhost:3000/api/history \
  -H "Authorization: Bearer {TOKEN}"
```

---

### 3.8 Sistema de Bônus

#### Ver indicados
```bash
curl -X GET http://localhost:3000/api/referrals \
  -H "Authorization: Bearer {TOKEN}"
```

**Com o Líder (leader@7iatlas.com):**
- Tem 15 indicados ativos
- Cada ciclo dos indicados gera bônus de 40%

---

### 3.9 Notificações

#### Ver preferências
```bash
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer {TOKEN}"
```

#### Atualizar preferências
```bash
curl -X PUT http://localhost:3000/api/notifications \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notifyEmail": true,
    "notifyPush": true,
    "notifyOnCycle": true,
    "notifyOnBonus": true,
    "notifyFrequency": "realtime"
  }'
```

#### Subscrever para push
```bash
curl -X POST http://localhost:3000/api/notifications/subscribe \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "BNcRd...",
      "auth": "tBHI..."
    },
    "device": "Chrome Windows"
  }'
```

---

## 4. Fluxo de Teste Completo

### Passo a passo para testar todo o sistema:

1. **Reset do banco**
   ```bash
   npm run db:reset
   ```

2. **Iniciar servidor**
   ```bash
   npm run dev
   ```

3. **Login como Líder** (tem dados mais ricos)
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "leader@7iatlas.com", "password": "Test@123"}'
   ```
   Guardar o `accessToken` retornado.

4. **Ver dashboard do líder**
   ```bash
   curl -X GET http://localhost:3000/api/users/me \
     -H "Authorization: Bearer {TOKEN}"
   ```

5. **Ver posição na fila (3 cotas no N1)**
   ```bash
   curl -X GET http://localhost:3000/api/quotas \
     -H "Authorization: Bearer {TOKEN}"
   ```

6. **Ver indicados (15 pessoas)**
   ```bash
   curl -X GET http://localhost:3000/api/referrals \
     -H "Authorization: Bearer {TOKEN}"
   ```

7. **Processar ciclos**
   ```bash
   curl -X GET http://localhost:3000/api/cron/process-cycles \
     -H "Authorization: Bearer CRON_SECRET"
   ```

8. **Ver histórico após ciclo**
   ```bash
   curl -X GET http://localhost:3000/api/history \
     -H "Authorization: Bearer {TOKEN}"
   ```

9. **Transferir saldo para indicado**
   ```bash
   curl -X POST http://localhost:3000/api/transfers \
     -H "Authorization: Bearer {TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"toUserCode": "USR001", "amount": 10, "pin": "1234"}'
   ```

10. **Login como usuário que recebeu transferência**
    ```bash
    curl -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email": "user1@test.com", "password": "Test@123"}'
    ```

11. **Comprar cota adicional com saldo recebido**
    ```bash
    curl -X POST http://localhost:3000/api/quotas \
      -H "Authorization: Bearer {TOKEN_USER1}" \
      -H "Content-Type: application/json" \
      -d '{"levelNumber": 1}'
    ```

---

## 5. Dados de Teste Criados

### Estrutura do Seed

| Entidade | Quantidade | Detalhes |
|----------|------------|----------|
| Níveis | 10 | $10 a $5,120 |
| Admin | 1 | Saldo: $1,000 |
| Líder | 1 | Saldo: $500, 3 cotas N1, 1 cota N2, 1 cota N3 |
| Usuários Ativos | 15 | Na fila do N1 |
| Usuários Pendentes | 5 | Aguardando depósito |
| Entradas na Fila | 18 | Nível 1: $180 no caixa |
| Transações | 6 | Depósitos e transferências |
| Ciclos Históricos | 1 | Exemplo de ciclo completo |

### Relacionamentos de Indicação

```
Líder (LEADER01)
├── User 1-10 (indicados diretos)
│   └── User 1
│       └── Pending 11-15 (indicados de user1)
└── Matrix 16-20 (indicados diretos)
```

---

## 6. Validações Importantes

### 6.1 Regras de Negócio Testáveis

1. **Ativação de Usuário**
   - Status muda de PENDING para ACTIVE após depósito de $10

2. **Sistema de Score**
   - Score = (horas_espera × 2) + (reentradas × 1.5) + pontos_indicados
   - CAP de 290 pontos para indicados

3. **Múltiplas Cotas**
   - Sem limite de cotas por nível
   - Cada cota é independente

4. **Níveis Superiores**
   - Só pode comprar N2+ se tiver cota em N-1

5. **Transferências**
   - Mínimo: $10
   - Limite sem KYC: $100/dia
   - Requer PIN

6. **Processamento de Ciclo**
   - Mínimo 7 pessoas na fila
   - Caixa suficiente (7 × valor_entrada)

---

## 7. Troubleshooting

### Erro: "Prisma Client not generated"
```bash
npm run db:generate
```

### Erro: "Table does not exist"
```bash
npm run db:push
```

### Erro: "Token inválido"
- Gerar novo token via login
- Tokens expiram em 1 hora

### Erro: "PIN bloqueado"
- Aguarde o tempo de bloqueio (15min após 3 erros)
- Ou reset o PIN via senha

---

## 8. Variáveis de Ambiente para Teste

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/7iatlas_test"

# Auth
JWT_SECRET="chave-secreta-32-caracteres-minimo"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Cron
CRON_SECRET="chave-para-cron-jobs"

# Blockchain (testnet)
BLOCKCHAIN_NETWORK="testnet"
SYSTEM_WALLET_ADDRESS="0x..."
SYSTEM_WALLET_PRIVATE_KEY="0x..."

# Email (opcional para testes)
EMAIL_SERVICE="console"
```
