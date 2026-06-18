import { BaseSerializer } from "@/base-serializer/index.js"

type User = {
  id: number
  name: string
  organization?: Organization | null
}

type Organization = {
  id: number
  name: string
}

type UserAsReference = {
  id: number
  label: string
}

describe("src/base-serializer/base-serializer.ts", () => {
  describe("BaseSerializer", () => {
    describe(".perform", () => {
      test("serializes one record with extra constructor context", () => {
        // Arrange
        class UserReferenceSerializer extends BaseSerializer<User, UserAsReference> {
          constructor(
            record: User,
            private readonly prefix: string
          ) {
            super(record)
          }

          perform(): UserAsReference {
            return {
              id: this.record.id,
              label: `${this.prefix}: ${this.record.name}`,
            }
          }
        }

        // Act
        const result = UserReferenceSerializer.perform({ id: 1, name: "Ada" }, "User")

        // Assert
        expect(result).toEqual({ id: 1, label: "User: Ada" })
      })

      test("serializes arrays through the same serializer", () => {
        // Arrange
        class UserReferenceSerializer extends BaseSerializer<User, UserAsReference> {
          perform(): UserAsReference {
            return {
              id: this.record.id,
              label: this.record.name,
            }
          }
        }

        // Act
        const result = UserReferenceSerializer.perform([
          { id: 1, name: "Ada" },
          { id: 2, name: "Grace" },
        ])

        // Assert
        expect(result).toEqual([
          { id: 1, label: "Ada" },
          { id: 2, label: "Grace" },
        ])
      })
    })

    describe("#requiredAssociation", () => {
      test("returns a loaded association", () => {
        // Arrange
        class UserShowSerializer extends BaseSerializer<User, string> {
          perform(): string {
            const organization = this.requiredAssociation(
              this.record.organization,
              "Expected user organization association to be preloaded."
            )

            return organization.name
          }
        }

        // Act
        const result = UserShowSerializer.perform({
          id: 1,
          name: "Ada",
          organization: { id: 2, name: "Computing" },
        })

        // Assert
        expect(result).toBe("Computing")
      })

      test("fails loudly when an association is missing", () => {
        // Arrange
        class UserShowSerializer extends BaseSerializer<User, string> {
          perform(): string {
            return this.requiredAssociation(
              this.record.organization,
              "Expected user organization association to be preloaded."
            ).name
          }
        }

        // Act / Assert
        expect(() => UserShowSerializer.perform({ id: 1, name: "Ada" })).toThrow(
          "Expected user organization association to be preloaded."
        )
      })
    })
  })
})
