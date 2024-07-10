import { OutfitPreview } from './OutfitPreview'
import type {
  OutfitConfig,
  OutfitGroupConfig,
  OutfitTextureConfig,
  OutfitBaseConfig,
  OutfitLayerConfig,
  TextureTilingOptions,
  PreviewOptions,
} from './types'

export async function createOutfitPreview(
  outfitCfg: OutfitConfig,
  rootEl: HTMLElement
) {
  const outfitPreview = new OutfitPreview(outfitCfg, rootEl)
  await outfitPreview.init()
  return outfitPreview
}

// Exporting all public types
export type {
  OutfitPreview,
  OutfitConfig,
  OutfitGroupConfig,
  OutfitTextureConfig,
  OutfitBaseConfig,
  OutfitLayerConfig,
  TextureTilingOptions,
  PreviewOptions,
}
