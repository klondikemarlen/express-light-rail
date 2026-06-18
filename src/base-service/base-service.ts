export abstract class BaseService {
  static perform<TService extends BaseService, TConstructorArgs extends unknown[]>(
    this: new (...args: TConstructorArgs) => TService,
    ...args: TConstructorArgs
  ): ReturnType<TService["perform"]> {
    const instance = new this(...args)
    return instance.perform() as ReturnType<TService["perform"]>
  }

  abstract perform(): unknown
}
