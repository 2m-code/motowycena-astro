"""
Generator PDF - łączy wszystkie dokumenty projektu w jeden plik.

Czytane pliki:
  README.md
  PODSUMOWANIE-DLA-KLIENTA.md
  DLA-KLIENTA-PO-LUDZKU.md
  docs/01-AUDYT-SEO.md
  docs/02-STACK-DECYZJA.md
  docs/03-URL-MAPPING.md
  docs/04-PLAN-MIGRACJI.md
  docs/05-CHECKLIST.md
  docs/06-SEO-IMPROVEMENTS.md
  app/docs/TURNSTILE-RESEND-SETUP.md

Wynik: motowycena-PELNY-RAPORT.pdf
"""

import re
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

BASE = Path(__file__).parent

# ===== FONTS =====
# Arial – dostępne na każdym Windows, dobre wsparcie polskich znaków.
pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", "C:/Windows/Fonts/ariali.ttf"))
pdfmetrics.registerFont(TTFont("Arial-BoldItalic", "C:/Windows/Fonts/arialbi.ttf"))
pdfmetrics.registerFontFamily(
    "Arial",
    normal="Arial",
    bold="Arial-Bold",
    italic="Arial-Italic",
    boldItalic="Arial-BoldItalic",
)
# Courier do code – ma polskie znaki w bazowym Windows
pdfmetrics.registerFont(TTFont("Consolas", "C:/Windows/Fonts/consola.ttf"))
pdfmetrics.registerFont(TTFont("Consolas-Bold", "C:/Windows/Fonts/consolab.ttf"))


# ===== COLORS =====
BRAND_BLUE = HexColor("#1e3a8a")
BRAND_LIGHT = HexColor("#dbeafe")
TEXT_GRAY = HexColor("#374151")
LIGHT_GRAY = HexColor("#f3f4f6")
BORDER_GRAY = HexColor("#e5e7eb")
ACCENT_RED = HexColor("#dc2626")
ACCENT_GREEN = HexColor("#16a34a")
ACCENT_AMBER = HexColor("#d97706")


