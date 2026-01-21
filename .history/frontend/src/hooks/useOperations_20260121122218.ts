import { useCallback, useState } from 'react'
import { useWalletStore, useGameStore } from '@/stores'
import type { Operation, OperationResponse } from '@/types'

interface UseOperationOptions {
  onSuccess?: (response: OperationResponse) => void
  onError?: (error: Error) => void
}

/**
 * Hook for executing operations on the Linera chain
 */
export function useOperation(options: UseOperationOptions = {}) {
  const { chainId } = useWalletStore()
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

      setIsExecuting(true)
      setLoading(true)
      setError(null)

      try {
        // In a real implementation, this would send the operation
        // to the Linera node via the appropriate API
        const response = await sendOperation(chainId, operation)

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
    [chainId, options, setLoading, setError]
  )

  return {
    execute,
    isExecuting,
  }
}

/**
 * Send an operation to the Linera node
 * This is a placeholder - actual implementation depends on Linera's client API
 */
async function sendOperation(
  chainId: string,
  operation: Operation
): Promise<OperationResponse> {
  // TODO: Implement actual Linera operation submission
  // This would typically:
  // 1. Serialize the operation
  // 2. Sign it with the user's key
  // 3. Submit to the Linera node
  // 4. Wait for confirmation
  // 5. Return the response

  console.log(`Sending operation to chain ${chainId}:`, operation)

  // Placeholder response
  return { Success: null }
}

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
