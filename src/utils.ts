export function loadImg(srcPath) {
  return new Promise(resolve => {
    const img = new Image()
    img.addEventListener('load', () => {
      resolve(img)
    })
    img.src = srcPath
  })
}

export async function loadMaskImg(srcPath) {
  const img = await loadImg(srcPath)
  return createMaskImgFromGrayscaleImg(img)
}

export function createMaskImgFromGrayscaleImg(img) {
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

export function maximiseWithinBounds(sourceW, sourceH, maxW, maxH) {
  const scale = Math.min(maxW / sourceW, maxH / sourceH)
  const w = sourceW * scale
  const h = sourceH * scale
  return { w, h }
}

export function getGroupCfg(outfitCfg, groupKey) {
  const groupCfg = outfitCfg.groups[groupKey]
  if (!groupCfg)
    throw new Error(
      `The group with key "${groupKey}" was not found in the config of outfit "${outfitCfg.name}"`
    )
  return groupCfg
}

export function getLayerCfg(groupCfg, layerKey) {
  const layerCfg = groupCfg.textureReplacementLayers[layerKey]
  if (!layerCfg)
    throw new Error(
      `The layer with key "${layerKey}" was not found in the config of group "${groupCfg.name}"`
    )
  return layerCfg
}

export function getTextureCfg(groupCfg, textureKey) {
  const textureCfg = groupCfg.availableTextures[textureKey]
  if (!textureCfg)
    throw new Error(
      `The texture with key "${textureKey}" was not found in the config of group "${groupCfg.name}"`
    )
  return textureCfg
}