# ===== STYLES =====
def make_styles():
    s = {}
    s["Title"] = ParagraphStyle(
        "Title",
        fontName="Arial-Bold",
        fontSize=28,
        leading=34,
        textColor=BRAND_BLUE,
        alignment=TA_CENTER,
        spaceAfter=18,
    )
    s["Subtitle"] = ParagraphStyle(
        "Subtitle",
        fontName="Arial",
        fontSize=14,
        leading=18,
        textColor=TEXT_GRAY,
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    s["H1"] = ParagraphStyle(
        "H1",
        fontName="Arial-Bold",
        fontSize=20,
        leading=24,
        textColor=BRAND_BLUE,
        spaceBefore=20,
        spaceAfter=14,
        keepWithNext=True,
    )
    s["H2"] = ParagraphStyle(
        "H2",
        fontName="Arial-Bold",
        fontSize=15,
        leading=19,
        textColor=BRAND_BLUE,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True,
    )
    s["H3"] = ParagraphStyle(
        "H3",
        fontName="Arial-Bold",
        fontSize=12,
        leading=16,
        textColor=TEXT_GRAY,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True,
    )
    s["Body"] = ParagraphStyle(
        "Body",
        fontName="Arial",
        fontSize=10,
        leading=14,
        textColor=TEXT_GRAY,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
    )
    s["Quote"] = ParagraphStyle(
        "Quote",
        parent=s["Body"],
        leftIndent=12,
        borderColor=BRAND_BLUE,
        borderWidth=0,
        borderPadding=0,
        textColor=BRAND_BLUE,
        fontName="Arial-Italic",
    )
    s["Code"] = ParagraphStyle(
        "Code",
        fontName="Consolas",
        fontSize=9,
        leading=12,
        textColor=TEXT_GRAY,
        backColor=LIGHT_GRAY,
        borderColor=BORDER_GRAY,
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=8,
        leftIndent=0,
    )
    s["ListItem"] = ParagraphStyle(
        "ListItem",
        fontName="Arial",
        fontSize=10,
        leading=14,
        textColor=TEXT_GRAY,
        leftIndent=14,
        bulletIndent=4,
        spaceAfter=3,
    )
    s["TOC1"] = ParagraphStyle(
        "TOC1",
        fontName="Arial-Bold",
        fontSize=12,
        textColor=BRAND_BLUE,
        leading=16,
        leftIndent=0,
        spaceBefore=8,
    )
    s["TOC2"] = ParagraphStyle(
        "TOC2",
        fontName="Arial",
        fontSize=10,
        textColor=TEXT_GRAY,
        leading=13,
        leftIndent=16,
    )
    s["Footer"] = ParagraphStyle(
        "Footer",
        fontName="Arial",
        fontSize=8,
        textColor=HexColor("#9ca3af"),
        alignment=TA_CENTER,
    )
    s["Caption"] = ParagraphStyle(
        "Caption",
        fontName="Arial-Italic",
        fontSize=9,
        textColor=HexColor("#6b7280"),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    return s


STYLES = make_styles()


# ===== MARKDOWN → REPORTLAB =====
def md_inline_to_reportlab(text: str) -> str:
    """Konwertuje markdown inline na ReportLab inline tags."""
    # Escape XML chars first (ale zachowujemy istniejące tagi)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Bold: **text**
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    # Italic: *text* (ale nie wewnątrz already-processed bold)
    text = re.sub(r"(?<![*\w])\*([^*\n]+)\*(?!\*)", r"<i>\1</i>", text)
    # Inline code: `code`
    text = re.sub(
        r"`([^`]+)`",
        r'<font name="Consolas" backColor="#f3f4f6" color="#1e3a8a">&#160;\1&#160;</font>',
        text,
    )
    # Links: [text](url)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<link href="\2" color="#1e3a8a"><u>\1</u></link>',
        text,
    )
    # Emoji/special chars → tekst
    emoji_map = {
        "✅": "[OK]",
        "❌": "[NIE]",
        "⚠️": "[!]",
        "🚨": "[!!]",
        "🔴": "[P0]",
        "🟠": "[P1]",
        "🟡": "[P2]",
        "🟢": "[OK]",
        "⭐": "*",
        "📋": "",
        "📊": "",
        "📅": "",
        "📡": "",
        "📦": "",
        "🚀": "",
        "🎯": "",
        "🏗️": "",
        "🔌": "",
        "🛡️": "",
        "💡": "",
        "💰": "",
        "🔒": "",
        "🌐": "",
        "🗣️": "",
        "🏝️": "",
        "🔵": "",
        "🟦": "",
        "📝": "",
        "↑": "wzrost ",
        "↓": "spadek ",
        "→": "->",
        "←": "<-",
        "—": "-",
        "–": "-",
        "≥": ">=",
        "≤": "<=",
        "±": "+/-",
        "×": "x",
        "÷": "/",
        "€": "EUR",
        "🕗": "",
        "🕖": "",
        "🚗": "",
    }
    for k, v in emoji_map.items():
        text = text.replace(k, v)
    return text


def parse_markdown_to_flowables(md_text: str, section_num: str | None = None):
    """Parsuje markdown na listę Flowables dla reportlab."""
    lines = md_text.split("\n")
    flowables = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # PUSTE LINIE
        if not stripped:
            i += 1
            continue

        # HORIZONTAL RULE
        if re.match(r"^-{3,}$", stripped) or re.match(r"^\*{3,}$", stripped):
            flowables.append(Spacer(1, 4))
            flowables.append(
                HRFlowable(width="100%", color=BORDER_GRAY, thickness=0.5)
            )
            flowables.append(Spacer(1, 6))
            i += 1
            continue

        # CODE BLOCK
        if stripped.startswith("```"):
            i += 1
            code_lines = []
            while i < n and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            code_text = (
                "\n".join(code_lines)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace(" ", "&#160;")
                .replace("\n", "<br/>")
            )
            flowables.append(Paragraph(code_text, STYLES["Code"]))
            continue

        # HEADINGS
        h_match = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if h_match:
            level = len(h_match.group(1))
            content = h_match.group(2)
            # Strip emoji at start
            content = re.sub(r"^[^\w\s]+\s*", "", content).strip()
            content = md_inline_to_reportlab(content)
            style_key = f"H{min(level, 3)}"
            flowables.append(Paragraph(content, STYLES[style_key]))
            i += 1
            continue

        # TABLE (markdown pipe table)
        if "|" in line and i + 1 < n and re.match(r"^[\s|:\-]+$", lines[i + 1].strip()):
            table_lines = [line]
            i += 1  # header
            i += 1  # separator
            while i < n and "|" in lines[i] and lines[i].strip():
                table_lines.append(lines[i])
                i += 1

            # Parsuj tabelę
            rows = []
            for tl in table_lines:
                cells = [c.strip() for c in tl.strip().strip("|").split("|")]
                rows.append(cells)

            if rows:
                # Konwertuj komórki na Paragraph (wsparcie inline markdown)
                cell_style = ParagraphStyle(
                    "CellBody",
                    fontName="Arial",
                    fontSize=9,
                    leading=12,
                    textColor=TEXT_GRAY,
                )
                cell_header_style = ParagraphStyle(
                    "CellHeader",
                    fontName="Arial-Bold",
                    fontSize=9,
                    leading=12,
                    textColor=colors.white,
                )
                table_data = []
                for ri, row in enumerate(rows):
                    style = cell_header_style if ri == 0 else cell_style
                    table_data.append(
                        [Paragraph(md_inline_to_reportlab(c), style) for c in row]
                    )

                # Auto column width based on # of columns
                ncols = max(len(r) for r in table_data)
                col_widths = [(16 * cm) / ncols] * ncols

                tbl = Table(table_data, colWidths=col_widths, hAlign="LEFT")
                tbl.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
                            ("GRID", (0, 0), (-1, -1), 0.25, BORDER_GRAY),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 5),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                            ("TOPPADDING", (0, 0), (-1, -1), 4),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ]
                    )
                )
                flowables.append(Spacer(1, 4))
                flowables.append(tbl)
                flowables.append(Spacer(1, 8))
            continue

        # UNORDERED LIST
        if re.match(r"^[-*+]\s+", stripped):
            items = []
            while i < n:
                ls = lines[i].strip()
                m = re.match(r"^[-*+]\s+(.+)$", ls)
                if not m:
                    if ls == "":
                        # patrz czy następna linia to też lista - jeśli tak, kontynuuj
                        j = i + 1
                        while j < n and lines[j].strip() == "":
                            j += 1
                        if j < n and re.match(r"^[-*+]\s+", lines[j].strip()):
                            i = j
                            continue
                    break
                items.append(md_inline_to_reportlab(m.group(1)))
                i += 1

            list_items = [
                ListItem(Paragraph(it, STYLES["ListItem"]), leftIndent=20)
                for it in items
            ]
            flowables.append(
                ListFlowable(
                    list_items,
                    bulletType="bullet",
                    start="•",  # • U+2022
                    leftIndent=10,
                    bulletFontName="Arial",
                    bulletFontSize=10,
                    bulletColor=BRAND_BLUE,
                )
            )
            flowables.append(Spacer(1, 4))
            continue

        # ORDERED LIST
        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while i < n:
                ls = lines[i].strip()
                m = re.match(r"^\d+\.\s+(.+)$", ls)
                if not m:
                    break
                items.append(md_inline_to_reportlab(m.group(1)))
                i += 1
            list_items = [
                ListItem(Paragraph(it, STYLES["ListItem"]), leftIndent=20)
                for it in items
            ]
            flowables.append(
                ListFlowable(
                    list_items,
                    bulletType="1",
                    leftIndent=10,
                    bulletFontName="Arial",
                    bulletFontSize=10,
                )
            )
            flowables.append(Spacer(1, 4))
            continue

        # BLOCKQUOTE
        if stripped.startswith(">"):
            quote_lines = []
            while i < n and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip().lstrip(">").strip())
                i += 1
            quote_text = " ".join(quote_lines)
            flowables.append(Paragraph(md_inline_to_reportlab(quote_text), STYLES["Quote"]))
            continue

        # NORMAL PARAGRAPH (akumulacja kolejnych linii)
        para_lines = [stripped]
        i += 1
        while i < n:
            nxt = lines[i].strip()
            if not nxt:
                break
            if (
                nxt.startswith("#")
                or nxt.startswith("```")
                or re.match(r"^[-*+]\s+", nxt)
                or re.match(r"^\d+\.\s+", nxt)
                or nxt.startswith(">")
                or "|" in nxt
            ):
                break
            para_lines.append(nxt)
            i += 1
        para_text = " ".join(para_lines)
        flowables.append(Paragraph(md_inline_to_reportlab(para_text), STYLES["Body"]))

    return flowables


