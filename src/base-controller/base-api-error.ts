export class BaseAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = "BaseAPIError"
  }
}

export default BaseAPIError
