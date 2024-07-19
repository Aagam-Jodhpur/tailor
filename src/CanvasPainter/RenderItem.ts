import type {
  TCanvasImage,
  TCtx,
  TProcessedTransitionOptions,
} from '../common/types'

export class TransitionCompleteEvent extends Event {
  static get name() {
    return 'transitionComplete'
  }
  constructor() {
    super(TransitionCompleteEvent.name)
  }
}

export class RenderItem extends EventTarget {
  currImg: TCanvasImage | null
  prevImg: TCanvasImage | null
  transitionProgress: number
  transitionOptions: TProcessedTransitionOptions
  lastFrameDrawn: boolean

  constructor(
    img: TCanvasImage,
    transitionOptions: TProcessedTransitionOptions
  ) {
    super()
    this.currImg = img
    this.prevImg = null
    this.transitionProgress = 0
    this.transitionOptions = transitionOptions
    this.lastFrameDrawn = false
  }

  transitionComplete() {
    return this.transitionProgress >= 1
  }

  stepTransition() {
    if (this.transitionProgress < 1)
      this.transitionProgress += this.transitionOptions.speed
    if (this.transitionProgress > 1) this.transitionProgress = 1
  }

  triggerImgChange(img: TCanvasImage) {
    this.prevImg = this.currImg
    this.currImg = img
    this.transitionProgress = 0
    this.lastFrameDrawn = false
  }

  triggerExit() {
    this.prevImg = this.currImg
    this.currImg = null
    this.transitionProgress = 0
    this.lastFrameDrawn = false
  }

  loop(ctx: TCtx, w: number, h: number) {
    if (this.transitionComplete()) {
      // Draw the last frame of entry transitionOptions
      if (this.currImg) ctx.drawImage(this.currImg, 0, 0, w, h)

      // Do the following actions only once
      if (!this.lastFrameDrawn) {
        this.lastFrameDrawn = true
        // Since the transition is complete, delete the previous img
        if (this.prevImg) this.prevImg = null
        this.dispatchEvent(new TransitionCompleteEvent())
      }
    } else {
      this.stepTransition()
      const timedProgress = this.transitionOptions.timingFn(
        this.transitionProgress
      )
      // Draw the item in a transitioning state
      ctx.save()
      this.transitionOptions.entry(ctx, w, h, this.currImg, timedProgress)
      ctx.restore()
      ctx.save()
      this.transitionOptions.exit(ctx, w, h, this.prevImg, timedProgress)
      ctx.restore()
    }
  }
}
