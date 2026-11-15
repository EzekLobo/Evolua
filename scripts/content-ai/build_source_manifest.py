#!/usr/bin/env python3
"""Extract a local, hash-linked manifest from an authorized PDF source."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from pypdf import PdfReader, __version__ as PYPDF_VERSION


DEFAULT_MINIMUM_CHARACTERS_PER_PAGE = 100
SCRIPT_DIRECTORY = Path(__file__).resolve().parent
REPOSITORY_ROOT = SCRIPT_DIRECTORY.parents[1]
ALLOWED_OUTPUT_ROOT = REPOSITORY_ROOT / "work" / "content-ai" / "sources"
SOURCE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,63}$")


def sha256_hex(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def source_id_from_filename(filename: str, maximum_length: int = 59) -> str:
    if maximum_length < 2:
        raise ValueError("Não há espaço suficiente para um ID e seu sufixo de evidência.")
    stem = Path(filename).stem
    normalized = unicodedata.normalize("NFKD", stem)
    without_marks = "".join(char for char in normalized if not unicodedata.combining(char))
    ascii_text = without_marks.encode("ascii", "ignore").decode("ascii").lower()
    source_id = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    if len(source_id) < 2:
        source_id = f"{source_id or 'source'}-pdf"
    source_id = source_id[:maximum_length].rstrip("-")
    return source_id if len(source_id) >= 2 else "source"[:maximum_length]


def create_source_manifest(
    *,
    source_id: str,
    file_name: str,
    source_bytes: bytes,
    page_texts: list[str],
    minimum_characters_per_page: int = DEFAULT_MINIMUM_CHARACTERS_PER_PAGE,
    extracted_at: str | None = None,
) -> dict[str, Any]:
    if not SOURCE_ID_PATTERN.fullmatch(source_id):
        raise ValueError("source-id deve usar letras minúsculas, números e hífens.")
    if not page_texts:
        raise ValueError("A fonte precisa ter ao menos uma página.")
    evidence_suffix_length = len(f"-p{len(page_texts):03d}")
    if len(source_id) + evidence_suffix_length > 64:
        raise ValueError(
            "source-id é longo demais para gerar IDs de evidência de até 64 caracteres."
        )
    if minimum_characters_per_page < 1:
        raise ValueError("O limite mínimo de caracteres precisa ser positivo.")

    source_hash = sha256_hex(source_bytes)
    pages = []
    for index, text in enumerate(page_texts, start=1):
        character_count = len(text)
        status = (
            "empty"
            if character_count == 0
            else "review-required"
            if character_count < minimum_characters_per_page
            else "text-present"
        )
        pages.append(
            {
                "evidenceId": f"{source_id}-p{index:03d}",
                "pageNumber": index,
                "locator": f"Página {index} do PDF",
                "textFile": f"pages/{index:03d}.txt",
                "textSha256": sha256_hex(text.encode("utf-8")),
                "characterCount": character_count,
                "extractionStatus": status,
                "reviewStatus": "unreviewed",
                "reviewer": None,
                "reviewedAt": None,
            }
        )

    return {
        "schema": "evolua-source-manifest",
        "version": 2,
        "source": {
            "id": source_id,
            "fileName": file_name,
            "sha256": source_hash,
            "sizeBytes": len(source_bytes),
            "pageCount": len(page_texts),
            "origin": {
                "type": "unknown",
                "title": None,
                "creator": None,
                "locator": None,
                "publicationYear": None,
            },
            "rights": {
                "status": "unknown",
                "license": None,
                "note": None,
            },
        },
        "authorization": {
            "externalProcessing": "unreviewed",
            "reviewer": None,
            "reviewedAt": None,
            "approvalBasis": None,
            "note": "Envio a provedor externo bloqueado até revisão de direitos e autorização.",
        },
        "extraction": {
            "tool": "pypdf",
            "toolVersion": PYPDF_VERSION,
            "options": ["strict=true", "extraction_mode=default"],
            "encoding": "UTF-8",
            "lineEndings": "LF",
            "trimOuterWhitespace": True,
            "ocrPerformed": False,
            "pageCount": len(page_texts),
            "minimumCharactersPerPage": minimum_characters_per_page,
            "extractedAt": extracted_at
            or datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        },
        "pages": pages,
    }


def extract_pdf_pages_from_bytes(source_bytes: bytes) -> list[str]:
    # Parse the same bytes whose digest is recorded in the manifest, so a
    # concurrent replacement of the input cannot create a hash/text mismatch.
    reader = PdfReader(BytesIO(source_bytes), strict=True)
    if reader.is_encrypted:
        raise ValueError("O PDF está criptografado; nenhuma senha será solicitada ou armazenada.")
    page_texts: list[str] = []
    for index, page in enumerate(reader.pages, start=1):
        try:
            extracted = page.extract_text() or ""
        except Exception as error:
            raise ValueError(f"Falha ao extrair a página {index}: {error}") from error
        page_texts.append(extracted.replace("\r\n", "\n").replace("\r", "\n").strip())
    if not page_texts:
        raise ValueError("O PDF não contém páginas.")
    return page_texts


def extract_pdf_pages(pdf_path: Path) -> tuple[bytes, list[str]]:
    source_bytes = pdf_path.read_bytes()
    return source_bytes, extract_pdf_pages_from_bytes(source_bytes)


def resolve_output_directory(output_directory: str | None, source_id: str, source_hash: str) -> Path:
    repository_root = REPOSITORY_ROOT.resolve()
    allowed_root = ALLOWED_OUTPUT_ROOT.resolve()
    try:
        allowed_root.relative_to(repository_root)
    except ValueError as error:
        raise ValueError("A raiz de saída não pode apontar para fora do repositório.") from error

    default = allowed_root / f"{source_id}-{source_hash[:12]}"
    candidate = (REPOSITORY_ROOT / output_directory).resolve() if output_directory else default.resolve()
    try:
        candidate.relative_to(allowed_root)
    except ValueError as error:
        raise ValueError("O destino deve ficar dentro de work/content-ai/sources.") from error
    return candidate


def build_manifest(
    pdf_path: Path,
    *,
    source_id: str | None = None,
    output_directory: str | None = None,
    minimum_characters_per_page: int = DEFAULT_MINIMUM_CHARACTERS_PER_PAGE,
) -> tuple[dict[str, Any], Path]:
    source_bytes, page_texts = extract_pdf_pages(pdf_path)
    maximum_source_id_length = 64 - len(f"-p{len(page_texts):03d}")
    resolved_id = source_id or source_id_from_filename(
        pdf_path.name,
        maximum_length=maximum_source_id_length,
    )
    manifest = create_source_manifest(
        source_id=resolved_id,
        file_name=pdf_path.name,
        source_bytes=source_bytes,
        page_texts=page_texts,
        minimum_characters_per_page=minimum_characters_per_page,
    )
    output_path = resolve_output_directory(
        output_directory,
        resolved_id,
        manifest["source"]["sha256"],
    )
    pages_directory = output_path / "pages"
    pages_directory.mkdir(parents=True, exist_ok=True)
    for index, text in enumerate(page_texts, start=1):
        (pages_directory / f"{index:03d}.txt").write_bytes(text.encode("utf-8"))
    (output_path / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest, output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extrai texto por página e cria um manifesto local vinculado por SHA-256."
    )
    parser.add_argument("pdf", type=Path, help="PDF de origem")
    parser.add_argument("--source-id", help="ID estável da fonte")
    parser.add_argument(
        "--output-dir",
        help="Destino relativo à raiz, dentro de work/content-ai/sources/",
    )
    parser.add_argument(
        "--minimum-characters-per-page",
        type=int,
        default=DEFAULT_MINIMUM_CHARACTERS_PER_PAGE,
        help="Abaixo desse valor a página fica marcada para conferência (padrão: 100)",
    )
    arguments = parser.parse_args()
    if arguments.minimum_characters_per_page < 1:
        parser.error("--minimum-characters-per-page precisa ser positivo")
    return arguments


def main() -> int:
    arguments = parse_args()
    pdf_path = arguments.pdf.resolve()
    if not pdf_path.is_file():
        print(f"Arquivo não encontrado: {pdf_path}", file=sys.stderr)
        return 2
    try:
        manifest, output_directory = build_manifest(
            pdf_path,
            source_id=arguments.source_id,
            output_directory=arguments.output_dir,
            minimum_characters_per_page=arguments.minimum_characters_per_page,
        )
    except Exception as error:
        print(f"Falha ao criar manifesto: {error}", file=sys.stderr)
        return 1

    review_required = sum(
        page["extractionStatus"] != "text-present" for page in manifest["pages"]
    )
    relative_manifest = (output_directory / "manifest.json").relative_to(REPOSITORY_ROOT)
    print(f"Manifesto criado: {relative_manifest}")
    print(
        f"{len(manifest['pages'])} páginas extraídas; {review_required} têm pouco ou nenhum texto. "
        "Todas continuam sem revisão humana. "
        "Nenhum conteúdo foi enviado a uma IA."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
