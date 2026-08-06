export const STALL_THRESHOLD = 10
export const REFETCH_INTERVAL = 10 * 1000 // 10 seconds in milliseconds
export const ONE_HOUR = 60 * 60 * 1000 // 1 hour in milliseconds

export interface IndexingData {
  currentBlockNumber: number
  erc20BlockNumber: number
  erc20Synced: boolean
  masterCopiesBlockNumber: number
  masterCopiesSynced: boolean
  synced: boolean
  timestamp: number
}

export const calculateRollingSpeed = (data: IndexingData[], isERC20: boolean) => {
  if (data.length < 2) return 0

  const now = data[0].timestamp
  const oneHourAgo = now - ONE_HOUR

  // Find the oldest data point within the last hour
  const oldestIndex = data.findIndex((d) => d.timestamp < oneHourAgo)
  const oldestPoint = oldestIndex === -1 ? data[data.length - 1] : data[oldestIndex]

  const blockDiff = isERC20
    ? data[0].erc20BlockNumber - oldestPoint.erc20BlockNumber
    : data[0].masterCopiesBlockNumber - oldestPoint.masterCopiesBlockNumber

  const timeDiff = (data[0].timestamp - oldestPoint.timestamp) / 1000 / 60 // Convert to minutes
  return blockDiff / timeDiff
}

// Clamped to [0, 100] — a transient lag between the indexing and RPC
// endpoints can otherwise push blocksLeft slightly negative.
export const calculateProgress = (blocksLeft: number, currentBlockNumber: number): number => {
  if (currentBlockNumber <= 0) return 0
  const indexed = currentBlockNumber - blocksLeft
  return Math.min(100, Math.max(0, (indexed / currentBlockNumber) * 100))
}

export const calculateETA = (blocksLeft: number, speed: number): string => {
  if (speed <= 0) return "N/A"

  const minutes = blocksLeft / speed
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`
  } else if (minutes < 1440) {
    return `${Math.round(minutes / 60)} hours`
  } else {
    return `${Math.round(minutes / 1440)} days`
  }
}
