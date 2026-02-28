import {
  foreignKey,
  index,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const Books = pgTable("Books", {
  id: varchar().primaryKey().notNull(),
  title: text().notNull(),
  authors: text().array().notNull(),
  description: text(),
  imageLinks: json().$type<{ smallThumbnail?: string; thumbnail?: string }>(),
  publisher: text(),
  categories: text().array().notNull(),
  isbnValue: text("isbn_value").array(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
});

export const Categories = pgTable("Categories", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull().unique(),
});

export const BookCategories = pgTable(
  "book_categories",
  {
    bookId: text("book_id").notNull(),
    categoryId: text("category_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bookId, table.categoryId] }),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [Books.id],
      name: "book_categories_book_id_fk",
    }),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [Categories.id],
      name: "book_categories_category_id_fk",
    }),
    index("book_categories_category_idx").on(table.categoryId),
    index("book_categories_book_idx").on(table.bookId),
  ]
);

export const Users = pgTable("Users", {
  userId: text("user_id").primaryKey().notNull(),
  email: text().notNull(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
});

export const readingStatus = pgEnum("reading_status", [
  "reading_list",
  "reading",
  "completed",
]);
export const UserBooks = pgTable(
  "user_books",
  {
    userId: text("user_id"),
    bookId: text("book_id"),
    status: readingStatus().notNull(),
    dateAdded: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [Books.id],
      name: "user_books_book_id_Books_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [Users.userId],
      name: "user_books_user_id_Users_user_id_fk",
    }),
  ]
);

export const UserFavorites = pgTable(
  "user_favorites",
  {
    userId: text("user_id"),
    bookId: text("book_id"),
    dateAdded: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [Books.id],
      name: "user_books_book_id_Books_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [Users.userId],
      name: "user_books_user_id_Users_user_id_fk",
    }),
  ]
);
