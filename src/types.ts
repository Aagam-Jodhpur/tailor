export type Canvas = HTMLCanvasElement | OffscreenCanvas
export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
export type CanvasImage = HTMLImageElement | HTMLCanvasElement | OffscreenCanvas

export interface OutfitConfig {
  name: string
  base: OutfitBaseConfig
  groups: Record<string, OutfitGroupConfig>
}

export interface OutfitBaseConfig {
  width: number
  height: number
  img: string
  enhancedImg: string
}

export interface OutfitGroupConfig {
  name: string
  textures: Record<string, OutfitTextureConfig>
  layers: Record<string, OutfitLayerConfig>
}

export interface OutfitTextureConfig {
  name: string
  src: string
}

export interface OutfitLayerConfig {
  name: string
  maskSrc: string
  textureTilingOptions?: TextureTilingOptions
}

export interface TextureTilingOptions {
  scale?: number
  angle?: number
}

export interface PreviewOptions {
  textureScale: number
}
