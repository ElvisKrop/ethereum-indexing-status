export interface AboutData {
  name: string
  version: string
  api_version: string
  secure: boolean
  host: string
  headers: string[]
  settings: Settings
}

export interface Settings {
  AWS_CONFIGURED: boolean
  AWS_S3_PUBLIC_URL: string
  ETHEREUM_NODE_URL: string
  ETHEREUM_TRACING_NODE_URL: null
  ETH_EVENTS_BLOCK_PROCESS_LIMIT: number
  ETH_EVENTS_BLOCK_PROCESS_LIMIT_MAX: number
  ETH_EVENTS_QUERY_CHUNK_SIZE: number
  ETH_EVENTS_UPDATED_BLOCK_BEHIND: number
  ETH_INTERNAL_NO_FILTER: boolean
  ETH_INTERNAL_TRACE_TXS_BATCH_SIZE: number
  ETH_INTERNAL_TXS_BLOCK_PROCESS_LIMIT: number
  ETH_L2_NETWORK: boolean
  ETH_REORG_BLOCKS: number
  NOTIFICATIONS_FIREBASE_CREDENTIALS_PATH: null
  SSO_ENABLED: boolean
  TOKENS_LOGO_BASE_URI: string
  TOKENS_LOGO_EXTENSION: string
}

export interface CurrentData {
  erc20: {
    blocksLeft: number
    speed: number
    indexedBlocks: number
    eta: string
    synced: boolean
  }
  masterCopies: {
    blocksLeft: number
    speed: number
    indexedBlocks: number
    eta: string
    synced: boolean
  }
  latestBlock: number
}

export interface RpcData {
  version: string
  block_number: number
  chain_id: number
  chain: string
  syncing: boolean
}
