import type { TTimingFn } from '../common/types'

export const Linear: TTimingFn = x => {
  return x
}

export const EaseInQuad: TTimingFn = x => {
  return Math.pow(x, 2)
}

export const EaseOutQuad: TTimingFn = x => {
  return 1 - Math.pow(1 - x, 2)
}

export const EaseInCubic: TTimingFn = x => {
  return Math.pow(x, 3)
}

export const EaseOutCubic: TTimingFn = x => {
  return 1 - Math.pow(1 - x, 3)
}
