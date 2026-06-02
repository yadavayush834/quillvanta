from dataclasses import dataclass
from pathlib import Path

import pymupdf
import pymupdf4llm


@dataclass(frozen=True)
class PageText:
    page: int
    text: str


def extract_pages(pdf_path: Path) -> list[PageText]:
    with pymupdf.open(pdf_path) as document:
        pages = pymupdf4llm.to_markdown(document, page_chunks=True)
    extracted: list[PageText] = []

    for index, item in enumerate(pages):
        text = item.get("text", "").strip()
        if not text:
            continue
        metadata = item.get("metadata", {})
        page_number = metadata.get("page", index + 1)
        extracted.append(PageText(page=page_number, text=text))

    if not extracted:
        raise ValueError(
            "No text could be extracted. V1 supports text-based PDFs; scanned "
            "documents will need OCR support in a later version."
        )

    return extracted
