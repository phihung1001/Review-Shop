let accessToken = ''

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(value) {
  accessToken = typeof value === 'string' ? value : ''
}

export function clearAccessToken() {
  accessToken = ''
}
