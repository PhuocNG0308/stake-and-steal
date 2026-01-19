import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { motion } from 'framer-motion'
import {
  BoltIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  PlayIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { GET_RAID_STATE, GET_COOLDOWN_STATUS } from '@/graphql/queries'
import { formatBalance } from '@/utils/format'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { TargetInfo } from '@/types'

type RaidStep = 'idle' | 'finding' | 'selecting' | 'locked' | 'executing' | 'result'

export default function Raid() {
  const { data: raidData, loading } = useQuery(GET_RAID_STATE, {
    pollInterval: 2000,
  })
  const { data: cooldownData } = useQuery(GET_COOLDOWN_STATUS, {
    pollInterval: 5000,
  })

  const [selectedTarget, setSelectedTarget] = useState<TargetInfo | null>(null)
  const [raidStep, setRaidStep] = useState<RaidStep>('idle')

  const raidState = raidData?.raidState
  const isOnCooldown = cooldownData?.isOnCooldown || false
  const cooldownRemaining = cooldownData?.cooldownRemaining || '0'

  const handleFindTargets = () => {
    setRaidStep('finding')
    // TODO: Call FindTargets mutation
  }

  const handleSelectTarget = (target: TargetInfo) => {
    setSelectedTarget(target)
  }

  const handleLockTarget = () => {
    if (!selectedTarget) return
    setRaidStep('locked')
    // TODO: Call LockTarget mutation
  }

  const handleExecuteSteal = () => {
    setRaidStep('executing')
    // TODO: Call ExecuteSteal mutation
  }

  const handleCancelRaid = () => {
    setRaidStep('idle')
    setSelectedTarget(null)
    // TODO: Call CancelRaid mutation
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BoltIcon className="w-8 h-8 text-danger-400" />
            Raid Mode
          </h1>
          <p className="text-dark-400">
            Find targets and steal their yield
          </p>
        </div>
      </div>

      {/* Cooldown Warning */}
      {isOnCooldown && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-yellow-900/20 border-yellow-600/30"
        >
          <div className="flex items-center gap-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="font-semibold text-yellow-400">Raid Cooldown Active</p>
              <p className="text-sm text-dark-300">
                You can raid again in <span className="font-mono font-bold">{cooldownRemaining}</span> blocks
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Raid Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Find Targets */}
        <motion.div
          className={`card ${raidStep === 'idle' || raidStep === 'finding' ? 'ring-2 ring-primary-500' : 'opacity-50'}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h3 className="font-semibold">Find Targets</h3>
          </div>

          <p className="text-sm text-dark-400 mb-4">
            Search for players with deposited funds to raid.
          </p>

          <button
            className="btn-primary w-full"
            onClick={handleFindTargets}
            disabled={isOnCooldown || raidStep !== 'idle'}
          >
            {raidStep === 'finding' ? (
              <>
                <LoadingSpinner size="sm" />
                Searching...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-4 h-4" />
                Find Targets
              </>
            )}
          </button>
        </motion.div>

        {/* Step 2: Lock Target */}
        <motion.div
          className={`card ${raidStep === 'selecting' || raidStep === 'locked' ? 'ring-2 ring-primary-500' : 'opacity-50'}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h3 className="font-semibold">Lock Target</h3>
          </div>

          <p className="text-sm text-dark-400 mb-4">
            Select and lock onto a target using commit-reveal.
          </p>

          <button
            className="btn-secondary w-full"
            onClick={handleLockTarget}
            disabled={!selectedTarget || raidStep === 'locked'}
          >
            <LockClosedIcon className="w-4 h-4" />
            {raidStep === 'locked' ? 'Locked' : 'Lock Target'}
          </button>
        </motion.div>

        {/* Step 3: Execute Steal */}
        <motion.div
          className={`card ${raidStep === 'locked' || raidStep === 'executing' ? 'ring-2 ring-danger-500' : 'opacity-50'}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-danger-600 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <h3 className="font-semibold">Execute Steal</h3>
          </div>

          <p className="text-sm text-dark-400 mb-4">
            Reveal your commitment and attempt the steal.
          </p>

          <button
            className="btn-danger w-full"
            onClick={handleExecuteSteal}
            disabled={raidStep !== 'locked'}
          >
            {raidStep === 'executing' ? (
              <>
                <LoadingSpinner size="sm" />
                Stealing...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                Execute Steal
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Target Selection */}
      {raidState?.targets && raidState.targets.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-primary-400" />
            Available Targets
          </h3>

          <div className="space-y-3">
            {raidState.targets.map((target: TargetInfo, index: number) => (
              <motion.button
                key={target.chainId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSelectTarget(target)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTarget?.chainId === target.chainId
                    ? 'border-primary-500 bg-primary-600/20'
                    : 'border-dark-600 hover:border-dark-500 bg-dark-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-dark-300">
                      {target.chainId.slice(0, 16)}...{target.chainId.slice(-8)}
                    </p>
                    <p className="text-xs text-dark-400 mt-1">
                      Last active: Block {target.lastActiveBlock}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-400">
                      ~{formatBalance(target.estimatedValue)}
                    </p>
                    <p className="text-xs text-dark-400">
                      Defense: {target.defenseScore}/100
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {raidStep !== 'idle' && (
        <div className="flex justify-center">
          <button
            onClick={handleCancelRaid}
            className="btn-ghost text-dark-400"
          >
            <XMarkIcon className="w-4 h-4" />
            Cancel Raid
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="card bg-dark-800/50">
        <h4 className="font-semibold mb-3">How Raiding Works</h4>
        <ul className="space-y-2 text-sm text-dark-400">
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>Find random targets from the registry with deposited funds</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>Lock onto a target using commit-reveal to prevent front-running</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>Execute the steal with 30% base success rate</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400">•</span>
            <span>If successful, steal up to 10% of target's deposited amount</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-danger-400">•</span>
            <span>100 block cooldown between raids</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
