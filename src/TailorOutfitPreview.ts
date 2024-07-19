import { CanvasPainter } from './CanvasPainter/CanvasPainter'
import { TError } from './TError'

import {
  createCanvasInMemory,
  getLayerCfgs,
  loadImg,
  loadMaskImg,
} from './common/utils'

import {
  DEFAULT_PREVIEW_OPTIONS,
  DEFAULT_TEXTURE_TILING_OPTIONS,
  TRANSITION_MAP,
  TIMING_FN_MAP,
  DEFAULT_TEXTURE_SCALE,
} from './common/constants'

import type {
  TCtx,
  TOutfitConfig,
  TPreviewOptions,
  TProcessedOutfitBaseConfig,
  TProcessedOutfitConfig,
  TProcessedOutfitLayerConfig,
  TProcessedPreviewOptions,
  TProcessedTextureConfig,
  TProcessedTextureTilingOptions,
  TProcessedTransitionOptions,
  TTextureConfig,
  TTimingFn,
  TTransition,
} from './common/types'

export class TInitError extends TError {
  constructor(cause?: Error) {
    const msg = 'Tailor could not be initialized properly'
    super(msg, cause)
    this.name = 'InitError'
  }
}

export class TOpError extends TError {
  constructor(op: string, cause?: Error) {
    const msg = `Tailor could not perform operation: ${op}`
    super(msg, cause)
    this.name = 'OpError'
  }
}

export class TailorOutfitPreview {
  private ready: boolean
  private canvasPainter: CanvasPainter | null
  private outfitCfg: TProcessedOutfitConfig | null
  private previewOptions: TProcessedPreviewOptions

  constructor(previewOptions?: TPreviewOptions) {
    try {
      this.ready = false
      this.canvasPainter = null
      this.outfitCfg = null
      this.previewOptions = this.processPreviewOptions(previewOptions)
    } catch (e) {
      if (e instanceof Error) {
        const err = new TInitError(e)
        err.log()
        throw err
      } else throw e
    }
  }

  async init(cfg: TOutfitConfig, rootEl: HTMLElement) {
    try {
      if (this.ready) throw new TError(`The class is already initialized`)

      this.outfitCfg = await this.processOutfitConfig(cfg)

      const { width, height } = cfg.base
      this.canvasPainter = new CanvasPainter(width, height, rootEl)

      // Draw the outfit base image
      await this.canvasPainter.addRenderItem(
        'base',
        this.outfitCfg.base.img,
        this.previewOptions.transitionOptions
      )

      this.ready = true
    } catch (e) {
      if (e instanceof Error) {
        const err = new TInitError(e)
        err.log()
        throw err
      } else throw e
    }
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
      scale: cfg.scale ?? DEFAULT_TEXTURE_SCALE,
    }
    return processedTextureCfg
  }

  private processPreviewOptions(
    options?: TPreviewOptions,
    baseOptions = DEFAULT_PREVIEW_OPTIONS
  ) {
    if (!options) return baseOptions

    let transitionOptions: TProcessedTransitionOptions
    if (options.transitionOptions) {
      let entry: TTransition
      if (options.transitionOptions.entry) {
        entry = TRANSITION_MAP[options.transitionOptions.entry]
        if (!entry) throw new TError(`Transition option "entry" is invalid`)
      } else {
        entry = baseOptions.transitionOptions.entry
      }

      let exit: TTransition
      if (options.transitionOptions.exit) {
        exit = TRANSITION_MAP[options.transitionOptions.exit]
        if (!exit) throw new TError(`Transition option "exit" is invalid`)
      } else {
        exit = baseOptions.transitionOptions.exit
      }

      let timingFn: TTimingFn
      if (options.transitionOptions.timingFn) {
        timingFn = TIMING_FN_MAP[options.transitionOptions.timingFn]
        if (!timingFn)
          throw new TError(`Transition option "timingFn" is invalid`)
      } else {
        timingFn = baseOptions.transitionOptions.timingFn
      }

      let speed: number
      if (options.transitionOptions.speed) {
        if (
          options.transitionOptions.speed < 0 ||
          options.transitionOptions.speed > 1
        )
          throw new TError(`Transition option "speed" is invalid`)
        speed = options.transitionOptions.speed
      } else {
        speed = baseOptions.transitionOptions.speed
      }

      transitionOptions = {
        entry,
        exit,
        timingFn,
        speed,
      }
    } else {
      transitionOptions = baseOptions.transitionOptions
    }

    const processedPreviewOptions: TProcessedPreviewOptions = {
      transitionOptions,
    }

    return processedPreviewOptions
  }

  setPreviewOptions(options: TPreviewOptions) {
    this.previewOptions = this.processPreviewOptions(
      options,
      this.previewOptions
    )
  }

  async applyTextureOnGroup(groupKey: string, textureCfg: TTextureConfig) {
    try {
      if (!this.ready)
        throw new TError(
          `Tailor is already processing a previous operation. Wait for it to finish.`
        )
      if (!this.canvasPainter)
        throw new TError(`Canvas painter not initialized`)
      if (!this.outfitCfg) throw new TError(`Outfit config not initialized`)

      this.ready = false

      // Process the texture config
      const processedTextureCfg = await this.processTextureConfig(textureCfg)

      // Create group image
      const layerCfgs = getLayerCfgs(this.outfitCfg, groupKey)
      const groupImg = await this.#createGroupImg(
        this.outfitCfg.base,
        layerCfgs,
        processedTextureCfg
      )

      await this.canvasPainter.addRenderItem(
        groupKey,
        groupImg,
        this.previewOptions.transitionOptions
      )

      this.ready = true
    } catch (e) {
      if (e instanceof Error) {
        const err = new TOpError('applyTextureOnGroup', e)
        err.log()
        throw err
      } else throw e
    }
  }

  async removeTextureOnGroup(groupKey: string) {
    try {
      if (!this.ready)
        throw new TError(
          `Tailor is already processing a previous operation. Wait for it to finish.`
        )
      if (!this.canvasPainter)
        throw new TError(`Canvas painter not initialized`)
      if (!this.outfitCfg) throw new TError(`Outfit config not initialized`)

      this.ready = false

      await this.canvasPainter.removeRenderItem(groupKey)

      this.ready = true
    } catch (e) {
      if (e instanceof Error) {
        const err = new TOpError('removeTextureOnGroup', e)
        err.log()
        throw err
      } else throw e
    }
  }

  async #createGroupImg(
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfgs: TProcessedOutfitLayerConfig[],
    textureCfg: TProcessedTextureConfig
  ) {
    // Create each layer
    const layerImgs = await Promise.all(
      layerCfgs.map(
        async layerCfg =>
          await this.#createLayerImg(baseCfg, layerCfg, textureCfg)
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
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfg: TProcessedOutfitLayerConfig,
    textureCfg: TProcessedTextureConfig
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
      textureCfg.scale
    )

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
    textureScale: number
  ) {
    const tW = textureImg.width
    const tH = textureImg.height

    let tS = tilingOptions.scale
    tS *= textureScale

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
