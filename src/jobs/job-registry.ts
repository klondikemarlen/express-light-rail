import type { BaseJob } from "@/base-job/index.js"

type JobConstructor<TArguments extends unknown[], TResult> = {
  new (...args: TArguments): BaseJob<TResult>
  readonly name: string
  readonly jobName?: string
}

export type JobRegistrationOptions<TArguments extends unknown[]> = {
  aliases?: readonly string[]
  deserialize: (...args: unknown[]) => TArguments | Promise<TArguments>
}

type RegisteredJob = {
  name: string
  perform: (args: unknown[]) => Promise<unknown>
}

export class JobRegistry {
  private readonly registrations = new Map<string, RegisteredJob>()

  register<TArguments extends unknown[], TResult>(
    jobClass: JobConstructor<TArguments, TResult>,
    options: JobRegistrationOptions<TArguments>
  ): void {
    const name = jobClass.jobName ?? jobClass.name
    const names = [name, ...(options.aliases ?? [])]

    for (const registeredName of names) {
      if (this.registrations.has(registeredName)) {
        throw new Error(`Job identity is already registered: ${registeredName}`)
      }
    }

    const registration: RegisteredJob = {
      name,
      async perform(args) {
        const deserializedArguments = await options.deserialize(...args)
        const instance = new jobClass(...deserializedArguments)
        return instance.perform()
      },
    }

    for (const registeredName of names) {
      this.registrations.set(registeredName, registration)
    }
  }

  resolveName(name: string): string {
    return this.registrationFor(name).name
  }

  async perform(name: string, args: unknown[]): Promise<unknown> {
    return this.registrationFor(name).perform(args)
  }

  private registrationFor(name: string): RegisteredJob {
    const registration = this.registrations.get(name)
    if (registration === undefined) {
      throw new Error(`Job identity is not registered: ${name}`)
    }

    return registration
  }
}
