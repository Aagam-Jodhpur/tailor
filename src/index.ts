import { TailorOutfitPreview } from './TailorOutfitPreview'
import type {
  TOutfitConfig,
  TTextureConfig,
  TOutfitBaseConfig,
  TOutfitLayerConfig,
  TTextureTilingOptions,
  TPreviewOptions,
} from './types'

export async function createOutfitPreview(
  outfitCfg: TOutfitConfig,
  rootEl: HTMLElement
) {
  const outfitPreview = new TailorOutfitPreview()
  await outfitPreview.init(outfitCfg, rootEl)
  return outfitPreview
}

// Exporting all public types
export type {
  TailorOutfitPreview,
  TOutfitConfig,
  TTextureConfig,
  TOutfitBaseConfig,
  TOutfitLayerConfig,
  TTextureTilingOptions,
  TPreviewOptions,
}
