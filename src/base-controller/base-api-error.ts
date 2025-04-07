export class BaseApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export default BaseApiError
