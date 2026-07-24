import { IDocumentGenerator, Document, DocumentRequest } from '@bmi/ports';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFImage } from 'pdf-lib';

const LOGO_URL = 'https://bmi-portal.hkmministries.org/bmi-logo.png';

export class PdfDocumentAdapter implements IDocumentGenerator {
  private static readonly PAGE_W = 612;
  private static readonly PAGE_H = 792;
  private static readonly CARD_W = 340;
  private static readonly CARD_H = 220;
  private static readonly NAVY = rgb(0.06, 0.09, 0.16);
  private static readonly GOLD = rgb(0.83, 0.69, 0.22);
  private static readonly WHITE = rgb(1, 1, 1);
  private static readonly BLACK = rgb(0, 0, 0);
  private static readonly DARK_GRAY = rgb(0.2, 0.2, 0.2);
  private static readonly LIGHT_GRAY = rgb(0.55, 0.55, 0.55);

  private static centerX(text: string, font: PDFFont, size: number, pageW: number = PdfDocumentAdapter.PAGE_W): number {
    return (pageW - font.widthOfTextAtSize(text, size)) / 2;
  }

  private logoCache: Uint8Array | null = null;

  async generateDocument(request: DocumentRequest): Promise<Document> {
    const { type, userId, metadata } = request;
    const pdfDoc = await PDFDocument.create();

    let logo: PDFImage | undefined;
    try {
      const logoData = await this.getLogoBytes();
      if (logoData) logo = await pdfDoc.embedPng(logoData);
    } catch {}

    switch (type) {
      case 'admission_letter':
        await this.buildAdmissionLetter(pdfDoc, logo, metadata);
        break;
      case 'enrollment_letter':
        await this.buildEnrollmentLetter(pdfDoc, logo, metadata);
        break;
      case 'id_card':
        await this.buildIdCard(pdfDoc, logo, metadata);
        break;
      case 'transcript':
        await this.buildTranscript(pdfDoc, logo, metadata);
        break;
      case 'certificate':
        await this.buildCertificate(pdfDoc, logo, metadata);
        break;
      default:
        await this.buildGenericDocument(pdfDoc, type, userId, metadata);
    }

    const pdfBytes = await pdfDoc.save();
    const verificationCode = crypto.randomUUID().split('-')[0];

    return {
      id: crypto.randomUUID(),
      type,
      userId,
      status: 'ready',
      data: Buffer.from(pdfBytes),
      createdAt: new Date(),
      verificationCode,
    };
  }

  async getDocument(_id: string): Promise<Document | null> { return null; }
  async getDocumentsByUser(_userId: string): Promise<Document[]> { return []; }
  async verifyDocument(_verificationCode: string): Promise<Document | null> { return null; }

  private async getLogoBytes(): Promise<Uint8Array | null> {
    if (this.logoCache) return this.logoCache;
    try {
      const res = await fetch(LOGO_URL);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      this.logoCache = new Uint8Array(buf);
      return this.logoCache;
    } catch { return null; }
  }