# ===== PAGE TEMPLATE (header/footer) =====
def on_page(canvas, doc):
    canvas.saveState()
    # Footer
    canvas.setFont("Arial", 8)
    canvas.setFillColor(HexColor("#9ca3af"))
    canvas.drawCentredString(
        A4[0] / 2,
        15 * mm,
        f"motowycena.pl · Plan przebudowy · str. {doc.page}",
    )
    # Header line on pages > 1
    if doc.page > 1:
        canvas.setStrokeColor(BORDER_GRAY)
        canvas.setLineWidth(0.3)
        canvas.line(20 * mm, A4[1] - 18 * mm, A4[0] - 20 * mm, A4[1] - 18 * mm)
        canvas.setFont("Arial", 8)
        canvas.setFillColor(HexColor("#9ca3af"))
        canvas.drawString(20 * mm, A4[1] - 14 * mm, "motowycena.pl")
        canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 14 * mm, "Plan przebudowy 2026")
    canvas.restoreState()


# ===== COVER PAGE =====
def build_cover():
    flowables = []
    flowables.append(Spacer(1, 8 * cm))
    flowables.append(
        Paragraph("MOTOWYCENA.PL", STYLES["Title"])
    )
    flowables.append(
        Paragraph("Plan przebudowy i optymalizacji SEO", STYLES["Subtitle"])
    )
    flowables.append(Spacer(1, 1 * cm))
    flowables.append(
        HRFlowable(width="40%", color=BRAND_BLUE, thickness=2, hAlign="CENTER")
    )
    flowables.append(Spacer(1, 2 * cm))

    # Info table
    info_data = [
        ["Klient:", "Rafal Pelczar - Rzeczoznawca Techniki Samochodowej"],
        ["Certyfikat:", "RS001771"],
        ["Domena:", "https://www.motowycena.pl"],
        ["Stack docelowy:", "Astro 5 + React 19"],
        ["Czas wdrozenia:", "3-4 tygodnie"],
        ["Ryzyko utraty pozycji SEO:", "ponizej 5%"],
        ["Data dokumentu:", "Maj 2026"],
    ]
    info_cell_label = ParagraphStyle(
        "InfoLabel", fontName="Arial-Bold", fontSize=10, textColor=TEXT_GRAY
    )
    info_cell_val = ParagraphStyle(
        "InfoVal", fontName="Arial", fontSize=10, textColor=TEXT_GRAY
    )
    info_pdata = [
        [Paragraph(r[0], info_cell_label), Paragraph(r[1], info_cell_val)]
        for r in info_data
    ]
    tbl = Table(info_pdata, colWidths=[5.5 * cm, 9 * cm], hAlign="CENTER")
    tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, BORDER_GRAY),
            ]
        )
    )
    flowables.append(tbl)
    flowables.append(Spacer(1, 3 * cm))
    flowables.append(
        Paragraph(
            "<i>Pelna dokumentacja techniczna i strategiczna projektu</i>",
            STYLES["Caption"],
        )
    )
    flowables.append(PageBreak())
    return flowables


