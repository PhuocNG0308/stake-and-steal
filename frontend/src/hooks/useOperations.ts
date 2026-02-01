import { useCallback, useState } from 'react'
import { useWalletStore, useGameStore } from '@/stores'
import type { Operation, OperationResponse } from '@/types'
import { signWithCheCko, getCheCko } from '@/lib/checko-wallet'
import { signWithLineraWallet, getLineraWallet } from '@/lib/linera-wallet'
import { signWithCroissant, getCroissant } from '@/lib/croissant-wallet'
import { signWithMetaMask } from '@/lib/metamask-adapter'
import { signWithDemoWallet } from '@/lib/demo-wallet'
import type { WalletType } from '@/lib/wallet-types'
import { config } from '@/config'

interface UseOperationOptions {
  onSuccess?: (response: OperationResponse) => void
  onError?: (error: Error) => void
}

/**
 * Get the appropriate signing function based on wallet type
 */
async function signWithWallet(walletType: WalletType, message: string): Promise<string> {
  switch (walletType) {
    case 'checko':
      return signWithCheCko(message)
    case 'linera':
      return signWithLineraWallet(message)
    case 'croissant':
      return signWithCroissant(message)
    case 'metamask':
      return signWithMetaMask(message)
    case 'demo':
      return signWithDemoWallet(message)
    default:
      throw new Error('No wallet connected for signing')
  }
}

/**
 * Submit operation via the appropriate wallet
 */
