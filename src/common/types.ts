//===============================<  Internal Types  >===========================

import { TTimingFnName, TTransitionName } from './constants'

export type TCanvas = HTMLCanvasElement | OffscreenCanvas

export type TCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export type TCanvasImage =
  | HTMLImageElement
  | HTMLCanvasElement
  | OffscreenCanvas
  | ImageBitmap

export interface TProcessedOutfitConfig {
  base: TProcessedOutfitBaseConfig
  groupWiseLayers: Record<string, TProcessedOutfitLayerConfig[]>
}

export interface TProcessedOutfitBaseConfig {
  width: number
  height: number
  img: ImageBitmap
  enhancedImg: ImageBitmap
}

export interface TProcessedOutfitLayerConfig {
  maskImg: ImageBitmap
  textureTilingOptions: TProcessedTextureTilingOptions
}

export type TProcessedTextureTilingOptions = Required<TTextureTilingOptions>

export interface TProcessedTextureConfig {
  img: ImageBitmap
  scale: number
}

export interface TProcessedTransitionOptions {
  entry: TTransition
  exit: TTransition
  timingFn: TTimingFn
  speed: number
}

export type TProcessedPreviewOptions = {
  transitionOptions: TProcessedTransitionOptions
}

export type TTransition = (
  ctx: TCtx,
  w: number,
  h: number,
  img: TCanvasImage | null,
  progress: number
) => void

export type TTimingFn = (x: number) => number

//================================<  Public Types  >============================

export interface TOutfitConfig {
  base: TOutfitBaseConfig
  groupWiseLayers: Record<string, TOutfitLayerConfig[]>
}

export interface TOutfitBaseConfig {
  width: number
  height: number
  imgSrc: string
  enhancedImgSrc: string
}

export interface TOutfitLayerConfig {
  maskImgSrc: string
  textureTilingOptions?: TTextureTilingOptions
}

export interface TTextureTilingOptions {
  scale?: number
  angle?: number
}

export interface TTextureConfig {
  imgSrc: string
  scale?: number
}

export interface TPreviewOptions {
  transitionOptions?: TTransitionOptions
}

export interface TTransitionOptions {
  entry?: TTransitionName
  exit?: TTransitionName
  timingFn?: TTimingFnName
  speed?: number
}
