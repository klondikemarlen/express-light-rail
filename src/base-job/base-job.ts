import { logger } from "@/utils/logger.js"

export type JobPayload = {
  queueName: string
  jobName: string
  jobData: unknown[]
  jobFilename?: string
}

export type JobBackend<TEnqueuedJob = unknown> = {
  enqueue(payload: JobPayload): Promise<TEnqueuedJob>
  isEnqueued?: (jobName: string) => Promise<boolean>
}

export type JobArgumentSerializer = {
  serialize: (...args: unknown[]) => unknown[] | Promise<unknown[]>
}

export type BaseJobConfiguration = {
  backend?: JobBackend
  argumentSerializer?: JobArgumentSerializer
}

export class MissingJobBackendError extends Error {
  constructor() {
    super("BaseJob backend is not configured")
    this.name = this.constructor.name
  }
}

type BaseJobClass<TConstructorArgs extends unknown[], TResult> = (new (
  ...args: TConstructorArgs
) => BaseJob<TResult>) & {
  name: string
  queueName: string
}

const DEFAULT_ARGUMENT_SERIALIZER: JobArgumentSerializer = {
  serialize: (...args: unknown[]) => args,
}

const backendByJobClass = new WeakMap<object, JobBackend>()
const argumentSerializerByJobClass = new WeakMap<object, JobArgumentSerializer>()

function configuredValue<TValue>(
  jobClass: object,
  valuesByJobClass: WeakMap<object, TValue>,
  defaultValue?: TValue
): TValue | undefined {
  let current: object | null = jobClass

  while (current !== null) {
    const configured = valuesByJobClass.get(current)
    if (configured !== undefined) {
      return configured
    }

    current = Object.getPrototypeOf(current) as object | null
  }

  return defaultValue
}

function backendFor(jobClass: object): JobBackend {
  const backend = configuredValue(jobClass, backendByJobClass)
  if (backend === undefined) {
    throw new MissingJobBackendError()
  }

  return backend
}

function argumentSerializerFor(jobClass: object): JobArgumentSerializer {
  return (
    configuredValue(
      jobClass,
      argumentSerializerByJobClass,
      DEFAULT_ARGUMENT_SERIALIZER
    ) ?? DEFAULT_ARGUMENT_SERIALIZER
  )
}

export class BaseJob<TResult = unknown> {
  static queueName = "default"

  protected readonly jobFilename?: string

  constructor(jobFilename?: string) {
    this.jobFilename = jobFilename
  }

  static configure(this: object, configuration: BaseJobConfiguration): void {
    if (configuration.backend !== undefined) {
      backendByJobClass.set(this, configuration.backend)
    }

    if (configuration.argumentSerializer !== undefined) {
      argumentSerializerByJobClass.set(this, configuration.argumentSerializer)
    }
  }

  static perform<TResult, TConstructorArgs extends unknown[]>(
    this: BaseJobClass<TConstructorArgs, TResult>,
    ...args: TConstructorArgs
  ): TResult {
    const instance = new this(...args)
    logger.debug(`Performing job: ${this.name}`)
    return instance.perform()
  }

  static performNow<TResult, TConstructorArgs extends unknown[]>(
    this: BaseJobClass<TConstructorArgs, TResult>,
    ...args: TConstructorArgs
  ): TResult {
    const instance = new this(...args)
    logger.debug(`Performing job: ${this.name}`)
    return instance.perform()
  }

  static async performLater<TConstructorArgs extends unknown[]>(
    this: BaseJobClass<TConstructorArgs, unknown>,
    ...args: TConstructorArgs
  ): Promise<unknown> {
    const backend = backendFor(this)
    const instance = new this(...args)
    const serializedArguments = await argumentSerializerFor(this).serialize(...args)

    logger.debug(`Enqueuing job: ${this.name}`)
    return backend.enqueue({
      queueName: this.queueName,
      jobName: this.name,
      jobData: serializedArguments,
      jobFilename: instance.jobFilename,
    })
  }

  static async isJobEnqueued<TConstructorArgs extends unknown[]>(
    this: BaseJobClass<TConstructorArgs, unknown>,
    jobName: string = this.name
  ): Promise<boolean> {
    const backend = backendFor(this)

    if (backend.isEnqueued === undefined) {
      throw new Error("BaseJob backend does not support isEnqueued")
    }

    return backend.isEnqueued(jobName)
  }

  static queueAs<TJobClass extends object>(
    this: TJobClass,
    queueName: string
  ): TJobClass {
    const queuedJobClass = new Proxy(this, {
      get(target, property, receiver) {
        if (property === "queueName") {
          return queueName
        }

        return Reflect.get(target, property, receiver)
      },
    })

    const backend = configuredValue(this, backendByJobClass)
    if (backend !== undefined) {
      backendByJobClass.set(queuedJobClass, backend)
    }

    const argumentSerializer = configuredValue(this, argumentSerializerByJobClass)
    if (argumentSerializer !== undefined) {
      argumentSerializerByJobClass.set(queuedJobClass, argumentSerializer)
    }

    return queuedJobClass
  }

  perform(): TResult {
    throw new Error("Not Implemented")
  }

}