async function submitViaWallet(
  walletType: WalletType,
  chainId: string,
  appId: string,
  operation: Operation
): Promise<OperationResponse> {
  // For native Linera wallets (CheCko, Croissant), use their native submission
  if (walletType === 'checko') {
    const wallet = getCheCko()
    if (wallet) {
      try {
        const result = await wallet.submitOperation(chainId, appId, operation)
        console.log('CheCko transaction submitted:', result.hash)
        return { Success: null }
      } catch (error) {
        throw new Error(`CheCko submission failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  if (walletType === 'croissant') {
    const wallet = getCroissant()
    if (wallet) {
      try {
        const result = await wallet.submitOperation(chainId, appId, operation)
        console.log('Croissant transaction submitted:', result.hash)
        return { Success: null }
      } catch (error) {
        throw new Error(`Croissant submission failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  if (walletType === 'linera') {
    const wallet = getLineraWallet()
    if (wallet) {
      try {
        // Linera wallet may have submitOperation method
        const result = await (wallet as any).submitOperation?.(chainId, appId, operation)
        if (result) {
          console.log('Linera wallet transaction submitted:', result.hash)
          return { Success: null }
        }
      } catch (error) {
        console.warn('Linera wallet submitOperation not available, falling back to signing')
      }
    }
  }

  // For MetaMask and other wallets, sign the operation and submit via API
  const operationJson = JSON.stringify(operation)
  const signature = await signWithWallet(walletType, operationJson)
  
  console.log(`Signed operation with ${walletType}:`, { operation, signature })
  
  // Submit signed operation to the Linera node
  return sendSignedOperation(chainId, appId, operation, signature)
}

/**
 * Send a signed operation to the Linera node via API
 */
async function sendSignedOperation(
  chainId: string,
  appId: string,
  operation: Operation,
  signature: string
): Promise<OperationResponse> {
  // For demo mode or when no real backend, simulate success
  console.log('Submitting signed operation:', { chainId, appId, operation, signature })
  
  // In production, this would POST to the Linera node
  // const response = await fetch(`${config.lineraEndpoint}/operations`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ chainId, appId, operation, signature })
  // })
  // return response.json()
  
  // For now, return success (demo mode)
  return { Success: null }
}

/**
 * Hook for executing operations on the Linera chain
 */
export function useOperation(options: UseOperationOptions = {}) {
  const { chainId, walletType } = useWalletStore()
  const { setLoading, setError } = useGameStore()
  const [isExecuting, setIsExecuting] = useState(false)

  const execute = useCallback(
    async (operation: Operation): Promise<OperationResponse | null> => {
      if (!chainId) {
        const error = new Error('Not connected to chain')
        options.onError?.(error)
        setError(error.message)
        return null
      }

      if (!walletType) {
        const error = new Error('No wallet connected')
        options.onError?.(error)
        setError(error.message)
        return null
      }

      setIsExecuting(true)
      setLoading(true)
      setError(null)

      try {
        // Use wallet extension for signing and submitting operations
        const appId = config.applicationId || 'stake-and-steal'
        const response = await submitViaWallet(walletType, chainId, appId, operation)

        if (response.Error) {
          throw new Error(response.Error.message)
        }

        options.onSuccess?.(response)
        return response
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Operation failed')
        options.onError?.(err)
        setError(err.message)
        return null
      } finally {
        setIsExecuting(false)
        setLoading(false)
      }
    },
    [chainId, walletType, options, setLoading, setError]
  )

  return {
    execute,
    isExecuting,
  }
}

// Operation submission is now handled by submitViaWallet() which uses the connected wallet extension

/**
 * Hook for registering the player
 */
export function useRegister() {
  const { execute, isExecuting } = useOperation({
    onSuccess: (response) => {
      if (response.Registered) {
        console.log('Registered with ID:', response.Registered.player_id)
      }
    },
  })

  const register = useCallback(
    async (encryptedName: number[]) => {
      return execute({ Register: { encrypted_name: encryptedName } })
    },
    [execute]
  )

  return { register, isRegistering: isExecuting }
}

/**
 * Hook for creating a new page
 */
export function useCreatePage() {
  const { execute, isExecuting } = useOperation({
    onSuccess: (response) => {
      if (response.PageCreated) {
        console.log('Created page:', response.PageCreated.page_id)
      }
    },
  })

  const createPage = useCallback(async () => {
    return execute({ CreatePage: null })
  }, [execute])

  return { createPage, isCreating: isExecuting }
}

/**
 * Hook for depositing funds
 */
export function useDeposit() {
  const { execute, isExecuting } = useOperation({
    onSuccess: (response) => {
      if (response.Deposited) {
        console.log('Deposited to plot:', response.Deposited)
      }
    },
  })

  const deposit = useCallback(
    async (
      pageId: number,
      plotId: number,
      amount: string,
      encryptedData: number[]
    ) => {
      return execute({
        Deposit: {
          page_id: pageId,
          plot_id: plotId,
          amount,
          encrypted_data: encryptedData,
        },
      })
    },
    [execute]
  )

  return { deposit, isDepositing: isExecuting }
}

/**
 * Hook for withdrawing funds
 */
export function useWithdraw() {
  const { execute, isExecuting } = useOperation({
    onSuccess: (response) => {
      if (response.Withdrawn) {
        console.log('Withdrawn:', response.Withdrawn)
      }
    },
  })

  const withdraw = useCallback(
    async (pageId: number, plotId: number, amount: string) => {
      return execute({
        Withdraw: {
          page_id: pageId,
          plot_id: plotId,
          amount,
        },
      })
    },
    [execute]
  )

  return { withdraw, isWithdrawing: isExecuting }
}

/**
 * Hook for claiming yield
 */
export function useClaim() {
  const { execute, isExecuting } = useOperation({
    onSuccess: (response) => {
      if (response.Claimed) {
        console.log('Claimed yield:', response.Claimed.yield_amount)
      }
    },
  })

  const claim = useCallback(
    async (pageId: number, plotId: number) => {
      return execute({
        Claim: {
          page_id: pageId,
          plot_id: plotId,
        },
      })
    },
    [execute]
  )

  const claimAll = useCallback(async () => {
    return execute({ ClaimAll: null })
  }, [execute])

  return { claim, claimAll, isClaiming: isExecuting }
}

/**
 * Hook for raid operations
 */
export function useRaid() {
  const { execute, isExecuting } = useOperation()

  const findTargets = useCallback(
    async (count: number = 3) => {
      return execute({ FindTargets: { count } })
    },
    [execute]
  )

  const lockTarget = useCallback(
    async (targetChain: string, commitment: number[]) => {
      return execute({
        LockTarget: {
          target_chain: targetChain,
          commitment,
        },
      })
    },
    [execute]
  )

  const executeSteal = useCallback(
    async (attackerPage: number, attackerPlot: number, targetPage: number, targetPlot: number, revealNonce: number[]) => {
      return execute({
        ExecuteSteal: {
          attacker_page: attackerPage,
          attacker_plot: attackerPlot,
          target_page: targetPage,
          target_plot: targetPlot,
          reveal_nonce: revealNonce,
        },
      })
    },
    [execute]
  )

  const cancelRaid = useCallback(async () => {
    return execute({ CancelRaid: null })
  }, [execute])

  return {
    findTargets,
    lockTarget,
    executeSteal,
    cancelRaid,
    isExecuting,
  }
}
