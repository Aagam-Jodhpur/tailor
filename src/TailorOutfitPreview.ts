import { CanvasPainter } from './CanvasPainter'
import { DEFAULT_TEXTURE_TILING_OPTIONS } from './constants'

import {
  createCanvas,
  createCanvasInMemory,
  getLayerCfgs,
  loadImg,
  loadMaskImg,
} from './utils'

import type {
  TCanvasImage,
  TCtx,
  TOutfitConfig,
  TOutfitLayerConfig,
  TOutfitTextureConfig,
  TPreviewOptions,
  TTextureTilingOptions,
} from './types'

export class TailorOutfitPreview {
  private readonly outfitCfg: TOutfitConfig
  private assets: Record<string, TCanvasImage> = {}

  private readonly canvasPainter: CanvasPainter

  constructor(outfitCfg: TOutfitConfig, rootEl: HTMLElement) {
    this.outfitCfg = outfitCfg
    const { width, height } = outfitCfg.base
    this.canvasPainter = new CanvasPainter(width, height, rootEl)
  }

  async init() {
    await this.#loadAssets()
    this.drawOutfitBaseImg()
  }

  async #loadAssets() {
    // Load base images
    const { base } = this.outfitCfg
    this.assets = {
      'base.img': await loadImg(base.img),
      'base.enhancedImg': await loadImg(base.enhancedImg),
    }

    // Load assets for each group
    const groupCfgs = this.outfitCfg.groupWiseLayers
    for (const groupKey in groupCfgs) {
      const layerCfgs = groupCfgs[groupKey]

      // Load assets for each layer
      await Promise.all(
        layerCfgs.map(async (layerCfg, i) => {
          const key = `${groupKey}.layer.${i}.maskSrc`
          // Load layer mask
          this.assets[key] = await loadMaskImg(layerCfg.maskSrc)
        })
      )
    }
  }

  drawOutfitBaseImg() {
    this.canvasPainter.addToRenderQueue(this.assets['base.img'])
  }

  async drawGroupWithReplacedTexture(
    groupKey: string,
    textureCfg: TOutfitTextureConfig,
    previewOptions: TPreviewOptions
  ) {
    // Get the configs for all layers in this group
    const layerCfgs = getLayerCfgs(this.outfitCfg, groupKey)
    const groupImg = await this.#createGroupImg(
      groupKey,
      layerCfgs,
      textureCfg,
      previewOptions
    )
    this.canvasPainter.addToRenderQueue(groupImg)
  }

  async eraseGroup(groupKey: string) {
    const layerCfgs = getLayerCfgs(this.outfitCfg, groupKey)
    const groupImg = await this.#createGroupImgWithBaseImg(groupKey, layerCfgs)
    this.canvasPainter.addToRenderQueue(groupImg)
  }

  async #createGroupImg(
    groupKey: string,
    layerCfgs: TOutfitLayerConfig[],
    textureCfg: TOutfitTextureConfig,
    previewOptions: TPreviewOptions
  ) {
    // Create each layer
    const layerImgs = await Promise.all(
      layerCfgs.map(
        async (layerCfg, layerIdx) =>
          await this.#createLayerImg(
            groupKey,
            layerIdx,
            layerCfg,
            textureCfg,
            previewOptions
          )
      )
    )

    // Create a temporary off-screen canvas for the group
    const { w, h } = this.canvasPainter
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Compose all layers
    layerImgs.forEach(layerImg => {
      ctx.drawImage(layerImg, 0, 0, w, h)
    })

    return canvas
  }

  async #createGroupImgWithBaseImg(
    groupKey: string,
    layerCfgs: TOutfitLayerConfig[]
  ) {
    // Create each layer
    const layerImgs = await Promise.all(
      layerCfgs.map(
        async (layerCfg, layerIdx) =>
          await this.#createLayerImgWithBaseImg(groupKey, layerIdx)
      )
    )

    // Create a temporary off-screen canvas for the group
    const { w, h } = this.canvasPainter
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Compose all layers
    layerImgs.forEach(layerImg => {
      ctx.drawImage(layerImg, 0, 0, w, h)
    })

    return canvas
  }

  async #createLayerImg(
    groupKey: string,
    layerIdx: number,
    layerCfg: TOutfitLayerConfig,
    textureCfg: TOutfitTextureConfig,
    previewOptions: TPreviewOptions
  ) {
    // Create a temporary off-screen canvas for this layer
    const { w, h } = this.canvasPainter
    // const { canvas, ctx } = createCanvasInMemory(w, h)
    const { canvas, ctx } = createCanvas(w, h)

    // Draw the enhanced base image
    const enhancedBaseImg = this.assets['base.enhancedImg']
    ctx.drawImage(enhancedBaseImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Tiling the texture
    // Load the texture
    const textureImg = await loadImg(textureCfg.src)
    // Create tiling properties
    const tilingOptions: Required<TTextureTilingOptions> = {
      ...DEFAULT_TEXTURE_TILING_OPTIONS,
      ...layerCfg.textureTilingOptions,
    }
    // Do the tiling
    this.#tileTexture(ctx, w, h, textureImg, tilingOptions, previewOptions)

    // Applying a mask
    // Get the layer assets from the asset store
    const maskAssetKey = `${groupKey}.layer.${layerIdx}.maskSrc`
    const maskImg = this.assets[maskAssetKey]
    // Do the masking
    this.#applyMask(ctx, maskImg, 0, 0, w, h)

    return canvas
  }

  async #createLayerImgWithBaseImg(groupKey: string, layerIdx: number) {
    // Create a temporary off-screen canvas for this layer
    const { w, h } = this.canvasPainter
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Draw the base image
    const baseImg = this.assets['base.img']
    ctx.drawImage(baseImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Applying a mask
    const maskAssetKey = `${groupKey}.layer.${layerIdx}.maskSrc`
    const maskImg = this.assets[maskAssetKey]
    this.#applyMask(ctx, maskImg, 0, 0, w, h)

    return canvas
  }

  #applyMask(
    ctx: TCtx,
    maskImg: TCanvasImage,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-atop'
    ctx.drawImage(maskImg, x, y, w, h)
    ctx.restore()
  }

  #tileTexture(
    ctx: TCtx,
    w: number,
    h: number,
    textureImg: TCanvasImage,
    tilingOptions: Required<TTextureTilingOptions>,
    previewOptions: TPreviewOptions
  ) {
    const tW = textureImg.width
    const tH = textureImg.height

    let tS = tilingOptions.scale
    if (previewOptions.textureScale) tS *= previewOptions.textureScale

    const tA = (Math.PI * tilingOptions.angle) / 180

    const overhang = 0.25
    const tStartX = -(w / tS) * overhang
    const tEndX = (w / tS) * (1 + overhang)
    const tStartY = -(h / tS) * overhang
    const tEndY = (h / tS) * (1 + overhang)

    ctx.save()
    ctx.scale(tS, tS)
    ctx.translate(w / (2 * tS), h / (2 * tS))
    ctx.rotate(tA)
    ctx.translate(-w / (2 * tS), -h / (2 * tS))
    for (let y = tStartY; y < tEndY; y += tH) {
      for (let x = tStartX; x < tEndX; x += tW) {
        ctx.drawImage(textureImg, x, y, tW, tH)
      }
    }
    ctx.restore()
  }
}
