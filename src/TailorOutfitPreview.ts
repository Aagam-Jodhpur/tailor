import { GroupImgCreator } from './workers/GroupImgCreator'
import { OutfitConfigProcessor } from './workers/OutfitConfigProcessor'
import { CanvasPainter } from './CanvasPainter/CanvasPainter'

import {
  DEFAULT_PREVIEW_OPTIONS,
  DEFAULT_TEXTURE_SCALE,
  TIMING_FN_MAP,
  TRANSITION_MAP,
} from './common/constants'

import type {
  TOutfitConfig,
  TPreviewOptions,
  TProcessedPreviewOptions,
  TProcessedTextureConfig,
  TProcessedTransitionOptions,
  TTextureConfig,
  TTimingFn,
  TTransition,
} from './common/types'

import { loadImg } from './common/utils'
import { TError } from './TError'

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
  private previewOptions: TProcessedPreviewOptions

  private outfitConfigProcessor: OutfitConfigProcessor
  private groupWiseImgCreators: Record<string, GroupImgCreator>

  constructor(previewOptions?: TPreviewOptions) {
    try {
      this.ready = false
      this.canvasPainter = null
      this.previewOptions = this.processPreviewOptions(previewOptions)
      this.outfitConfigProcessor = new OutfitConfigProcessor()
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

      const outfitCfg =
        await this.outfitConfigProcessor.processOutfitConfig(cfg)

      this.groupWiseImgCreators = Object.fromEntries(
        await Promise.all(
          Object.keys(outfitCfg.groupWiseLayers).map(async groupKey => {
            const groupImgCreator = new GroupImgCreator()
            await groupImgCreator.transferCfg(
              outfitCfg.base,
              outfitCfg.groupWiseLayers[groupKey]
            )
            return [groupKey, groupImgCreator]
          })
        )
      )

      const { width, height } = outfitCfg.base
      this.canvasPainter = new CanvasPainter(width, height, rootEl)

      // Draw the outfit base image
      await this.canvasPainter.addRenderItem(
        'base',
        outfitCfg.base.img,
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
      if (!this.groupWiseImgCreators)
        throw new TError('Web workers for group img creation not initialized')
      if (!this.groupWiseImgCreators.hasOwnProperty(groupKey))
        throw new TError(`Web worker for group with key ${groupKey} not found`)
      if (!this.canvasPainter)
        throw new TError(`Canvas painter not initialized`)

      // Process the texture config
      const processedTextureCfg = await this.processTextureConfig(textureCfg)

      const groupImg =
        await this.groupWiseImgCreators[groupKey].createGroupImg(
          processedTextureCfg
        )

      await this.canvasPainter.addRenderItem(
        groupKey,
        groupImg,
        this.previewOptions.transitionOptions
      )
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
      if (!this.canvasPainter)
        throw new TError(`Canvas painter not initialized`)

      await this.canvasPainter.removeRenderItem(groupKey)
    } catch (e) {
      if (e instanceof Error) {
        const err = new TOpError('removeTextureOnGroup', e)
        err.log()
        throw err
      } else throw e
    }
  }
}
