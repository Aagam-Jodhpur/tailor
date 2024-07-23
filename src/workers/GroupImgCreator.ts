import { WorkerExecutor } from './WorkerExecutor'
import type {
  TCtx,
  TMaskBoundingBox,
  TProcessedOutfitBaseConfig,
  TProcessedOutfitLayerConfig,
  TProcessedTextureConfig,
  TProcessedTextureTilingOptions,
  TWorkerFn,
} from '../common/types'

//==============================<  Worker Executor  >===========================

interface TransferReq {
  type: 'transfer'
  baseCfg: TProcessedOutfitBaseConfig
  layerCfgs: TProcessedOutfitLayerConfig[]
}

interface CreateReq {
  type: 'create'
  textureCfg: TProcessedTextureConfig
}

type CreateRes = ImageBitmap

export class GroupImgCreator extends WorkerExecutor {
  constructor() {
    super('GroupImgCreator', workerFn)
  }

  async transferCfg(
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfgs: TProcessedOutfitLayerConfig[]
  ) {
    const transfer = []
    for (let layer of layerCfgs) transfer.push(layer.maskImg)

    await this.safelySendRequestToWorker<TransferReq, void>(
      {
        type: 'transfer',
        baseCfg,
        layerCfgs,
      },
      transfer
    )
  }

  async createGroupImg(textureCfg: TProcessedTextureConfig) {
    const transfer = [textureCfg.img]
    const res = await this.safelySendRequestToWorker<CreateReq, CreateRes>(
      {
        type: 'create',
        textureCfg,
      },
      transfer
    )
    return res
  }
}

//================================<  Worker Code  >=============================

interface MessageEvent {
  data: TransferReq | CreateReq
}

const workerFn: TWorkerFn = () => {
  let baseCfg: TProcessedOutfitBaseConfig | null = null
  let layerCfgs: TProcessedOutfitLayerConfig[] | null = null

  onmessage = async e => {
    if (e.data.type === 'transfer') {
      baseCfg = e.data.baseCfg
      layerCfgs = e.data.layerCfgs
      postMessage(true)
    } else if (e.data.type === 'create') {
      try {
        const { textureCfg } = e.data
        const res = await createGroupImg(textureCfg)
        const transfer = [res]
        postMessage(res, { transfer })
      } catch (e) {
        setTimeout(() => {
          throw e
        })
      }
    }
  }

  async function createGroupImg(textureCfg: TProcessedTextureConfig) {
    const ready = Boolean(baseCfg && layerCfgs)
    if (!ready)
      throw new Error(
        'Configs are not available in worker. Transfer the configs first.'
      )

    // Create each layer
    const layerImgs = await Promise.all(
      layerCfgs!.map(
        async layerCfg => await createLayerImg(baseCfg!, layerCfg, textureCfg)
      )
    )

    const w = baseCfg!.width
    const h = baseCfg!.height

    // Create a temporary off-screen canvas for the group
    const { canvas, ctx } = createOffscreenCanvas(w, h)

    // Compose all layers
    layerImgs.forEach(layerImg => {
      ctx.drawImage(layerImg, 0, 0, w, h)
    })

    return await createImageBitmap(canvas)
  }

  async function createLayerImg(
    baseCfg: TProcessedOutfitBaseConfig,
    layerCfg: TProcessedOutfitLayerConfig,
    textureCfg: TProcessedTextureConfig
  ) {
    const w = baseCfg.width
    const h = baseCfg.height

    // Create a temporary off-screen canvas for this layer
    const { canvas, ctx } = createOffscreenCanvas(w, h)

    // Draw the enhanced base image
    ctx.drawImage(baseCfg.enhancedImg, 0, 0, w, h)
    ctx.globalCompositeOperation = 'multiply'

    // Tiling the texture
    tileTexture(
      ctx,
      w,
      h,
      textureCfg.img,
      layerCfg.boundingBox,
      layerCfg.textureTilingOptions,
      textureCfg.scale
    )

    // Applying a mask
    applyMask(ctx, layerCfg.maskImg, 0, 0, w, h)

    return await createImageBitmap(canvas)
  }

  function applyMask(
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

  function tileTexture(
    ctx: TCtx,
    w: number,
    h: number,
    textureImg: ImageBitmap,
    boundingBox: TMaskBoundingBox,
    tilingOptions: TProcessedTextureTilingOptions,
    textureScale: number
  ) {
    const tW = textureImg.width
    const tH = textureImg.height
    let tS = tilingOptions.scale * textureScale
    const tA = (Math.PI * tilingOptions.angle) / 180
    const { x1, y1, x2, y2 } = boundingBox
    const tStartX = x1 / tS
    const tEndX = x2 / tS
    const tStartY = y1 / tS
    const tEndY = y2 / tS
    const tMidX = (tStartX - tEndX) / 2
    const tMidY = (tStartY - tEndY) / 2

    ctx.save()
    ctx.scale(tS, tS)
    ctx.translate(tMidX, tMidY)
    ctx.rotate(tA)
    ctx.translate(-tMidX, -tMidY)
    for (let y = tStartY; y < tEndY; y += tH) {
      for (let x = tStartX; x < tEndX; x += tW) {
        ctx.drawImage(textureImg, x, y, tW, tH)
      }
    }
    ctx.restore()
  }

  function createOffscreenCanvas(w = 0, h = 0) {
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
      desynchronized: true,
    })
    return { canvas, ctx }
  }
}
