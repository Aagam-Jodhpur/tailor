import { OutfitCanvasRenderer } from './OutfitCanvasRenderer'

export async function createOutfitCanvasRenderer(outfitCfg, rootElSelector) {
  const outfitCanvasRenderer = new OutfitCanvasRenderer(
    outfitCfg,
    rootElSelector
  )
  await outfitCanvasRenderer.init()
  return outfitCanvasRenderer
}
