/**
 * Legal reading / download links for a book.
 *
 * Sources, in priority order:
 *   1. Project Gutenberg  (public-domain downloads, via Open Library ids)
 *   2. Standard Ebooks    (public-domain, carefully formatted ebooks)
 *   3. Internet Archive / Open Library (free read for public scans, free borrow otherwise)
 *   4. Google Books free downloads (public-domain EPUB/PDF only)
 *
 * If none of the above are available, we fall back to the Google Books
 * preview / web reader so the user can at least sample the book.
 */

export type ReadingLinkAccess = "download" | "read" | "borrow" | "preview";

export interface ReadingLink {
  source:
    | "Project Gutenberg"
    | "Standard Ebooks"
    | "Internet Archive"
    | "Open Library"
    | "Google Books";
  access: ReadingLinkAccess;
  format: string;
  url: string;
  label: string;
}

export interface ReadingLinksResult {
  links: ReadingLink[];
  /** true when no legal free source was found and only a Google preview is returned */
  isFallback: boolean;
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  ebook_access?: "no_ebook" | "printdisabled" | "borrowable" | "public";
  ia?: string[];
  id_project_gutenberg?: string[];
  id_standard_ebooks?: string[];
  lending_edition_s?: string;
}

export interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
    publisher?: string;
    categories?: string[];
    industryIdentifiers?: { type: string; identifier: string }[];
    previewLink?: string;
    infoLink?: string;
  };
  accessInfo?: {
    viewability?: "NO_PAGES" | "PARTIAL" | "ALL_PAGES" | "UNKNOWN";
    publicDomain?: boolean;
    webReaderLink?: string;
    epub?: { isAvailable?: boolean; downloadLink?: string };
    pdf?: { isAvailable?: boolean; downloadLink?: string };
  };
}

const OPEN_LIBRARY_FIELDS = [
  "key",
  "title",
  "author_name",
  "ebook_access",
  "ia",
  "id_project_gutenberg",
  "id_standard_ebooks",
  "lending_edition_s",
].join(",");

