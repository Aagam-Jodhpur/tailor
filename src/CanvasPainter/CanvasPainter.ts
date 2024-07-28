import { TError } from '../TError'
import { RenderItem, TransitionCompleteEvent } from './RenderItem'
import { createCanvas, maximiseWithinBounds } from '../common/utils'
import type {
  TCanvasImage,
  TCtx,
  TProcessedTransitionOptions,
} from '../common/types'

export class CanvasPainter {
  private terminated: boolean
  private readonly rootEl: HTMLElement
  private readonly rootElResizeObserver: ResizeObserver
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: TCtx
  private readonly renderMap: Map<string, RenderItem>
  readonly w: number
  readonly h: number

  constructor(width: number, height: number, rootEl: HTMLElement) {
    this.terminated = false
    this.rootEl = rootEl
    this.w = width
    this.h = height

    // Set up the canvas
    const { canvas, ctx } = createCanvas(width, height)
    this.canvas = canvas
    this.ctx = ctx

    // Resize handler
    this.rootElResizeObserver = new ResizeObserver(_ => {
      this.resizeCanvas()
    })
    this.rootElResizeObserver.observe(this.rootEl)

    // Add the canvas to the DOM
    this.rootEl.append(canvas)

    // Initialize an empty render queue
    this.renderMap = new Map()

    // Start the loop
    this.#initLoop()
  }

  private resizeCanvas() {
    if (this.terminated) return
    const { w, h } = this
    const { clientWidth, clientHeight } = this.rootEl
    const dims = maximiseWithinBounds(w, h, clientWidth, clientHeight)
    this.canvas.style.width = `${dims.w}px`
    this.canvas.style.height = `${dims.h}px`
  }

  #initLoop() {
    if (!this.terminated) window.requestAnimationFrame(() => this.#loop())
  }

  #loop() {
    // Loop again
    this.#initLoop()

    const { w, h } = this

    // Clear the canvas
    this.ctx.clearRect(0, 0, w, h)

    // Draw each render item
    this.renderMap.forEach(item => item.loop(this.ctx, w, h))
  }

  async addRenderItem(
    key: string,
    img: TCanvasImage,
    transitionOptions: TProcessedTransitionOptions
  ) {
    if (this.terminated) return
    await new Promise((resolve, reject) => {
      const itemExists = this.renderMap.has(key)
      const item =
        this.renderMap.get(key) ?? new RenderItem(img, transitionOptions)

      if (itemExists && !item.transitionComplete())
        reject(
          new TError(
            `CanvasPainter is still transitioning render item with key ${key}. Wait for the transition to finish.`
          )
        )

      item.addEventListener(TransitionCompleteEvent.name, _ => resolve(), {
        once: true,
      })
      if (itemExists) item.triggerImgChange(img)
      else this.renderMap.set(key, item)
    })
  }

  async removeRenderItem(key: string) {
    if (this.terminated) return
    await new Promise((resolve, reject) => {
      const item = this.renderMap.get(key)
      if (item) {
        item.addEventListener(
          TransitionCompleteEvent.name,
          _ => {
            this.renderMap.delete(key)
            resolve()
          },
          {
            once: true,
          }
        )
        item.triggerExit()
      } else {
        reject(
          new TError(
            `CanvasPainter does not have a render item with key ${key}`
          )
        )
      }
    })
  }

  destroy() {
    this.canvas.remove()
    this.rootElResizeObserver.disconnect()
    this.terminated = true
  }
}
