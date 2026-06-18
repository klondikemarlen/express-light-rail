export type BaseApiErrorMeta = Record<string, unknown>

export type BaseApiErrorBody = {
  error: {
    code: string
    msg: string
    meta: BaseApiErrorMeta
  }
}

export class BaseApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public meta: BaseApiErrorMeta = {},
    public statusCode: number = 500
  ) {
    super(message)
    this.name = this.constructor.name
  }

  toJSON(): BaseApiErrorBody {
    return {
      error: {
        code: this.code,
        msg: this.message,
        meta: this.meta,
      },
    }
  }
}