# ===== TABLE OF CONTENTS =====
def build_toc():
    flowables = []
    flowables.append(Paragraph("Spis tresci", STYLES["H1"]))
    flowables.append(Spacer(1, 8))

    toc_items = [
        ("CZESC I  -  DLA KLIENTA", None),
        ("1.  Wytlumaczenie po ludzku", None),
        ("2.  Podsumowanie wykonawcze", None),
        ("", None),
        ("CZESC II  -  ANALIZA TECHNICZNA", None),
        ("3.  Audyt SEO obecnej strony", None),
        ("4.  Wybor stacka technologicznego", None),
        ("5.  Mapa URL (strategia 1:1)", None),
        ("", None),
        ("CZESC III  -  WDROZENIE", None),
        ("6.  Plan migracji - krok po kroku", None),
        ("7.  Checklist migracji", None),
        ("8.  Konkretne ulepszenia SEO", None),
        ("", None),
        ("CZESC IV  -  SETUP TECHNICZNY", None),
        ("9.  Turnstile + Resend - integracja", None),
        ("", None),
        ("CZESC V  -  ENCYKLOPEDIA TECHNICZNA", None),
        ("10. Pojecia + definicje + kod (40+ tematow)", None),
        ("    A. Framework i frontend (Astro, React, TS, Tailwind)", None),
        ("    B. SEO techniczne (meta, JSON-LD, OG, sitemap)", None),
        ("    C. Performance i Core Web Vitals", None),
        ("    D. Formularze i backend (PE, PRG, Turnstile, Resend)", None),
        ("    E. Bezpieczenstwo i prawo (HTTPS, HSTS, RODO, CSP)", None),
        ("    F. Strategia URL i linkowanie", None),
        ("    G. Hosting i deploy (Cloudflare, Edge, CI/CD)", None),
        ("    H. Narzedzia pomiarowe (Lighthouse, RUM)", None),
        ("    I. Content management (Markdown, MDX, Headless CMS)", None),
        ("    J. Wersjowanie i package management", None),
        ("", None),
        ("DODATKI", None),
        ("11. Slowniczek pojec", None),
    ]
    for label, _ in toc_items:
        if not label:
            flowables.append(Spacer(1, 4))
            continue
        if label.startswith("CZESC") or label.startswith("DODATKI"):
            flowables.append(Paragraph(label, STYLES["TOC1"]))
        else:
            flowables.append(Paragraph(label, STYLES["TOC2"]))

    flowables.append(PageBreak())
    return flowables


