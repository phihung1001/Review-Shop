export function normalizeContributorProfileUrl(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidGoogleMapsContributorUrl(value) {
  try {
    const url = new URL(normalizeContributorProfileUrl(value))
    return url.protocol === 'https:'
      && ['google.com', 'www.google.com'].includes(url.hostname)
      && /^\/maps\/contrib\/\d+\/?$/.test(url.pathname)
      && !url.search
      && !url.hash
  } catch { return false }
}
