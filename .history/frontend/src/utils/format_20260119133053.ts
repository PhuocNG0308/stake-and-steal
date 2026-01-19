/**
 * Utility functions for formatting values
 */

/**
 * Format a balance string to a human-readable format
 * @param balance - The balance as a string (may be very large)
 * @param decimals - Number of decimal places (default: 6)
 * @returns Formatted balance string
 */
export function formatBalance(balance: string, decimals: number = 6): string {
  try {
    const value = BigInt(balance)
    const divisor = BigInt(10 ** decimals)
    const wholePart = value / divisor
    const fractionalPart = value % divisor

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    const trimmedFractional = fractionalStr.replace(/0+$/, '')

    if (trimmedFractional === '') {
      return formatNumber(wholePart.toString())
    }

    return `${formatNumber(wholePart.toString())}.${trimmedFractional.slice(0, 4)}`
  } catch {
    return '0'
  }
}

/**
 * Format a number with thousand separators
 * @param value - The number as a string
 * @returns Formatted number string
 */
export function formatNumber(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format a percentage value
 * @param value - The percentage as a number
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a chain ID for display
 * @param chainId - The full chain ID
 * @param prefixLength - Length of prefix to show (default: 8)
 * @param suffixLength - Length of suffix to show (default: 6)
 * @returns Truncated chain ID
 */
export function formatChainId(
  chainId: string,
  prefixLength: number = 8,
  suffixLength: number = 6
): string {
  if (chainId.length <= prefixLength + suffixLength + 3) {
    return chainId
  }
  return `${chainId.slice(0, prefixLength)}...${chainId.slice(-suffixLength)}`
}

/**
 * Format a block number
 * @param block - The block number as a string
 * @returns Formatted block string
 */
export function formatBlock(block: string): string {
  return `#${formatNumber(block)}`
}

/**
 * Format a timestamp
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

/**
 * Format a relative time
 * @param blocks - Number of blocks
 * @param blockTime - Average block time in seconds (default: 1)
 * @returns Human-readable time string
 */
export function formatBlocksAsTime(blocks: number, blockTime: number = 1): string {
  const seconds = blocks * blockTime

  if (seconds < 60) {
    return `${seconds}s`
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  }

  const days = Math.floor(seconds / 86400)
  return `${days}d`
}

/**
 * Parse a balance input string to wei
 * @param input - User input string
 * @param decimals - Number of decimal places (default: 6)
 * @returns Balance as bigint string
 */
export function parseBalanceInput(input: string, decimals: number = 6): string {
  try {
    const parts = input.split('.')
    const whole = parts[0] || '0'
    let fractional = parts[1] || ''

    // Pad or truncate fractional part
    fractional = fractional.padEnd(decimals, '0').slice(0, decimals)

    const combined = whole + fractional
    return BigInt(combined).toString()
  } catch {
    return '0'
  }
}

/**
 * Calculate yield for display
 * @param principal - Principal amount
 * @param yieldRateBps - Yield rate in basis points
 * @param blocks - Number of blocks
 * @param blocksPerYear - Blocks per year (default: 31536000 for 1 block/sec)
 * @returns Calculated yield
 */
export function calculateYield(
  principal: string,
  yieldRateBps: number,
  blocks: number,
  blocksPerYear: number = 31536000
): string {
  try {
    const p = BigInt(principal)
    const rate = BigInt(yieldRateBps)
    const b = BigInt(blocks)
    const yearBlocks = BigInt(blocksPerYear)
    const bps = BigInt(10000)

    // yield = principal * rate * blocks / (10000 * blocksPerYear)
    const yieldAmount = (p * rate * b) / (bps * yearBlocks)
    return yieldAmount.toString()
  } catch {
    return '0'
  }
}
