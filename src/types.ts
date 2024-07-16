//===============================<  Internal Types  >===========================

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
}

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
}

export interface TPreviewOptions {
  textureScale: number
}
