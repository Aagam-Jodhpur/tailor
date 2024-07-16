import { CanvasPainter } from './CanvasPainter'
import { DEFAULT_TEXTURE_TILING_OPTIONS } from './constants'

import type {
  TCtx,
  TOutfitConfig,
  TPreviewOptions,
  TProcessedOutfitBaseConfig,
  TProcessedOutfitConfig,
  TProcessedOutfitLayerConfig,
  TProcessedTextureConfig,
  TProcessedTextureTilingOptions,
  TTextureConfig,
} from './types'

import {
  createCanvasInMemory,
  getLayerCfgs,
  loadImg,
  loadMaskImg,
} from './utils'

export class TailorOutfitPreview {
  private canvasPainter: CanvasPainter | null
  private outfitCfg: TProcessedOutfitConfig | null

  constructor() {
    this.canvasPainter = null
    this.outfitCfg = null
  }

  async init(cfg: TOutfitConfig, rootEl: HTMLElement) {
    this.outfitCfg = await this.processOutfitConfig(cfg)

    const { width, height } = cfg.base
    this.canvasPainter = new CanvasPainter(width, height, rootEl)

    this.drawOutfitBaseImg()
  }

  private async processOutfitConfig(cfg: TOutfitConfig) {
    // Create outfit base config
    const base: TProcessedOutfitBaseConfig = {
      width: cfg.base.width,
      height: cfg.base.height,
      img: await loadImg(cfg.base.imgSrc),
      enhancedImg: await loadImg(cfg.base.enhancedImgSrc),
    }

    // Create outfit group wise layers
    const groupWiseLayers: Record<string, TProcessedOutfitLayerConfig[]> = {}
    for (const groupKey in cfg.groupWiseLayers) {
      const layerCfgs = cfg.groupWiseLayers[groupKey]
      groupWiseLayers[groupKey] = await Promise.all(
        layerCfgs.map(
          async (layerCfg): Promise<TProcessedOutfitLayerConfig> => {
            const maskImg = await loadMaskImg(layerCfg.maskImgSrc)
            const textureTilingOptions: TProcessedTextureTilingOptions = {
              ...DEFAULT_TEXTURE_TILING_OPTIONS,
              ...layerCfg.textureTilingOptions,
            }
            return {
              maskImg,
              textureTilingOptions,
            }
          }
        )
      )
    }

    const processedOutfitCfg: TProcessedOutfitConfig = {
      base,
      groupWiseLayers,
    }

    return processedOutfitCfg
  }

  private async processTextureConfig(cfg: TTextureConfig) {
    const processedTextureCfg: TProcessedTextureConfig = {
      img: await loadImg(cfg.imgSrc),
    }
    return processedTextureCfg
  }

  drawOutfitBaseImg() {
    if (!this.canvasPainter) throw new Error(`Canvas painter not initialized`)
    if (!this.outfitCfg) throw new Error(`Outfit config not initialized`)
    this.canvasPainter.addToRenderQueue(this.outfitCfg.base.img)
  }

  async drawGroupWithReplacedTexture(
    groupKey: string,
    textureCfg: TTextureConfig,
    previewOptions: TPreviewOptions
  ) {
    if (!this.canvasPainter) throw new Error(`Canvas painter not initialized`)
    if (!this.outfitCfg) throw new Error(`Outfit config not initialized`)

    // Process the texture config
    const processedTextureCfg = await this.processTextureConfig(textureCfg)

    // Create group image
    const layerCfgs = getLayerCfgs(this.outfitCfg, groupKey)
    const groupImg = await this.#createGroupImg(
      this.outfitCfg.base,
      layerCfgs,
      processedTextureCfg,
      previewOptions
    )
    this.canvasPainter.addToRenderQueue(groupImg)
  }

  eraseGroup(groupKey: string) {
    if (!this.canvasPainter) throw new Error(`Canvas painter not initialized`)
    if (!this.outfitCfg) throw new Error(`Outfit config not initialized`)
    const layerCfgs = getLayerCfgs(this.outfitCfg, groupKey)
    const groupImg = this.#createGroupImgWithBaseImg(
      this.outfitCfg.base,
      layerCfgs
    )
    this.canvasPainter.addToRenderQueue(groupImg)
  }

  async #createGroupImg(
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfgs: TProcessedOutfitLayerConfig[],
    textureCfg: TProcessedTextureConfig,
    previewOptions: TPreviewOptions
  ) {
    // Create each layer
    const layerImgs = await Promise.all(
      layerCfgs.map(
        async layerCfg =>
          await this.#createLayerImg(
            baseCfg,
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

  #createGroupImgWithBaseImg(
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfgs: TProcessedOutfitLayerConfig[]
  ) {
    // Create each layer
    const layerImgs = layerCfgs.map(layerCfg =>
      this.#createLayerImgWithBaseImg(baseCfg, layerCfg)
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
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfg: TProcessedOutfitLayerConfig,
    textureCfg: TProcessedTextureConfig,
    previewOptions: TPreviewOptions
  ) {
    // Create a temporary off-screen canvas for this layer
    const { w, h } = this.canvasPainter
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Draw the enhanced base image
    ctx.drawImage(baseCfg.enhancedImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Tiling the texture
    this.#tileTexture(
      ctx,
      w,
      h,
      textureCfg.img,
      layerCfg.textureTilingOptions,
      previewOptions
    )

    // Applying a mask
    this.#applyMask(ctx, layerCfg.maskImg, 0, 0, w, h)

    return canvas
  }

  #createLayerImgWithBaseImg(
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfg: TProcessedOutfitLayerConfig
  ) {
    // Create a temporary off-screen canvas for this layer
    const { w, h } = this.canvasPainter
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Draw the base image
    ctx.drawImage(baseCfg.img, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Applying a mask
    this.#applyMask(ctx, layerCfg.maskImg, 0, 0, w, h)

    return canvas
  }

  #applyMask(
    ctx: TCtx,
    maskImg: ImageBitmap,
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
    textureImg: ImageBitmap,
    tilingOptions: TProcessedTextureTilingOptions,
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
