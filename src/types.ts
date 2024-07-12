export type TCanvas = HTMLCanvasElement | OffscreenCanvas

export type TCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export type TCanvasImage =
  | HTMLImageElement
  | HTMLCanvasElement
  | OffscreenCanvas

export interface TOutfitConfig {
  base: TOutfitBaseConfig
  groupWiseLayers: Record<string, TOutfitLayerConfig[]>
}

export interface TOutfitBaseConfig {
  width: number
  height: number
  img: string
  enhancedImg: string
}

export interface TOutfitLayerConfig {
  maskSrc: string
  textureTilingOptions?: TTextureTilingOptions
}

export interface TTextureTilingOptions {
  scale?: number
  angle?: number
}

export interface TOutfitTextureConfig {
  src: string
}

export interface TPreviewOptions {
  textureScale: number
}
