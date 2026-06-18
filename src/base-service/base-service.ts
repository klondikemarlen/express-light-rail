export abstract class BaseService<TResult = unknown> {
  static perform<TResult, TConstructorArgs extends unknown[]>(
    this: new (...args: TConstructorArgs) => BaseService<TResult>,
    ...args: TConstructorArgs
  ): TResult {
    const instance = new this(...args)
    return instance.perform()
  }

  abstract perform(): TResult
}
