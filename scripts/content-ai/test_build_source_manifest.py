import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from build_source_manifest import (
    REPOSITORY_ROOT,
    ALLOWED_OUTPUT_ROOT,
    build_manifest,
    create_source_manifest,
    resolve_output_directory,
    sha256_hex,
    source_id_from_filename,
)
from pypdf import PdfWriter


class SourceManifestTests(unittest.TestCase):
    def test_source_id_is_stable_and_safe(self):
        self.assertEqual(source_id_from_filename("METODOLOGIA 1.pdf"), "metodologia-1")
        self.assertEqual(source_id_from_filename("Análise & Métodos.pdf"), "analise-metodos")
        self.assertEqual(source_id_from_filename("á.pdf"), "a-pdf")

    def test_long_source_id_cannot_overflow_evidence_id(self):
        with self.assertRaises(ValueError):
            create_source_manifest(
                source_id="a" * 60,
                file_name="source.pdf",
                source_bytes=b"pdf",
                page_texts=["text"],
            )

    def test_sha256_uses_full_bytes(self):
        self.assertEqual(sha256_hex(b"source"), hashlib.sha256(b"source").hexdigest())

    def test_manifest_binds_pages_to_source_hashes(self):
        source_bytes = b"pdf bytes"
        result = create_source_manifest(
            source_id="metodologia-1",
            file_name="METODOLOGIA 1.pdf",
            source_bytes=source_bytes,
            page_texts=["texto longo de teste", ""],
            minimum_characters_per_page=10,
            extracted_at="2026-11-15T12:00:00.000Z",
        )

        self.assertEqual(result["source"]["sha256"], sha256_hex(source_bytes))
        self.assertEqual(result["version"], 2)
        self.assertEqual(result["source"]["origin"]["type"], "unknown")
        self.assertIsNone(result["source"]["origin"]["title"])
        self.assertEqual(result["source"]["rights"]["status"], "unknown")
        self.assertIsNone(result["source"]["rights"]["license"])
        self.assertEqual(
            [page["evidenceId"] for page in result["pages"]],
            ["metodologia-1-p001", "metodologia-1-p002"],
        )
        self.assertEqual(
            [page["extractionStatus"] for page in result["pages"]],
            ["text-present", "empty"],
        )
        self.assertEqual(result["authorization"]["externalProcessing"], "unreviewed")
        self.assertIsNone(result["authorization"]["reviewer"])
        self.assertIsNone(result["authorization"]["reviewedAt"])
        self.assertEqual(
            [page["reviewStatus"] for page in result["pages"]],
            ["unreviewed", "unreviewed"],
        )
        self.assertTrue(
            all(page["reviewer"] is None and page["reviewedAt"] is None for page in result["pages"])
        )

    def test_low_text_requires_manual_review(self):
        result = create_source_manifest(
            source_id="notes",
            file_name="notes.pdf",
            source_bytes=b"pdf",
            page_texts=["short"],
            minimum_characters_per_page=100,
            extracted_at="2026-11-15T12:00:00.000Z",
        )
        self.assertEqual(result["pages"][0]["extractionStatus"], "review-required")

    def test_rejects_invalid_ids_and_missing_pages(self):
        with self.assertRaises(ValueError):
            create_source_manifest(
                source_id="Bad ID",
                file_name="bad.pdf",
                source_bytes=b"pdf",
                page_texts=["text"],
            )
        with self.assertRaises(ValueError):
            create_source_manifest(
                source_id="notes",
                file_name="notes.pdf",
                source_bytes=b"pdf",
                page_texts=[],
            )

    def test_manifest_text_hash_matches_bytes_written_on_disk(self):
        ALLOWED_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
            temporary_directory = Path(temporary)
            pdf_path = temporary_directory / "source.pdf"
            writer = PdfWriter()
            writer.add_blank_page(width=100, height=100)
            with pdf_path.open("wb") as pdf_file:
                writer.write(pdf_file)

            output_directory = temporary_directory / "output"
            relative_output_directory = output_directory.relative_to(REPOSITORY_ROOT)
            with patch(
                "build_source_manifest.extract_pdf_pages",
                return_value=(pdf_path.read_bytes(), ["linha 1\nlinha 2"]),
            ):
                manifest, output_path = build_manifest(
                    pdf_path,
                    source_id="hash-check",
                    output_directory=str(relative_output_directory),
                )

            stored_text = (output_path / "pages" / "001.txt").read_bytes()
            self.assertEqual(manifest["pages"][0]["textSha256"], sha256_hex(stored_text))
            self.assertEqual(stored_text, "linha 1\nlinha 2".encode("utf-8"))

    def test_rejects_output_outside_allowed_root(self):
        with self.assertRaises(ValueError):
            resolve_output_directory("work/not-content-ai/output", "source", "a" * 64)


if __name__ == "__main__":
    unittest.main()
