import { pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const Books = pgTable('Books', {
    id: varchar().primaryKey(),
    title: text().notNull(),
    authors: text().array().notNull(),
    description: text(),
    imageLinks: text(),
    publisher: text(),
    categories: text().array().notNull(),
    isbnValue: text("isbn_value"),
    createdAt: timestamp().defaultNow().notNull(),
})

export const Users = pgTable('Users', {
    userId: text('user_id').primaryKey(),
    email: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
})

export const statusEnum = pgEnum("status", ["favorites", "reading_list", "completed"])

export const userBooks = pgTable("user_books", {
    userId: text("user_id").references(() => Users.userId),
    bookId: text('book_id').references(() => Books.id),
    status: statusEnum(),
    dateAdded: timestamp().defaultNow().notNull(),
})