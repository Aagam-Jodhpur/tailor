import { TailorOutfitPreview } from './TailorOutfitPreview'
import { TTimingFnName, TTransitionName } from './common/constants'
import { TError } from './TError'
import type {
  TOutfitConfig,
  TTextureConfig,
  TOutfitBaseConfig,
  TOutfitLayerConfig,
  TTextureTilingOptions,
  TPreviewOptions,
  TTransitionOptions,
} from './common/types'

export async function createOutfitPreview(
  outfitCfg: TOutfitConfig,
  rootEl: HTMLElement,
  previewOptions?: TPreviewOptions
) {
  const outfitPreview = new TailorOutfitPreview(previewOptions)
  await outfitPreview.init(outfitCfg, rootEl)
  return outfitPreview
}

export { TailorOutfitPreview, TError }

// Exporting enums
export { TTransitionName, TTimingFnName }

// Exporting all public types
export type {
  TOutfitConfig,
  TTextureConfig,
  TOutfitBaseConfig,
  TOutfitLayerConfig,
  TTextureTilingOptions,
  TPreviewOptions,
  TTransitionOptions,
}
