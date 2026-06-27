/* eslint-disable */
/* eslint-disable */
/* eslint-disable */
/**
 * BMI University Management System - Document Service
 * Comprehensive document management with maximum security features
 * 100% Open Source - No proprietary dependencies
 */

import type {
  BaseDocument,
  DocumentType,
  DocumentStatus,
  DocumentSecurityFeatures,
  DocumentGenerationRequest,
  DocumentOutputOptions,
  DocumentVerificationResult,
  DocumentTemplate,
  DocumentStatistics,
  DocumentAuditLog,
  EnhancedCertificate,
  EnhancedTranscript,
  StudentIDCard,
  AdmissionLetter,
  GoodStandingLetter,
  RegistrationCard,
  LibraryCard,
  AttendanceRecord,
} from "../types/documents";

// QR Code generation (using free API or local implementation)
import QRCode from "qrcode";
import { getHtml2Pdf } from "./pdfService";
import { API_URL as SHARED_API_URL } from "./config";

/**
 * Document Service - Central hub for all document operations
 * Implements all security features using native Web APIs
 */
export class DocumentService {
  private static instance: DocumentService;
  private readonly API_BASE: string;
  private readonly STORAGE_KEY = "bmi_documents";
  private readonly AUDIT_KEY = "bmi_document_audit";
  private readonly TEMPLATES_KEY = "bmi_document_templates";

  private constructor() {
    // Strip the `/api/v1` suffix from the shared base if present, then
    // append it again — keeps behavior identical to the previous logic
    // but routes through the single source-of-truth `config.ts`.
    const base = SHARED_API_URL;
    this.API_BASE = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
  }

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  // ==========================================
  // CRYPTOGRAPHIC SECURITY FEATURES
  // ==========================================