const REQUEST_TIMEOUT_MS = 6000;

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { "User-Agent": "BookVerse (https://bookvs.pages.dev)" },
    });
    if (!response.ok) {
      console.log(`Reading links request failed (${response.status}): ${url}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.log(`Reading links request errored: ${url}`, error);
    return null;
  }
};

const normalize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const pickBestDoc = (docs: OpenLibraryDoc[], title: string) => {
  if (!docs.length) return null;
  const wanted = normalize(title);
  return (
    docs.find((doc) => normalize(doc.title) === wanted) ??
    docs.find((doc) => normalize(doc.title).startsWith(wanted)) ??
    docs[0]
  );
};

const searchOpenLibrary = async ({
  title,
  author,
  isbns,
}: {
  title?: string;
  author?: string;
  isbns: string[];
}): Promise<OpenLibraryDoc | null> => {
  const base = "https://openlibrary.org/search.json";

  // An ISBN match is the most precise, try that first.
  for (const isbn of isbns.slice(0, 3)) {
    const data = await fetchJson<{ docs: OpenLibraryDoc[] }>(
      `${base}?q=${encodeURIComponent(`isbn:${isbn}`)}&fields=${OPEN_LIBRARY_FIELDS}&limit=1`,
    );
    if (data?.docs?.length) return data.docs[0];
  }

  if (!title) return null;

  const params = new URLSearchParams({
    title,
    fields: OPEN_LIBRARY_FIELDS,
    limit: "5",
  });
  if (author) params.set("author", author);

  const data = await fetchJson<{ docs: OpenLibraryDoc[] }>(`${base}?${params}`);
  return pickBestDoc(data?.docs ?? [], title);
};

export const fetchGoogleVolume = async (
  volumeId: string,
): Promise<GoogleVolume | null> => {
  if (!volumeId) return null;
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}${
    key ? `?key=${encodeURIComponent(key)}` : ""
  }`;
  return fetchJson<GoogleVolume>(url);
};

const linksFromOpenLibrary = (doc: OpenLibraryDoc): ReadingLink[] => {
  const links: ReadingLink[] = [];

  const gutenbergId = doc.id_project_gutenberg?.[0];
  if (gutenbergId) {
    links.push({
      source: "Project Gutenberg",
      access: "download",
      format: "EPUB / Kindle / HTML",
      url: `https://www.gutenberg.org/ebooks/${encodeURIComponent(gutenbergId)}`,
      label: "Download free from Project Gutenberg",
    });
  }

  const standardEbooksId = doc.id_standard_ebooks?.[0];
  if (standardEbooksId) {
    links.push({
      source: "Standard Ebooks",
      access: "download",
      format: "EPUB / AZW3 / KEPUB",
      url: `https://standardebooks.org/ebooks/${standardEbooksId
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      label: "Download free from Standard Ebooks",
    });
  }

  const iaId = doc.ia?.[0];
  if (doc.ebook_access === "public" && iaId) {
    links.push({
      source: "Internet Archive",
      access: "read",
      format: "Online reader / PDF / EPUB",
      url: `https://archive.org/details/${encodeURIComponent(iaId)}`,
      label: "Read free on the Internet Archive",
    });
  } else if (doc.ebook_access === "borrowable") {
    const path = doc.lending_edition_s
      ? `/books/${encodeURIComponent(doc.lending_edition_s)}`
      : doc.key;
    if (path) {
      links.push({
        source: "Open Library",
        access: "borrow",
        format: "Online reader",
        url: `https://openlibrary.org${path}`,
        label: "Borrow free from Open Library",
      });
    }
  }

  return links;
};

const linksFromGoogle = (volume: GoogleVolume | null): ReadingLink[] => {
  const access = volume?.accessInfo;
  if (!access?.publicDomain) return [];

  const links: ReadingLink[] = [];
  if (access.epub?.isAvailable && access.epub.downloadLink) {
    links.push({
      source: "Google Books",
      access: "download",
      format: "EPUB",
      url: access.epub.downloadLink,
      label: "Download free EPUB from Google Books",
    });
  }
  if (access.pdf?.isAvailable && access.pdf.downloadLink) {
    links.push({
      source: "Google Books",
      access: "download",
      format: "PDF",
      url: access.pdf.downloadLink,
      label: "Download free PDF from Google Books",
    });
  }
  return links;
};

const googlePreviewFallback = (
  volume: GoogleVolume | null,
  volumeId: string,
): ReadingLink => {
  const viewability = volume?.accessInfo?.viewability;
  const hasPages = viewability === "PARTIAL" || viewability === "ALL_PAGES";

  const url =
    (hasPages && volume?.accessInfo?.webReaderLink) ||
    volume?.volumeInfo?.previewLink ||
    volume?.volumeInfo?.infoLink ||
    `https://books.google.com/books?id=${encodeURIComponent(volumeId)}`;

  return {
    source: "Google Books",
    access: "preview",
    format: hasPages ? "Online preview" : "Book info",
    url,
    label: hasPages
      ? "Preview on Google Books"
      : volume
        ? "View on Google Books (no preview available)"
        : "View on Google Books",
  };
};

export const getReadingLinks = async ({
  bookId,
  title,
  author,
  isbns = [],
}: {
  bookId: string;
  title?: string;
  author?: string;
  isbns?: string[];
}): Promise<ReadingLinksResult> => {
  const volume = await fetchGoogleVolume(bookId);

  const resolvedTitle = title || volume?.volumeInfo?.title;
  const resolvedAuthor = author || volume?.volumeInfo?.authors?.[0];
  const resolvedIsbns = isbns.length
    ? isbns
    : (volume?.volumeInfo?.industryIdentifiers ?? [])
        .filter((id) => id.type === "ISBN_13" || id.type === "ISBN_10")
        .map((id) => id.identifier);

  const openLibraryDoc = await searchOpenLibrary({
    title: resolvedTitle,
    author: resolvedAuthor,
    isbns: resolvedIsbns,
  });

  const links = [
    ...(openLibraryDoc ? linksFromOpenLibrary(openLibraryDoc) : []),
    ...linksFromGoogle(volume),
  ];

  if (links.length > 0) {
    return { links, isFallback: false };
  }

  return { links: [googlePreviewFallback(volume, bookId)], isFallback: true };
};
