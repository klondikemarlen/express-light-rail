import type { Knex } from "knex"

export async function up(database: Knex): Promise<void> {
  await database.schema.createTable("users", (table) => {
    table.increments("id").primary()
    table.string("username", 255).notNullable().unique()
    table.string("name", 255).notNullable()
    table.string("passwordHash", 255).nullable()
  })

  await database.schema.createTable("threads", (table) => {
    table.increments("id").primary()
    table.string("title", 255).notNullable()
    table.text("body").notNullable()
    table
      .integer("authorId")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION")
  })

  await database.schema.createTable("comments", (table) => {
    table.increments("id").primary()
    table.text("body").notNullable()
    table
      .integer("authorId")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("NO ACTION")
      .onUpdate("NO ACTION")
    table
      .integer("threadId")
      .notNullable()
      .references("id")
      .inTable("threads")
      .onDelete("CASCADE")
      .onUpdate("NO ACTION")
  })
}

export async function down(database: Knex): Promise<void> {
  await database.schema.dropTable("comments")
  await database.schema.dropTable("threads")
  await database.schema.dropTable("users")
}
