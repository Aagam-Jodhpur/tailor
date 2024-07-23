import { DEFAULT_TEXTURE_TILING_OPTIONS } from '../common/constants'
import { WorkerExecutor } from './WorkerExecutor'
import type {
  TMaskBoundingBox,
  TOutfitConfig,
  TProcessedOutfitBaseConfig,
  TProcessedOutfitConfig,
  TProcessedOutfitLayerConfig,
  TProcessedTextureTilingOptions,
  TWorkerFn,
} from '../common/types'

//==============================<  Worker Executor  >===========================

interface ProcessReq {
  cfg: TOutfitConfig
  constants: {
    BASE_URL: string
    DEFAULT_TEXTURE_TILING_OPTIONS: TProcessedTextureTilingOptions
  }
}

interface ProcessRes {
  cfg: TProcessedOutfitConfig
}

export class OutfitConfigProcessor extends WorkerExecutor {
  constructor() {
    super('OutfitConfigProcessor', workerFn)
  }

  async processOutfitConfig(cfg: TOutfitConfig) {
    const res = await this.safelySendRequestToWorker<ProcessReq, ProcessRes>({
      cfg,
      constants: {
        DEFAULT_TEXTURE_TILING_OPTIONS,
        BASE_URL: window.location.href,
      },
    })
    return res.cfg
  }
}

//================================<  Worker Code  >=============================

interface MessageEvent {
  data: ProcessReq
}

const workerFn: TWorkerFn = () => {
  onmessage = async e => {
    try {
      const { cfg, constants } = e.data

      // Create outfit base config
      const [img, enhancedImg] = await Promise.all([
        loadImg(cfg.base.imgSrc, constants.BASE_URL),
        loadImg(cfg.base.enhancedImgSrc, constants.BASE_URL),
      ])
      const base: TProcessedOutfitBaseConfig = {
        width: cfg.base.width,
        height: cfg.base.height,
        img,
        enhancedImg,
      }

      // Create outfit group wise layers
      const groupWiseLayers: Record<string, TProcessedOutfitLayerConfig[]> = {}
      for (const groupKey in cfg.groupWiseLayers) {
        const layerCfgs = cfg.groupWiseLayers[groupKey]
        groupWiseLayers[groupKey] = await Promise.all(
          layerCfgs.map(
            async (layerCfg): Promise<TProcessedOutfitLayerConfig> => {
              const maskImg = await loadImg(
                layerCfg.maskImgSrc,
                constants.BASE_URL
              )
              const modifiedMask = await processMask(maskImg)
              const textureTilingOptions: TProcessedTextureTilingOptions = {
                ...constants.DEFAULT_TEXTURE_TILING_OPTIONS,
                ...layerCfg.textureTilingOptions,
              }
              return {
                maskImg: modifiedMask.img,
                boundingBox: modifiedMask.boundingBox,
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

      const data: ProcessRes = {
        cfg: processedOutfitCfg,
      }

      const transfer = [data.cfg.base.img, data.cfg.base.enhancedImg]
      for (let groupKey in data.cfg.groupWiseLayers)
        for (let layer of data.cfg.groupWiseLayers[groupKey])
          transfer.push(layer.maskImg)

      postMessage(data, { transfer })
    } catch (e) {
      setTimeout(() => {
        throw e
      })
    }
  }

  async function loadImg(src: string, baseURL?: string) {
    try {
      let blob: Blob
      if (isSrcDataURL(src)) blob = dataURLToBlob(src)
      else blob = await imgURLToBlob(src, baseURL)
      return createImageBitmap(blob)
    } catch (e) {
      throw new Error(`Failed to load image: ${src}. ${e}`)
    }
  }

  function isSrcDataURL(url: string) {
    return url.startsWith('data:')
  }

  function dataURLToBlob(dataURL) {
    const dataURLParts = dataURL.split(',')
    const mime = dataURLParts[0].match(/:(.*?);/)[1]
    const base64Str = atob(dataURLParts[1])
    let n = base64Str.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = base64Str.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  async function imgURLToBlob(src: string, baseURL?: string) {
    const url = new URL(src, baseURL).href
    const response = await fetch(url)
    return await response.blob()
  }

  function createOffscreenCanvas(w = 0, h = 0) {
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
      desynchronized: true,
    })
    return { canvas, ctx }
  }

  async function processMask(
    img: ImageBitmap
  ): Promise<{ img: ImageBitmap; boundingBox: TMaskBoundingBox }> {
    const { width, height } = img
    const { canvas, ctx } = createOffscreenCanvas(width, height)

    let x1 = width,
      x2 = 0,
      y1 = height,
      y2 = 0
    ctx.drawImage(img, 0, 0)
    let maskImgData = ctx.getImageData(0, 0, width, height)
    let maskImgBuffer = new Uint32Array(maskImgData.data.buffer)
    for (let i = 0; i < maskImgBuffer.length; i++) {
      const maskedPixel = (maskImgBuffer[i] << 8) & 0xff000000
      maskImgBuffer[i] = maskedPixel
      if (maskedPixel !== 0) {
        let x = i % width
        let y = Math.floor(i / width)
        x1 = Math.min(x, x1)
        x2 = Math.max(x, x2)
        y1 = Math.min(y, y1)
        y2 = Math.max(y, y2)
      }
    }
    ctx.putImageData(maskImgData, 0, 0)

    return {
      img: await createImageBitmap(canvas),
      boundingBox: {
        x1,
        x2,
        y1,
        y2,
      },
    }
  }
}
