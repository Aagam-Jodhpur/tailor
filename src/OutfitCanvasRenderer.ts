import {
  createCanvasInMemory,
  getGroupCfg,
  getLayerCfg,
  loadImg,
  loadMaskImg,
} from './utils'
import { CanvasRenderer } from './CanvasRenderer.js'

export class OutfitCanvasRenderer extends CanvasRenderer {
  ready = false
  DEFAULT_TILING_OPTIONS = {
    scale: 0.2,
    angle: 0,
    overhang: 0.25,
  }
  #outfitCfg
  #assets

  constructor(outfitCfg, rootEl) {
    super(outfitCfg.baseImg.w, outfitCfg.baseImg.h, rootEl)
    this.#outfitCfg = outfitCfg
  }

  async init() {
    this.ready = false
    await this.#loadAssets()
    this.#drawOutfitBaseImg()
    this.ready = true
  }

  async draw(groupTextureMap) {
    const groupKeys = Object.keys(groupTextureMap)
    for await (const groupKey of groupKeys) {
      const { textureKey, textureProperties } = groupTextureMap[groupKey]
      try {
        if (textureKey.trim() === '') this.#eraseGroup(groupKey)
        else
          this.#drawGroupWithReplacedTexture(
            groupKey,
            textureKey,
            textureProperties
          )
        await this.blockTillRenderComplete()
      } catch (e) {
        console.error(e)
      }
    }
  }

  async #loadAssets() {
    // Load base images
    const { baseImg } = this.#outfitCfg
    this.#assets = {
      baseImg: await loadImg(baseImg.srcPath),
      enhancedBaseImg: await loadImg(baseImg.enhancedSrcPath),
    }

    // Load assets for each group
    const groupCfgs = this.#outfitCfg.groups
    for (const groupKey in groupCfgs) {
      const groupCfg = groupCfgs[groupKey]
      this.#assets[groupKey] = {}

      const { availableTextures, textureReplacementLayers } = groupCfg

      // Load assets for each texture
      this.#assets[groupKey].textures = {}
      for (const textureKey in availableTextures) {
        const textureCfg = availableTextures[textureKey]
        this.#assets[groupKey].textures[textureKey] = await loadImg(
          textureCfg.srcPath
        )
      }

      // Load assets for each layer
      this.#assets[groupKey].layers = {}
      for (const layerKey in textureReplacementLayers) {
        const layerCfg = textureReplacementLayers[layerKey]
        this.#assets[groupKey].layers[layerKey] = {}

        // Load layer mask
        this.#assets[groupKey].layers[layerKey].mask = await loadMaskImg(
          layerCfg.maskSrcPath
        )
      }
    }
  }

  #drawOutfitBaseImg() {
    this.addToRenderQueue(this.#assets.baseImg)
  }

  #drawGroupWithReplacedTexture(groupKey, textureKey, textureProperties) {
    const groupImg = this.#createGroupImg(
      groupKey,
      textureKey,
      textureProperties
    )
    this.addToRenderQueue(groupImg)
  }

  #eraseGroup(groupKey) {
    const groupImg = this.#createGroupImgWithBaseImg(groupKey)
    this.addToRenderQueue(groupImg)
  }

  #createGroupImg(groupKey, textureKey, textureProperties) {
    // Get the group config
    const groupCfg = getGroupCfg(this.#outfitCfg, groupKey)

    // Create each layer
    const layerImgs = Object.keys(groupCfg.textureReplacementLayers).map(
      layerKey =>
        this.#createLayerImg(groupKey, layerKey, textureKey, textureProperties)
    )

    // Create a temporary off-screen canvas for the group
    const { w, h } = this
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Compose all layers
    layerImgs.forEach(layerImg => {
      ctx.drawImage(layerImg, 0, 0, w, h)
    })

    return canvas
  }

  #createGroupImgWithBaseImg(groupKey) {
    // Get the group config
    const groupCfg = getGroupCfg(this.#outfitCfg, groupKey)

    // Create each layer
    const layerImgs = Object.keys(groupCfg.textureReplacementLayers).map(
      layerKey => this.#createLayerImgWithBaseImg(groupKey, layerKey)
    )

    // Create a temporary off-screen canvas for the group
    const { w, h } = this
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Compose all layers
    layerImgs.forEach(layerImg => {
      ctx.drawImage(layerImg, 0, 0, w, h)
    })

    return canvas
  }

  #createLayerImg(groupKey, layerKey, textureKey, textureProperties) {
    const groupCfg = getGroupCfg(this.#outfitCfg, groupKey)
    const layerCfg = getLayerCfg(groupCfg, layerKey)

    // Create a temporary off-screen canvas for this layer
    const { w, h } = this
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Draw the enhanced base image
    const { enhancedBaseImg } = this.#assets
    ctx.drawImage(enhancedBaseImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Tiling the texture
    const tilingOptions = {
      ...this.DEFAULT_TILING_OPTIONS,
      ...layerCfg.tilingOptions,
    }
    const textureImg = this.#assets[groupKey]['textures'][textureKey]
    this.#tileTexture(ctx, w, h, textureImg, tilingOptions, textureProperties)

    // Applying a mask
    const maskImg = this.#assets[groupKey]['layers'][layerKey].mask
    this.#applyMask(ctx, maskImg, 0, 0, w, h)

    return canvas
  }

  #createLayerImgWithBaseImg(groupKey, layerKey) {
    // Create a temporary off-screen canvas for this layer
    const { w, h } = this
    const { canvas, ctx } = createCanvasInMemory(w, h)

    // Draw the base image
    const { baseImg } = this.#assets
    ctx.drawImage(baseImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Applying a mask
    const maskImg = this.#assets[groupKey]['layers'][layerKey].mask
    this.#applyMask(ctx, maskImg, 0, 0, w, h)

    return canvas
  }

  #applyMask(ctx, maskImg, x, y, w, h) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-atop'
    ctx.drawImage(maskImg, x, y, w, h)
    ctx.restore()
  }

  #tileTexture(ctx, w, h, textureImg, tilingOptions, textureProperties) {
    const tW = textureImg.naturalWidth
    const tH = textureImg.naturalHeight

    let tS = tilingOptions.scale
    if (textureProperties.scale) tS *= textureProperties.scale

    const tA = (Math.PI * tilingOptions.angle) / 180

    const tStartX = -(w / tS) * tilingOptions.overhang
    const tEndX = (w / tS) * (1 + tilingOptions.overhang)
    const tStartY = -(h / tS) * tilingOptions.overhang
    const tEndY = (h / tS) * (1 + tilingOptions.overhang)

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
