'use strict'

export function sleep(ms) {
  const p = new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
  return p
}
