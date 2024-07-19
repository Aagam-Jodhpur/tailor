import type { TTransition } from '../../common/types'

export const WipeIn: TTransition = (ctx, w, h, img, progress) => {
  if (!img) return

  const xIntercept = 2 * w * progress
  const yIntercept = 2 * h * progress

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, yIntercept)
  ctx.lineTo(xIntercept, 0)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, 0, 0, w, h)
}

export const WipeOut: TTransition = (ctx, w, h, img, progress) => {
  if (!img) return

  const antiprogress = 1 - progress
  const xIntercept = 2 * w * antiprogress
  const yIntercept = 2 * h * antiprogress

  ctx.beginPath()
  ctx.moveTo(w, h)
  ctx.lineTo(w, h - yIntercept)
  ctx.lineTo(w - xIntercept, h)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, 0, 0, w, h)
}
