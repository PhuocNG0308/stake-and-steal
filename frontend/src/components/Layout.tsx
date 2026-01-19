import { Outlet, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  SparklesIcon,
  BoltIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useUIStore, useWalletStore, useGameStore } from '@/stores'
import { formatBalance } from '@/utils/format'

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Dashboard' },
  { to: '/farm', icon: SparklesIcon, label: 'Farm' },
  { to: '/raid', icon: BoltIcon, label: 'Raid' },
  { to: '/stats', icon: ChartBarIcon, label: 'Stats' },
  { to: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
]

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { connected, chainId, disconnect } = useWalletStore()
  const { availableBalance, totalDeposited } = useGameStore()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-800 flex flex-col"
          >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-dark-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg gradient-text">Steal & Yield</span>
              </div>
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-1 hover:bg-dark-800 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                        : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Balance Card */}
            <div className="p-4 border-t border-dark-800">
              <div className="card bg-gradient-to-br from-dark-800 to-dark-900 p-4">
                <div className="text-xs text-dark-400 mb-1">Available Balance</div>
                <div className="text-xl font-bold text-primary-400">
                  {formatBalance(availableBalance)}
                </div>
                <div className="mt-3 pt-3 border-t border-dark-700">
                  <div className="text-xs text-dark-400">Total Deposited</div>
                  <div className="text-sm font-medium">
                    {formatBalance(totalDeposited)}
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-dark-800 rounded-lg lg:hidden"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold hidden sm:block">
              Welcome to Steal & Yield
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {connected ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-dark-400">Connected</div>
                  <div className="text-sm font-mono">
                    {chainId?.slice(0, 8)}...{chainId?.slice(-6)}
                  </div>
                </div>
                <button
                  onClick={disconnect}
                  className="btn-secondary text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="btn-primary">
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
