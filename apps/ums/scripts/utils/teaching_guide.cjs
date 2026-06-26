const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, PageNumber, NumberFormat, Footer,
  TableOfContents, convertInchesToTwip
} = require('docx');
const fs = require('fs');

// ─── Color palette ───────────────────────────────────────────────────────────
const NAVY    = "1B3A6B";   // deep royal blue
const GOLD    = "C49A00";   // warm gold
const TEAL    = "007B82";   // teal green
const PURPLE  = "5B2C6F";   // regal purple
const ORANGE  = "C0392B";   // warm red-orange
const LGRAY   = "F0F4F8";   // light background
const MGRAY   = "D0D8E4";   // mid-gray for borders
const DTEXT   = "1A1A2E";   // dark text
const WHITE   = "FFFFFF";

// ─── Border helper ────────────────────────────────────────────────────────────
const bdr = (color = MGRAY) => ({ style: BorderStyle.SINGLE, size: 1, color });
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: WHITE });
const allBorders = (color = MGRAY) => ({ top: bdr(color), bottom: bdr(color), left: bdr(color), right: bdr(color) });
const noBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() });

// ─── Paragraph factories ──────────────────────────────────────────────────────
function coverTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 52, bold: true, color: WHITE })]
  });
}
function coverSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 28, color: "E8D8A0", italics: true })]
  });
}
function spacer(pts = 160) {
  return new Paragraph({ spacing: { before: 0, after: pts }, children: [new TextRun("")] });
}
function h1(text, color = NAVY) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color })]
  });
}
function h2(text, color = TEAL) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color })]
  });
}
function h3(text, color = PURPLE) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color })]
  });
}
function body(text, options = {}) {
  const { bold = false, italic = false, color = DTEXT, size = 22, before = 60, after = 100 } = options;
  return new Paragraph({
    spacing: { before, after },
    children: [new TextRun({ text, font: "Arial", size, bold, italic, color })]
  });
}
function mixed(runs, options = {}) {
  const { before = 60, after = 100, alignment } = options;
  return new Paragraph({
    spacing: { before, after },
    alignment,
    children: runs.map(r => new TextRun({ font: "Arial", size: 22, color: DTEXT, ...r }))
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DTEXT })]
  });
}
function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DTEXT })]
  });
}

// ─── Colored banner paragraph ─────────────────────────────────────────────────
function banner(label, text, bgColor = NAVY, textColor = WHITE) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({ children: [
        new TableCell({
          borders: noBorders(),
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: 140, bottom: 140, left: 200, right: 200 },
          width: { size: 9360, type: WidthType.DXA },
          children: [
            new Paragraph({ spacing: { before: 0, after: 40 }, children: [
              new TextRun({ text: label.toUpperCase(), font: "Arial", size: 18, bold: true, color: GOLD, allCaps: true })
            ]}),
            new Paragraph({ spacing: { before: 0, after: 0 }, children: [
              new TextRun({ text, font: "Arial", size: 22, color: textColor })
            ]})
          ]
        })
      ]})
    ]
  });
}

// ─── Two-column info table ─────────────────────────────────────────────────────
function infoTable(rows, leftColor = NAVY, rightColor = LGRAY) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: rows.map(([left, right]) => new TableRow({ children: [
      new TableCell({
        borders: allBorders(MGRAY),
        shading: { fill: leftColor, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: 2800, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: left, font: "Arial", size: 20, bold: true, color: WHITE })] })]
      }),
      new TableCell({
        borders: allBorders(MGRAY),
        shading: { fill: rightColor, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 120 },
        width: { size: 6560, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: right, font: "Arial", size: 21, color: DTEXT })] })]
      })
    ]}))
  });
}

// ─── Philosopher card table ───────────────────────────────────────────────────
function philCard(name, dates, contribution, christian) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({ children: [new TableCell({
        borders: allBorders(NAVY),
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        children: [new Paragraph({ children: [
          new TextRun({ text: name, font: "Arial", size: 26, bold: true, color: WHITE }),
          new TextRun({ text: "  " + dates, font: "Arial", size: 20, color: "C8D8EC", italics: true })
        ]})]
      })]})
    , new TableRow({ children: [new TableCell({
        borders: allBorders(MGRAY),
        shading: { fill: LGRAY, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        children: [
          new Paragraph({ spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "💡 KEY IDEA", font: "Arial", size: 18, bold: true, color: TEAL })] }),
          new Paragraph({ spacing: { before: 0, after: 100 }, children: [new TextRun({ text: contribution, font: "Arial", size: 21, color: DTEXT })] }),
          new Paragraph({ spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "✝ CHRISTIAN REFLECTION", font: "Arial", size: 18, bold: true, color: PURPLE })] }),
          new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: christian, font: "Arial", size: 21, color: DTEXT, italics: true })] })
        ]
      })]})
    ]
  });
}

// ─── Callout box ─────────────────────────────────────────────────────────────
function callout(icon, title, text, bgColor = "FFF8E8", borderColor = GOLD) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: bdr(borderColor), bottom: bdr(borderColor), left: { style: BorderStyle.SINGLE, size: 12, color: borderColor }, right: bdr(borderColor) },
      shading: { fill: bgColor, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      width: { size: 9360, type: WidthType.DXA },
      children: [
        new Paragraph({ spacing: { before: 0, after: 60 }, children: [new TextRun({ text: icon + " " + title, font: "Arial", size: 22, bold: true, color: borderColor })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text, font: "Arial", size: 21, color: DTEXT })] })
      ]
    })]})
    ]
  });
}

// ─── Comparison table ─────────────────────────────────────────────────────────
function compTable(headers, rows, headerBg = NAVY) {
  const colCount = headers.length;
  const colWidth = Math.floor(9360 / colCount);
  const colWidths = headers.map(() => colWidth);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map(h => new TableCell({
        borders: allBorders(WHITE),
        shading: { fill: headerBg, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        width: { size: colWidth, type: WidthType.DXA },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: "Arial", size: 22, bold: true, color: WHITE })] })]
      }))  }),
      ...rows.map((row, ri) => new TableRow({ children: row.map(cell => new TableCell({
        borders: allBorders(MGRAY),
        shading: { fill: ri % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: colWidth, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Arial", size: 20, color: DTEXT })] })]
      }))  }))
    ]
  });
}

// ─── Section divider ─────────────────────────────────────────────────────────
function sectionDivider(chapterNum, chapterTitle, subtitle) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorders(),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 280, bottom: 280, left: 300, right: 300 },
      width: { size: 9360, type: WidthType.DXA },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [
          new TextRun({ text: "CHAPTER " + chapterNum, font: "Arial", size: 22, bold: true, color: GOLD, allCaps: true })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [
          new TextRun({ text: chapterTitle, font: "Arial", size: 40, bold: true, color: WHITE })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [
          new TextRun({ text: subtitle, font: "Arial", size: 22, color: "B8CCE0", italics: true })
        ]})
      ]
    })]})
    ]
  });
}

// ─── PAGE BREAK ─────────────────────────────────────────────────────────────
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── DISCUSSION QUESTIONS TABLE ──────────────────────────────────────────────
function discussionTable(questions) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [400, 8960],
    rows: questions.map((q, i) => new TableRow({ children: [
      new TableCell({
        borders: allBorders(TEAL),
        shading: { fill: TEAL, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        width: { size: 400, type: WidthType.DXA },
        verticalAlign: "center",
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i+1), font: "Arial", size: 24, bold: true, color: WHITE })] })]
      }),
      new TableCell({
        borders: allBorders(MGRAY),
        shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 120 },
        width: { size: 8960, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: q, font: "Arial", size: 21, color: DTEXT })] })]
      })
    ]}))
  });
}

