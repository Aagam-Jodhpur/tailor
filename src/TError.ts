export class TError extends Error {
  name: string = 'Error'
  cause: Error | null

  constructor(msg: string, cause?: Error) {
    super(msg)
    this.cause = cause ?? null
  }

  addCause(cause: Error) {
    this.cause = cause
  }

  removeCause() {
    this.cause = null
  }

  log() {
    console.error(`[Tailor]: ${this.name} - ${this.message}`)
    if (!this.cause) return
    if (this.cause instanceof TError) this.cause.log()
    else
      console.error(
        `[Tailor]: Unknown error - ${this.cause.message ?? 'No error message'}`
      )
  }

  print() {
    let msg = `${this.message}.`
    if (this.cause && this.cause instanceof TError)
      msg += ` ${this.cause.message}.`
    return msg
  }
}
