import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("users", (table) => {
    table.increments("id").primary()
    table.string("username", 255).notNullable().unique()
    table.string("name", 255).notNullable()
    table.string("passwordHash", 255).nullable()
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("users")
}
