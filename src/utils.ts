import type { TCanvasImage, TOutfitConfig } from './types'

export function loadImg(src: string) {
  return new Promise<TCanvasImage>(resolve => {
    const img = new Image()
    img.addEventListener('load', () => {
      resolve(img)
    })
    img.addEventListener('error', err => {
      console.error(err, err.message)
    })
    img.src = src
  })
}

export async function loadMaskImg(src: string): Promise<TCanvasImage> {
  const img = await loadImg(src)
  return createMaskImgFromGrayscaleImg(img)
}

export function createMaskImgFromGrayscaleImg(img: TCanvasImage): TCanvasImage {
  const { width, height } = img
  const { canvas, ctx } = createCanvasInMemory(width, height)
  ctx.drawImage(img, 0, 0)
  let maskImgData = ctx.getImageData(0, 0, width, height)
  let i = 0
  while (i < maskImgData.data.length) {
    let rgb =
      maskImgData.data[i++] + maskImgData.data[i++] + maskImgData.data[i++]
    maskImgData.data[i++] = rgb / 3
  }
  ctx.putImageData(maskImgData, 0, 0)
  return canvas
}

export function createCanvasInMemory(w = 0, h = 0) {
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')
  return { canvas, ctx }
}

export function createCanvas(w = 0, h = 0) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  return { canvas, ctx }
}

export function maximiseWithinBounds(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number
) {
  const scale = Math.min(maxW / srcW, maxH / srcH)
  const w = srcW * scale
  const h = srcH * scale
  return { w, h }
}

export function getLayerCfgs(outfitCfg: TOutfitConfig, groupKey: string) {
  const layerCfgs = outfitCfg.groupWiseLayers[groupKey]
  if (!layerCfgs)
    throw new Error(
      `The group with key "${groupKey}" was not found in the given outfit config`
    )
  return layerCfgs
}
