from io import BytesIO
import html
import re

from pygments import lex
from pygments.lexers import get_lexer_by_name, TextLexer
from pygments.styles import get_style_by_name
from pygments.token import Token
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    XPreformatted,
)

from .models import ChatMessage, ChatSession, Document


TEAL = colors.HexColor("#006b73")
INK = colors.HexColor("#16324f")
MUTED = colors.HexColor("#62778d")
PALE = colors.HexColor("#f2f7f8")
BORDER = colors.HexColor("#d4e0e4")
CODE_STYLE = get_style_by_name("friendly")


def _inline_markup(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"`([^`]+)`", r'<font name="Courier" color="#006b73">\1</font>', escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    return escaped


def _highlight_code(code: str, language: str) -> str:
    try:
        lexer = get_lexer_by_name(language or "text")
    except Exception:
        lexer = TextLexer()

    chunks: list[str] = []
    for token_type, value in lex(code, lexer):
        style = CODE_STYLE.style_for_token(token_type)
        color = style.get("color")
        escaped = html.escape(value)
        if color:
            escaped = f'<font color="#{color}">{escaped}</font>'
        if style.get("bold"):
            escaped = f"<b>{escaped}</b>"
        if style.get("italic"):
            escaped = f"<i>{escaped}</i>"
        chunks.append(escaped)
    return "".join(chunks)


def _answer_flowables(content: str, styles: dict) -> list:
    flowables: list = []
    lines = content.replace("\r\n", "\n").split("\n")
    index = 0

    while index < len(lines):
        line = lines[index].rstrip()
        if not line.strip():
            index += 1
            continue
        if line.startswith("```"):
            language = line[3:].strip()
            code: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].rstrip().startswith("```"):
                code.append(lines[index])
                index += 1
            highlighted = _highlight_code("\n".join(code), language)
            flowables.append(XPreformatted(highlighted, styles["code"]))
            flowables.append(Spacer(1, 6))
            index += 1
            continue
        if re.match(r"^\s*[-=_]{3,}\s*$", line):
            flowables.append(HRFlowable(width="100%", color=BORDER, thickness=0.7, spaceBefore=3, spaceAfter=7))
            index += 1
            continue
        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        bold_heading = re.match(r"^\*\*([^*]+)\*\*$", line)
        if heading or bold_heading:
            level = len(heading.group(1)) if heading else 2
            text = heading.group(2) if heading else bold_heading.group(1)
            flowables.append(Paragraph(_inline_markup(text), styles[f"h{min(level, 3)}"]))
            index += 1
            continue
        list_item = re.match(r"^([-*]|\d+\.)\s+(.+)$", line)
        if list_item:
            ordered = list_item.group(1)[0].isdigit()
            items = []
            while index < len(lines):
                match = re.match(r"^([-*]|\d+\.)\s+(.+)$", lines[index].rstrip())
                if not match or match.group(1)[0].isdigit() != ordered:
                    break
                items.append(ListItem(Paragraph(_inline_markup(match.group(2)), styles["body"]), leftIndent=10))
                index += 1
            flowables.append(ListFlowable(items, bulletType="1" if ordered else "bullet", leftIndent=18, bulletFontSize=8))
            flowables.append(Spacer(1, 4))
            continue

        paragraph = [line.strip()]
        index += 1
        while index < len(lines) and lines[index].strip():
            next_line = lines[index].rstrip()
            if next_line.startswith("```") or re.match(r"^\s*[-=_]{3,}\s*$", next_line) or re.match(r"^(#{1,3})\s+", next_line) or re.match(r"^\*\*([^*]+)\*\*$", next_line) or re.match(r"^([-*]|\d+\.)\s+", next_line):
                break
            paragraph.append(next_line.strip())
            index += 1
        flowables.append(Paragraph(_inline_markup(" ".join(paragraph)), styles["body"]))
        flowables.append(Spacer(1, 5))
    return flowables


def _styles() -> dict:
    sample = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle("Brand", parent=sample["Title"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=INK, spaceAfter=3),
        "meta": ParagraphStyle("Meta", parent=sample["BodyText"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED),
        "question_label": ParagraphStyle("QuestionLabel", parent=sample["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=TEAL),
        "question": ParagraphStyle("Question", parent=sample["BodyText"], fontName="Helvetica-Bold", fontSize=10.5, leading=15, textColor=INK),
        "body": ParagraphStyle("Body", parent=sample["BodyText"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK),
        "h1": ParagraphStyle("Heading1", parent=sample["Heading1"], fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=INK, spaceBefore=8, spaceAfter=5),
        "h2": ParagraphStyle("Heading2", parent=sample["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=INK, spaceBefore=7, spaceAfter=4),
        "h3": ParagraphStyle("Heading3", parent=sample["Heading3"], fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=INK, spaceBefore=6, spaceAfter=3),
        "code": ParagraphStyle("Code", parent=sample["Code"], fontName="Courier", fontSize=7.7, leading=10.5, textColor=INK, backColor=PALE, borderColor=BORDER, borderWidth=0.6, borderPadding=8, spaceBefore=5, spaceAfter=4),
        "citation": ParagraphStyle("Citation", parent=sample["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=TEAL),
        "footer": ParagraphStyle("Footer", parent=sample["BodyText"], alignment=TA_CENTER, fontName="Helvetica", fontSize=7.5, textColor=MUTED),
    }


def export_chat_pdf(session: ChatSession, document: Document) -> bytes:
    buffer = BytesIO()
    styles = _styles()
    pdf = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=16 * mm,
        title=session.title,
        author="Quillvanta",
    )
    story: list = [
        Paragraph("Quillvanta", styles["brand"]),
        Paragraph("Saved PDF conversation", styles["meta"]),
        Spacer(1, 8),
        HRFlowable(width="100%", color=TEAL, thickness=1.2, spaceAfter=9),
        Paragraph(f"<b>Chat:</b> {_inline_markup(session.title)}", styles["body"]),
        Paragraph(f"<b>Source PDF:</b> {html.escape(document.filename)} &nbsp; | &nbsp; {document.page_count} pages", styles["meta"]),
        Spacer(1, 12),
    ]

    for message in session.messages:
        if message.role == "user":
            content = [
                Paragraph("QUESTION", styles["question_label"]),
                Paragraph(_inline_markup(message.content), styles["question"]),
            ]
            story.append(Table([[content]], colWidths=[174 * mm], style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ])))
        else:
            story.append(Spacer(1, 7))
            story.append(Paragraph("ANSWER", styles["question_label"]))
            story.extend(_answer_flowables(message.content, styles))
            if message.citations:
                pages = ", ".join(str(citation.page) for citation in message.citations)
                story.append(Paragraph(f"Sources: pages {pages}", styles["citation"]))
        story.append(Spacer(1, 11))

    def add_page_number(canvas, doc):
        canvas.saveState()
        footer = Paragraph(f"Quillvanta export &nbsp; | &nbsp; Page {doc.page}", styles["footer"])
        footer.wrapOn(canvas, 174 * mm, 8 * mm)
        footer.drawOn(canvas, 18 * mm, 8 * mm)
        canvas.restoreState()

    pdf.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return buffer.getvalue()
