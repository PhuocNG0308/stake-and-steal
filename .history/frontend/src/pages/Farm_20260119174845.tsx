import React from 'react'
import { useQuery } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { GET_ALL_PAGES, GET_CONFIG } from '@/graphql/queries'
import { useUIStore } from '@/stores'
import { formatBalance } from '@/utils/format'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { PageInfo, PlotInfo } from '@/types'

export default function Farm() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_PAGES)
  const { data: configData } = useQuery(GET_CONFIG)
  const { openModal, selectPlot, selectedPage, selectedPlot, clearSelection } = useUIStore()

  const pages: PageInfo[] = data?.allPages || []
  const config = configData?.config

  const handlePlotClick = (pageId: number, plotId: number, plot: PlotInfo) => {
    if (plot.isLocked) return
    selectPlot(pageId, plotId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-danger-600/50 bg-danger-900/20">
        <p className="text-danger-400">Error loading farm data: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Farm</h1>
          <p className="text-dark-400">
            Manage your land plots and grow your yield
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => openModal('create-page')}
          disabled={pages.length >= (config?.maxPages || 5)}
        >
          <PlusIcon className="w-4 h-4" />
          New Page
        </button>
      </div>

      {/* Config Info */}
      {config && (
        <div className="card bg-dark-800/50 p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-dark-400">Yield Rate:</span>{' '}
              <span className="font-semibold text-primary-400">
                {(Number(config.yieldRateBps) / 100).toFixed(2)}% APY
              </span>
            </div>
            <div>
              <span className="text-dark-400">Min Deposit:</span>{' '}
              <span className="font-semibold">{formatBalance(config.minDeposit)}</span>
            </div>
            <div>
              <span className="text-dark-400">Max Steal:</span>{' '}
              <span className="font-semibold text-danger-400">{config.maxStealPercentage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {pages.length === 0 && (
        <div className="card text-center py-12">
          <SparklesIcon className="w-16 h-16 mx-auto text-dark-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Pages Yet</h3>
          <p className="text-dark-400 mb-6">
            Create your first page to start farming yield
          </p>
          <button
            className="btn-primary mx-auto"
            onClick={() => openModal('create-page')}
          >
            <PlusIcon className="w-4 h-4" />
            Create First Page
          </button>
        </div>
      )}

      {/* Pages Grid */}
      <div className="space-y-8">
        {pages.map((page) => (
          <motion.div
            key={page.pageId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Page {page.pageId + 1}</h2>
                <p className="text-sm text-dark-400">
                  {page.activePlots} / {config?.maxPlotsPerPage || 5} plots active
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-dark-400">Total Balance</p>
                <p className="text-xl font-bold text-primary-400">
                  {formatBalance(page.totalBalance)}
                </p>
              </div>
            </div>

            {/* Plots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {page.plots.map((plot) => (
                <motion.button
                  key={plot.plotId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePlotClick(page.pageId, plot.plotId, plot)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    plot.isLocked
                      ? 'border-danger-600/50 bg-danger-900/20 cursor-not-allowed'
                      : selectedPage === page.pageId && selectedPlot === plot.plotId
                      ? 'border-primary-500 bg-primary-600/20'
                      : plot.isEmpty
                      ? 'border-dashed border-dark-600 hover:border-dark-500 bg-dark-800/50'
                      : 'border-dark-600 hover:border-primary-600/50 bg-dark-800'
                  }`}
                >
                  {/* Lock Icon */}
                  {plot.isLocked && (
                    <div className="absolute top-2 right-2">
                      <LockClosedIcon className="w-4 h-4 text-danger-400" />
                    </div>
                  )}

                  {/* Plot Content */}
                  <div className="text-center">
                    <p className="text-xs text-dark-400 mb-1">Plot {plot.plotId + 1}</p>
                    
                    {plot.isEmpty ? (
                      <div className="py-4">
                        <PlusIcon className="w-6 h-6 mx-auto text-dark-500" />
                        <p className="text-xs text-dark-500 mt-1">Empty</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-lg font-bold">
                          {formatBalance(plot.balance)}
                        </p>
                        <p className="text-xs text-primary-400 mt-1">
                          +{formatBalance(plot.estimatedYield)}
                        </p>
                      </>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Page Actions */}
            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-dark-700">
              <button className="btn-primary text-sm">
                <SparklesIcon className="w-4 h-4" />
                Claim All
              </button>
              <button className="btn-secondary text-sm">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Deposit
              </button>
              <button className="btn-secondary text-sm">
                <ArrowUpTrayIcon className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Selected Plot Actions */}
      <AnimatePresence>
        {selectedPage !== null && selectedPlot !== null && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="card bg-dark-800 shadow-2xl flex items-center gap-4">
              <span className="text-sm text-dark-400">
                Page {selectedPage + 1}, Plot {selectedPlot + 1}
              </span>
              <div className="h-6 w-px bg-dark-600" />
              <button className="btn-primary text-sm">Deposit</button>
              <button className="btn-secondary text-sm">Withdraw</button>
              <button className="btn-ghost text-sm">Claim</button>
              <button
                onClick={clearSelection}
                className="btn-ghost text-sm text-dark-400"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
