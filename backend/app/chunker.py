from dataclasses import dataclass

from .pdf_parser import PageText


@dataclass(frozen=True)
class Chunk:
    page: int
    index: int
    text: str


def chunk_pages(
    pages: list[PageText], chunk_size: int = 800, overlap: int = 120
) -> list[Chunk]:
    chunks: list[Chunk] = []
    chunk_index = 0

    for page in pages:
        words = page.text.split()
        start = 0
        while start < len(words):
            end = min(len(words), start + chunk_size)
            chunks.append(
                Chunk(page=page.page, index=chunk_index, text=" ".join(words[start:end]))
            )
            chunk_index += 1
            if end == len(words):
                break
            start = max(start + 1, end - overlap)

    return chunks