// ─── KEY TERMS TABLE ─────────────────────────────────────────────────────────
function keyTermsTable(terms) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: allBorders(WHITE), shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 120 }, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "TERM", font: "Arial", size: 21, bold: true, color: WHITE })] })] }),
        new TableCell({ borders: allBorders(WHITE), shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 120 }, width: { size: 6960, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "DEFINITION", font: "Arial", size: 21, bold: true, color: WHITE })] })] })
      ]}),
      ...terms.map(([term, def], i) => new TableRow({ children: [
        new TableCell({ borders: allBorders(MGRAY), shading: { fill: i % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 120 }, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: term, font: "Arial", size: 20, bold: true, color: NAVY })] })] }),
        new TableCell({ borders: allBorders(MGRAY), shading: { fill: i % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 120 }, width: { size: 6960, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: def, font: "Arial", size: 20, color: DTEXT })] })] })
      ]}))
    ]
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
                 { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }]
      },
      {
        reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: DTEXT } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial", color: TEAL }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: PURPLE }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Introduction to Philosophy | Chapters 11 & 12 Teaching Guide  •  Page ", font: "Arial", size: 18, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" })
          ]
        })]
      })
    },
    children: [

      // ══════════════════════ COVER PAGE ══════════════════════
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          borders: noBorders(),
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 600, bottom: 600, left: 400, right: 400 },
          width: { size: 9360, type: WidthType.DXA },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 }, children: [new TextRun({ text: "✦  INTRODUCTION TO PHILOSOPHY  ✦", font: "Arial", size: 20, color: GOLD, bold: true, allCaps: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [new TextRun({ text: "TEACHING GUIDE", font: "Arial", size: 56, bold: true, color: WHITE })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 }, children: [new TextRun({ text: "Chapters 11 & 12", font: "Arial", size: 34, color: GOLD, bold: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 }, children: [new TextRun({ text: "Political Philosophy  ·  Contemporary Philosophies & Social Theories", font: "Arial", size: 24, color: "B8CCE0", italics: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "─────────────────────────────────", font: "Arial", size: 22, color: GOLD })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "Comprehensive  ·  Beginner-Friendly  ·  Faith-Integrated", font: "Arial", size: 22, color: "E0EEFF", italics: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 }, children: [new TextRun({ text: "Designed for Christian Learners", font: "Arial", size: 24, bold: true, color: GOLD })] })
          ]
        })]})
        ]
      }),

      spacer(300),

      // Bible verse callout
      callout("📖", "A Word for the Journey",
        "\"For by him all things were created: things in heaven and on earth, visible and invisible, whether thrones or powers or rulers or authorities; all things were created by him and for him.\" — Colossians 1:16\n\nAs we study political philosophy and social theories, we do so remembering that all authority ultimately traces back to God. These chapters explore how human beings think about governance, justice, and meaning — questions that deeply concern the Christian faith.",
        "FFF3D4", GOLD),

      spacer(200),

      // HOW TO USE THIS GUIDE
      h1("📘  How to Use This Guide"),
      body("This teaching guide is designed to walk you through Chapters 11 and 12 of Introduction to Philosophy in a clear, approachable way — with special connections to the Christian faith woven throughout. Whether you are a student, a teacher, or a curious reader, this guide is your companion."),
      spacer(60),

      compTable(
        ["This Guide Includes", "Why It Matters"],
        [
          ["Plain-English summaries", "Understand ideas without jargon"],
          ["Real-life illustrations & analogies", "Anchor abstract ideas in everyday experience"],
          ["Christian Faith Connections", "See how philosophy relates to biblical truth"],
          ["Philosopher Profile Cards", "Know who said what and why it matters"],
          ["Key Terms Tables", "Master the vocabulary of each section"],
          ["Discussion Questions", "Engage deeply and think critically"],
          ["Visual Comparison Charts", "Compare ideas side by side at a glance"],
          ["Self-Check Quizzes", "Test your understanding before moving on"],
        ],
        TEAL
      ),

      spacer(200),
      pageBreak(),

      // ══════════════════════ CHAPTER 11 ══════════════════════
      sectionDivider("11", "Political Philosophy", "Justice, Authority, Government & Ideology"),
      spacer(200),

      h1("🗺  Chapter 11 Overview: The Big Picture"),
      body("Politics is all around us — in the news, in our communities, and in our daily lives. But have you ever stopped to ask: Where does the right to govern come from? What makes a law just or unjust? What kind of government is best? These are the questions of political philosophy."),
      spacer(60),
      callout("💡", "Simple Definition",
        "Political philosophy is the branch of philosophy that studies government, justice, citizenship, and authority. It asks foundational questions like: Who should rule? What makes a government legitimate? What rights do citizens have? What duties do we owe one another?",
        "E8F4F8", TEAL),
      spacer(100),
      body("Chapter 11 is divided into four main topics:", { bold: true }),
      bullet("Historical Perspectives on Government — How ancient thinkers from Greece, China, and the Islamic world imagined the ideal society"),
      bullet("Forms of Government — Different systems: monarchy, aristocracy, democracy, totalitarianism"),
      bullet("Political Legitimacy and Duty — What gives a government the right to rule? What do citizens owe the state?"),
      bullet("Political Ideologies — Conservatism, liberalism, egalitarianism, socialism, and anarchism"),
      spacer(120),

      // ─── FAITH BRIDGE ──────────────────────────────────────
      callout("✝", "Faith Bridge: Why Christians Care About Political Philosophy",
        "Romans 13:1 says: \"Let everyone be subject to the governing authorities, for there is no authority except that which God has established.\" Political philosophy helps us understand what governance is, why it exists, and what makes it just or unjust — all deeply relevant questions for a Christian living in the world. Christians throughout history — from Augustine's City of God to Martin Luther King Jr.'s Letters from Birmingham Jail — have engaged political philosophy to advocate for justice.",
        "F5EEF8", PURPLE),

      spacer(180),
      pageBreak(),

      // ─── 11.1 ─────────────────────────────────────────────
      h2("11.1  Historical Perspectives on Government"),
      body("Long before modern nations existed, thinkers across the world were asking: What does a just society look like, and who should lead it? Let us explore three major historical traditions."),
      spacer(80),

      // ILLUSTRATION
      callout("🏛", "Illustration: The School of Athens",
        "Imagine a classroom where Plato, a Chinese philosopher, and an Islamic scholar are all debating the same question: 'What makes a city good?' Each comes from a different world, yet they share a deep conviction — that governance and virtue are inseparable. This is the conversation Chapter 11 invites us into.",
        "E8F4F8", TEAL),
      spacer(120),

      h3("A) Plato's Just City (Ancient Greece, ~380 BCE)"),
      body("Plato believed that a just city is like a well-ordered soul — each part doing its proper job. In his book The Republic, he imagines the ideal city built on four virtues:"),
      spacer(40),
      infoTable([
        ["Wisdom", "Exercised by rulers (philosopher-kings) who understand what is truly good"],
        ["Courage", "Possessed by soldiers (guardians) who protect the city"],
        ["Discipline", "Practiced by all citizens — keeping desires in check"],
        ["Justice", "Each person does what they are naturally suited for"],
      ], NAVY, LGRAY),
      spacer(100),

      callout("🏠", "Everyday Analogy",
        "Think of a healthy family: parents lead with wisdom, older children help protect and guide younger siblings (courage), everyone manages their responsibilities (discipline), and each person contributes their unique gifts. That is Plato's just city in miniature.",
        "E8F4F8", TEAL),
      spacer(80),

      philCard("Plato", "428–348 BCE",
        "Believed the ideal city should be governed by philosopher-kings — wise leaders trained in virtue. Society should be structured in three tiers: rulers (wisdom), guardians (courage), and workers (discipline). Justice means each group fulfilling its role well.",
        "Christians can appreciate Plato's conviction that rulers must be morally virtuous, not merely powerful. This echoes Proverbs 29:2: \"When the righteous thrive, the people rejoice; when the wicked rule, the people groan.\" However, Christians would differ from Plato in insisting that true wisdom comes from God, not just reason."),
      spacer(80),

      philCard("Aristotle", "384–322 BCE",
        "Plato's most famous student. Believed humans are by nature political beings — we need community to live a good life. The goal of the state is to help citizens live virtuously. Laws should train people in good habits.",
        "Aristotle's view that humans are made for community resonates with the Christian understanding of the Church as the Body of Christ (1 Corinthians 12). We are not isolated individuals — we belong to one another."),
      spacer(80),

      h3("B) Mohism in Ancient China (~470–391 BCE)"),
      body("Mozi, a Chinese philosopher-reformer, developed a political philosophy centred on universal love (jian ai) and the common good. He believed that social chaos arises when everyone follows only their own moral compass. A wise, virtuous ruler chosen by heaven is needed to unify society around shared moral standards."),
      spacer(60),
      callout("🌏", "Comparing East and West",
        "Mozi and Plato lived roughly at the same time on opposite sides of the globe and reached remarkably similar conclusions: society needs virtuous leadership and shared moral norms. This parallel development of ideas across cultures is a fascinating example of what philosophers call 'convergent reasoning.'",
        "FFF3D4", GOLD),
      spacer(80),

      philCard("Mozi (Mo Di)", "470–391 BCE",
        "Taught that universal love and benevolence should guide governance. Opposed aggression and war. Believed Heaven chooses a wise ruler to bring order and moral education to society. The morality of actions is judged by their benefit to others.",
        "Mozi's concept of universal love (jian ai) and his opposition to war echo Jesus's command to 'love your neighbor as yourself' (Mark 12:31) and the Sermon on the Mount's blessing of the peacemakers (Matthew 5:9). Christians will find surprising common ground here."),
      spacer(80),

      h3("C) Al-Farabi's City of Excellence (Islamic World, ~870–950 CE)"),
      body("Al-Farabi, often called the 'Second Master' (with Aristotle being the first), combined Greek political philosophy with Islamic thought. He believed the ideal city is ruled by a supreme philosopher-ruler who possesses both practical wisdom (knowing how to govern) and theoretical wisdom (understanding truth and goodness). The goal: a 'city of excellence' where citizens can pursue true happiness through virtue."),
      spacer(60),

      infoTable([
        ["True Happiness", "Comes from virtuous action and moral character development"],
        ["Presumed Happiness", "False happiness focused on money, power, and pleasure — it corrupts"],
        ["Supreme Ruler", "Possesses both practical statecraft AND theoretical knowledge of virtue"],
        ["City of Excellence", "Where citizens are guided toward moral flourishing — not just material well-being"],
      ], PURPLE, LGRAY),
      spacer(80),

      callout("✝", "Faith Reflection: What Is True Happiness?",
        "Al-Farabi's distinction between 'true happiness' (through virtue) and 'presumed happiness' (through wealth and pleasure) is strikingly similar to Jesus's teaching in the Beatitudes (Matthew 5:3-12). \"Blessed are the poor in spirit... blessed are the pure in heart...\" — true blessing is not found in earthly comfort but in alignment with God's character. The Christian tradition calls this 'beatitude' or shalom.",
        "F5EEF8", PURPLE),

      spacer(200),
      pageBreak(),

      // ─── KEY TERMS 11.1 ──────────────────────────────────
      h3("📌 Key Terms — Section 11.1"),
      keyTermsTable([
        ["Polis", "Greek word for 'city-state' — the basic political unit of ancient Greece; root of the word 'political'"],
        ["Telos", "Greek for 'goal' or 'end purpose'; Aristotle believed all things — including humans — have a natural purpose"],
        ["Philosopher-King", "Plato's ideal ruler: someone trained in virtue and wisdom from birth to lead the city for the common good"],
        ["Mohism", "Chinese philosophical tradition founded by Mozi; emphasized universal love, social benefit, and benevolent governance"],
        ["City of Excellence", "Al-Farabi's term for the ideal city, governed by a supreme ruler whose aim is guiding citizens to true happiness through virtue"],
        ["Jian Ai", "Mozi's concept of 'universal love' — caring for all people equally regardless of group membership"],
      ]),
      spacer(200),
      pageBreak(),

      // ─── 11.2 ─────────────────────────────────────────────
      h2("11.2  Forms of Government"),
      body("Throughout history, societies have organized themselves under very different systems of government. Each system reflects beliefs about who should hold power and why. Let us walk through the major forms."),
      spacer(80),

      h3("Overview: The Spectrum of Governance"),
      compTable(
        ["Form", "Who Holds Power", "Example"],
        [
          ["Monarchy (Absolute)", "One ruler — unlimited power, often divine right", "Medieval European kingdoms"],
          ["Monarchy (Constitutional)", "One ruler — power limited by constitution & parliament", "Modern United Kingdom"],
          ["Aristocracy / Caste", "Small elite class based on birth or social status", "Ancient Greek class system, Indian caste (jati)"],
          ["Representative Democracy", "Elected representatives chosen by the people", "USA, Kenya, most modern nations"],
          ["Totalitarianism", "State controls every aspect of life — no opposition allowed", "Soviet Union under Stalin"],
          ["Communism", "State owns all production; ruling party controls all", "People's Republic of China"],
          ["Fascism", "Nationalist, anti-democratic, hierarchical ideology", "Nazi Germany, Mussolini's Italy"],
        ],
        NAVY
      ),
      spacer(120),

      callout("🏠", "Analogy: Different Kinds of Classrooms",
        "Imagine a school with different kinds of classrooms:\n• In one classroom, the teacher makes all the rules alone and no student can question them (absolute monarchy).\n• In another, the teacher leads but students elect class representatives to give feedback (constitutional monarchy / representative democracy).\n• In another, the top students make all the decisions for everyone (aristocracy).\n• In the strictest classroom, the teacher monitors every movement, punishes any dissent, and controls even what students think (totalitarianism).\nEach classroom works differently — and has different consequences for students.",
        "E8F4F8", TEAL),

      spacer(100),
      h3("On Monarchy"),
      body("A monarchy places authority in one individual. In an absolute monarchy, the ruler has unlimited power — often justified by divine right (the idea that God chose them to rule). A constitutional monarchy limits the ruler's power through laws and shared governance."),
      spacer(60),
      callout("✝", "Faith Connection: Divine Right of Kings",
        "The idea that kings are chosen by God was widespread in Christian Europe. The Mohists in China had a similar idea (Heaven chooses the ruler). While Christians affirm that God ordains governing authorities (Romans 13), most Christian thinkers today would argue this does not mean rulers are infallible or unaccountable. King David in Scripture was anointed by God — yet was held accountable when he sinned (2 Samuel 12). Authority comes from God, but it must be exercised with righteousness and humility.",
        "F5EEF8", PURPLE),

      spacer(100),
      h3("On Representative Government"),
      body("In representative government, citizens choose leaders to act on their behalf. This idea has ancient roots — including in Native American tribal democracies and African 'campfire democracy.' The Athenian experiment with democracy was imperfect (it excluded women and enslaved people), but it planted seeds that grew into modern democratic systems."),
      spacer(60),
      body("Philosopher Amartya Sen argued that democracies tend to be wealthier, more peaceful, and better at preventing famine because leaders must answer to citizens. This is an empirical (evidence-based) defense of democracy.", { italic: true }),
      spacer(80),

      callout("✝", "Faith Connection: Human Dignity and Democracy",
        "The Christian conviction that every human being is made in the image of God (Genesis 1:27 — imago Dei) provides a powerful theological foundation for democratic ideals. If every person has inherent dignity and worth, then every person's voice matters in governance. The abolitionist movement, the civil rights movement, and countless other justice movements drew deeply on this Christian idea.",
        "FFF3D4", GOLD),

      spacer(100),
      h3("On Totalitarianism"),
      body("Philosopher Hannah Arendt (1906–1975) wrote the landmark book The Origins of Totalitarianism (1951). She argued that totalitarianism is unique: it does not merely seize power — it seeks to eliminate the individual self, making every person an extension of the state. It uses systematic terror and the constant threat of violence to destroy independent thought."),
      spacer(60),
      callout("⚠", "Important Distinction",
        "Totalitarianism is different from ordinary dictatorship. A dictator takes power and installs loyalists in government. A totalitarian regime infiltrates every arena of life — family, church, school, even one's private thoughts — until people cannot imagine being anything other than 'citizens' (really, captives) of the state. This is why Hannah Arendt said totalitarianism is a new kind of evil in human history.",
        "FDEDEC", ORANGE),

      spacer(80),
      callout("✝", "Faith Reflection: When the State Becomes God",
        "Scripture repeatedly warns against giving to Caesar what belongs to God (Mark 12:17). Totalitarian systems demand exactly this — total allegiance of body, mind, and soul. The early Christian martyrs died rather than burn incense to the Roman emperor. Dietrich Bonhoeffer resisted the Nazi state because he believed the Church must obey God rather than men (Acts 5:29). Political philosophy helps Christians identify when the state has overstepped its God-ordained limits.",
        "F5EEF8", PURPLE),

      spacer(180),
      pageBreak(),

      // ─── KEY TERMS 11.2 ──────────────────────────────────
      h3("📌 Key Terms — Section 11.2"),
      keyTermsTable([
        ["Monarchy", "A system of rule by one individual who usually inherits their position"],
        ["Absolute Monarchy", "The ruler has complete, unchecked power — often justified by 'divine right'"],
        ["Constitutional Monarchy", "The ruler's power is limited by a constitution and shared governance (e.g., UK Parliament)"],
        ["Aristocracy", "Rule by a small, elite class — determined by birth or social status"],
        ["Caste System (Jati)", "A Hindu social hierarchy in India where one's role is determined by the class into which one is born"],
        ["Representative Democracy", "Citizens elect representatives to make decisions on their behalf"],
        ["Totalitarianism", "A government that seeks complete control over all aspects of citizens' public and private lives"],
        ["Communism", "A system where the state owns all means of production; associated with Marx and Engels"],
        ["Fascism", "A totalitarian ideology marked by extreme nationalism, disdain for democracy, and social hierarchy"],
      ]),
      spacer(200),
      pageBreak(),

      // ─── 11.3 ─────────────────────────────────────────────
      h2("11.3  Political Legitimacy and Duty"),
      body("Even the most powerful government cannot simply declare itself legitimate. Legitimacy is the quality of being accepted as rightfully in authority by the people being governed. Without it, a ruler rules by force alone. This section explores what gives rulers their authority and what citizens owe in return."),
      spacer(80),

      h3("A) Sources of Political Legitimacy"),
      body("Sociologist Max Weber (1864–1920) identified three sources of legitimate authority that help us understand why people accept the rule of their governments:"),
      spacer(60),

      compTable(
        ["Type", "What Makes It Legitimate", "Example", "Stability"],
        [
          ["Traditional Legitimacy", "Long-standing tradition, custom, or divine right", "Monarchy; tribal chieftains", "Moderate — depends on tradition holding firm"],
          ["Charismatic Legitimacy", "Personal qualities of the leader — inspiration, empathy", "Nelson Mandela; MLK Jr.", "Unstable — dies with the leader"],
          ["Rational-Legal Legitimacy", "Belief in laws and systems, not individual persons", "Modern democracies, constitutions", "Most stable — survives changes in leadership"],
        ],
        NAVY
      ),
      spacer(100),

      callout("✝", "Faith Reflection: Where Does Authority Come From?",
        "Romans 13:1 teaches that 'there is no authority except that which God has established.' Christians believe ultimate authority belongs to God alone. Weber's three types of legitimacy are human mechanisms for organizing power — each with strengths and weaknesses. Christians are called to engage critically: Is a government's authority being exercised justly and in line with God's purposes? When it is not, Christians have a long tradition of prophetic resistance — think of Elijah before Ahab, Daniel before Nebuchadnezzar, or the apostles before the Sanhedrin.",
        "F5EEF8", PURPLE),
      spacer(100),

      h3("B) Social Contract Theory: Hobbes vs. Locke"),
      body("Two English philosophers asked a pivotal question: What would life look like without government? Their answers led to very different political theories."),
      spacer(60),

      compTable(
        ["Question", "Thomas Hobbes (1588–1679)", "John Locke (1632–1704)"],
        [
          ["State of nature (without govt)", "War of all against all — life is 'nasty, brutish, and short'", "Mostly peaceful — humans can live by natural law and reason"],
          ["Natural law", "None — only power and survival instinct", "God gives humans reason to discover moral law; all are equal"],
          ["Social contract", "Give absolute power to a sovereign in exchange for security", "Give up some freedom for protection — government must serve the people"],
          ["Preferred government", "Absolute monarchy — one central authority prevents chaos", "Representative government — power must be limited and accountable"],
          ["Right of revolt", "No — rebelling against the sovereign is always wrong", "Yes — if government becomes tyrannical, people may replace it"],
          ["Legacy", "Justifies strong central authority", "Inspired American Declaration of Independence and Constitution"],
        ],
        NAVY
      ),
      spacer(100),

      callout("🏠", "Analogy: The Neighborhood Watch",
        "Hobbes is like someone who says: 'Without a powerful police force, this neighborhood would become a war zone. Give the police chief unlimited authority — it's the only way to have peace.'\n\nLocke is like someone who says: 'Most of our neighbors are decent people. We form a neighborhood association, agree on rules, and hire a security guard — but the guard works for us, not the other way around. If the guard abuses power, we can replace them.'",
        "E8F4F8", TEAL),
      spacer(80),

      philCard("Thomas Hobbes", "1588–1679",
        "Author of Leviathan. Argued that without government, humans live in perpetual war. To escape chaos, people surrender rights to an absolute sovereign (monarch) who maintains order. The social contract is: obedience in exchange for security. The sovereign cannot be questioned.",
        "Hobbes reflects a darkly realistic view of human nature — closer to the biblical doctrine of original sin than Locke's optimism. However, most Christians would reject his conclusion: absolute, unquestionable power in any human ruler is dangerous. History confirms this. Biblical kingship was always accountable to the law of God."),
      spacer(80),

      philCard("John Locke", "1632–1704",
        "Author of Second Treatise on Civil Government. Argued that humans have natural rights (life, liberty, property) given by God through reason. Government exists to protect these rights. When it fails, people have the right to replace it. Locke's ideas directly shaped the US Declaration of Independence.",
        "Locke grounded his political theory in natural law — reason given by God that reveals moral truth. This resonates strongly with Christian natural law tradition (Romans 2:15 — the law written on the heart). Many Christian political thinkers across history have built on Locke's framework to defend human rights and limited government."),
      spacer(80),

      h3("C) Gandhi and the Duty of Civil Disobedience"),
      body("Mahatma Gandhi (1869–1948) believed that when a government becomes corrupt or unjust, citizens have a sacred duty to disobey it — but always through nonviolent means. He called this satyagraha (holding to the truth) and grounded it in ahimsa (non-harming)."),
      spacer(60),
      callout("✝", "Faith Connection: Obeying God Rather Than Man",
        "Gandhi's concept of principled civil disobedience echoes a long Christian tradition. The Hebrew midwives disobeyed Pharaoh to save baby boys (Exodus 1:15-21). The apostles declared 'We must obey God rather than human beings!' (Acts 5:29). Martin Luther King Jr. drew explicitly on Gandhi AND on Christian theology when leading the American civil rights movement. The question is not whether to obey — but whom to obey when human law contradicts divine justice.",
        "FFF3D4", GOLD),
      spacer(80),

      h3("D) Communitarianism: We Belong to Each Other"),
      body("Communitarianism argues that humans are fundamentally social beings. Our values, identities, and moral instincts are shaped by our communities. Therefore, individuals have real obligations to their communities — not just rights. Sociologist Amitai Etzioni identified three principles:"),
      bullet("We need social connection — isolation causes genuine psychological and physical harm"),
      bullet("Communities enforce moral norms through social praise and accountability — not only laws"),
      bullet("Rights come with responsibilities — personal freedom must be balanced with social duty"),
      spacer(80),
      callout("✝", "Faith Connection: The Body of Christ",
        "Communitarianism aligns beautifully with the New Testament vision of Christian community. 1 Corinthians 12 describes the Church as a body — each part essential, each member needing the others. Romans 15:1-2 says 'We who are strong ought to bear with the failings of the weak and not to please ourselves. Each of us should please our neighbors for their good, to build them up.' Christians are not isolated individuals — we are members of a body, a household, a family.",
        "F5EEF8", PURPLE),

      spacer(180),
      pageBreak(),

      // ─── 11.4 ─────────────────────────────────────────────
      h2("11.4  Political Ideologies: How Should Society Be Organized?"),
      body("A political ideology is a set of beliefs about how society should be governed — who should lead, what rights people have, and how resources should be distributed. These ideologies shape laws, policies, and social movements. Let us walk through the major ones."),
      spacer(80),

      h3("Distributive Justice: The Common Thread"),
      body("All political ideologies must answer this question: How should goods, wealth, and opportunities be distributed in society? Is a just society one that maximizes individual freedom, even if some people end up very rich and others very poor? Or should the state ensure that everyone's basic needs are met?"),
      spacer(60),
      callout("✝", "A Christian Starting Point",
        "Scripture takes a strong stance on economic justice. The Law of Moses included provisions for the poor (gleaning laws, Jubilee debt forgiveness, tithes for the needy). The prophets thundered against those who 'grind the faces of the poor' (Isaiah 3:15). Jesus proclaimed good news to the poor (Luke 4:18). James warned that favoritism toward the rich is a sin (James 2:1-9). Christians engaging political ideologies must bring this prophetic tradition with them.",
        "FFF3D4", GOLD),
      spacer(100),

      h3("The Five Major Ideologies"),
      spacer(40),

      compTable(
        ["Ideology", "Core Belief", "View on Government", "View on Equality"],
        [
          ["Conservatism", "Preserve what has worked historically", "Limited; protect tradition, property rights, local action", "Equal opportunity within established structures"],
          ["Liberalism", "Maximize individual liberty", "Limited; prevent harm to others, avoid interference", "Negative liberty (freedom from constraint)"],
          ["Egalitarianism", "All people have equal worth and deserve equal rights", "Active in removing systemic barriers to fairness", "Equal rights and fair opportunity for all"],
          ["Socialism", "Resources should be owned/managed publicly for common good", "Strong role in controlling basic resources", "Focus on reducing inequality through redistribution"],
          ["Anarchism", "No government — self-governing communities", "None — government is itself the problem", "Radical freedom and mutual aid among equals"],
        ],
        NAVY
      ),
      spacer(120),

      h3("Deep Dive: Conservatism"),
      body("Modern conservatism traces back to Edmund Burke (1729–1797), who was horrified by the violence of the French Revolution. His core insight: don't tear down institutions that took centuries to build, even if they are imperfect. Reform gradually; cherish what has proven valuable. Conservatives believe human nature is fundamentally flawed, so institutions — including the church, family, and state — are necessary to teach discipline and maintain order."),
      spacer(60),
      callout("✝", "Faith Connection: Christian Conservatism",
        "Many Christians are drawn to conservatism's emphasis on moral virtue, family, community, and the recognition of human fallibility (the doctrine of original sin). The church plays a central role in conservative thought as a moral institution. However, Christians must also remember that 'conserving the past' can sometimes mean conserving injustice. The prophets were rarely defenders of the status quo — they spoke truth to power and called Israel back to justice.",
        "F5EEF8", PURPLE),
      spacer(80),

      h3("Deep Dive: Liberalism — Mill and Rawls"),
      body("John Stuart Mill (1806–1873) argued for one foundational principle: governments may only limit your freedom to prevent you from harming others. Beyond that, people are free to live as they choose. This is called the harm principle."),
      body("John Rawls (1921–2002) extended liberalism to address fairness. His famous thought experiment: Imagine you are designing a society from behind a 'veil of ignorance' — you don't know whether you'll be rich or poor, male or female, or what race you'll be. What rules would you choose? Rawls argued that from this position, everyone would insist on:"),
      bullet("The Liberty Principle: equal basic liberties for all (free speech, property, assembly)"),
      bullet("The Difference Principle: inequalities are only acceptable if they benefit the least advantaged members of society"),
      spacer(80),
      callout("🏠", "Analogy: Designing a Game Before Choosing Your Position",
        "Rawls's 'veil of ignorance' is like designing the rules of a board game before knowing which piece you'll play. If you don't know whether you'll be the richest or poorest player, you'll probably design a game with fair starting conditions and a safety net for whoever ends up on the bottom. That is Rawls's vision of justice.",
        "E8F4F8", TEAL),
      spacer(80),

      h3("Deep Dive: Marxism and Alienation"),
      body("Karl Marx (1818–1883) argued that capitalism causes suffering through alienation — the estrangement of workers from their work, their products, and ultimately from themselves. When a worker on an assembly line has no connection to the final product, no ownership over their labor, and is treated as a replaceable commodity — their humanity is diminished."),
      spacer(60),
      infoTable([
        ["Bourgeoisie", "Those who own the means of production (factories, capital)"],
        ["Proletariat", "Workers who sell their labor; exploited for surplus value (profit)"],
        ["Alienation", "Workers are disconnected from their work, products, and humanity"],
        ["Surplus Value", "The profit capitalists keep above and beyond workers' wages"],
        ["Revolution", "Marx believed the proletariat would inevitably overthrow capitalism"],
      ], ORANGE, LGRAY),
      spacer(80),
      callout("✝", "Faith Reflection: Marx and Christian Concern for Workers",
        "While Christians rightly reject Marx's atheism and his call for violent revolution, his diagnosis of worker exploitation resonates with biblical concerns. The prophets condemned those who 'trample on the heads of the poor as on the dust of the ground' (Amos 2:7). Leviticus 19:13 warns: 'Do not hold back the wages of a hired worker overnight.' The Christian tradition of Catholic Social Teaching (and later Protestant social ethics) developed a rich alternative to both capitalism and Marxism — rooted in human dignity, solidarity, subsidiarity, and the common good.",
        "FFF3D4", GOLD),
      spacer(80),

      h3("Deep Dive: Anarchism"),
      body("Anarchism literally means 'no ruler.' Anarchists argue that governments — through surveillance, coercion, and violence — are the source of disorder, not the cure. They believe rational human beings, if free from oppressive states, would naturally organize cooperative, peaceful communities."),
      spacer(60),
      callout("⚠", "A Word of Caution",
        "Anarchism is a philosophically serious position, even if it seems extreme. Its strength is a deep commitment to human freedom and a critique of state abuse of power. Its weakness is optimism about human nature without government constraint — a view that most Christian theologians, aware of the doctrine of original sin and humanity's capacity for collective evil, would find dangerously naive.",
        "FDEDEC", ORANGE),

      spacer(180),
      pageBreak(),

      // ─── KEY TERMS 11.3-11.4 ──────────────────────────────
      h3("📌 Key Terms — Sections 11.3 & 11.4"),
      keyTermsTable([
        ["Legitimacy", "Acceptance of a ruler's right to govern by the people being ruled"],
        ["Divine Rule", "The doctrine that political authority comes from God's appointment of rulers"],
        ["Social Contract", "An agreement among people to surrender some freedoms to a governing authority in exchange for protection"],
        ["Natural Law", "Moral law discoverable by human reason, given by God; provides a standard above human-made law"],
        ["Communitarianism", "The view that individual identity and values are shaped by community; individuals have duties to their communities"],
        ["Ahimsa", "Foundational Indian principle: refrain from harming oneself or others"],
        ["Satyagraha", "Gandhi's doctrine of nonviolent resistance to injustice — 'holding to the truth'"],
        ["Distributive Justice", "Moral principles governing the fair distribution of goods, wealth, and opportunities in society"],
        ["Veil of Ignorance", "Rawls's thought experiment: design society without knowing your own position in it"],
        ["Alienation", "In Marxism: workers' estrangement from their work, products, and humanity due to capitalist exploitation"],
        ["Surplus Value", "The profit retained by capitalists beyond the wages paid to workers"],
        ["Egalitarianism", "The belief that all individuals possess equal moral worth and deserve equal rights and opportunities"],
      ]),
      spacer(200),

      // ─── DISCUSSION QUESTIONS CH11 ────────────────────────
      h2("💬  Chapter 11 Discussion Questions"),
      body("Use these questions for small group discussion, journaling, or classroom reflection."),
      spacer(80),
      discussionTable([
        "Plato believed that rulers must be virtuous. Can you think of a historical or current leader whose virtue (or lack of it) significantly shaped their country? How does this compare to the biblical model of leadership?",
        "Hobbes believed people are naturally selfish and need a strong authority to keep the peace. Locke believed people are mostly reasonable and government exists to serve them. Which view do you find more convincing — and why? How does the Bible's teaching on human nature inform your answer?",
        "Weber identified three types of legitimacy: traditional, charismatic, and rational-legal. Which type does your national government rely on most? Does your church or faith community have its own form of legitimacy? How?",
        "John Rawls asked us to design a just society from behind a 'veil of ignorance.' Try it: if you didn't know your gender, race, economic class, or abilities, what rules would you design? How does this exercise connect to the Golden Rule (Matthew 7:12)?",
        "Gandhi argued that civil disobedience is a sacred duty when the state is corrupt. Martin Luther King Jr. agreed. Are there situations today where Christians might be called to peacefully disobey laws or systems that violate God's standards of justice? What boundaries should govern such resistance?",
        "Marx identified 'alienation' as a product of modern capitalism — workers disconnected from their work and from each other. Do you see evidence of this in your community or workplace? What does the Christian vision of meaningful, dignified work look like (see Genesis 2:15, Colossians 3:23)?",
      ]),
      spacer(200),

      // ─── SELF-CHECK QUIZ CH11 ─────────────────────────────
      h2("✅  Chapter 11 Self-Check Quiz"),
      body("Answer these questions to test your understanding. Check back to the text for answers."),
      spacer(80),
      numbered("What is the branch of philosophy that studies government, justice, and citizenship?"),
      numbered("Name Plato's four virtues upon which the state should be founded."),
      numbered("What does 'telos' mean, and how did Aristotle use it in his political philosophy?"),
      numbered("What are the three types of legitimate authority identified by Max Weber?"),
      numbered("What is the 'state of nature' according to Thomas Hobbes? How does it differ from Locke's view?"),
      numbered("What is the 'veil of ignorance' in Rawls's theory of justice?"),
      numbered("What is the difference between a constitutional monarchy and a totalitarian regime?"),
      numbered("What does 'ahimsa' mean, and how did Gandhi apply it to political resistance?"),
      numbered("How does Marxism define 'alienation,' and what causes it?"),
      numbered("What are the five major political ideologies covered in this chapter? Give one-sentence descriptions of each."),

      spacer(300),
      pageBreak(),

      // ══════════════════════ CHAPTER 12 ══════════════════════
      sectionDivider("12", "Contemporary Philosophies & Social Theories", "Enlightenment · Marxism · Critical Theory · Postmodernism"),
      spacer(200),

      h1("🗺  Chapter 12 Overview: The Big Picture"),
      body("The modern era brought both breathtaking progress and new horrors. The Enlightenment unleashed science, democracy, and technological advance. But it also produced colonialism, industrial exploitation, and eventually totalitarianism. Chapter 12 traces the major philosophical movements that arose to understand — and respond to — the modern world."),
      spacer(80),
      callout("💡", "Simple Definition",
        "Chapter 12 covers three major philosophical currents: (1) Enlightenment Social Theory — the belief that reason and science can solve social problems; (2) Marxist Theory — the belief that capitalism itself is the root of social problems; and (3) Critical Theory / Postmodernism — the belief that both reason AND Marxism failed, and we need to rethink knowledge, power, and truth itself.",
        "E8F4F8", TEAL),
      spacer(100),
      body("Chapter 12 is divided into five main sections:", { bold: true }),
      bullet("12.1 — Enlightenment Social Theory: Reason, positivism, and the birth of sociology"),
      bullet("12.2 — The Marxist Solution: Class struggle, dialectical materialism, and revolution"),
      bullet("12.3 — Continental Philosophy's Challenge: Hermeneutics, phenomenology, and existentialism"),
      bullet("12.4 — The Frankfurt School: Critical theory and communicative action"),
      bullet("12.5 — Postmodernism: Deconstruction, power, and the end of absolute truth"),
      spacer(120),
      callout("✝", "Faith Bridge: Why Christians Need to Understand These Movements",
        "Critical theory, postmodernism, and Marxist ideas are no longer confined to university lecture halls — they shape media, education, law, and public conversation. Understanding these ideas does not mean accepting them. Christians are called to be 'wise as serpents and innocent as doves' (Matthew 10:16). Knowing what these philosophies claim helps us engage intelligently, find what is true and valuable in them, and identify where they diverge from biblical truth.",
        "FFF3D4", GOLD),

      spacer(200),
      pageBreak(),

      // ─── 12.1 ─────────────────────────────────────────────
      h2("12.1  Enlightenment Social Theory"),
      body("The Enlightenment (roughly 1685–1815, also called the Age of Reason) was a revolutionary intellectual movement in Europe. Thinkers proposed that human reason and scientific investigation — not tradition, authority, or religion — were the keys to understanding the world and improving the human condition."),
      spacer(80),

      h3("A) Rationalism vs. Empiricism"),
      compTable(
        ["Approach", "How We Know Truth", "Key Thinker", "Example"],
        [
          ["Rationalism", "Through pure reason and logical deduction — independent of experience", "René Descartes ('I think therefore I am')", "Mathematics: 1+1=2 is known by reason, not experience"],
          ["Empiricism", "Through observation, experiment, and experience", "Francis Bacon, John Locke", "Scientific experiments; gathering and analyzing data"],
        ],
        TEAL
      ),
      spacer(80),
      callout("🏠", "Analogy: Two Detectives",
        "A rationalist detective solves crimes by thinking through the logical possibilities from their armchair. An empiricist detective insists on going to the crime scene, gathering evidence, interviewing witnesses, and following the data. In practice, good science — and good thinking — combines both approaches.",
        "E8F4F8", TEAL),
      spacer(80),

      h3("B) Kant and Ethical Progress"),
      body("Immanuel Kant (1724–1804) proposed that reason alone can guide us to ethical truth. He developed the categorical imperative: act only according to rules you would wish applied to everyone universally. Kant believed that by reasoning together across generations, humanity would gradually build a more perfect moral society."),
      spacer(60),
      callout("✝", "Faith Reflection: Kant and the Moral Law",
        "Kant's belief that reason reveals universal moral law echoes the Christian understanding of natural law (Romans 1:19-20; 2:14-15). However, Kant grounded morality in human reason alone, excluding divine revelation. Christians affirm that reason is a gift of God that can perceive some moral truths — but that Scripture provides a fuller, clearer revelation of God's will than unaided reason can achieve. Kant's rigorous ethics (treat persons as ends in themselves, never merely as means) has been deeply influential in Christian ethics and human rights discourse.",
        "F5EEF8", PURPLE),
      spacer(80),

      h3("C) Auguste Comte and the Birth of Sociology"),
      philCard("Auguste Comte", "1798–1857",
        "Considered the founder of sociology. Proposed the 'Law of Three Stages': (1) Theological — events explained by supernatural forces; (2) Metaphysical — human effort and natural forces are acknowledged; (3) Positivism — scientific, evidence-based understanding replaces religion. Comte believed society, like nature, could be studied scientifically and improved through rational management.",
        "Comte's 'positivism' predicted that as societies progress, religion would be replaced by science. This prediction has not been fulfilled — religion remains a central force in the majority of human societies, including the most scientifically advanced. Christians would argue this is because spiritual hunger is fundamental to human nature (Augustine: 'our heart is restless until it rests in You'). Interestingly, Comte himself later founded a 'Religion of Humanity' — suggesting even he recognized the need for meaning that science alone cannot provide."),
      spacer(80),

      h3("D) W.E.B. Du Bois and Empirical Sociology"),
      philCard("W.E.B. Du Bois", "1868–1963",
        "First African American to earn a PhD from Harvard. Pioneered empirical (evidence-based) sociology. Conducted thousands of door-to-door interviews in Philadelphia to scientifically study the obstacles faced by African Americans. His book The Philadelphia Negro (1899) was the first empirical analysis of racism in the United States. He transformed sociology from theoretical speculation into practical, data-driven science.",
        "Du Bois's work was, in part, a form of truth-telling — exposing injustice with the irrefutable power of evidence. This resonates deeply with the prophetic tradition: speaking truth about suffering to those in power. Christians committed to racial justice (Galatians 3:28 — 'neither Jew nor Gentile') will find in Du Bois both a methodological model and a moral inspiration."),
      spacer(80),

      callout("💡", "Key Insight: What the Enlightenment Got Right — and Wrong",
        "RIGHT: Human reason is a powerful tool for understanding the world and solving problems. Science has saved millions of lives. Democratic governance has reduced tyranny. Empirical research has exposed injustice.\n\nWRONG: The Enlightenment tended toward overconfidence in reason alone, underestimating human sinfulness, spiritual needs, and the limits of scientific methods. The 20th century — with its World Wars, genocides, and totalitarian regimes — was produced by highly 'rational' and 'scientific' societies. Reason without wisdom, and science without ethics, can become instruments of tremendous evil.",
        "E8F4F8", TEAL),

      spacer(200),
      pageBreak(),

      // ─── 12.2 ─────────────────────────────────────────────
      h2("12.2  The Marxist Solution"),
      body("While Enlightenment theorists tried to improve capitalism and solve its problems, Karl Marx concluded that capitalism itself was the problem. He developed a sweeping theory of history, economics, and revolution."),
      spacer(80),

      h3("A) Hegel's Dialectic: History as Conflict and Progress"),
      body("Marx built on the ideas of German philosopher Georg Wilhelm Friedrich Hegel (1770–1831). Hegel proposed that history moves through a dialectic: a conflict between opposing forces that produces something new and higher."),
      spacer(40),
      infoTable([
        ["Thesis", "The existing state of affairs — a current idea, system, or condition"],
        ["Antithesis", "A force or idea that challenges and opposes the thesis"],
        ["Synthesis", "The new, higher reality that emerges from the conflict between thesis and antithesis"],
      ], TEAL, LGRAY),
      spacer(80),
      callout("🏠", "Analogy: The Dialectic in a Student's Growth",
        "Imagine a student (thesis: current understanding) who reads a challenging book that contradicts everything they believed (antithesis). The struggle between old and new ideas produces a richer, more nuanced understanding (synthesis). Hegel believed history itself moves this way — toward greater freedom and self-knowledge.",
        "E8F4F8", TEAL),
      spacer(80),

      callout("✝", "Faith Reflection: Hegel and Christianity",
        "Hegel saw the life, death, and resurrection of Jesus as the central moment in world history — the Absolute Spirit encountering itself in human form. Many Christian thinkers have engaged Hegel's philosophy seriously. However, Christians would insist that the resurrection is not just a symbol of spiritual progress — it is a real, historical event that reconciles humanity to God. Hegel's system absorbs Christianity into philosophy; Christianity insists it is more than a philosophical system.",
        "F5EEF8", PURPLE),
      spacer(80),

      h3("B) Marx's Dialectical Materialism"),
      body("Marx took Hegel's dialectic but grounded it in material reality — economics, class conflict, and power — rather than abstract spirit or ideas. For Marx, what drives history is not ideas but economic contradictions between social classes."),
      spacer(60),
      body("Marx's prediction: As capitalism advances, the working class (proletariat) will develop consciousness of their shared oppression, rise up, seize the means of production from the capitalist class (bourgeoisie), and establish a classless communist society — a world without exploitation. He believed this was historically inevitable."),
      spacer(60),

      callout("⚠", "What Actually Happened",
        "Marx predicted the revolution would begin in England — the most industrialized nation. Instead, revolutions occurred in Russia, China, and other less-industrialized countries. Communist regimes, rather than creating classless societies, produced new forms of oppression, mass murder (Stalin's gulags, Mao's Cultural Revolution), and poverty. The failure of these predictions was a serious blow to orthodox Marxism — and led to major revisions by later thinkers (the Frankfurt School).",
        "FDEDEC", ORANGE),
      spacer(80),

      philCard("Karl Marx", "1818–1883",
        "Co-author (with Friedrich Engels) of The Communist Manifesto (1848). Developed 'dialectical materialism' — the theory that class conflict drives history toward inevitable revolution. Identified capitalism as the root cause of social problems including alienation, inequality, and exploitation. Advocated for the proletariat (workers) to overthrow the bourgeoisie (owners) and establish a classless society.",
        "Marx's diagnosis of exploitation and his concern for the poor resonates with many biblical themes — the prophets' condemnation of injustice, Jesus's concern for the marginalized. However, his atheism ('religion is the opium of the people'), his denial of human dignity rooted in God's image, and the catastrophic human cost of regimes inspired by his ideas make Marxism, as a total system, deeply incompatible with Christianity. Christians can agree with Marx's diagnosis while proposing a very different cure rooted in Scripture."),
      spacer(80),

      h3("C) Lenin, Mao, and the Revolution's Spread"),
      body("Vladimir Lenin (1870–1924) adapted Marx's theory for Russia, arguing that capitalism had mutated into imperialism — exploiting colonies in Africa, Asia, and South America for cheap labor and raw materials. Revolutionary change would therefore occur first in the colonized world, not in industrialized England."),
      body("Mao Zedong (1893–1976) extended this further in China — broadening the 'revolutionary class' beyond industrial workers to include peasants, intellectuals, and even some members of the middle class. His Cultural Revolution (1966–1977) was an attempt to reshape Chinese society through forced ideological conformity — resulting in between hundreds of thousands and millions of deaths."),
      spacer(60),
      callout("✝", "Faith Reflection: When Ideology Becomes Idolatry",
        "The history of Marxist revolutions provides a sobering illustration of what happens when a secular ideology attempts to create heaven on earth through human effort and political will alone. Augustine wrote of the 'City of Man' — human societies built on self-love — in contrast with the 'City of God' built on love of God. Every attempt to build a perfect human society apart from God has ended in tragedy. This is not an argument for inaction, but a caution against placing ultimate hope in any political system.",
        "FFF3D4", GOLD),

      spacer(200),
      pageBreak(),

      // ─── 12.3 ─────────────────────────────────────────────
      h2("12.3  Continental Philosophy's Challenge to Enlightenment Theories"),
      body("While Marx challenged the economic assumptions of the Enlightenment, a cluster of European philosophers challenged its deepest intellectual assumptions — the belief that we can know objective truth through reason and empirical observation. This section introduces hermeneutics, phenomenology, and existentialism."),
      spacer(80),

      h3("A) Hermeneutics: The Art of Interpretation"),
      body("Hermeneutics (from Hermes, the Greek messenger god) is the philosophical study of interpretation — especially of texts. Key insight: meaning is not simply 'in' a text waiting to be discovered. Meaning arises from the relationship between a text and its reader, shaped by historical, cultural, and personal context."),
      spacer(60),

      infoTable([
        ["Historicity", "Every text and reader is a product of history; meaning is never context-free"],
        ["Reception", "What an audience perceives can differ significantly from what an author intended"],
        ["Discourse", "Meaning-making is an active process — we construct meaning from texts, we don't simply extract it"],
      ], PURPLE, LGRAY),
      spacer(80),

      callout("🏠", "Analogy: Reading the Same Story at Different Ages",
        "Have you ever re-read a childhood book as an adult and found entirely new meanings? The text hasn't changed — but you have. Your experiences, losses, relationships, and growth have given you new eyes. Hermeneutics says this is not a failure of reading — it is how meaning works. Every reader brings their whole history to the page.",
        "E8F4F8", TEAL),
      spacer(80),

      callout("✝", "Faith Relevance: Biblical Hermeneutics",
        "Christians practice hermeneutics every time we read the Bible! Understanding Scripture correctly requires attention to: the historical context of the author (what did this mean in its original setting?), the literary genre (is this poetry, history, prophecy, or letter?), the canonical context (how does this fit the whole Bible?), and the reader's context (how does this speak to us today?). Good Bible study is rigorous hermeneutics guided by the Holy Spirit (John 16:13). The field of biblical hermeneutics is one of the richest in Christian scholarship.",
        "F5EEF8", PURPLE),
      spacer(80),

      philCard("Paul Ricoeur", "1913–2005",
        "French philosopher who argued that no text 'says' anything by itself — meaning is generated by the encounter between text and reader. He developed rich theories of metaphor (a way of saying the unsayable) and narrative (stories shape how we understand ourselves and society). He argued that self-understanding is always mediated through stories we tell about ourselves.",
        "Ricoeur, who was a committed Protestant Christian, saw no contradiction between his philosophy and his faith. His insight that human identity is fundamentally narrative — we understand ourselves through the stories we inhabit — resonates deeply with the biblical understanding of humans as story-shaped creatures. We are the people of The Story — creation, fall, redemption, new creation."),
      spacer(80),

      h3("B) Phenomenology: Experience Before Theory"),
      body("Phenomenology (from the Greek 'phenomena' — what appears) insists that philosophical investigation must begin with actual lived experience, not abstract ideas. Rather than starting with a theory of what a chair is, phenomenology asks: How do I actually experience this chair? What does my encounter with it reveal?"),
      spacer(60),

      compTable(
        ["Philosopher", "Key Contribution"],
        [
          ["Edmund Husserl (1859–1938)", "Founded phenomenology; insisted we must 'bracket' assumptions and focus on how things appear to us"],
          ["Maurice Merleau-Ponty (1908–1961)", "Rejected Descartes's mind/body split; showed that perception is always embodied — our bodies shape how we encounter the world"],
          ["Martin Heidegger (1889–1976)", "Argued that 'being' must always be understood as 'being-in-the-world'; abstract theory misses the richness of lived experience"],
        ],
        PURPLE
      ),
      spacer(80),
      callout("✝", "Faith Connection: The Importance of Embodied Experience",
        "Phenomenology's insistence that we are embodied beings whose physical experience matters resonates with a biblical theology of the body. The Incarnation — God becoming flesh in Jesus Christ — is the ultimate affirmation that bodies matter, experience matters, the physical world matters. Christianity has never been a purely 'spiritual' religion that dismisses the physical. The resurrection of the body in 1 Corinthians 15 confirms: what happens to our bodies is eternally significant.",
        "FFF3D4", GOLD),
      spacer(80),

      h3("C) Existentialism: Freedom, Meaning, and Responsibility"),
      body("Existentialism builds on phenomenology's emphasis on lived experience and adds a radical claim: there is no pre-given essence to human life. Existence precedes essence — humans are not born with a fixed purpose or nature; we create meaning through our choices and actions. This places enormous weight on human freedom and responsibility."),
      spacer(60),
      callout("⚠", "Key Existentialist Idea",
        "If humans create meaning rather than discover it, then in the absence of God there is no fixed moral order — only individual freedom and the 'absurdity' of a universe without inherent purpose. French existentialist Albert Camus described this as the 'absurd.' However, not all existentialists were atheists — Christian existentialists like Søren Kierkegaard and Gabriel Marcel argued that authentic human existence is found precisely in one's relationship with God.",
        "FDEDEC", ORANGE),
      spacer(80),
      callout("✝", "Faith Reflection: Existentialism and Christianity",
        "Christian philosopher Søren Kierkegaard (1813–1855) — often called the 'father of existentialism' — argued that true selfhood is not found through reason or social conformity, but in a 'leap of faith' toward God. C.S. Lewis similarly argued that the deepest longing of the human heart ('Joy' or Sehnsucht) points us beyond any earthly satisfaction to God Himself. Christianity provides what secular existentialism cannot: a story that gives existence genuine, eternal meaning rooted in the purposes of a personal God who loves us.",
        "F5EEF8", PURPLE),

      spacer(200),
      pageBreak(),

      // ─── 12.4 ─────────────────────────────────────────────
      h2("12.4  The Frankfurt School and Critical Theory"),
      body("When communist revolutions failed to bring about Marx's promised classless utopia, and when fascism rose to power in the very countries where Enlightenment reason was supposed to have triumphed, a group of Marxist intellectuals in Frankfurt, Germany began to ask: What went wrong? Their answer became critical theory."),
      spacer(80),

      callout("💡", "What Is Critical Theory?",
        "Critical theory is a method of analyzing society that asks: How do power structures — economic, cultural, political — shape what we accept as 'normal,' 'natural,' or 'true'? Its goal is not just to understand society but to change it by exposing and dismantling oppressive systems. It emerged from the Frankfurt School (Institute for Social Research, founded 1923).",
        "E8F4F8", TEAL),
      spacer(80),

      h3("Key Frankfurt School Thinkers"),

      philCard("Max Horkheimer", "1895–1973",
        "Director of the Frankfurt School. Argued that a credible critical theory must: (1) explain the ills of society, (2) identify means by which change can occur, (3) provide a framework for critique, and (4) articulate realistic goals. Critiqued the Enlightenment's overconfidence in reason as a neutral, objective tool — arguing that 'reason' is always shaped by context and power.",
        "Horkheimer's critique of 'neutral' reason echoes the Christian insight that humans are not purely rational beings — we are shaped by desires, cultural formation, and yes, sin. The doctrine of total depravity does not mean we are as evil as possible, but that every part of us — including our reasoning — is affected by the fall. Christians who engage public reasoning should bring this humility to all knowledge claims, including their own."),
      spacer(80),

      philCard("Walter Benjamin", "1892–1940",
        "German-Jewish philosopher and literary critic. Introduced the concept of the 'messianic' — a disruption of the status quo that interrupts the normal flow of history and exposes oppressive power structures. Saw capitalism as a linear 'myth of progress' that could be interrupted by moments of radical justice. Benjamin fled the Nazi regime and died while attempting to escape Europe.",
        "Benjamin's borrowing of 'messianic' language is fascinating — he adapted a specifically Jewish and Christian concept (the coming of a redeemer who breaks into history) to describe radical social transformation. Christians would affirm that the ultimate messianic disruption has already occurred: in the life, death, and resurrection of Jesus. The Kingdom of God breaks into the present age in every act of justice, mercy, and love — a foretaste of the final redemption."),
      spacer(80),

      philCard("Jürgen Habermas", "b. 1929",
        "Most prolific Frankfurt School thinker. Developed the concept of 'communicative action' — the idea that genuine liberation occurs through open, free public dialogue where ideas are rigorously challenged. Argued that the best democracies are those most responsive to the 'public sphere' — the realm of free, open debate outside state control. Saw language and dialogue as the primary tools of human emancipation.",
        "Habermas's vision of a public sphere in which free, honest dialogue produces justice resonates with biblical ideals of speaking truth (Ephesians 4:15 — 'speaking the truth in love'), the prophetic tradition of speaking uncomfortable truths to power, and the Church as a community of honest discernment. Christians should be champions of genuine free speech and robust public debate — while recognizing that no purely human dialogue can substitute for the transforming work of the Holy Spirit."),
      spacer(80),

      philCard("Paulo Freire", "1921–1997",
        "Brazilian philosopher inspired by the Frankfurt School. Developed 'critical pedagogy' — the belief that true education is not the transmission of facts from teacher to student ('banking education'), but an ongoing dialogue that helps students examine and question the foundations of their society. Argued that authentic education leads to emancipation — freeing people to think critically and act justly.",
        "Freire's critique of 'banking education' — treating students as passive vessels — resonates with the Socratic and Jesuit traditions of education as active inquiry. The Christian educational tradition, at its best, has always sought to form not just informed minds but transformed hearts — whole human beings who love truth, pursue justice, and serve God and neighbor. Jesus himself was a radical teacher who invited dialogue, asked questions, and challenged his hearers to think afresh."),
      spacer(80),

      callout("✝", "Overall Faith Assessment: Critical Theory",
        "Critical theory offers genuine insights that Christians should take seriously:\n✓ Power structures do shape what is accepted as 'normal' — including unjust arrangements.\n✓ Education can be used to liberate or to oppress.\n✓ The marginalized deserve to have their voices heard.\n✓ Dialogue and honest communication are essential to justice.\n\nHowever, critical theory also has significant blind spots:\n✗ Its rejection of objective truth makes it difficult to ground any critique of injustice.\n✗ It can reduce complex human experiences entirely to power dynamics.\n✗ Without a transcendent moral foundation, 'liberation' is left undefined and contested.\n✗ Some applications (e.g., certain versions of Critical Race Theory) have been criticized for their own forms of ideological pressure.\n\nChristians bring a better foundation: a God who defines justice, a Christ who embodies liberation, and a Spirit who transforms hearts — the only lasting source of social change.",
        "F5EEF8", PURPLE),

      spacer(200),
      pageBreak(),

      // ─── 12.5 ─────────────────────────────────────────────
      h2("12.5  Postmodernism"),
      body("Postmodernism is, in some ways, the philosophical conclusion of all the critiques we have examined. If the Enlightenment was wrong to trust reason, if Marxism failed to change history as predicted, and if knowledge is always shaped by context and power — then perhaps there is no such thing as objective truth at all. This is the core claim of postmodernism."),
      spacer(80),

      callout("💡", "What Is Postmodernism?",
        "Postmodernism rejects the idea of universal, objective truth. It argues that all knowledge claims are relative — shaped by historical context, cultural assumptions, and power dynamics. There is no 'God's-eye view' from which to judge all perspectives. Instead of one 'master narrative' (e.g., Progress, Reason, or Revolution), there are many competing stories, all partial and perspectival.",
        "E8F4F8", TEAL),
      spacer(80),

      h3("A) Structuralism vs. Post-structuralism"),
      body("To understand postmodernism, we need to understand the debate it arose from: the conflict between structuralism and post-structuralism."),
      spacer(60),

      compTable(
        ["", "Structuralism", "Post-structuralism"],
        [
          ["Core belief", "Reality has universal, underlying structures we can discover (e.g., through language, mathematics)", "All 'structures' are human constructions — arbitrary, contested, and power-laden"],
          ["View of language", "Language has rules that correspond to reality", "Language is unstable; meanings shift; words do not simply 'refer' to fixed realities"],
          ["View of truth", "Objective truth is discoverable through systematic analysis", "Truth is plural, perspectival, and always contested"],
          ["Key thinkers", "Saussure (linguistics), Freud (psychology)", "Derrida, Foucault, Deleuze"],
        ],
        PURPLE
      ),
      spacer(80),

      h3("B) Freud and the Unconscious"),
      body("Sigmund Freud (1856–1939) proposed a structural theory of the mind: all humans share the same unconscious architecture — the id (instincts), ego (conscious thought), and superego (internalized social norms). Psychoanalysis claimed to reveal universal truths about human psychology beneath conscious awareness."),
      spacer(60),
      body("Post-structuralist critics argued: Freud's categories cannot be proven. His theories exclude women's experience. They reflect the patriarchal assumptions of 19th-century Vienna rather than universal human nature. This critique opened the door to feminist philosophy and to a broader questioning of all 'scientific' claims about human nature."),
      spacer(60),
      callout("✝", "Faith Reflection: The Limits of Psychoanalysis",
        "Christians would affirm post-structuralist critiques of Freudian overreach — the claim to have scientifically mapped the universal structure of the human psyche is far beyond what evidence can support. However, Christians also have a rich tradition of understanding the human soul: its longing for God (Augustine), its capacity for self-deception (Jeremiah 17:9), its need for grace and transformation. Psychological insight and spiritual formation are not enemies — they serve different but compatible purposes.",
        "F5EEF8", PURPLE),
      spacer(80),

      h3("C) Key Post-structuralist Thinkers"),

      philCard("Friedrich Nietzsche", "1844–1900",
        "'God is dead' — Nietzsche declared that the Enlightenment had undermined the religious foundations of Western morality, but had not yet provided an alternative. Without God, there is no objective moral order — only 'the abyss.' He developed 'genealogy' as a method for tracing moral concepts back to their historical origins, exposing them as products of power dynamics rather than eternal truths.",
        "Nietzsche's declaration that 'God is dead' was not a triumph but a warning about the consequences of atheism. Without God, Nietzsche saw moral nihilism on the horizon. C.S. Lewis made a similar argument: if there is no God, objective morality collapses. Christians engage Nietzsche not with fear but with the confidence of the resurrection — God is not dead, and the moral order He established is not a fiction but the deepest structure of reality (John 14:6)."),
      spacer(80),

      philCard("Jacques Derrida", "1930–2004",
        "Algerian-born French philosopher. Developed 'deconstruction' — a method of reading texts to expose the hidden assumptions and power dynamics that give some interpretations privilege over others. Argued that language is unstable (différance) — meaning is always deferred and never fully present. Every 'center' that organizes meaning is itself arbitrary.",
        "Derrida's deconstruction has been both fascinating and troubling to Christian scholars. On one hand, it can help us expose how human power structures sometimes distort our reading of Scripture and history. On the other hand, if all texts are infinitely deconstructible, then the Bible's claim to convey God's definitive Word becomes philosophically problematic. Christians affirm that while human language is imperfect and interpretation is complex, God is capable of communicating truly through Scripture, illuminated by the Holy Spirit."),
      spacer(80),

      philCard("Michel Foucault", "1926–1984",
        "French philosopher. Argued that 'knowledge' and 'power' are inseparable — those in power define what counts as knowledge, what is 'normal,' and what is 'deviant.' He used genealogy (borrowed from Nietzsche) to expose how modern institutions — hospitals, prisons, schools, clinics — exercise power by defining and categorizing human beings. Argued that claims to 'truth' often conceal power interests.",
        "Foucault's insight that power shapes knowledge is a genuine gift for Christian engagement with culture. The prophetic tradition of Scripture constantly exposes how those in power define 'normal' in ways that serve their interests at the expense of the marginalized. However, Foucault's framework, taken to its extreme, makes it impossible to ground any claim to truth — including claims about justice or liberation. Christians argue that God's Word stands above all human power games as the final criterion of truth and justice."),
      spacer(80),

      h3("D) Critical Race Theory and Radical Democracy"),
      body("Critical theory has inspired concrete political movements, including Critical Race Theory (CRT) and Radical Democracy."),
      spacer(60),
      infoTable([
        ["Critical Race Theory", "Argues that race is a social construct shaped by power; 'whiteness' as a concept was invented to justify colonialism; racism is built into institutions, not just individual attitudes; policies are insufficient — the power structure itself must be challenged"],
        ["Radical Democracy", "Argues for a democracy that maintains genuine ideological diversity and tension, resisting the normalizing of any single ideology; associated with Habermas's deliberative democracy and with Marxist-influenced movements"],
      ], NAVY, LGRAY),
      spacer(80),
      callout("✝", "Faith Assessment: Critical Race Theory",
        "CRT raises questions that Christians cannot ignore: Does racism persist in institutions and systems beyond individual prejudice? Do power structures shape whose voices are heard? These are legitimate questions.\n\nHowever, CRT's philosophical framework has significant tensions with Christian faith:\n• Its rejection of objective truth makes it difficult to ground claims of racial injustice in universal moral standards.\n• It tends to reduce all human relationships to power dynamics, obscuring the possibility of genuine reconciliation.\n• Its secular framework cannot adequately address the spiritual dimensions of racism — pride, fear, hatred — which require repentance, forgiveness, and transformation.\n\nThe Christian gospel provides the deepest foundation for racial reconciliation: in Christ 'there is neither Jew nor Gentile' (Galatians 3:28). The multiethnic Church is itself a sign of the coming Kingdom where 'every tribe and tongue and people and nation' worship together (Revelation 7:9).",
        "FFF3D4", GOLD),

      spacer(200),
      pageBreak(),

      // ─── KEY TERMS CH12 ────────────────────────────────────
      h3("📌 Key Terms — Chapter 12"),
      keyTermsTable([
        ["Rationalism", "The view that reason, independent of experience, is the primary source of knowledge"],
        ["Empiricism", "The view that knowledge comes through observation, experiment, and sensory experience"],
        ["Positivism", "Comte's third stage of societal development: rejecting religion in favor of scientific, evidence-based understanding"],
        ["Sociology", "The scientific study of human society and its institutions — founded theoretically by Comte, made empirical by Du Bois"],
        ["Dialectic Method", "Hegel's idea that history progresses through thesis → antithesis → synthesis"],
        ["Dialectical Materialism", "Marx's revision of Hegel: class conflict over material conditions (not abstract spirit) drives historical change"],
        ["Hermeneutics", "The philosophical study of interpretation — especially of texts; meaning arises from text-reader-context relationships"],
        ["Historicity", "The view that meaning is always embedded in and shaped by historical context — nothing stands outside history"],
        ["Phenomenology", "Philosophy beginning with first-person lived experience, not abstract theory; 'phenomena' = what appears to us"],
        ["Existentialism", "The philosophical focus on human freedom, meaning-making, and authentic existence; existence precedes essence"],
        ["Frankfurt School", "Group of Marxist-influenced thinkers at the Institute for Social Research in Frankfurt; developed critical theory"],
        ["Critical Theory", "A method of analyzing and challenging the power structures of society; originated with the Frankfurt School"],
        ["Communicative Action", "Habermas's term for free, open public dialogue that has the power to challenge and transform political systems"],
        ["Critical Pedagogy", "Freire's approach: education as dialogue that empowers students to question and challenge oppressive systems"],
        ["Structuralism", "The view that reality has universal underlying structures discoverable through systematic analysis"],
        ["Post-structuralism", "Argues that all 'structures' are arbitrary human constructions shaped by power and context"],
        ["Deconstruction", "Derrida's method: expose hidden assumptions and power dynamics in texts and concepts"],
        ["Postmodernism", "Rejects universal objective truth; all knowledge is perspectival, context-dependent, and power-laden"],
        ["Critical Race Theory", "Applies critical theory to race: argues race is a social construct and racism is embedded in institutions"],
        ["Discourse", "Ricoeur's term for the process of making meaning from texts and dialogue"],
        ["Linguistic Turn", "Early 20th-century philosophical movement privileging logically verifiable statements over those that cannot be proven"],
      ]),

      spacer(200),
      pageBreak(),

      // ─── DISCUSSION QUESTIONS CH12 ────────────────────────
      h2("💬  Chapter 12 Discussion Questions"),
      body("Use these questions for small group discussion, journaling, or classroom reflection."),
      spacer(80),
      discussionTable([
        "Comte predicted that as societies progressed scientifically, religion would fade away. Why has this prediction not come true? What does the persistence of religious faith across all cultures and periods suggest about human nature?",
        "Marx diagnosed 'alienation' as a key problem of modern work. Do you see evidence of alienation in your own work or community? What might a Christian vision of dignified, meaningful work look like in practical terms?",
        "Hermeneutics says that every reader brings their history and context to a text — including the Bible. How does this insight help us read Scripture more carefully? How might it also be misused to undermine Scripture's authority?",
        "The Frankfurt School argued that what we call 'knowledge' is always shaped by power — those in power define what counts as truth. Do you see examples of this in your context? How can Christians guard against power distorting their own understanding of truth?",
        "Derrida's deconstruction argues that every 'center' of meaning is arbitrary and contested. How do Christians respond to this challenge? What is the foundation of meaning for a follower of Jesus (John 1:1-14; Colossians 1:15-20)?",
        "Nietzsche declared 'God is dead' and predicted that without a divine foundation, morality would collapse. Looking at contemporary culture, do you see evidence for or against his prediction? How does the resurrection of Jesus answer Nietzsche's challenge?",
        "Critical Race Theory argues that racism is embedded in institutions and systems, not just individual attitudes. How should Christians engage with this claim? What does Scripture say about structural injustice (Amos 5:24; Micah 6:8; Isaiah 58)?",
      ]),
      spacer(200),

      // ─── SELF-CHECK QUIZ CH12 ─────────────────────────────
      h2("✅  Chapter 12 Self-Check Quiz"),
      body("Answer these questions to test your understanding. Check back to the text for answers."),
      spacer(80),
      numbered("What is the difference between rationalism and empiricism? Give an example of each."),
      numbered("What did Auguste Comte mean by 'positivism'? What was his 'Law of Three Stages'?"),
      numbered("What was W.E.B. Du Bois's contribution to sociology? Why was it historically significant?"),
      numbered("What is Hegel's 'dialectic method'? Explain thesis, antithesis, and synthesis with an example."),
      numbered("How did Marx revise Hegel's dialectic into 'dialectical materialism'? What did he predict would happen?"),
      numbered("Why did Mao Zedong expand the definition of the 'revolutionary class'? What was the result in China?"),
      numbered("What is hermeneutics? What is 'historicity'?"),
      numbered("What is phenomenology's main contribution to philosophy? Who were its key thinkers?"),
      numbered("What is the Frankfurt School? Name three thinkers associated with it and their key ideas."),
      numbered("What is postmodernism's central claim about truth? How does it differ from Enlightenment philosophy?"),
      numbered("What is deconstruction, and who developed it?"),
      numbered("What is the relationship between 'knowledge' and 'power' in Foucault's philosophy?"),

      spacer(300),
      pageBreak(),

      // ══════════════════════ SYNTHESIS SECTION ══════════════════════
      h1("🧭  Putting It All Together: A Christian Response"),
      body("After journeying through Chapters 11 and 12, let us step back and see the whole landscape. What has philosophy been wrestling with, and where does Christian faith fit?"),
      spacer(100),

      h2("The Great Questions — And Christian Answers"),
      compTable(
        ["Philosophy Asks", "Secular Approaches", "Christian Response"],
        [
          ["What makes government legitimate?", "Tradition, charisma, social contract, or rational law (Weber, Hobbes, Locke)", "Ultimately, all authority is derived from and accountable to God (Romans 13:1; Acts 5:29)"],
          ["What kind of society is just?", "Various ideologies: conservatism, liberalism, egalitarianism, socialism, anarchism", "Justice is rooted in God's character; Scripture calls for dignity, equity, and care for the marginalized (Micah 6:8)"],
          ["Can reason alone guide us to truth?", "Enlightenment: Yes. Critical theory: No — reason is power-laden.", "Reason is a gift of God but limited and fallen. Scripture and Spirit illuminate what reason alone cannot reach (1 Corinthians 2:14)"],
          ["What is the source of suffering?", "Marxism: capitalism and class structure. Enlightenment: ignorance and poor institutions.", "Sin — personal and structural; only the gospel transforms both individuals and societies (Romans 8:20-21)"],
          ["Is there objective truth?", "Structuralism: Yes. Postmodernism: No — truth is relative.", "Yes — ultimate truth is found in the God who IS truth (John 14:6; John 17:17)"],
          ["How do we achieve liberation?", "Critical theory: dialogue, deconstruction, dismantling power structures. Marxism: revolution.", "True liberation is from sin and death, through Christ's redemption — and expressed in justice, forgiveness, and community (Luke 4:18; Galatians 5:1)"],
        ],
        NAVY
      ),
      spacer(120),

      callout("✝", "Final Reflection: Engaging Philosophy as a Christian",
        "Philosophy is the love of wisdom (philo = love; sophia = wisdom). Christians believe the source of all wisdom is God Himself: 'For the LORD gives wisdom; from his mouth come knowledge and understanding' (Proverbs 2:6). We need not fear philosophical inquiry — Jesus himself engaged the sharpest minds of his day with questions, stories, and arguments.\n\nBut we do so as disciples: bringing every thought captive to obedience to Christ (2 Corinthians 10:5), testing everything and holding fast to what is good (1 Thessalonians 5:21), being transformed by the renewing of our minds (Romans 12:2).\n\nThe thinkers in these chapters grappled honestly with the deepest questions of human life — often without the light of Scripture. Their partial insights, brilliant though they sometimes are, await completion in the fullness of Truth that is found in Jesus Christ, 'in whom are hidden all the treasures of wisdom and knowledge' (Colossians 2:3).",
        "F5EEF8", PURPLE),

      spacer(200),
      pageBreak(),

      // ─── FINAL INTEGRATIVE ACTIVITY ─────────────────────
      h2("🎯  Final Integrative Activity: Philosophy in My World"),
      body("Complete this reflection as a final assignment, discussion, or journal entry."),
      spacer(100),

      compTable(
        ["Step", "Task"],
        [
          ["1. Choose a social issue", "Select one current issue in your community (e.g., poverty, corruption, racism, inequality, political violence)"],
          ["2. Apply political philosophy", "How would Plato, Locke, Marx, or Rawls analyze this issue? Whose approach seems most useful and why?"],
          ["3. Apply Chapter 12 thinking", "Does this issue involve questions of knowledge and power (Frankfurt School)? Are there competing narratives about its causes (hermeneutics)? Is it related to systemic structures (critical theory)?"],
          ["4. Bring a Christian lens", "What does Scripture say about this issue? What does love of neighbor require? What would justice look like?"],
          ["5. Propose action", "What specific, constructive steps can you or your community take? How do these reflect both your philosophical analysis and your faith commitments?"],
        ],
        NAVY
      ),

      spacer(200),
      pageBreak(),

      // ─── RECOMMENDED READING ─────────────────────────────
      h2("📚  Recommended Further Reading"),
      body("For Christian students who want to go deeper:"),
      spacer(80),

      infoTable([
        ["Plato's Republic (abridged)", "Read Books 1-4 for the foundational discussion of justice"],
        ["C.S. Lewis, Mere Christianity", "A philosophical defense of Christian ethics, engaging liberalism and Marxism"],
        ["John Locke, Second Treatise of Government", "The foundational text for democratic political theory"],
        ["Hannah Arendt, The Origins of Totalitarianism", "Essential reading on the nature and danger of totalitarian regimes"],
        ["Abraham Kuyper, Lectures on Calvinism", "A Reformed Christian political philosophy — sphere sovereignty and God's lordship over all of life"],
        ["Martin Luther King Jr., Letter from Birmingham Jail", "A masterclass in Christian civil disobedience and political theology"],
        ["Nicholas Wolterstorff, Justice: Rights and Wrongs", "A rigorous Christian philosophical account of justice and human rights"],
        ["James K.A. Smith, Who's Afraid of Postmodernism?", "A fair, accessible Christian engagement with Derrida, Lyotard, and Foucault"],
        ["Paulo Freire, Pedagogy of the Oppressed", "Read critically — influential account of education for liberation"],
        ["Os Guinness, The Gravedigger File", "An accessible critique of secular modernity from a Christian perspective"],
      ], NAVY, LGRAY),

      spacer(200),

      // CLOSING
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          borders: noBorders(),
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          margins: { top: 300, bottom: 300, left: 400, right: 400 },
          width: { size: 9360, type: WidthType.DXA },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 }, children: [
              new TextRun({ text: "\"The fear of the LORD is the beginning of wisdom,", font: "Arial", size: 26, color: GOLD, italics: true })
            ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 }, children: [
              new TextRun({ text: "and knowledge of the Holy One is understanding.\"", font: "Arial", size: 26, color: GOLD, italics: true })
            ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [
              new TextRun({ text: "— Proverbs 9:10", font: "Arial", size: 22, color: "B8CCE0", bold: true })
            ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 }, children: [
              new TextRun({ text: "May your study of philosophy deepen your love of God and your service to your neighbor.", font: "Arial", size: 20, color: "E8F0FF", italics: true })
            ]})
          ]
        })]})
        ]
      }),

    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Philosophy_Chapters_11_12_Teaching_Guide.docx', buffer);
  console.log('Done! File saved as Philosophy_Chapters_11_12_Teaching_Guide.docx');
}).catch (error);
});






