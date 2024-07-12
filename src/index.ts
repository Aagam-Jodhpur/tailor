import { TailorOutfitPreview } from './TailorOutfitPreview'
import type {
  TOutfitConfig,
  TOutfitTextureConfig,
  TOutfitBaseConfig,
  TOutfitLayerConfig,
  TTextureTilingOptions,
  TPreviewOptions,
} from './types'

export async function createOutfitPreview(
  outfitCfg: TOutfitConfig,
  rootEl: HTMLElement
) {
  const outfitPreview = new TailorOutfitPreview(outfitCfg, rootEl)
  await outfitPreview.init()
  return outfitPreview
}

// Exporting all public types
export type {
  TailorOutfitPreview,
  TOutfitConfig,
  TOutfitTextureConfig,
  TOutfitBaseConfig,
  TOutfitLayerConfig,
  TTextureTilingOptions,
  TPreviewOptions,
}
