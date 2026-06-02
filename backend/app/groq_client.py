import httpx

from .config import GROQ_API_KEY, GROQ_MODEL


SYSTEM_PROMPT = """You answer questions only from the supplied PDF passages.
If the passages do not contain the answer, say that you could not find it in
the document. Do not invent facts. The UI displays page sources separately, so
do not add a sources section.

Format every answer as clean Markdown that is easy to study:
- Start with a short direct explanation.
- Use Markdown headings such as ## Explanation and ## Code Example when the
  answer has multiple parts. Do not imitate headings with bold text or lines of
  equals signs.
- Use bullet points or numbered steps instead of dense paragraphs.
- Put code in fenced code blocks with a language tag such as ```java.
- Use inline code for method names, classes, and short identifiers.
- Keep paragraphs short.
- If the user asks for an exam explanation, include a brief exam-ready summary.
- Answer in the language or style requested by the user."""


async def answer_question(question: str, passages: list[dict]) -> str:
    if not GROQ_API_KEY or GROQ_API_KEY == "replace-with-your-groq-api-key":
        raise RuntimeError("Add GROQ_API_KEY to backend/.env before asking questions.")

    context = "\n\n".join(
        f"[Page {passage['page']}]\n{passage['text']}" for passage in passages
    )
    prompt = f"PDF passages:\n\n{context}\n\nQuestion: {question}"

    async with httpx.AsyncClient(timeout=45) as http_client:
        response = await http_client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 500,
            },
        )
        response.raise_for_status()
        payload = response.json()
        return payload["choices"][0]["message"]["content"].strip()
