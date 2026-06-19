# Base Serializer

Serializers own API response shape. They are the boundary between database-shaped records and client-facing payloads.

```ts
export type UserAsShow = {
  id: number
  name: string
  organization: OrganizationAsReference
}

export class ShowSerializer extends BaseSerializer<User, UserAsShow> {
  perform(): UserAsShow {
    const organization = this.requiredAssociation(
      this.record.organization,
      "Expected user organization association to be preloaded."
    )

    const serializedOrganization = Organizations.ReferenceSerializer.perform(organization)

    return {
      id: this.record.id,
      name: this.record.name,
      organization: serializedOrganization,
    }
  }
}
```

## Responsibilities

Serializers should:

- expose only fields needed by the client
- keep index/show/reference response shapes explicit
- fail loudly when required associations were not preloaded
- serialize nested associations into named locals before the final returned object

Serializers should not:

- query the database to hide missing preloads
- perform authorization checks
- format dates or money when the front end should own display formatting

## Naming

Use output type names that match the response shape:

- `UserAsIndex`
- `UserAsShow`
- `UserAsReference`

Resource barrels should export in this order when present: Index, Show, Reference.