# ===== SECTION HEADER =====
def section_header(part: str, title: str):
    return [
        Spacer(1, 2 * cm),
        Paragraph(
            f'<font color="#9ca3af">{part}</font>',
            ParagraphStyle("PartLabel", fontName="Arial", fontSize=10, alignment=TA_CENTER),
        ),
        Spacer(1, 6),
        Paragraph(
            title,
            ParagraphStyle(
                "PartTitle",
                fontName="Arial-Bold",
                fontSize=28,
                textColor=BRAND_BLUE,
                alignment=TA_CENTER,
                leading=32,
            ),
        ),
        Spacer(1, 8),
        HRFlowable(width="30%", color=BRAND_BLUE, thickness=2, hAlign="CENTER"),
        PageBreak(),
    ]


# ===== LOAD MD FILES =====
def load_md(rel_path: str) -> str:
    path = BASE / rel_path
    return path.read_text(encoding="utf-8")


# ===== GLOSSARY =====
def build_glossary():
    flowables = []
    flowables.append(Paragraph("10. Slowniczek pojec", STYLES["H1"]))
    flowables.append(
        Paragraph(
            "Wszystkie terminy techniczne tlumaczeniu na codzienny jezyk - do uzycia w rozmowie z klientem.",
            STYLES["Body"],
        )
    )
    flowables.append(Spacer(1, 8))

    terms = [
        ("SEO", "Co robi ze Google znajduje strone. Im lepsze, tym wyzsze pozycje w wyszukiwarce."),
        ("Meta description", "Krotki opis pod tytulem w Google. Dziala jak reklama - zacheca do kliknieciu."),
        ("Schema markup (JSON-LD)", "Wizytowka strony, ktora czyta Google. Mowi mu kim jestes, gdzie dzialasz, co oferujesz."),
        ("Astro", "Nowoczesny system do budowy stron, ktory generuje czysty HTML. Najszybszy dla stron uslugowych."),
        ("React", "System komponentow uzywany do interaktywnych czesci (formularz, przyciski). Najpopularniejszy w 2026."),
        ("Cloudflare Pages", "Darmowy hosting na komputerach Cloudflare. Strona ladowana z najblizszego serwera (Polska, Niemcy, USA - automatycznie)."),
        ("Sitemap (XML)", "Spis tresci strony dla Google - lista wszystkich podstron z datami ostatniej modyfikacji."),
        ("Trailing slash", "Ukosnik na koncu adresu URL (np. /kontakt/ a nie /kontakt). Zostawiamy taki sam jak teraz - krytyczne dla SEO."),
        ("Schema LocalBusiness", "Specjalna 'wizytowka' dla lokalnych firm. Po jej dodaniu Google moze pokazac Twoja firme w mapach."),
        ("Core Web Vitals", "Trzy pomiary szybkosci strony uzywane przez Google: jak szybko sie ladowala, jak szybko reaguje na klikniecie, jak stabilny jest uklad."),
        ("LCP", "Largest Contentful Paint - jak szybko ladowala sie najwieksza czesc strony. Cel: ponizej 2.5 sekundy."),
        ("CLS", "Cumulative Layout Shift - czy elementy strony 'skacza' podczas ladowania. Cel: bliski zera."),
        ("INP", "Interaction to Next Paint - jak szybko strona reaguje na klikniecie. Cel: ponizej 200ms."),
        ("OG image", "Ladny obrazek, ktory wyswietla sie gdy udostepniasz link strony na Facebooku, LinkedIn, WhatsApp."),
        ("Progressive enhancement", "Formularz dziala zawsze - z wlaczonym i wylaczonym JavaScript. Lepsze UX z JS, ale podstawowa funkcjonalnosc bez JS."),
        ("Cloudflare Turnstile", "Niewidzialny 'bramkarz' przeciwko botom spamerskim. Lepszy niz reCAPTCHA, darmowy, zgodny z RODO."),
        ("Resend", "Serwis do wysylki maili z formularza. 3000 maili miesiecznie za darmo."),
        ("Honeypot", "Niewidoczne pole w formularzu - ludzie go nie widza, boty go wypelniaja i wpadaja w pulapke."),
        ("Content Collection", "Folder z plikami tresci (MDX/Markdown), ktore Astro zamienia na strony www."),
        ("TinaCMS", "Wizualny panel administracyjny do edycji tresci - dziala jak WordPress, ale bez WordPressa."),
        ("Sanity / Strapi", "Headless CMS-y - bardziej zaawansowane panele do zarzadzania trescia. Uzywane gdy strona ma duzo dynamicznej tresci (blog, katalog)."),
        ("301 redirect", "Stale przekierowanie ze starego adresu URL na nowy. My NIE potrzebujemy - bo zostawiamy wszystkie stare adresy."),
        ("Cache", "Pamiec podreczna - strona zostaje 'zapamietana' po pierwszym ladowaniu i nastepne razy laduje sie blyskawicznie."),
        ("HTTPS", "Zielona kludka w pasku adresu - oznacza bezpieczne, szyfrowane polaczenie. Wymagane przez Google."),
        ("CDN (Content Delivery Network)", "Siec serwerow rozproszonych geograficznie. Klient z Polski laczy sie z serwerem w Polsce, z Niemiec - w Niemczech. Bardzo szybko."),
        ("PRG pattern (Post/Redirect/Get)", "Trzykrokowy schemat dla formularzy: wyslanie, przekierowanie, pokazanie strony 'dziekuje'. Zapobiega podwojnym wyslaniom."),
        ("RODO / GDPR", "Europejskie przepisy o ochronie danych osobowych. Strona musi miec polityke prywatnosci, cookies tylko za zgoda, dane przechowywane bezpiecznie."),
        ("DNS", "System tlumaczacy nazwy domen (motowycena.pl) na adresy serwerow. Podczas wdrozenia jedyne co zmieniamy."),
        ("TTL (Time To Live)", "Jak dlugo DNS pamieta odpowiedz. Podczas migracji obnizamy do 300s zeby szybko przelaczyc serwer."),
    ]

    cell_style_b = ParagraphStyle(
        "GlossB", fontName="Arial-Bold", fontSize=9, textColor=BRAND_BLUE, leading=12
    )
    cell_style_v = ParagraphStyle(
        "GlossV", fontName="Arial", fontSize=9, textColor=TEXT_GRAY, leading=12
    )
    rows = []
    for term, desc in terms:
        rows.append(
            [Paragraph(term, cell_style_b), Paragraph(desc, cell_style_v)]
        )
    tbl = Table(rows, colWidths=[4.5 * cm, 12 * cm])
    tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, BORDER_GRAY),
            ]
        )
    )
    flowables.append(tbl)
    return flowables