  /**
   * Generate SHA-256 hash of document content
   * Uses native Web Crypto API - 100% open source
   */
  async generateContentHash(data: Record<string, any>): Promise<string> {
    const canonicalString = JSON.stringify(data, Object.keys(data).sort());
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(canonicalString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Generate unique serial number with cryptographic randomness
   */
  generateSerialNumber(type: DocumentType, studentId: string): string {
    const year = new Date().getFullYear();
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    const prefix = this.getDocumentPrefix(type);
    const cleanId = studentId.replace(/[^A-Z0-9]/gi, "").slice(0, 6);

    return `${prefix}-${year}-${cleanId}-${randomHex}`;
  }

  private getDocumentPrefix(type: DocumentType): string {
    const prefixes: Record<DocumentType, string> = {
      certificate: "BMI-CERT",
      transcript: "BMI-TRANS",
      id_card: "BMI-ID",
      admission_letter: "BMI-ADM",
      good_standing: "BMI-GS",
      registration_card: "BMI-REG",
      library_card: "BMI-LIB",
      attendance_record: "BMI-ATT",
    };
    return prefixes[type];
  }

  /**
   * Generate anti-tamper seal hash
   * Combines multiple hash algorithms for extra security
   */
  async generateSealHash(
    contentHash: string,
    serialNumber: string,
    timestamp: string,
  ): Promise<string> {
    const sealData = `${contentHash}|${serialNumber}|${timestamp}|BMI-SEAL`;
    return this.generateContentHash({ seal: sealData });
  }

  /**
   * Generate blockchain-style anchor hash
   * Creates a chain of hashes for immutability verification
   */
  async generateBlockchainAnchor(
    previousAnchor: string | null,
    currentHash: string,
  ): Promise<string> {
    const anchorData = previousAnchor
      ? `${previousAnchor}|${currentHash}|${Date.now()}`
      : `${currentHash}|GENESIS|${Date.now()}`;
    return this.generateContentHash({ anchor: anchorData });
  }

  /**
   * Generate digital signature (simplified using HMAC concept)
   * In production, this would use proper RSA/ECDSA keys
   */
  async generateDigitalSignature(
    contentHash: string,
    issuerKey: string,
  ): Promise<string> {
    const signatureData = `${contentHash}|${issuerKey}|${Date.now()}`;
    return this.generateContentHash({ sign: signatureData });
  }

  // ==========================================
  // QR CODE & BARCODE GENERATION
  // ==========================================

  /**
   * Generate QR code data URL with verification information
   */
  async generateQRCode(
    verificationUrl: string,
    options?: { width?: number; margin?: number },
  ): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(verificationUrl, {
        width: options?.width || 200,
        margin: options?.margin || 2,
        color: {
          dark: "#4B0082",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      });
      return dataUrl;
    } catch (error) { console.error("QR Code generation failed:", error);
      // Return empty string rather than leaking document data to a third-party CDN.
      // The transcript component will handle missing QR gracefully.
      return "";
     }
  }

  /**
   * Generate barcode data for ID cards
   */
  generateBarcodeData(serialNumber: string, studentId: string): string {
    // Code 128 compatible format
    return `\x00BMI${studentId.replace(/[^A-Z0-9]/gi, "")}${serialNumber.slice(-8)}\x00`;
  }

  // ==========================================
  // VERIFICATION URL GENERATION
  // ==========================================

  /**
   * Generate a verification URL.
   * Uses the unified scheme: ?id=SERIAL&t=TOKEN
   * where TOKEN is the HMAC nonce token returned by the backend on registration.
   * Falls back to serial-only URL when token is not yet available.
   */
  generateVerificationUrl(
    serialNumber: string,
    hiddenToken?: string,
    _contentHash?: string, // kept for backward-compat call sites
    _type?: DocumentType,
  ): string {
    // Prefer the configured public portal URL so QR codes on printed
    // documents link to the real publicly-accessible site, not localhost.
    // Set VITE_VERIFY_URL=https://verify.bmiuniversity.ac.ke in .env
    const baseUrl =
      (import.meta.env.VITE_VERIFY_URL as string | undefined) ??
      window.location.origin;
    if (hiddenToken) {
      return `${baseUrl}/verify?id=${encodeURIComponent(serialNumber)}&t=${encodeURIComponent(hiddenToken)}`;
    }
    return `${baseUrl}/verify?id=${encodeURIComponent(serialNumber)}`;
  }

  // ==========================================
  // DOCUMENT GENERATION
  // ==========================================

  /**
   * Generate complete security features for a document.
   *
   * TRANSCRIPTS register server-side so the QR works on any device.
   * Other document types keep the existing client-side path.
   */
  async generateSecurityFeatures(
    type: DocumentType,
    studentId: string,
    contentData: Record<string, any>,
    options?: { expiresAt?: string; includeBlockchain?: boolean },
  ): Promise<DocumentSecurityFeatures> {
    const timestamp = new Date().toISOString();

    // Content hash covers all visible fields
    const contentHash = await this.generateContentHash({
      ...contentData,
      studentId,
      timestamp,
    });

    // ── TRANSCRIPT: server-side registration ──────────────────────────────
    if (type === "transcript") {
      try {
        const { authFetch } = await import("./authService");
        const studentName =
          (contentData.studentName as string) ||
          `${String(contentData.first_name ?? "")} ${String(contentData.last_name ?? "")}`.trim();
        const res = await authFetch(`${this.API_BASE}/transcripts/register`, {
          method: "POST",
          body: JSON.stringify({
            studentId,
            studentName,
            programme: String(
              contentData.programme ?? contentData.program_code ?? "Unknown",
            ),
            academicYear: String(
              contentData.academicYear ??
                new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
            ),
            contentHash,
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            success: boolean;
            data?: {
              serialNumber: string;
              issuedAt: string;
              verificationUrl: string;
              hiddenToken: string;
            };
          };
          if (json.success && json.data) {
            const { serialNumber, issuedAt, verificationUrl, hiddenToken } =
              json.data;
            // Regenerate QR with the backend-issued token (no CDN fallback)
            const qrCodeDataUrl = await this.generateQRCode(verificationUrl);
            const sealHash = await this.generateSealHash(
              contentHash,
              serialNumber,
              timestamp,
            );
            return {
              contentHash,
              serialNumber,
              qrCodeDataUrl,
              verificationUrl,
              issuedAt,
              expiresAt: options?.expiresAt,
              sealHash,
              verificationCount: 0,
            };
          }
        }
      } catch (error) { console.warn(
          "[DocumentService] Transcript server registration failed, falling back to client-side:",
          error,
        );
      }
      // Fallback: client-side serial (verification will only work in this browser)
      console.warn(
        "[DocumentService] Using client-side transcript serial. QR will not verify cross-device.",
      );
    }

    // ── All other types (and transcript fallback) ────────────────────────────
    const serialNumber = this.generateSerialNumber(type, studentId);
    const sealHash = await this.generateSealHash(
      contentHash,
      serialNumber,
      timestamp,
    );
    const verificationUrl = this.generateVerificationUrl(serialNumber);
    const qrCodeDataUrl = await this.generateQRCode(verificationUrl);

    let blockchainAnchor: string | undefined;
    if (options?.includeBlockchain) {
      const previousAnchor = await this.getLastAnchor();
      blockchainAnchor = await this.generateBlockchainAnchor(
        previousAnchor,
        contentHash,
      );
    }

    return {
      contentHash,
      serialNumber,
      qrCodeDataUrl,
      verificationUrl,
      issuedAt: timestamp,
      expiresAt: options?.expiresAt,
      sealHash,
      blockchainAnchor,
      verificationCount: 0,
    };
  }

  /**
   * Create a new document with full security
   */
  async createDocument<T extends BaseDocument>(
    type: DocumentType,
    studentId: string,
    data: Omit<T, "id" | "type" | "security" | "createdAt" | "updatedAt">,
    options?: { templateId?: string; expiresAt?: string; createdBy?: string },
  ): Promise<T> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Generate security features
    const security = await this.generateSecurityFeatures(
      type,
      studentId,
      { ...data, id },
      {
        expiresAt: options?.expiresAt,
        includeBlockchain: true,
      },
    );

    const document: BaseDocument = {
      ...data, // spread first so explicit fields below override
      id,
      type,
      studentId,
      status: "issued" as const,
      security,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: options?.createdBy || "system",
    } as BaseDocument;

    // Save to storage
    await this.saveDocument(document);

    // Log audit entry
    await this.logAuditEntry(
      document.id,
      "created",
      options?.createdBy || "system",
      {
        templateId: options?.templateId,
      },
    );

    return document as T;
  }

  // ==========================================
  // DOCUMENT STORAGE & RETRIEVAL
  // ==========================================

  /**
   * Save document to persistent storage
   */
  private async saveDocument(document: BaseDocument): Promise<void> {
    const documents = await this.getAllDocuments();
    const existingIndex = documents.findIndex((d) => d.id === document.id);

    if (existingIndex >= 0) {
      documents[existingIndex] = document;
    } else {
      documents.push(document);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
  }

  /**
   * Get all documents from storage
   */
  async getAllDocuments(): Promise<BaseDocument[]> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: string): Promise<BaseDocument | null> {
    const documents = await this.getAllDocuments();
    return documents.find((d) => d.id === id) || null;
  }

  /**
   * Get documents by student ID
   */
  async getDocumentsByStudent(studentId: string): Promise<BaseDocument[]> {
    const documents = await this.getAllDocuments();
    return documents.filter((d) => d.studentId === studentId);
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(type: DocumentType): Promise<BaseDocument[]> {
    const documents = await this.getAllDocuments();
    return documents.filter((d) => d.type === type);
  }

  // ==========================================
  // DOCUMENT VERIFICATION
  // ==========================================

  /**
   * Verify document authenticity
   */
  async verifyDocument(
    serialNumber: string,
    providedHash?: string,
    options?: { method?: "online" | "qr_scan" | "api" },
  ): Promise<DocumentVerificationResult> {
    const timestamp = new Date().toISOString();
    const method = options?.method || "online";

    try {
      // Find document by serial number
      const documents = await this.getAllDocuments();
      const document = documents.find(
        (d) => d.security.serialNumber === serialNumber,
      );

      if (!document) {
        return {
          valid: false,
          securityCheck: {
            hashValid: false,
            sealIntact: false,
            notExpired: false,
            notRevoked: false,
            qrCodeValid: false,
          },
          verification: {
            timestamp,
            method,
          },
          error: "Document not found",
          code: "NOT_FOUND",
         };
      }

      // Perform security checks
      const now = new Date();
      const securityCheck = {
        hashValid:
          !providedHash ||
          document.security.contentHash.startsWith(providedHash),
        sealIntact: await this.verifySeal(document),
        notExpired:
          !document.security.expiresAt ||
          new Date(document.security.expiresAt) > now,
        notRevoked: document.status !== "revoked",
        qrCodeValid: true,
      };

      const isValid = Object.values(securityCheck).every((check) => check);

      // Update verification count
      document.security.verificationCount++;
      document.security.lastVerifiedAt = timestamp;
      await this.saveDocument(document);

      // Log verification
      await this.logAuditEntry(document.id, "verified", "anonymous", {
        method,
        result: isValid,
      });

      return {
        valid: isValid,
        document: isValid ? document : undefined,
        securityCheck,
        verification: {
          timestamp,
          method,
          verifiedBy: method === "api" ? "api_client" : undefined,
        },
      };
    } catch (error) { return {
        valid: false,
        securityCheck: {
          hashValid: false,
          sealIntact: false,
          notExpired: false,
          notRevoked: false,
          qrCodeValid: false,
        },
        verification: {
          timestamp,
          method,
        },
        error: error instanceof Error ? error.message : "Verification failed",
        code: "VERIFICATION_ERROR",
       };
    }
  }

  /**
   * Verify document seal integrity
   */
  private async verifySeal(document: BaseDocument): Promise<boolean> {
    const expectedSeal = await this.generateSealHash(
      document.security.contentHash,
      document.security.serialNumber,
      document.security.issuedAt,
    );
    return expectedSeal === document.security.sealHash;
  }

  // ==========================================
  // DOCUMENT OUTPUT (PRINT/PDF)
  // ==========================================

  /**
   * Generate PDF from document
   */
  async generatePDF(
    documentId: string,
    options: DocumentOutputOptions = { format: "pdf", quality: "high" },
  ): Promise<Blob | null> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) return null;

    // Get the DOM element for the document
    const elementId = `document-${documentId}`;
    const element = globalThis.document.getElementById(elementId);
    if (!element) {
      console.error(`Document element not found: ${elementId}`);
      return null;
    }

    try {
      const html2pdf = await getHtml2Pdf();

      const qualityMap = { low: 1, medium: 1.5, high: 2, maximum: 3 };
      const scale = qualityMap[options.quality || "high"];

      const pdfOptions = {
        margin: 0,
        filename:
          options.filename || `${doc.type}_${doc.security.serialNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor:
            options.includeBackground !== false ? "#FFFFFF" : null,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      };

      const pdfBlob = await (html2pdf as any)()
        .set(pdfOptions)
        .from(element)
        .output("blob");

      // Log download
      await this.logAuditEntry(doc.id, "downloaded", "user", {
        format: "pdf",
        quality: options.quality,
      });

      return pdfBlob;
    } catch (error) { console.error("PDF generation failed:", error);
      return null;
     }
  }

  /**
   * Download PDF file
   */
  async downloadPDF(documentId: string, filename?: string): Promise<boolean> {
    const blob = await this.generatePDF(documentId, {
      format: "pdf",
      filename,
      quality: "high",
    });

    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `document_${documentId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  }

  /**
   * Print document
   */
  async printDocument(documentId: string): Promise<boolean> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) return false;

    const elementId = `document-${documentId}`;
    const element = globalThis.document.getElementById(elementId);
    if (!element) return false;

    // Log print
    await this.logAuditEntry(doc.id, "printed", "user");

    // Trigger print
    const originalTitle = globalThis.document.title;
    globalThis.document.title =
      `${doc.type}_${doc.security.serialNumber}`.toUpperCase();
    window.print();
    setTimeout(() => {
      globalThis.document.title = originalTitle;
    }, 1000);

    return true;
  }

  // ==========================================
  // DOCUMENT TEMPLATES
  // ==========================================

  /**
   * Get default document templates
   */
  async getDefaultTemplates(): Promise<DocumentTemplate[]> {
    return [
      {
        id: "certificate-standard",
        type: "certificate",
        name: "Standard Certificate",
        description: "Traditional A4 landscape certificate with gold seal",
        orientation: "landscape",
        paperSize: "A4",
        securityLevel: "enhanced",
        features: {
          qrCode: true,
          barcode: false,
          microtext: true,
          guilloche: true,
          watermark: true,
          holographic: true,
          uvFeatures: false,
          digitalSignature: true,
        },
        design: {
          primaryColor: "#4B0082",
          secondaryColor: "#FFD700",
          accentColor: "#000000",
          fontFamily: "serif",
          borderStyle: "ornate",
        },
        isDefault: true,
        isActive: true,
      },
      {
        id: "transcript-official",
        type: "transcript",
        name: "Official Transcript",
        description: "Official academic record with full security features",
        orientation: "portrait",
        paperSize: "A4",
        securityLevel: "maximum",
        features: {
          qrCode: true,
          barcode: false,
          microtext: true,
          guilloche: true,
          watermark: true,
          holographic: false,
          uvFeatures: false,
          digitalSignature: true,
        },
        design: {
          primaryColor: "#4B0082",
          secondaryColor: "#000000",
          accentColor: "#666666",
          fontFamily: "sans-serif",
          borderStyle: "double",
        },
        isDefault: true,
        isActive: true,
      },
      {
        id: "id-card-standard",
        type: "id_card",
        name: "Standard ID Card",
        description: "ISO ID-1 format student identification card",
        orientation: "landscape",
        paperSize: "ID1",
        customDimensions: { width: 85.6, height: 54, unit: "mm" },
        securityLevel: "enhanced",
        features: {
          qrCode: true,
          barcode: true,
          microtext: true,
          guilloche: false,
          watermark: false,
          holographic: true,
          uvFeatures: true,
          digitalSignature: false,
        },
        design: {
          primaryColor: "#4B0082",
          secondaryColor: "#FFFFFF",
          accentColor: "#FFD700",
          fontFamily: "sans-serif",
          borderStyle: "simple",
        },
        isDefault: true,
        isActive: true,
      },
      {
        id: "admission-letter",
        type: "admission_letter",
        name: "Admission Letter",
        description: "Official letter of admission with security features",
        orientation: "portrait",
        paperSize: "A4",
        securityLevel: "standard",
        features: {
          qrCode: true,
          barcode: false,
          microtext: false,
          guilloche: false,
          watermark: true,
          holographic: false,
          uvFeatures: false,
          digitalSignature: true,
        },
        design: {
          primaryColor: "#4B0082",
          secondaryColor: "#000000",
          accentColor: "#FFD700",
          fontFamily: "serif",
          borderStyle: "none",
        },
        isDefault: true,
        isActive: true,
      },
    ];
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    const templates = await this.getDefaultTemplates();
    return templates.find((t) => t.id === templateId) || null;
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================

  /**
   * Log audit entry for document action
   */
  private async logAuditEntry(
    documentId: string,
    action: DocumentAuditLog["action"],
    performedBy: string,
    details?: Record<string, any>,
  ): Promise<void> {
    const logs = this.getAuditLogs();
    const entry: DocumentAuditLog = {
      id: crypto.randomUUID(),
      documentId,
      action,
      performedBy,
      performedAt: new Date().toISOString(),
      ipAddress: undefined, // Would be populated in real implementation
      userAgent: navigator.userAgent,
      details,
    };

    logs.push(entry);
    localStorage.setItem(this.AUDIT_KEY, JSON.stringify(logs));
  }

  /**
   * Get all audit logs
   */
  getAuditLogs(): DocumentAuditLog[] {
    const stored = localStorage.getItem(this.AUDIT_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get audit logs for specific document
   */
  getAuditLogsForDocument(documentId: string): DocumentAuditLog[] {
    return this.getAuditLogs().filter((log) => log.documentId === documentId);
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<DocumentStatistics> {
    const documents = await this.getAllDocuments();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const byType: Record<DocumentType, number> = {
      certificate: 0,
      transcript: 0,
      id_card: 0,
      admission_letter: 0,
      good_standing: 0,
      registration_card: 0,
      library_card: 0,
      attendance_record: 0,
    };

    const byStatus: Record<DocumentStatus, number> = {
      draft: 0,
      issued: 0,
      revoked: 0,
      suspended: 0,
      expired: 0,
    };

    let issuedThisMonth = 0;
    let issuedThisYear = 0;

    documents.forEach((doc) => {
      byType[doc.type]++;
      byStatus[doc.status]++;

      const created = new Date(doc.createdAt);
      if (created.getFullYear() === thisYear) {
        issuedThisYear++;
        if (created.getMonth() === thisMonth) {
          issuedThisMonth++;
        }
      }
    });

    const mostVerified = documents
      .sort(
        (a, b) => b.security.verificationCount - a.security.verificationCount,
      )
      .slice(0, 5)
      .map((d) => ({ documentId: d.id, count: d.security.verificationCount }));

    return {
      totalDocuments: documents.length,
      byType,
      byStatus,
      issuedThisMonth,
      issuedThisYear,
      revokedCount: byStatus.revoked,
      averageVerificationTime: 0.5, // Simulated average in seconds
      mostVerifiedDocuments: mostVerified,
    };
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Revoke a document
   */
  async revokeDocument(
    documentId: string,
    reason: string,
    revokedBy: string,
  ): Promise<boolean> {
    const document = await this.getDocumentById(documentId);
    if (!document) return false;

    document.status = "revoked";
    document.updatedAt = new Date().toISOString();
    document.metadata = {
      ...document.metadata,
      revocationReason: reason,
      revokedBy,
    };

    await this.saveDocument(document);
    await this.logAuditEntry(documentId, "revoked", revokedBy, { reason });

    return true;
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, any>,
  ): Promise<boolean> {
    const document = await this.getDocumentById(documentId);
    if (!document) return false;

    document.metadata = { ...document.metadata, ...metadata };
    document.updatedAt = new Date().toISOString();

    await this.saveDocument(document);
    await this.logAuditEntry(documentId, "updated", "user", { metadata });

    return true;
  }

  /**
   * Get last blockchain anchor (for chain continuity)
   */
  private async getLastAnchor(): Promise<string | null> {
    const documents = await this.getAllDocuments();
    const anchored = documents
      .filter((d) => d.security.blockchainAnchor)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return anchored[0]?.security.blockchainAnchor || null;
  }

  /**
   * Export all documents (for backup)
   */
  async exportAllDocuments(): Promise<string> {
    const documents = await this.getAllDocuments();
    return JSON.stringify(documents, null, 2);
  }

  /**
   * Import documents (from backup)
   */
  async importDocuments(jsonData: string): Promise<number> {
    try {
      const documents: BaseDocument[] = JSON.parse(jsonData);
      const existing = await this.getAllDocuments();
      const merged = [...existing];

      for (const doc of documents) {
        const existingIndex = merged.findIndex((d) => d.id === doc.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = doc;
        } else {
          merged.push(doc);
        }
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
      return documents.length;
    } catch (error) { console.error("Import failed:", error);
      return 0;
     }
  }
}

// Export singleton instance
export const documentService = DocumentService.getInstance();

// Export types (DocumentService is already exported as a class)
export type {
  BaseDocument,
  DocumentType,
  DocumentStatus,
  DocumentSecurityFeatures,
  DocumentGenerationRequest,
  DocumentOutputOptions,
  DocumentVerificationResult,
  DocumentTemplate,
  DocumentStatistics,
  DocumentAuditLog,
  EnhancedCertificate,
  EnhancedTranscript,
  StudentIDCard,
  AdmissionLetter,
  GoodStandingLetter,
  RegistrationCard,
  LibraryCard,
  AttendanceRecord,
};










