import { z } from "zod";

const identifier = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,63}$/, "ID inválido");
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const reviewer = z.string().trim().min(1).max(160).nullable();
const reviewedAt = z.iso.datetime().nullable();

const sourcePageSchema = z
  .object({
    evidenceId: identifier,
    pageNumber: z.number().int().positive(),
    locator: z.string().min(1).max(120),
    textFile: z.string().regex(/^pages\/\d{3,}\.txt$/),
    textSha256: sha256,
    characterCount: z.number().int().nonnegative(),
    extractionStatus: z.enum(["text-present", "review-required", "empty"]),
    reviewStatus: z.enum(["unreviewed", "verified", "rejected"]),
    reviewer,
    reviewedAt,
  })
  .strict()
  .superRefine((page, ctx) => {
    if (page.reviewStatus === "unreviewed") {
      if (page.reviewer !== null)
        ctx.addIssue({
          code: "custom",
          message: "Página não revisada não pode informar revisor",
          path: ["reviewer"],
        });
      if (page.reviewedAt !== null)
        ctx.addIssue({
          code: "custom",
          message: "Página não revisada não pode informar data",
          path: ["reviewedAt"],
        });
      return;
    }
    if (page.reviewer === null)
      ctx.addIssue({
        code: "custom",
        message: "Revisão humana exige o nome do revisor",
        path: ["reviewer"],
      });
    if (page.reviewedAt === null)
      ctx.addIssue({
        code: "custom",
        message: "Revisão humana exige data e hora",
        path: ["reviewedAt"],
      });
  });

const authorizationSchema = z
  .object({
    externalProcessing: z.enum([
      "unreviewed",
      "approved",
      "not-approved",
    ]),
    reviewer,
    reviewedAt,
    approvalBasis: z.string().trim().min(1).max(2000).nullable(),
    note: z.string().trim().min(1).max(500),
  })
  .strict()
  .superRefine((authorization, ctx) => {
    if (authorization.externalProcessing === "unreviewed") {
      if (authorization.reviewer !== null)
        ctx.addIssue({
          code: "custom",
          message: "Autorização não revisada não pode informar revisor",
          path: ["reviewer"],
        });
      if (authorization.reviewedAt !== null)
        ctx.addIssue({
          code: "custom",
          message: "Autorização não revisada não pode informar data",
          path: ["reviewedAt"],
        });
      if (authorization.approvalBasis !== null)
        ctx.addIssue({
          code: "custom",
          message: "Autorização não revisada não pode declarar base de aprovação",
          path: ["approvalBasis"],
        });
      return;
    }
    if (authorization.reviewer === null)
      ctx.addIssue({
        code: "custom",
        message: "Decisão de autorização exige o nome do revisor",
        path: ["reviewer"],
      });
    if (authorization.reviewedAt === null)
      ctx.addIssue({
        code: "custom",
        message: "Decisão de autorização exige data e hora",
        path: ["reviewedAt"],
      });
    if (
      authorization.externalProcessing === "approved" &&
      authorization.approvalBasis === null
    )
      ctx.addIssue({
        code: "custom",
        message: "Aprovação externa exige base documental explícita",
        path: ["approvalBasis"],
      });
    if (
      authorization.externalProcessing === "not-approved" &&
      authorization.approvalBasis !== null
    )
      ctx.addIssue({
        code: "custom",
        message: "Decisão negada não pode declarar base de aprovação",
        path: ["approvalBasis"],
      });
  });

export const sourceManifestSchema = z
  .object({
    schema: z.literal("evolua-source-manifest"),
    version: z.literal(2),
    source: z
      .object({
        id: identifier,
        fileName: z.string().min(1).max(255),
        sha256,
        sizeBytes: z.number().int().positive(),
        pageCount: z.number().int().positive(),
        origin: z
          .object({
            type: z.enum([
              "unknown",
              "provided-file",
              "publication",
              "website",
              "other",
            ]),
            title: z.string().trim().min(1).max(500).nullable(),
            creator: z.string().trim().min(1).max(500).nullable(),
            locator: z.string().trim().min(1).max(2000).nullable(),
            publicationYear: z.number().int().min(1).max(9999).nullable(),
          })
          .strict(),
        rights: z
          .object({
            status: z.enum([
              "unknown",
              "licensed",
              "permission-granted",
              "public-domain",
              "restricted",
            ]),
            license: z.string().trim().min(1).max(500).nullable(),
            note: z.string().trim().min(1).max(2000).nullable(),
          })
          .strict(),
      })
      .strict()
      .superRefine((source, ctx) => {
        if (source.rights.status === "licensed" && source.rights.license === null)
          ctx.addIssue({
            code: "custom",
            message: "Identifique a licença da fonte",
            path: ["rights", "license"],
          });
        if (
          ["licensed", "permission-granted", "public-domain"].includes(
            source.rights.status,
          ) && source.rights.note === null
        )
          ctx.addIssue({
            code: "custom",
            message: "Registre a justificativa para os direitos declarados",
            path: ["rights", "note"],
          });
      }),
    authorization: authorizationSchema,
    extraction: z
      .object({
        tool: z.literal("pypdf"),
        toolVersion: z.string().min(1).max(32),
        options: z.array(z.string().min(1)).max(10),
        encoding: z.literal("UTF-8"),
        lineEndings: z.literal("LF"),
        trimOuterWhitespace: z.boolean(),
        ocrPerformed: z.literal(false),
        pageCount: z.number().int().positive(),
        minimumCharactersPerPage: z.number().int().positive(),
        extractedAt: z.iso.datetime(),
      })
      .strict(),
    pages: z.array(sourcePageSchema).min(1),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    if (manifest.pages.length !== manifest.source.pageCount) {
      ctx.addIssue({
        code: "custom",
        message: "O manifesto precisa conter todas as páginas da fonte",
        path: ["pages"],
      });
    }
    if (manifest.extraction.pageCount !== manifest.source.pageCount) {
      ctx.addIssue({
        code: "custom",
        message: "A contagem extraída não corresponde aos metadados do PDF",
        path: ["extraction", "pageCount"],
      });
    }
    const evidenceIds = new Set<string>();
    manifest.pages.forEach((page, index) => {
      if (page.pageNumber !== index + 1) {
        ctx.addIssue({
          code: "custom",
          message: "As páginas devem estar completas e em ordem",
          path: ["pages", index, "pageNumber"],
        });
      }
      if (
        page.evidenceId !==
        `${manifest.source.id}-p${String(index + 1).padStart(3, "0")}`
      ) {
        ctx.addIssue({
          code: "custom",
          message: "ID de evidência não corresponde à fonte e página",
          path: ["pages", index, "evidenceId"],
        });
      }
      if (evidenceIds.has(page.evidenceId)) {
        ctx.addIssue({
          code: "custom",
          message: "ID de evidência duplicado",
          path: ["pages", index, "evidenceId"],
        });
      }
      evidenceIds.add(page.evidenceId);

      const expectedStatus =
        page.characterCount === 0
          ? "empty"
          : page.characterCount < manifest.extraction.minimumCharactersPerPage
            ? "review-required"
            : "text-present";
      if (page.extractionStatus !== expectedStatus) {
        ctx.addIssue({
          code: "custom",
          message: "Status de extração incompatível com o tamanho do texto",
          path: ["pages", index, "extractionStatus"],
        });
      }
    });
  });

export type SourceManifest = z.infer<typeof sourceManifestSchema>;
export type SourcePage = z.infer<typeof sourcePageSchema>;