  private async buildAdmissionLetter(pdf: PDFDocument, logo: PDFImage | undefined, meta?: Record<string, any>): Promise<void> {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const name = meta?.name || 'Applicant';
    const program = meta?.program || 'Program';
    const regNo = meta?.regNo || '';
    const date = meta?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let page = pdf.addPage([PdfDocumentAdapter.PAGE_W, PdfDocumentAdapter.PAGE_H]);
    this.drawLetterhead(pdf, page, font, bold, logo);

    this.drawHLine(page, 562, PdfDocumentAdapter.NAVY, 50, 512, 1);
    page.drawText(`Date: ${date}`, { x: 50, y: 540, size: 10, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Registration No: ${regNo || '______'}`, { x: 350, y: 540, size: 10, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText('ADMISSION LETTER', { x: 50, y: 500, size: 24, font: bold, color: PdfDocumentAdapter.NAVY });

    const bodyLines = [
      `Dear ${name},`,
      '',
      `Congratulations! On behalf of BMI University, I am pleased to inform you that you have been admitted to the ${program} program for the upcoming academic year.`,
      '',
      'Your admission is subject to the terms and conditions set forth in the university policies. Below are your next steps:',
      '',
      '1. Claim your student account using the admission code sent to your email',
      '2. Complete the online registration process through your student portal',
      '3. Upload required documents (ID photo, transcripts, etc.)',
      '4. Pay the required tuition and registration fees',
      '5. Enroll in your semester modules once registration is complete',
      '',
      'Once again, welcome to BMI University. We look forward to seeing you thrive.',
      '',
      'Sincerely,',
    ];

    let y = 460;
    for (const line of bodyLines) {
      page.drawText(line, { x: 50, y, size: 14, font, color: PdfDocumentAdapter.BLACK });
      y -= 20;
    }

    page.drawText('Admissions Office', { x: 50, y: y - 10, size: 14, font: bold, color: PdfDocumentAdapter.GOLD });
    page.drawText('BMI University', { x: 50, y: y - 30, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    this.drawFooter(pdf, page, font);
  }

  private async buildEnrollmentLetter(pdf: PDFDocument, logo: PDFImage | undefined, meta?: Record<string, any>): Promise<void> {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const name = meta?.name || 'Student';
    const program = meta?.program || 'Program';
    const regNo = meta?.regNo || '';
    const uid = meta?.uid || '';
    const date = meta?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let page = pdf.addPage([PdfDocumentAdapter.PAGE_W, PdfDocumentAdapter.PAGE_H]);
    this.drawLetterhead(pdf, page, font, bold, logo);

    this.drawHLine(page, 562, PdfDocumentAdapter.NAVY, 50, 512, 1);
    page.drawText(`Date: ${date}`, { x: 50, y: 540, size: 10, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText('ENROLLMENT VERIFICATION', { x: 50, y: 500, size: 24, font: bold, color: PdfDocumentAdapter.NAVY });

    this.drawRect(page, 50, 360, 512, 100, PdfDocumentAdapter.LIGHT_GRAY);
    page.drawText(`Student: ${name}`, { x: 65, y: 445, size: 14, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText(`Student ID: ${uid || '______'}`, { x: 65, y: 422, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Registration No: ${regNo || '______'}`, { x: 65, y: 402, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Program: ${program}`, { x: 65, y: 382, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Status: Active`, { x: 65, y: 362, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });

    page.drawText(`This certifies that the above-named individual is currently enrolled`, { x: 50, y: 315, size: 13, font, color: PdfDocumentAdapter.BLACK });
    page.drawText(`as a student at BMI University.`, { x: 50, y: 295, size: 13, font, color: PdfDocumentAdapter.BLACK });

    this.drawFooter(pdf, page, font);
  }

  private async buildIdCard(pdf: PDFDocument, logo: PDFImage | undefined, meta?: Record<string, any>): Promise<void> {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const name = meta?.name || 'Student';
    const uid = meta?.uid || '';
    const regNo = meta?.regNo || '';
    const program = meta?.program || '';

    let page = pdf.addPage([PdfDocumentAdapter.CARD_W, PdfDocumentAdapter.CARD_H]);

    this.drawRect(page, 0, 0, PdfDocumentAdapter.CARD_W, PdfDocumentAdapter.CARD_H, PdfDocumentAdapter.NAVY);
    this.drawRect(page, 5, 5, PdfDocumentAdapter.CARD_W - 10, PdfDocumentAdapter.CARD_H - 10, PdfDocumentAdapter.WHITE);

    if (logo) {
      const logoDims = logo.scale(0.08);
      page.drawImage(logo, { x: 12, y: 175, width: logoDims.width, height: logoDims.height });
    }
    page.drawText('BMI University', { x: 50, y: 190, size: 16, font: bold, color: PdfDocumentAdapter.NAVY });

    this.drawRect(page, 50, 50, 65, 85, PdfDocumentAdapter.LIGHT_GRAY);
    page.drawText('PHOTO', { x: 70, y: 85, size: 10, font, color: PdfDocumentAdapter.WHITE });

    page.drawText(name, { x: 130, y: 120, size: 18, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText(`ID: ${uid || '______'}`, { x: 130, y: 100, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Reg: ${regNo || '______'}`, { x: 130, y: 82, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`${program}`, { x: 130, y: 64, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });

    page.drawText('Student ID Card', { x: 12, y: 30, size: 10, font: bold, color: PdfDocumentAdapter.GOLD });
    page.drawText(`Valid: ${new Date().getFullYear()}`, { x: 200, y: 30, size: 10, font, color: PdfDocumentAdapter.LIGHT_GRAY });
  }

  private async buildTranscript(pdf: PDFDocument, logo: PDFImage | undefined, meta?: Record<string, any>): Promise<void> {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const name = meta?.name || 'Student';
    const uid = meta?.uid || '';
    const regNo = meta?.regNo || '';
    const program = meta?.program || '';
    const gpa = meta?.gpa || '';
    const courses = meta?.courses || [];
    const date = meta?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let page = pdf.addPage([PdfDocumentAdapter.PAGE_W, PdfDocumentAdapter.PAGE_H]);
    this.drawLetterhead(pdf, page, font, bold, logo);

    this.drawHLine(page, 562, PdfDocumentAdapter.NAVY, 50, 512, 1);
    page.drawText('ACADEMIC TRANSCRIPT', { x: 50, y: 545, size: 22, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText(`Date Issued: ${date}`, { x: 50, y: 520, size: 10, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Document Type: Unofficial`, { x: 350, y: 520, size: 10, font, color: PdfDocumentAdapter.DARK_GRAY });

    this.drawHLine(page, 510, PdfDocumentAdapter.LIGHT_GRAY, 50, 512, 0.5);
    page.drawText(`Student: ${name}`, { x: 50, y: 495, size: 14, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText(`Student ID: ${uid || '______'}`, { x: 50, y: 478, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Registration No: ${regNo || '______'}`, { x: 300, y: 478, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Program: ${program}`, { x: 50, y: 461, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });

    this.drawHLine(page, 450, PdfDocumentAdapter.LIGHT_GRAY, 50, 512, 0.5);
    page.drawText('Course Code', { x: 50, y: 435, size: 11, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText('Course Name', { x: 150, y: 435, size: 11, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText('Credits', { x: 370, y: 435, size: 11, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText('Grade', { x: 430, y: 435, size: 11, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText('Semester', { x: 490, y: 435, size: 11, font: bold, color: PdfDocumentAdapter.NAVY });
    this.drawHLine(page, 427, PdfDocumentAdapter.BLACK, 50, 512, 0.5);

    let y = 415;
    const items = Array.isArray(courses) && courses.length > 0 ? courses : [
      { code: '---', name: 'No courses loaded', credits: '', grade: '', semester: '' }
    ];

    for (const c of items) {
      page.drawText(String(c.code || ''), { x: 50, y, size: 10, font, color: PdfDocumentAdapter.BLACK });
      page.drawText(String(c.name || ''), { x: 150, y, size: 10, font, color: PdfDocumentAdapter.BLACK });
      page.drawText(String(c.credits || ''), { x: 375, y, size: 10, font, color: PdfDocumentAdapter.BLACK });
      page.drawText(String(c.grade || ''), { x: 435, y, size: 10, font, color: PdfDocumentAdapter.BLACK });
      page.drawText(String(c.semester || ''), { x: 495, y, size: 10, font, color: PdfDocumentAdapter.BLACK });
      y -= 18;
    }

    this.drawHLine(page, y - 5, PdfDocumentAdapter.BLACK, 50, 512, 0.5);
    page.drawText(`Cumulative GPA: ${gpa || 'N/A'}`, { x: 50, y: y - 25, size: 14, font: bold, color: PdfDocumentAdapter.NAVY });
    this.drawFooter(pdf, page, font);
  }

  private async buildCertificate(pdf: PDFDocument, logo: PDFImage | undefined, meta?: Record<string, any>): Promise<void> {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const name = meta?.name || 'Graduate';
    const program = meta?.program || 'Program';
    const uid = meta?.uid || '';
    const regNo = meta?.regNo || '';
    const awardDate = meta?.awardDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const classification = meta?.classification || '';

    let page = pdf.addPage([PdfDocumentAdapter.PAGE_W, PdfDocumentAdapter.PAGE_H]);

    this.drawRect(page, 0, 0, PdfDocumentAdapter.PAGE_W, PdfDocumentAdapter.PAGE_H, PdfDocumentAdapter.WHITE);
    this.drawRect(page, 20, 20, 572, 752, PdfDocumentAdapter.NAVY);
    this.drawRect(page, 25, 25, 562, 742, PdfDocumentAdapter.WHITE);
    this.drawRect(page, 28, 28, 556, 736, PdfDocumentAdapter.NAVY);
    this.drawRect(page, 32, 32, 548, 728, PdfDocumentAdapter.WHITE);

    if (logo) {
      const logoDims = logo.scale(0.12);
      page.drawImage(logo, { x: 306 - logoDims.width / 2, y: 690, width: logoDims.width, height: logoDims.height });
    }

    page.drawText('BMI University', { x: PdfDocumentAdapter.centerX('BMI University', bold, 28), y: 650, size: 28, font: bold, color: PdfDocumentAdapter.GOLD });
    page.drawText('Excellence in Education', { x: PdfDocumentAdapter.centerX('Excellence in Education', font, 14), y: 630, size: 14, font, color: PdfDocumentAdapter.LIGHT_GRAY });
    page.drawText('Certificate of Completion', { x: PdfDocumentAdapter.centerX('Certificate of Completion', bold, 18), y: 590, size: 18, font: bold, color: PdfDocumentAdapter.NAVY });

    this.drawHLine(page, 575, PdfDocumentAdapter.GOLD, 120, 372, 1);
    page.drawText('This is to certify that', { x: PdfDocumentAdapter.centerX('This is to certify that', font, 14), y: 545, size: 14, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(name, { x: PdfDocumentAdapter.centerX(name, bold, 28), y: 510, size: 28, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText(`has successfully completed the`, { x: PdfDocumentAdapter.centerX('has successfully completed the', font, 14), y: 480, size: 14, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(program, { x: PdfDocumentAdapter.centerX(program, bold, 20), y: 450, size: 20, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText(`program at BMI University`, { x: PdfDocumentAdapter.centerX('program at BMI University', font, 14), y: 420, size: 14, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Award Date: ${awardDate}`, { x: PdfDocumentAdapter.centerX(`Award Date: ${awardDate}`, font, 14), y: 390, size: 14, font, color: PdfDocumentAdapter.BLACK });

    if (classification) {
      page.drawText(`Classification: ${classification}`, { x: PdfDocumentAdapter.centerX(`Classification: ${classification}`, bold, 14), y: 365, size: 14, font: bold, color: PdfDocumentAdapter.GOLD });
    }

    this.drawHLine(page, 345, PdfDocumentAdapter.GOLD, 120, 372, 1);
    page.drawText(`Student ID: ${uid || '______'}`, { x: PdfDocumentAdapter.centerX(`Student ID: ${uid || '______'}`, font, 12), y: 320, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(`Registration No: ${regNo || '______'}`, { x: PdfDocumentAdapter.centerX(`Registration No: ${regNo || '______'}`, font, 12), y: 300, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });

    page.drawText('Authorized Signature', { x: 200, y: 180, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    this.drawHLine(page, 175, PdfDocumentAdapter.BLACK, 140, 180, 1);
    page.drawText('Registrar', { x: 200, y: 162, size: 11, font, color: PdfDocumentAdapter.LIGHT_GRAY });

    page.drawText('Verification Code', { x: 400, y: 180, size: 12, font, color: PdfDocumentAdapter.DARK_GRAY });
    page.drawText(meta?.verificationCode || '______', { x: 400, y: 162, size: 10, font, color: PdfDocumentAdapter.LIGHT_GRAY });
  }

  private async buildGenericDocument(pdf: PDFDocument, type: string, userId: string, meta?: Record<string, any>): Promise<void> {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([PdfDocumentAdapter.PAGE_W, PdfDocumentAdapter.PAGE_H]);

    page.drawText(`Document Type: ${type.replace('_', ' ').toUpperCase()}`, { x: 50, y: 550, size: 24, font: bold, color: PdfDocumentAdapter.NAVY });
    page.drawText(`User ID: ${userId}`, { x: 50, y: 510, size: 14, font, color: PdfDocumentAdapter.DARK_GRAY });
    if (meta) {
      let y = 480;
      for (const [key, value] of Object.entries(meta)) {
        page.drawText(`${key}: ${String(value)}`, { x: 50, y, size: 12, font, color: PdfDocumentAdapter.BLACK });
        y -= 18;
      }
    }
    this.drawFooter(pdf, page, font);
  }

  private drawLetterhead(_pdf: PDFDocument, page: any, font: PDFFont, bold: PDFFont, logo?: PDFImage): void {
    this.drawRect(page, 0, 650, PdfDocumentAdapter.PAGE_W, 142, PdfDocumentAdapter.NAVY);

    if (logo) {
      const dims = logo.scale(0.1);
      page.drawImage(logo, { x: 50, y: 680, width: dims.width, height: dims.height });
    }

    page.drawText('BMI University', { x: logo ? 160 : 50, y: 720, size: 32, font: bold, color: PdfDocumentAdapter.GOLD });
    page.drawText('Excellence in Education', { x: logo ? 160 : 50, y: 690, size: 14, font, color: PdfDocumentAdapter.WHITE });
    page.drawText('www.bmi.edu | admissions@bmi.edu', { x: logo ? 160 : 50, y: 668, size: 12, font, color: PdfDocumentAdapter.LIGHT_GRAY });

    this.drawHLine(page, 645, PdfDocumentAdapter.GOLD, 0, 612, 3);
  }

  private drawFooter(_pdf: PDFDocument, page: any, font: PDFFont): void {
    this.drawHLine(page, 50, PdfDocumentAdapter.LIGHT_GRAY, 50, 512, 1);
    page.drawText('This is a computer-generated document. Verification code can be used to validate authenticity.', {
      x: 50, y: 30, size: 10, font, color: PdfDocumentAdapter.LIGHT_GRAY,
    });
    page.drawText(`Generated: ${new Date().toISOString()}`, {
      x: 50, y: 14, size: 10, font, color: PdfDocumentAdapter.LIGHT_GRAY,
    });
  }

  private drawRect(page: any, x: number, y: number, w: number, h: number, color: any): void {
    page.drawRectangle({ x, y, width: w, height: h, color, borderWidth: 0 });
  }

  private drawHLine(page: any, y: number, color: any, x: number, w: number, t: number): void {
    page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: t, color });
  }
}