import {
  createCanvasInMemory,
  getGroupCfg,
  getLayerCfg,
  loadImg,
  loadMaskImg,
} from './utils'
import { CanvasPainter } from './CanvasPainter'
import type {
  CanvasImage,
  Ctx,
  OutfitConfig,
  PreviewOptions,
  TextureTilingOptions,
} from './types'

export class OutfitPreview {
  DEFAULT_TILING_OPTIONS: Required<TextureTilingOptions> = {
    scale: 0.2,
    angle: 0,
  }
  private readonly outfitCfg: OutfitConfig
  private assets: Record<string, CanvasImage> = {}

  private readonly canvasPainter: CanvasPainter

  constructor(outfitCfg: OutfitConfig, rootEl: HTMLElement) {
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
    const groupCfgs = this.outfitCfg.groups
    for (const groupKey in groupCfgs) {
      const groupCfg = groupCfgs[groupKey]

      const { textures, layers } = groupCfg

      // Load assets for each texture
      for (const textureKey in textures) {
        const textureCfg = textures[textureKey]
        const key = `${groupKey}.texture.src.${textureKey}`
        this.assets[key] = await loadImg(textureCfg.src)
      }

      // Load assets for each layer
      for (const layerKey in layers) {
        const layerCfg = layers[layerKey]
        const key = `${groupKey}.layer.maskSrc.${layerKey}`

        // Load layer mask
        this.assets[key] = await loadMaskImg(layerCfg.maskSrc)
      }
    }
  }

  drawOutfitBaseImg() {
    this.canvasPainter.addToRenderQueue(this.assets['base.img'])
  }

  drawGroupWithReplacedTexture(
    groupKey: string,
    textureKey: string,
    previewOptions: PreviewOptions
  ) {
    const groupImg = this.#createGroupImg(groupKey, textureKey, previewOptions)
    this.canvasPainter.addToRenderQueue(groupImg)
  }

  eraseGroup(groupKey: string) {
    const groupImg = this.#createGroupImgWithBaseImg(groupKey)
    this.canvasPainter.addToRenderQueue(groupImg)
  }

  #createGroupImg(
    groupKey: string,
    textureKey: string,
    previewOptions: PreviewOptions
  ) {
    // Get the group config
    const groupCfg = getGroupCfg(this.outfitCfg, groupKey)

    // Create each layer
    const layerImgs = Object.keys(groupCfg.layers).map(layerKey =>
      this.#createLayerImg(groupKey, layerKey, textureKey, previewOptions)
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

  #createGroupImgWithBaseImg(groupKey: string) {
    // Get the group config
    const groupCfg = getGroupCfg(this.outfitCfg, groupKey)

    // Create each layer
    const layerImgs = Object.keys(groupCfg.layers).map(layerKey =>
      this.#createLayerImgWithBaseImg(groupKey, layerKey)
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

  #createLayerImg(
    groupKey: string,
    layerKey: string,
    textureKey: string,
    previewOptions: PreviewOptions
  ) {
    const groupCfg = getGroupCfg(this.outfitCfg, groupKey)
    const layerCfg = getLayerCfg(groupCfg, layerKey)

    // Create a temporary off-screen canvas for this layer
    const { w, h } = this.canvasPainter
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Draw the enhanced base image
    const enhancedBaseImg = this.assets['base.enhancedImg']
    ctx.drawImage(enhancedBaseImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Tiling the texture
    const tilingOptions: Required<TextureTilingOptions> = {
      ...this.DEFAULT_TILING_OPTIONS,
      ...layerCfg.textureTilingOptions,
    }
    const textureAssetKey = `${groupKey}.texture.src.${textureKey}`
    const textureImg = this.assets[textureAssetKey]
    this.#tileTexture(ctx, w, h, textureImg, tilingOptions, previewOptions)

    // Applying a mask
    const maskAssetKey = `${groupKey}.layer.maskSrc.${layerKey}`
    const maskImg = this.assets[maskAssetKey]
    this.#applyMask(ctx, maskImg, 0, 0, w, h)

    return canvas
  }

  #createLayerImgWithBaseImg(groupKey: string, layerKey: string) {
    // Create a temporary off-screen canvas for this layer
    const { w, h } = this.canvasPainter
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Draw the base image
    const baseImg = this.assets['base.img']
    ctx.drawImage(baseImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Applying a mask
    const maskAssetKey = `${groupKey}.layer.maskSrc.${layerKey}`
    const maskImg = this.assets[maskAssetKey]
    this.#applyMask(ctx, maskImg, 0, 0, w, h)

    return canvas
  }

  #applyMask(
    ctx: Ctx,
    maskImg: CanvasImage,
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
    ctx: Ctx,
    w: number,
    h: number,
    textureImg: CanvasImage,
    tilingOptions: Required<TextureTilingOptions>,
    previewOptions: PreviewOptions
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
