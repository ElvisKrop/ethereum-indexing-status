// Function to remove trailing slashes from a URL
export const sanitizeUrl = (url: string): string => {
  return url.replace(/\/+$/, "")
}

// Function to validate URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Function to mask API keys in URLs
export const maskApiKey = (url: string): string => {
  if (!url) return "N/A"

  // Handle standard api_key or apikey parameters
  let maskedUrl = url.replace(/([?&]api[_-]?key=)([^&]+)/gi, "$1********")

  // Handle dRPC specific dkey parameter
  maskedUrl = maskedUrl.replace(/([?&]dkey=)([^&]+)/gi, "$1********")

  // Handle URLs with keys embedded in the path (like Infura or Alchemy)
  const patterns = [
    /https:\/\/[^/]+\.infura\.io\/v3\/([a-f0-9]+)/i,
    /https:\/\/[^/]+\.g\.alchemy\.com\/v2\/([a-zA-Z0-9_-]+)/i,
    /https:\/\/[^/]+\.alchemyapi\.io\/v2\/([a-zA-Z0-9_-]+)/i,
  ]

  for (const pattern of patterns) {
    maskedUrl = maskedUrl.replace(pattern, (match, key) => {
      return match.replace(key, "********")
    })
  }

  // Handle Ankr's URL structure with the key in the path
  maskedUrl = maskedUrl.replace(/(https:\/\/rpc\.ankr\.com\/[^/]+\/)([a-f0-9]{40,})/i, "$1********")

  // Handle QuickNode URL structures
  // Format: https://domain.quiknode.pro/apikey/ or https://domain.quiknode.pro/apikey/extendedpath/
  maskedUrl = maskedUrl.replace(/(https:\/\/[^/]+\.quiknode\.pro\/)([a-zA-Z0-9_-]{8,})(\/|$|#)/i, "$1********$3")

  // Handle QuickNode URL with .io domain
  maskedUrl = maskedUrl.replace(/(https:\/\/[^/]+\.quiknode\.io\/)([a-zA-Z0-9_-]{8,})(\/|$|#)/i, "$1********$3")

  // Handle other common RPC providers with API keys in the path
  maskedUrl = maskedUrl.replace(/(https:\/\/[^/]+\/)([a-zA-Z0-9_-]{30,})(\/|$|#)/i, (match, prefix, key, suffix) => {
    // Only mask if it looks like an API key (long alphanumeric string)
    if (/^[a-zA-Z0-9_-]{30,}$/.test(key)) {
      return `${prefix}********${suffix}`
    }
    return match
  })

  return maskedUrl
}

export const getNetworkFromHost = (host: string): string => {
  // Get the first part of the host (before the first dot)
  const firstPart = host.split(".")[0]

  // Remove "safe", "transaction", and "-" from the string
  const network = firstPart
    .replace(/safe/gi, "")
    .replace(/transaction/gi, "")
    .replace(/-/g, " ")
    .trim()

  // Hosts like "transaction.safe.educhain.xyz" have no chain name encoded in
  // the first segment (unlike "transaction-ethereum.safe...") — stripping
  // leaves nothing, so fall back to the raw first segment instead of "".
  return (network || firstPart).toUpperCase()
}
