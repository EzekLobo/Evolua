import { describe, expect, it } from "vitest";
import { sourceManifestSchema } from "../../src/lib/content-ai/source-schema";

const manifest = {
  schema: "evolua-source-manifest",
  version: 2,
  source: {
    id: "metodologia-1",
    fileName: "METODOLOGIA 1.pdf",
    sha256: "a".repeat(64),
    sizeBytes: 1024,
    pageCount: 2,
    origin: {
      type: "unknown",
      title: null,
      creator: null,
      locator: null,
      publicationYear: null,
    },
    rights: { status: "unknown", license: null, note: null },
  },
  authorization: {
    externalProcessing: "unreviewed",
    reviewer: null,
    reviewedAt: null,
    approvalBasis: null,
    note: "Envio externo ainda não autorizado.",
  },
  extraction: {
    tool: "pypdf",
    toolVersion: "7.1.0",
    options: ["strict=true", "extraction_mode=default"],
    encoding: "UTF-8",
    lineEndings: "LF",
    trimOuterWhitespace: true,
    ocrPerformed: false,
    pageCount: 2,
    minimumCharactersPerPage: 100,
    extractedAt: "2026-11-15T12:00:00.000Z",
  },
  pages: [
    {
      evidenceId: "metodologia-1-p001",
      pageNumber: 1,
      locator: "Página 1 do PDF",
      textFile: "pages/001.txt",
      textSha256: "b".repeat(64),
      characterCount: 120,
      extractionStatus: "text-present",
      reviewStatus: "unreviewed",
      reviewer: null,
      reviewedAt: null,
    },
    {
      evidenceId: "metodologia-1-p002",
      pageNumber: 2,
      locator: "Página 2 do PDF",
      textFile: "pages/002.txt",
      textSha256: "c".repeat(64),
      characterCount: 35,
      extractionStatus: "review-required",
      reviewStatus: "unreviewed",
      reviewer: null,
      reviewedAt: null,
    },
  ],
};

describe("source manifest schema", () => {
  it("accepts an ordered, complete page manifest", () => {
    expect(sourceManifestSchema.safeParse(manifest).success).toBe(true);
  });

  it("rejects missing pages and page count mismatches", () => {
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        pages: manifest.pages.slice(0, 1),
      }).success,
    ).toBe(false);
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        extraction: { ...manifest.extraction, pageCount: 3 },
      }).success,
    ).toBe(false);
  });

  it("rejects page evidence IDs that do not bind to the source and page", () => {
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        pages: [
          { ...manifest.pages[0], evidenceId: "fabricated-page-001" },
          manifest.pages[1],
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects invalid hashes and status labels inconsistent with extraction", () => {
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        source: { ...manifest.source, sha256: "not-a-hash" },
      }).success,
    ).toBe(false);
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        pages: [
          { ...manifest.pages[0], extractionStatus: "review-required" },
          manifest.pages[1],
        ],
      }).success,
    ).toBe(false);
  });

  it("requires reviewer and timestamp for verified or rejected pages", () => {
    for (const reviewStatus of ["verified", "rejected"] as const) {
      const page = {
        ...manifest.pages[0],
        reviewStatus,
        reviewer: null,
        reviewedAt: null,
      };
      expect(
        sourceManifestSchema.safeParse({
          ...manifest,
          pages: [page, manifest.pages[1]],
        }).success,
      ).toBe(false);
      expect(
        sourceManifestSchema.safeParse({
          ...manifest,
          pages: [
            {
              ...page,
              reviewer: "Editora responsável",
              reviewedAt: "2026-11-15T12:00:00.000Z",
            },
            manifest.pages[1],
          ],
        }).success,
      ).toBe(true);
    }
  });

  it("requires reviewer and timestamp for external processing decisions", () => {
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        authorization: {
          ...manifest.authorization,
          externalProcessing: "approved",
        },
      }).success,
    ).toBe(false);
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        authorization: {
          ...manifest.authorization,
          externalProcessing: "approved",
          reviewer: "Editora responsável",
          reviewedAt: "2026-11-15T12:00:00.000Z",
        },
      }).success,
    ).toBe(false);
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        authorization: {
          ...manifest.authorization,
          externalProcessing: "approved",
          reviewer: "Editora responsável",
          reviewedAt: "2026-11-15T12:00:00.000Z",
          approvalBasis: "Permissão escrita para processamento externo.",
        },
      }).success,
    ).toBe(true);
  });

  it("requires a license or permission note when those rights are declared", () => {
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        source: {
          ...manifest.source,
          rights: { status: "licensed", license: null, note: null },
        },
      }).success,
    ).toBe(false);
    expect(
      sourceManifestSchema.safeParse({
        ...manifest,
        source: {
          ...manifest.source,
          rights: {
            status: "permission-granted",
            license: null,
            note: "Autorização formal registrada pelo editor.",
          },
        },
      }).success,
    ).toBe(true);
  });
});
