import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from build_source_manifest import ALLOWED_OUTPUT_ROOT, REPOSITORY_ROOT, build_manifest
from pypdf import PdfWriter
from verify_source_manifest import verify_source_manifest


class VerifySourceManifestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ALLOWED_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    def create_fixture(self, directory: Path, page_texts: list[str]):
        pdf_path = directory / "source.pdf"
        writer = PdfWriter()
        for _ in page_texts:
            writer.add_blank_page(width=100, height=100)
        with pdf_path.open("wb") as pdf_file:
            writer.write(pdf_file)
        source_bytes = pdf_path.read_bytes()
        output_path = directory / "manifest-root"
        relative_output = output_path.relative_to(REPOSITORY_ROOT)
        with patch(
            "build_source_manifest.extract_pdf_pages",
            return_value=(source_bytes, page_texts),
        ):
            manifest, output_path = build_manifest(
                pdf_path,
                source_id="source-test",
                output_directory=str(relative_output),
                minimum_characters_per_page=3,
            )
        return pdf_path, output_path / "manifest.json", output_path, manifest, source_bytes

    def write_manifest(self, manifest_path: Path, value: dict):
        manifest_path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")

    def verify(self, manifest_path: Path, pdf_path: Path, page_texts: list[str], **kwargs):
        with patch(
            "verify_source_manifest.extract_pdf_pages_from_bytes",
            return_value=page_texts,
        ):
            return verify_source_manifest(manifest_path, pdf_path, **kwargs)

    def approved_manifest(self, manifest: dict, selected_pages: list[int]):
        approved = json.loads(json.dumps(manifest))
        approved["source"]["origin"] = {
            "type": "provided-file",
            "title": "Documento fornecido para o piloto",
            "creator": None,
            "locator": None,
            "publicationYear": None,
        }
        approved["source"]["rights"] = {
            "status": "permission-granted",
            "license": None,
            "note": "Permissão de processamento confirmada pelo responsável da fonte.",
        }
        approved["authorization"].update(
            {
                "externalProcessing": "approved",
                "reviewer": "Editora responsável",
                "reviewedAt": "2026-11-15T12:00:00.000Z",
                "approvalBasis": "Permissão escrita para processamento externo.",
                "note": "A autorização inclui o provedor de IA definido para o piloto.",
            }
        )
        for page_number in selected_pages:
            approved["pages"][page_number - 1].update(
                {
                    "reviewStatus": "verified",
                    "reviewer": "Editora responsável",
                    "reviewedAt": "2026-11-15T12:00:00.000Z",
                }
            )
        return approved

    def test_verifies_pdf_text_hashes_and_counts_without_external_calls(self):
        with tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
            directory = Path(temporary)
            page_texts = ["Texto íntegro da página um.", "Texto íntegro da página dois."]
            pdf, manifest_path, _, _, _ = self.create_fixture(directory, page_texts)
            result = self.verify(manifest_path, pdf, page_texts)
            self.assertEqual(result["sourceId"], "source-test")
            self.assertEqual(result["pageCount"], 2)
            self.assertFalse(result["externalGatePassed"])
            self.assertEqual(result["selectedPages"], [])

    def test_rejects_changed_pdf_bytes_and_wrong_original_filename(self):
        with tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
            directory = Path(temporary)
            page_texts = ["Texto íntegro da página."]
            pdf, manifest_path, _, _, pdf_bytes = self.create_fixture(directory, page_texts)
            renamed_pdf = directory / "different-name.pdf"
            renamed_pdf.write_bytes(pdf_bytes)
            with self.assertRaisesRegex(ValueError, "nome do PDF"):
                self.verify(manifest_path, renamed_pdf, page_texts)
            altered_bytes = bytearray(pdf_bytes)
            altered_bytes[-1] ^= 1
            pdf.write_bytes(altered_bytes)
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                self.verify(manifest_path, pdf, page_texts)

    def test_rejects_tampered_text_hash_content_or_character_count(self):
        for tamper in ("content", "hash", "count"):
            with self.subTest(tamper=tamper), tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
                directory = Path(temporary)
                page_texts = ["Texto íntegro da página."]
                pdf, manifest_path, output, _, _ = self.create_fixture(directory, page_texts)
                if tamper == "content":
                    (output / "pages" / "001.txt").write_text("texto adulterado", encoding="utf-8")
                    expected_message = "diverge do PDF original"
                elif tamper == "hash":
                    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    manifest["pages"][0]["textSha256"] = "0" * 64
                    self.write_manifest(manifest_path, manifest)
                    expected_message = "SHA-256 do texto"
                else:
                    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    manifest["pages"][0]["characterCount"] += 1
                    self.write_manifest(manifest_path, manifest)
                    expected_message = "Contagem de caracteres"
                with self.assertRaisesRegex(ValueError, expected_message):
                    self.verify(manifest_path, pdf, page_texts)

    def test_rejects_fabricated_page_ids_and_page_order(self):
        for mutation in ("id", "order"):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
                directory = Path(temporary)
                page_texts = ["Texto um.", "Texto dois."]
                pdf, manifest_path, _, manifest, _ = self.create_fixture(directory, page_texts)
                if mutation == "id":
                    manifest["pages"][0]["evidenceId"] = "invented-page-001"
                    message = "ID de evidência inválido"
                else:
                    manifest["pages"][1]["pageNumber"] = 1
                    message = "Ordem/número de página inválido"
                self.write_manifest(manifest_path, manifest)
                with self.assertRaisesRegex(ValueError, message):
                    self.verify(manifest_path, pdf, page_texts)

    def test_rejects_manifest_outside_local_source_root(self):
        with tempfile.TemporaryDirectory() as temporary:
            manifest_path = Path(temporary) / "manifest.json"
            manifest_path.write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "dentro de work/content-ai/sources"):
                self.verify(manifest_path, Path("missing.pdf"), [])

    def test_external_gate_requires_authorized_rights_and_reviewed_selected_pages(self):
        with tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
            directory = Path(temporary)
            page_texts = ["Texto íntegro da página um.", "Texto íntegro da página dois."]
            pdf, manifest_path, _, manifest, _ = self.create_fixture(directory, page_texts)
            with self.assertRaisesRegex(ValueError, "autorização não está approved"):
                self.verify(
                    manifest_path,
                    pdf,
                    page_texts,
                    for_external_processing=True,
                )
            approved = self.approved_manifest(manifest, [1])
            self.write_manifest(manifest_path, approved)

            selected = self.verify(
                manifest_path,
                pdf,
                page_texts,
                for_external_processing=True,
                selected_pages="1",
            )
            self.assertEqual(selected["selectedPages"], [1])
            with self.assertRaisesRegex(ValueError, "página 2 não está verified"):
                self.verify(
                    manifest_path,
                    pdf,
                    page_texts,
                    for_external_processing=True,
                )

    def test_external_gate_rejects_missing_authorization_provenance_or_rights_basis(self):
        with tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
            directory = Path(temporary)
            page_texts = ["Texto íntegro da página."]
            pdf, manifest_path, _, manifest, _ = self.create_fixture(directory, page_texts)
            approved = self.approved_manifest(manifest, [1])
            approved["authorization"]["reviewer"] = None
            self.write_manifest(manifest_path, approved)
            with self.assertRaisesRegex(ValueError, "authorization exige reviewer"):
                self.verify(manifest_path, pdf, page_texts, for_external_processing=True)

            approved = self.approved_manifest(manifest, [1])
            approved["source"]["rights"]["note"] = None
            self.write_manifest(manifest_path, approved)
            with self.assertRaisesRegex(ValueError, "justificar os direitos"):
                self.verify(manifest_path, pdf, page_texts, for_external_processing=True)

            approved = self.approved_manifest(manifest, [1])
            approved["authorization"]["note"] = "   "
            self.write_manifest(manifest_path, approved)
            with self.assertRaisesRegex(ValueError, "authorization.note"):
                self.verify(manifest_path, pdf, page_texts, for_external_processing=True)

            approved = self.approved_manifest(manifest, [1])
            approved["authorization"]["approvalBasis"] = None
            self.write_manifest(manifest_path, approved)
            with self.assertRaisesRegex(ValueError, "approvalBasis"):
                self.verify(manifest_path, pdf, page_texts, for_external_processing=True)

    def test_external_gate_rejects_page_decision_without_reviewer_and_timestamp(self):
        with tempfile.TemporaryDirectory(dir=ALLOWED_OUTPUT_ROOT) as temporary:
            directory = Path(temporary)
            page_texts = ["Texto íntegro da página."]
            pdf, manifest_path, _, manifest, _ = self.create_fixture(directory, page_texts)
            approved = self.approved_manifest(manifest, [1])
            approved["pages"][0]["reviewedAt"] = None
            self.write_manifest(manifest_path, approved)
            with self.assertRaisesRegex(ValueError, "exige reviewedAt"):
                self.verify(manifest_path, pdf, page_texts, for_external_processing=True)


if __name__ == "__main__":
    unittest.main()
