export function navigate(to, { replace = false } = {}) {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function handleInternalNavigation(event) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) return

  const anchor = event.target.closest('a[href]')
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return

  event.preventDefault()
  navigate(`${url.pathname}${url.search}${url.hash}`)
}

export function safeRedirect(value, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
