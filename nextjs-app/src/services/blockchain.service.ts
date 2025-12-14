// 7iATLAS - Blockchain Service
// Integração com Binance Smart Chain (BSC)

import { ethers } from 'ethers'

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const NETWORK = process.env.BLOCKCHAIN_NETWORK || 'testnet'

const CONFIG = {
  mainnet: {
    chainId: 56,
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    usdtContract: process.env.USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955',
    explorer: 'https://bscscan.com',
  },
  testnet: {
    chainId: 97,
    rpcUrl: process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    usdtContract: process.env.USDT_CONTRACT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    explorer: 'https://testnet.bscscan.com',
  },
}

const networkConfig = CONFIG[NETWORK as keyof typeof CONFIG] || CONFIG.testnet

// ABI mínimo do USDT (ERC20)
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]

// ==========================================
// PROVIDER E WALLET
// ==========================================

let provider: ethers.JsonRpcProvider | null = null
let systemWallet: ethers.Wallet | null = null
let usdtContract: ethers.Contract | null = null

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
  }
  return provider
}

function getSystemWallet(): ethers.Wallet {
  if (!systemWallet) {
    const privateKey = process.env.SYSTEM_WALLET_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('SYSTEM_WALLET_PRIVATE_KEY não configurada')
    }
    systemWallet = new ethers.Wallet(privateKey, getProvider())
  }
  return systemWallet
}

function getUsdtContract(): ethers.Contract {
  if (!usdtContract) {
    usdtContract = new ethers.Contract(
      networkConfig.usdtContract,
      USDT_ABI,
      getSystemWallet()
    )
  }
  return usdtContract
}

// ==========================================
// FUNÇÕES PÚBLICAS
// ==========================================

/**
 * Verifica se uma transação de depósito é válida
 */
export async function verifyDeposit(
  txHash: string,
  expectedFrom: string,
  expectedAmount: number
): Promise<{
  valid: boolean
  confirmations: number
  actualAmount?: number
  error?: string
}> {
  try {
    const provider = getProvider()
    const tx = await provider.getTransaction(txHash)

    if (!tx) {
      return { valid: false, confirmations: 0, error: 'Transação não encontrada' }
    }

    const receipt = await provider.getTransactionReceipt(txHash)

    if (!receipt) {
      return { valid: false, confirmations: 0, error: 'Recibo não encontrado' }
    }

    if (receipt.status !== 1) {
      return { valid: false, confirmations: 0, error: 'Transação falhou' }
    }

    const currentBlock = await provider.getBlockNumber()
    const confirmations = currentBlock - receipt.blockNumber

    // Verifica se é uma transação para o contrato USDT
    if (tx.to?.toLowerCase() !== networkConfig.usdtContract.toLowerCase()) {
      return { valid: false, confirmations, error: 'Não é uma transação USDT' }
    }

    // Decodifica os dados da transação
    const iface = new ethers.Interface(USDT_ABI)

    // Procura o evento Transfer nos logs
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        })

        if (parsed?.name === 'Transfer') {
          const from = parsed.args[0].toLowerCase()
          const to = parsed.args[1].toLowerCase()
          const value = parsed.args[2]

          const systemAddress = process.env.SYSTEM_WALLET_ADDRESS?.toLowerCase()

          // Verifica se foi enviado para a carteira do sistema
          if (to !== systemAddress) {
            continue
          }

          // Verifica remetente
          if (from !== expectedFrom.toLowerCase()) {
            return { valid: false, confirmations, error: 'Remetente incorreto' }
          }

          // Converte valor (USDT tem 18 decimais na BSC)
          const actualAmount = Number(ethers.formatUnits(value, 18))

          // Verifica valor (com margem de 0.01 para taxas)
          if (Math.abs(actualAmount - expectedAmount) > 0.01) {
            return {
              valid: false,
              confirmations,
              actualAmount,
              error: `Valor incorreto: esperado ${expectedAmount}, recebido ${actualAmount}`,
            }
          }

          // Verifica confirmações mínimas
          if (confirmations < 3) {
            return {
              valid: false,
              confirmations,
              actualAmount,
              error: `Aguardando confirmações: ${confirmations}/3`,
            }
          }

          return { valid: true, confirmations, actualAmount }
        }
      } catch {
        continue
      }
    }

    return { valid: false, confirmations, error: 'Transação USDT não encontrada nos logs' }
  } catch (error) {
    console.error('Erro ao verificar depósito:', error)
    return { valid: false, confirmations: 0, error: 'Erro ao verificar transação' }
  }
}

/**
 * Envia USDT para um endereço
 */
export async function sendUSDT(
  toAddress: string,
  amount: number
): Promise<string> {
  try {
    const contract = getUsdtContract()

    // Converte para wei (18 decimais)
    const amountWei = ethers.parseUnits(amount.toString(), 18)

    // Estima gas
    const gasEstimate = await contract.transfer.estimateGas(toAddress, amountWei)

    // Envia transação
    const tx = await contract.transfer(toAddress, amountWei, {
      gasLimit: gasEstimate * 120n / 100n, // 20% extra
    })

    // Aguarda confirmação
    const receipt = await tx.wait(1)

    console.log(`✅ Pagamento enviado: ${amount} USDT para ${toAddress}`)
    console.log(`   TX: ${receipt.hash}`)

    return receipt.hash
  } catch (error) {
    console.error('Erro ao enviar USDT:', error)
    throw error
  }
}

/**
 * Obtém saldo USDT de uma carteira
 */
export async function getUSDTBalance(walletAddress: string): Promise<string> {
  try {
    const contract = new ethers.Contract(
      networkConfig.usdtContract,
      USDT_ABI,
      getProvider()
    )

    const balance = await contract.balanceOf(walletAddress)
    return ethers.formatUnits(balance, 18)
  } catch (error) {
    console.error('Erro ao obter saldo:', error)
    return '0'
  }
}

/**
 * Obtém saldo BNB (para gas) de uma carteira
 */
export async function getBNBBalance(walletAddress: string): Promise<string> {
  try {
    const provider = getProvider()
    const balance = await provider.getBalance(walletAddress)
    return ethers.formatEther(balance)
  } catch (error) {
    console.error('Erro ao obter saldo BNB:', error)
    return '0'
  }
}

/**
 * Obtém saldo da carteira do sistema
 */
export async function getSystemWalletBalances(): Promise<{
  usdt: string
  bnb: string
}> {
  const address = process.env.SYSTEM_WALLET_ADDRESS
  if (!address) {
    return { usdt: '0', bnb: '0' }
  }

  return {
    usdt: await getUSDTBalance(address),
    bnb: await getBNBBalance(address),
  }
}

/**
 * Verifica se o endereço da carteira é válido
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address)
}

/**
 * Formata endereço para exibição
 */
export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.substring(0, 6)}...${address.substring(38)}`
}

/**
 * Gera link para explorador
 */
export function getExplorerLink(type: 'tx' | 'address', hash: string): string {
  return `${networkConfig.explorer}/${type}/${hash}`
}

// ==========================================
// EXPORTS
// ==========================================

export const blockchainService = {
  verifyDeposit,
  sendUSDT,
  getUSDTBalance,
  getBNBBalance,
  getSystemWalletBalances,
  isValidAddress,
  formatAddress,
  getExplorerLink,
  networkConfig,
}
