import { IDocumentGenerator, Document, DocumentRequest } from '@bmi/ports';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export class PdfDocumentAdapter implements IDocumentGenerator {
  async generateDocument(request: DocumentRequest): Promise<Document> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(`Document Type: ${request.type}`, { x: 50, y: 750, size: 24, font, color: rgb(0, 0, 0.5) });
    page.drawText(`User ID: ${request.userId}`, { x: 50, y: 700, size: 12, font });

    const pdfBytes = await pdfDoc.save();

    return {
      id: crypto.randomUUID(),
      type: request.type,
      userId: request.userId,
      status: 'ready',
      data: Buffer.from(pdfBytes),
      createdAt: new Date(),
    };
  }

  async getDocument(id: string): Promise<Document | null> {
    return null;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return [];
  }

  async verifyDocument(verificationCode: string): Promise<Document | null> {
    return null;
  }
}
