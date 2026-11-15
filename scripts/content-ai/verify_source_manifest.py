#!/usr/bin/env python3
"""Verify a local source manifest and its extracted text without external calls."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from build_source_manifest import (
    ALLOWED_OUTPUT_ROOT,
    PYPDF_VERSION,
    REPOSITORY_ROOT,
    extract_pdf_pages_from_bytes,
    sha256_hex,
)


ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,63}$")
HASH_PATTERN = re.compile(r"^[a-f0-9]{64}$")
PAGE_FILE_PATTERN = re.compile(r"^pages/\d{3,}\.txt$")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def expect_object(value: Any, keys: set[str], label: str) -> dict[str, Any]:
    require(isinstance(value, dict), f"{label} precisa ser um objeto JSON.")
    actual = set(value)
    missing = keys - actual
    extra = actual - keys
    require(not missing, f"{label} sem campos obrigatórios: {', '.join(sorted(missing))}.")
    require(not extra, f"{label} contém campos desconhecidos: {', '.join(sorted(extra))}.")
    return value


def expect_string(value: Any, label: str, *, nullable: bool = False) -> str | None:
    if nullable and value is None:
        return None
    require(isinstance(value, str) and bool(value.strip()), f"{label} precisa ser texto não vazio.")
    return value


def expect_timestamp(value: Any, label: str, *, nullable: bool = False) -> str | None:
    timestamp = expect_string(value, label, nullable=nullable)
    if timestamp is None:
        return None
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"{label} deve usar data ISO-8601.") from error
    require(parsed.tzinfo is not None, f"{label} precisa informar fuso horário.")
    return timestamp


def validate_review_provenance(
    status: str,
    reviewer: Any,
    reviewed_at: Any,
    label: str,
) -> None:
    reviewer_value = expect_string(reviewer, f"{label}.reviewer", nullable=True)
    timestamp_value = expect_timestamp(reviewed_at, f"{label}.reviewedAt", nullable=True)
    if status == "unreviewed":
        require(
            reviewer_value is None and timestamp_value is None,
            f"{label} não pode informar revisor/data enquanto estiver unreviewed.",
        )
    else:
        require(reviewer_value is not None, f"{label} exige reviewer para a decisão humana.")
        require(timestamp_value is not None, f"{label} exige reviewedAt para a decisão humana.")


def _manifest_location(path: Path) -> tuple[Path, Path]:
    repository_root = REPOSITORY_ROOT.resolve()
    allowed_root = ALLOWED_OUTPUT_ROOT.resolve()
    try:
        allowed_root.relative_to(repository_root)
    except ValueError as error:
        raise ValueError("A raiz permitida de fontes aponta para fora do repositório.") from error

    try:
        manifest_path = path.resolve(strict=True)
    except OSError as error:
        raise ValueError(f"Manifesto não encontrado ou inacessível: {path}") from error
    require(manifest_path.name == "manifest.json", "O arquivo precisa se chamar manifest.json.")
    try:
        manifest_path.relative_to(allowed_root)
    except ValueError as error:
        raise ValueError("O manifesto precisa estar dentro de work/content-ai/sources/.") from error
    require(manifest_path.is_file(), "O caminho do manifesto não é um arquivo regular.")
    return manifest_path, manifest_path.parent


def _load_manifest(manifest_path: Path) -> dict[str, Any]:
    try:
        value = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"Não foi possível ler o JSON do manifesto: {error}") from error
    return expect_object(
        value,
        {"schema", "version", "source", "authorization", "extraction", "pages"},
        "manifesto",
    )


def _validate_manifest_shape(manifest: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    require(manifest["schema"] == "evolua-source-manifest", "Schema de manifesto desconhecido.")
    require(manifest["version"] == 2, "Versão não suportada; regenere o manifesto v2.")

    source = expect_object(
        manifest["source"],
        {"id", "fileName", "sha256", "sizeBytes", "pageCount", "origin", "rights"},
        "source",
    )
    source_id = expect_string(source["id"], "source.id")
    require(bool(ID_PATTERN.fullmatch(source_id or "")), "source.id inválido.")
    file_name = expect_string(source["fileName"], "source.fileName")
    require(Path(file_name or "").name == file_name, "source.fileName deve conter somente o nome do PDF.")
    require((file_name or "").lower().endswith(".pdf"), "source.fileName precisa identificar um PDF.")
    source_hash = expect_string(source["sha256"], "source.sha256")
    require(bool(HASH_PATTERN.fullmatch(source_hash or "")), "source.sha256 inválido.")
    require(type(source["sizeBytes"]) is int and source["sizeBytes"] > 0, "source.sizeBytes inválido.")
    page_count = source["pageCount"]
    require(type(page_count) is int and page_count > 0, "source.pageCount inválido.")

    origin = expect_object(
        source["origin"],
        {"type", "title", "creator", "locator", "publicationYear"},
        "source.origin",
    )
    require(
        origin["type"] in {"unknown", "provided-file", "publication", "website", "other"},
        "source.origin.type inválido.",
    )
    for key in ("title", "creator", "locator"):
        expect_string(origin[key], f"source.origin.{key}", nullable=True)
    year = origin["publicationYear"]
    require(year is None or (type(year) is int and 1 <= year <= 9999), "source.origin.publicationYear inválido.")

    rights = expect_object(source["rights"], {"status", "license", "note"}, "source.rights")
    require(
        rights["status"] in {"unknown", "licensed", "permission-granted", "public-domain", "restricted"},
        "source.rights.status inválido.",
    )
    expect_string(rights["license"], "source.rights.license", nullable=True)
    expect_string(rights["note"], "source.rights.note", nullable=True)
    if rights["status"] == "licensed":
        require(rights["license"] is not None, "source.rights.license é obrigatória para status licensed.")
    if rights["status"] in {"licensed", "permission-granted", "public-domain"}:
        require(rights["note"] is not None, "source.rights.note deve justificar os direitos declarados.")

    authorization = expect_object(
        manifest["authorization"],
        {"externalProcessing", "reviewer", "reviewedAt", "approvalBasis", "note"},
        "authorization",
    )
    auth_status = authorization["externalProcessing"]
    require(auth_status in {"unreviewed", "approved", "not-approved"}, "Autorização externa inválida.")
    expect_string(authorization["note"], "authorization.note")
    approval_basis = expect_string(
        authorization["approvalBasis"],
        "authorization.approvalBasis",
        nullable=True,
    )
    if auth_status == "approved":
        require(approval_basis is not None, "authorization.approvalBasis é obrigatória para status approved.")
    else:
        require(approval_basis is None, "authorization.approvalBasis só pode existir quando status approved.")
    validate_review_provenance(
        auth_status,
        authorization["reviewer"],
        authorization["reviewedAt"],
        "authorization",
    )

    extraction = expect_object(
        manifest["extraction"],
        {
            "tool", "toolVersion", "options", "encoding", "lineEndings", "trimOuterWhitespace",
            "ocrPerformed", "pageCount", "minimumCharactersPerPage", "extractedAt",
        },
        "extraction",
    )
    require(extraction["tool"] == "pypdf", "Ferramenta de extração incompatível.")
    require(
        extraction["toolVersion"] == PYPDF_VERSION,
        f"Versão pypdf divergente: manifesto={extraction['toolVersion']}, ambiente={PYPDF_VERSION}.",
    )
    require(isinstance(extraction["options"], list) and all(isinstance(x, str) and x for x in extraction["options"]), "extraction.options inválido.")
    require(extraction["encoding"] == "UTF-8", "Encoding de extração incompatível.")
    require(extraction["lineEndings"] == "LF", "Quebras de linha de extração incompatíveis.")
    require(extraction["trimOuterWhitespace"] is True, "Normalização de espaços incompatível.")
    require(extraction["ocrPerformed"] is False, "O verificador espera extração sem OCR.")
    require(type(extraction["pageCount"]) is int and extraction["pageCount"] == page_count, "Contagem de páginas extraídas incompatível.")
    minimum_characters = extraction["minimumCharactersPerPage"]
    require(type(minimum_characters) is int and minimum_characters > 0, "Limite mínimo de caracteres inválido.")
    expect_timestamp(extraction["extractedAt"], "extraction.extractedAt")

    pages = manifest["pages"]
    require(isinstance(pages, list) and len(pages) == page_count, "O manifesto precisa listar todas as páginas do PDF.")
    for index, page_value in enumerate(pages, start=1):
        page = expect_object(
            page_value,
            {
                "evidenceId", "pageNumber", "locator", "textFile", "textSha256", "characterCount",
                "extractionStatus", "reviewStatus", "reviewer", "reviewedAt",
            },
            f"pages[{index - 1}]",
        )
        expected_id = f"{source_id}-p{index:03d}"
        require(page["evidenceId"] == expected_id, f"ID de evidência inválido na página {index}.")
        require(type(page["pageNumber"]) is int and page["pageNumber"] == index, f"Ordem/número de página inválido na página {index}.")
        require(page["locator"] == f"Página {index} do PDF", f"Localizador inválido na página {index}.")
        text_file = expect_string(page["textFile"], f"pages[{index - 1}].textFile")
        require(bool(PAGE_FILE_PATTERN.fullmatch(text_file or "")), f"Caminho de texto inválido na página {index}.")
        require(page["textFile"] == f"pages/{index:03d}.txt", f"Arquivo de texto fora da ordem na página {index}.")
        text_hash = expect_string(page["textSha256"], f"pages[{index - 1}].textSha256")
        require(bool(HASH_PATTERN.fullmatch(text_hash or "")), f"Hash de texto inválido na página {index}.")
        require(type(page["characterCount"]) is int and page["characterCount"] >= 0, f"Contagem de caracteres inválida na página {index}.")
        require(page["extractionStatus"] in {"text-present", "review-required", "empty"}, f"Status de extração inválido na página {index}.")
        require(page["reviewStatus"] in {"unreviewed", "verified", "rejected"}, f"Status de revisão inválido na página {index}.")
        validate_review_provenance(
            page["reviewStatus"],
            page["reviewer"],
            page["reviewedAt"],
            f"pages[{index - 1}]",
        )
        count = page["characterCount"]
        expected_status = "empty" if count == 0 else "review-required" if count < minimum_characters else "text-present"
        require(page["extractionStatus"] == expected_status, f"Status de extração inconsistente na página {index}.")
    return source, pages


def _verify_external_gate(
    manifest: dict[str, Any],
    source: dict[str, Any],
    pages: list[dict[str, Any]],
    selected_pages: list[int],
) -> None:
    require(
        manifest["authorization"]["externalProcessing"] == "approved",
        "Processamento externo bloqueado: autorização não está approved.",
    )
    require(
        bool(manifest["authorization"]["note"].strip()),
        "Processamento externo bloqueado: falta registrar a base textual da autorização.",
    )
    require(
        source["origin"]["type"] != "unknown",
        "Processamento externo bloqueado: origem da fonte continua unknown.",
    )
    require(
        source["rights"]["status"] in {"licensed", "permission-granted", "public-domain"},
        "Processamento externo bloqueado: situação de direitos não foi esclarecida.",
    )
    require(
        bool(source["rights"]["note"] and source["rights"]["note"].strip()),
        "Processamento externo bloqueado: falta justificativa textual dos direitos.",
    )
    for page_number in selected_pages:
        page = pages[page_number - 1]
        require(
            page["reviewStatus"] == "verified",
            f"Processamento externo bloqueado: página {page_number} não está verified por um revisor.",
        )
        require(
            page["extractionStatus"] != "empty",
            f"Processamento externo bloqueado: página {page_number} não possui texto extraído.",
        )


def parse_selected_pages(value: str | None, page_count: int) -> list[int]:
    if value is None:
        return list(range(1, page_count + 1))
    parts = value.split(",")
    require(bool(parts) and all(part.strip().isdigit() for part in parts), "--pages use números separados por vírgula, por exemplo 1,4.")
    selected = [int(part.strip()) for part in parts]
    require(len(set(selected)) == len(selected), "--pages não pode repetir números.")
    require(all(1 <= page <= page_count for page in selected), "--pages contém número fora do PDF.")
    return selected


def verify_source_manifest(
    manifest_file: Path,
    original_pdf: Path,
    *,
    for_external_processing: bool = False,
    selected_pages: str | None = None,
) -> dict[str, Any]:
    manifest_path, manifest_directory = _manifest_location(manifest_file)
    manifest = _load_manifest(manifest_path)
    source, pages = _validate_manifest_shape(manifest)

    try:
        pdf_path = original_pdf.resolve(strict=True)
        source_bytes = pdf_path.read_bytes()
    except OSError as error:
        raise ValueError(f"PDF original não encontrado ou inacessível: {original_pdf}") from error
    require(pdf_path.is_file(), "O PDF original não é um arquivo regular.")
    require(pdf_path.name == source["fileName"], "O nome do PDF não corresponde a source.fileName.")
    require(len(source_bytes) == source["sizeBytes"], "Tamanho do PDF original difere do manifesto.")
    require(sha256_hex(source_bytes) == source["sha256"], "SHA-256 do PDF original difere do manifesto.")

    try:
        extracted_pages = extract_pdf_pages_from_bytes(source_bytes)
    except Exception as error:
        raise ValueError(f"Falha ao validar extração do PDF original: {error}") from error
    require(len(extracted_pages) == source["pageCount"], "Quantidade de páginas do PDF difere do manifesto.")

    for index, (page, extracted_text) in enumerate(zip(pages, extracted_pages, strict=True), start=1):
        try:
            text_path = (manifest_directory / page["textFile"]).resolve(strict=True)
        except OSError as error:
            raise ValueError(f"Texto extraído da página {index} não foi encontrado.") from error
        try:
            text_path.relative_to(manifest_directory.resolve())
        except ValueError as error:
            raise ValueError(f"Arquivo de texto da página {index} aponta para fora da pasta do manifesto.") from error
        require(text_path.is_file(), f"Texto extraído da página {index} não é arquivo regular.")
        stored_bytes = text_path.read_bytes()
        expected_bytes = extracted_text.encode("utf-8")
        require(stored_bytes == expected_bytes, f"Texto extraído da página {index} diverge do PDF original.")
        require(b"\r" not in stored_bytes, f"Texto da página {index} não usa quebras LF normalizadas.")
        require(sha256_hex(stored_bytes) == page["textSha256"], f"SHA-256 do texto da página {index} diverge.")
        try:
            decoded_text = stored_bytes.decode("utf-8", errors="strict")
        except UnicodeDecodeError as error:
            raise ValueError(f"Texto da página {index} não está em UTF-8 válido.") from error
        require(len(decoded_text) == page["characterCount"], f"Contagem de caracteres da página {index} diverge.")

    if for_external_processing:
        selected = parse_selected_pages(selected_pages, source["pageCount"])
        _verify_external_gate(manifest, source, pages, selected)
    else:
        require(selected_pages is None, "Use --pages somente junto com --for-external-processing.")
        selected = []

    return {
        "sourceId": source["id"],
        "sha256": source["sha256"],
        "pageCount": source["pageCount"],
        "selectedPages": selected,
        "externalGatePassed": for_external_processing,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Confere integridade do manifesto local; nunca chama Gemini nem envia arquivos."
    )
    parser.add_argument("manifest", type=Path, help="manifest.json dentro de work/content-ai/sources/")
    parser.add_argument("pdf", type=Path, help="PDF original usado para gerar o manifesto")
    parser.add_argument(
        "--for-external-processing",
        action="store_true",
        help="aplica o gate humano de direitos, autorização e revisão das páginas selecionadas",
    )
    parser.add_argument(
        "--pages",
        help="páginas que seriam enviadas, por exemplo 1,4; sem esta opção, exige todas",
    )
    arguments = parser.parse_args()
    if arguments.pages is not None and not arguments.for_external_processing:
        parser.error("--pages exige --for-external-processing")
    return arguments


def main() -> int:
    arguments = parse_args()
    try:
        result = verify_source_manifest(
            arguments.manifest,
            arguments.pdf,
            for_external_processing=arguments.for_external_processing,
            selected_pages=arguments.pages,
        )
    except Exception as error:
        print(f"Verificação falhou: {error}", file=sys.stderr)
        return 1

    print(
        f"Integridade confirmada: source={result['sourceId']}, "
        f"páginas={result['pageCount']}, sha256={result['sha256']}"
    )
    if result["externalGatePassed"]:
        print(
            "Gate de processamento externo passou para as páginas "
            f"{','.join(map(str, result['selectedPages']))}."
        )
    print("Nenhuma chamada Gemini ou transferência externa foi realizada; conteúdo gerado não foi aprovado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