# ===== BUILD PDF =====
def main():
    out_path = BASE / "MOTOWYCENA-PELNY-RAPORT.pdf"
    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title="Motowycena - Plan przebudowy",
        author="Plan techniczno-strategiczny",
        subject="Motowycena.pl - migracja na Astro 5 + React 19",
    )

    story = []

    # COVER
    story.extend(build_cover())

    # TOC
    story.extend(build_toc())

    # CZĘŚĆ I
    story.extend(section_header("CZESC I", "Dla klienta"))
    story.append(Paragraph("1. Wytlumaczenie po ludzku", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("DLA-KLIENTA-PO-LUDZKU.md")))
    story.append(PageBreak())
    story.append(Paragraph("2. Podsumowanie wykonawcze", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("PODSUMOWANIE-DLA-KLIENTA.md")))
    story.append(PageBreak())

    # CZĘŚĆ II
    story.extend(section_header("CZESC II", "Analiza techniczna"))
    story.append(Paragraph("3. Audyt SEO obecnej strony", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("docs/01-AUDYT-SEO.md")))
    story.append(PageBreak())
    story.append(Paragraph("4. Wybor stacka technologicznego", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("docs/02-STACK-DECYZJA.md")))
    story.append(PageBreak())
    story.append(Paragraph("5. Mapa URL - strategia 1:1", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("docs/03-URL-MAPPING.md")))
    story.append(PageBreak())

    # CZĘŚĆ III
    story.extend(section_header("CZESC III", "Wdrozenie"))
    story.append(Paragraph("6. Plan migracji - krok po kroku", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("docs/04-PLAN-MIGRACJI.md")))
    story.append(PageBreak())
    story.append(Paragraph("7. Checklist migracji", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("docs/05-CHECKLIST.md")))
    story.append(PageBreak())
    story.append(Paragraph("8. Konkretne ulepszenia SEO", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("docs/06-SEO-IMPROVEMENTS.md")))
    story.append(PageBreak())

    # CZĘŚĆ IV
    story.extend(section_header("CZESC IV", "Setup techniczny"))
    story.append(Paragraph("9. Turnstile + Resend - integracja", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("app/docs/TURNSTILE-RESEND-SETUP.md")))
    story.append(PageBreak())

    # CZĘŚĆ V - ENCYKLOPEDIA TECHNICZNA (dla developera)
    story.extend(section_header("CZESC V", "Encyklopedia techniczna"))
    intro_style = ParagraphStyle(
        "Intro",
        parent=STYLES["Body"],
        fontSize=10.5,
        leading=15,
        textColor=BRAND_BLUE,
        spaceAfter=12,
        borderColor=BRAND_LIGHT,
        borderWidth=0,
        borderPadding=10,
        backColor=BRAND_LIGHT,
    )
    story.append(
        Paragraph(
            "<b>Dla developera:</b> kazde pojecie z 4 warstwami - po ludzku, definicja techniczna, "
            "mechanika pod spodem, kod z naszego projektu. Czytaj zeby <i>w chuj sie doszkolic</i>.",
            intro_style,
        )
    )
    story.append(Spacer(1, 8))
    story.append(Paragraph("10. Pojecia + definicje + kod", STYLES["H1"]))
    story.extend(parse_markdown_to_flowables(load_md("docs/07-ENCYKLOPEDIA-TECHNICZNA.md")))
    story.append(PageBreak())

    # DODATKI
    story.extend(section_header("DODATKI", "Slowniczek"))
    story.extend(build_glossary())

    # Build with on_page handler
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)

    print(f"PDF wygenerowany: {out_path}")
    print(f"Rozmiar: {out_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
