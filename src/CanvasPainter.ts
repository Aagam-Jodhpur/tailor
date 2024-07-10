import { createCanvas, maximiseWithinBounds } from './utils'
import type { CanvasImage } from './types'

interface RenderItem {
  img: CanvasImage
  transition: boolean
  transitionCounter: number
}

export class CanvasPainter {
  private readonly rootEl: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly renderQueue: RenderItem[]
  readonly w: number
  readonly h: number

  constructor(baseW: number, baseH: number, rootEl: HTMLElement) {
    this.rootEl = rootEl
    this.w = baseW
    this.h = baseH

    // Set up the canvas
    const { canvas, ctx } = createCanvas(baseW, baseH)
    this.canvas = canvas
    this.ctx = ctx

    // Size the canvas appropriately
    this.#resizeCanvas()

    // Resize handler
    window.addEventListener('resize', () => {
      this.#resizeCanvas()
    })

    // Add the canvas to the DOM
    this.rootEl.append(canvas)

    // Initialize an empty render queue
    this.renderQueue = []

    // Start the loop
    this.#initLoop()
  }

  #resizeCanvas() {
    const { w, h } = this
    const { clientWidth, clientHeight } = this.rootEl
    const dims = maximiseWithinBounds(w, h, clientWidth, clientHeight)
    this.canvas.style.width = `${dims.w}px`
    this.canvas.style.height = `${dims.h}px`
  }

  #initLoop() {
    window.requestAnimationFrame(() => this.#loop())
  }

  #loop() {
    // Loop again
    this.#initLoop()

    // If there are items in the render queue
    if (this.renderQueue.length > 0) {
      const renderItem = this.renderQueue[0]

      // If a transition is not needed for this item
      if (!renderItem.transition) {
        // Draw it
        const { w, h } = this
        this.ctx.drawImage(renderItem.img, 0, 0, w, h)
        // Remove it from the queue
        this.renderQueue.shift()

        return
      }

      // If transition is complete, remove this item from queue
      if (renderItem.transitionCounter >= 1) this.renderQueue.shift()
      else {
        // Otherwise, step through its animation
        renderItem.transitionCounter += 0.008

        // Compute properties from transitionCounter
        const { w, h } = this
        const opacity = renderItem.transitionCounter
        const intercept = 2 * h * renderItem.transitionCounter * 2

        // Then, draw the item
        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.lineTo(0, intercept)
        this.ctx.lineTo(intercept, 0)
        this.ctx.lineTo(0, 0)
        this.ctx.clip()
        this.ctx.globalAlpha = opacity
        this.ctx.drawImage(renderItem.img, 0, 0, w, h)
        this.ctx.restore()
      }
    }
  }

  blockTillRenderComplete() {
    return new Promise<void>(resolve => {
      const id = setInterval(() => {
        if (this.renderQueue.length === 0) {
          clearInterval(id)
          resolve()
        }
      }, 10)
    })
  }

  addToRenderQueue(img: CanvasImage, transition = true) {
    const renderItem: RenderItem = {
      img,
      transition,
      transitionCounter: 0,
    }
    this.renderQueue.push(renderItem)
  }
}
