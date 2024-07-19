import type { TTransition } from '../../common/types'

export const FadeIn: TTransition = (ctx, w, h, img, progress) => {
  if (!img) return

  const opacity = progress
  ctx.globalAlpha = opacity
  ctx.drawImage(img, 0, 0, w, h)
}

export const FadeOut: TTransition = (ctx, w, h, img, progress) => {
  if (!img) return

  const opacity = 1 - progress
  ctx.globalAlpha = opacity
  ctx.drawImage(img, 0, 0, w, h)
}
