import { TError } from '../TError'
import { TWorkerFn } from '../common/types'

export class WorkerExecutor {
  name: string
  protected busy: boolean
  private readonly workerUrl: string
  protected worker: Worker

  constructor(name: string, workerFn: TWorkerFn) {
    this.name = name
    this.busy = false

    try {
      this.workerUrl = this.createWorkerURLFromFn(workerFn)
      this.worker = new Worker(this.workerUrl)
    } catch (e) {
      if (e instanceof Error)
        throw new TWorkerExecutorConstructionError(this.name, e)
      else throw e
    }
  }

  private createWorkerURLFromFn(fn: TWorkerFn) {
    try {
      const srcStr = `(${fn.toString()})()`
      const srcBlob = new Blob([srcStr], { type: 'application/javascript' })
      const srcURL = URL.createObjectURL(srcBlob)
      return srcURL
    } catch (e) {
      if (e instanceof Error) throw new TWorkerURLCreationError(fn, e)
      else throw e
    }
  }

  protected async safelySendRequestToWorker<Req, Res>(
    data: Req,
    transfer?: Transferable[]
  ) {
    if (this.busy) throw new TError(`The worker is currently busy`)

    this.busy = true
    return new Promise<Res>((resolve, reject) => {
      this.worker.addEventListener(
        'message',
        e => {
          const data = e.data as Res
          this.busy = false
          resolve(data)
        },
        { once: true }
      )

      this.worker.addEventListener(
        'error',
        e => {
          this.busy = false
          reject(new TWorkerError(this.name, e as Error))
        },
        { once: true }
      )

      this.worker.postMessage(data, { transfer })
    })
  }

  destroy() {
    this.worker.terminate()
    URL.revokeObjectURL(this.workerUrl)
    this.busy = true
  }
}

export class TWorkerExecutorConstructionError extends TError {
  constructor(workerName: string, cause?: Error) {
    const msg = `Worker executor for "${workerName}" could not be constructed`
    super(msg, cause)
    this.name = 'WorkerExecutorConstructionError'
  }
}

export class TWorkerURLCreationError extends TError {
  constructor(fn: TWorkerFn, err?: Error) {
    let msg = `Could not create worker URL function ${fn.name}.`
    super(msg, err)
    this.name = 'WorkerURLCreationError'
  }
}

export class TWorkerError extends TError {
  constructor(workerName: string, cause?: Error) {
    const msg = `An error occurred in the worker "${workerName}"`
    super(msg, cause)
    this.name = 'WorkerError'
  }
}
