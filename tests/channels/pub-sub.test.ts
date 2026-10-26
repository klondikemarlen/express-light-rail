import { PubSub } from "@/channels/pub-sub.js"

type ChannelEvents = {
  recordChanged: [recordId: string, version: number]
  stockLow: [productCode: string]
}

type PrototypeNamedEvents = {
  __proto__: [value: string]
  constructor: [value: string]
  toString: [value: string]
}

describe("src/channels/pub-sub.ts", () => {
  describe("PubSub", () => {
    test("when publishing an event, delivers its typed tuple to subscribers", () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const received: string[] = []
      pubSub.subscribe("recordChanged", (recordId, version) => {
        received.push(`${recordId}:${version}`)
      })

      // Act
      pubSub.publish("recordChanged", "record-17", 3)

      // Assert
      expect(received).toEqual(["record-17:3"])
    })

    test("when event names match inherited object properties, keeps buses independent", () => {
      // Arrange
      const firstPubSub = new PubSub<PrototypeNamedEvents>()
      const secondPubSub = new PubSub<PrototypeNamedEvents>()
      const firstDeliveries: string[] = []
      const secondDeliveries: string[] = []
      firstPubSub.subscribe("__proto__", (value) => {
        firstDeliveries.push(`__proto__:${value}`)
      })
      firstPubSub.subscribe("constructor", (value) => {
        firstDeliveries.push(`constructor:${value}`)
      })
      firstPubSub.subscribe("toString", (value) => {
        firstDeliveries.push(`toString:${value}`)
      })
      secondPubSub.subscribe("__proto__", (value) => {
        secondDeliveries.push(`__proto__:${value}`)
      })
      secondPubSub.subscribe("constructor", (value) => {
        secondDeliveries.push(`constructor:${value}`)
      })
      secondPubSub.subscribe("toString", (value) => {
        secondDeliveries.push(`toString:${value}`)
      })

      // Act
      firstPubSub.publish("__proto__", "first")
      firstPubSub.publish("constructor", "first")
      firstPubSub.publish("toString", "first")
      secondPubSub.publish("__proto__", "second")
      secondPubSub.publish("constructor", "second")
      secondPubSub.publish("toString", "second")

      // Assert
      expect(firstDeliveries).toEqual(["__proto__:first", "constructor:first", "toString:first"])
      expect(secondDeliveries).toEqual([
        "__proto__:second",
        "constructor:second",
        "toString:second",
      ])
    })

    test("when a listener and its recovery handler throw, other listeners still run", () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const listenerError = new Error("listener failed")
      const recoveryError = new Error("recovery failed")
      const deliveries: string[] = []
      pubSub.subscribe(
        "recordChanged",
        () => {
          throw listenerError
        },
        () => {
          throw recoveryError
        }
      )
      pubSub.subscribe("recordChanged", (recordId) => {
        deliveries.push(recordId)
      })

      // Act
      pubSub.publish("recordChanged", "record-18", 4)

      // Assert
      expect(deliveries).toEqual(["record-18"])
    })

    test("when a listener rejects asynchronously, routes failure to recovery and contains recovery errors", async () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const listenerError = new Error("asynchronous listener failed")
      const recoveryError = new Error("asynchronous recovery failed")
      const recoveries: unknown[] = []
      pubSub.subscribe(
        "stockLow",
        () => Promise.reject(listenerError),
        (error) => {
          recoveries.push(error)
          return Promise.reject(recoveryError)
        }
      )

      // Act
      pubSub.publish("stockLow", "product-code-42")
      await Promise.resolve()
      await Promise.resolve()

      // Assert
      expect(recoveries).toEqual([listenerError])
    })

    test("when duplicate listeners are removed, removes the newest registration one at a time", () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const deliveries: string[] = []
      const listener = (recordId: string) => {
        deliveries.push(recordId)
      }
      const firstSignal = pubSub.subscribe("recordChanged", listener)
      const secondSignal = pubSub.subscribe("recordChanged", listener)

      // Act
      pubSub.unsubscribe("recordChanged", listener)
      pubSub.publish("recordChanged", "record-19", 5)

      // Assert
      expect(secondSignal.aborted).toBe(true)
      expect(firstSignal.aborted).toBe(false)
      expect(deliveries).toEqual(["record-19"])

      // Act
      pubSub.unsubscribe("recordChanged", listener)
      pubSub.publish("recordChanged", "record-20", 6)

      // Assert
      expect(firstSignal.aborted).toBe(true)
      expect(deliveries).toEqual(["record-19"])
    })

    test("when unsubscribing repeatedly, leaves the subscription cancelled", () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const deliveries: string[] = []
      const listener = (recordId: string) => {
        deliveries.push(recordId)
      }
      const signal = pubSub.subscribe("recordChanged", listener)

      // Act
      pubSub.unsubscribe("recordChanged", listener)
      pubSub.unsubscribe("recordChanged", listener)
      pubSub.publish("recordChanged", "record-19", 5)

      // Assert
      expect(signal.aborted).toBe(true)
      expect(deliveries).toEqual([])
    })

    test("when a queued listener is cancelled during publishing, skips its dispatch", () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const deliveries: string[] = []
      const queuedListener = (recordId: string) => {
        deliveries.push(`queued:${recordId}`)
      }
      pubSub.subscribe("recordChanged", (recordId) => {
        deliveries.push(`current:${recordId}`)
        pubSub.unsubscribe("recordChanged", queuedListener)
      })
      const queuedSignal = pubSub.subscribe("recordChanged", queuedListener)

      // Act
      pubSub.publish("recordChanged", "record-21", 7)

      // Assert
      expect(queuedSignal.aborted).toBe(true)
      expect(deliveries).toEqual(["current:record-21"])
    })

    test("when a listener replaces the original tail during publishing, defers the replacement", () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const deliveries: string[] = []
      const tailListener = (recordId: string) => {
        deliveries.push(`tail:${recordId}`)
      }
      const replacementListener = (recordId: string) => {
        deliveries.push(`replacement:${recordId}`)
      }
      let replaceTail = true
      pubSub.subscribe("recordChanged", (recordId) => {
        deliveries.push(`first:${recordId}`)
        if (replaceTail) {
          replaceTail = false
          pubSub.unsubscribe("recordChanged", tailListener)
          pubSub.subscribe("recordChanged", replacementListener)
        }
      })
      pubSub.subscribe("recordChanged", (recordId) => {
        deliveries.push(`middle:${recordId}`)
      })
      const tailSignal = pubSub.subscribe("recordChanged", tailListener)

      // Act
      pubSub.publish("recordChanged", "record-22", 8)

      // Assert
      expect(tailSignal.aborted).toBe(true)
      expect(deliveries).toEqual(["first:record-22", "middle:record-22"])

      // Act
      pubSub.publish("recordChanged", "record-23", 9)

      // Assert
      expect(deliveries).toEqual([
        "first:record-22",
        "middle:record-22",
        "first:record-23",
        "middle:record-23",
        "replacement:record-23",
      ])
    })

    test("when unsubscribing, synchronously aborts and returns the native subscription signal", () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const deliveries: string[] = []
      const listener = (productCode: string) => {
        deliveries.push(productCode)
      }
      const signal = pubSub.subscribe("stockLow", listener)
      const abortEvents: string[] = []
      signal.addEventListener("abort", () => {
        abortEvents.push("aborted")
      })

      // Act
      pubSub.unsubscribe("stockLow", listener)
      pubSub.publish("stockLow", "product-code-44")

      // Assert
      expect(signal).toBeInstanceOf(AbortSignal)
      expect(signal.aborted).toBe(true)
      expect(abortEvents).toEqual(["aborted"])
      expect(deliveries).toEqual([])
    })

    test("when an unsubscribed listener later rejects, suppresses its pending recovery", async () => {
      // Arrange
      const pubSub = new PubSub<ChannelEvents>()
      const listenerError = new Error("pending listener failed")
      const recoveries: unknown[] = []
      let rejectListener: (error: unknown) => void = () => {}
      const pendingListener = new Promise<void>((_resolve, reject) => {
        rejectListener = reject
      })
      const listener = () => pendingListener
      const signal = pubSub.subscribe("stockLow", listener, (error) => {
        recoveries.push(error)
      })
      pubSub.publish("stockLow", "product-code-43")

      // Act
      pubSub.unsubscribe("stockLow", listener)
      rejectListener(listenerError)
      await Promise.resolve()

      // Assert
      expect(signal.aborted).toBe(true)
      expect(recoveries).toEqual([])
    })
  })
})
