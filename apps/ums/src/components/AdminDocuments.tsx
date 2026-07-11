/* eslint-disable */
/* eslint-disable */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Eye,
  X,
  AlertCircle,
} from "lucide-react";
import { listDocuments, downloadDocument, type Document } from "../services/adminDocumentService";
import { usePagination } from "../hooks/usePagination";
import { useTranslation } from "react-i18next";
import { API_URL } from "../services/config";
import { authFetch } from "../services/authService";

const PREVIEWABLE_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);

const AdminDocuments: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("All Types");
  const [isLoading, setIsLoading] = useState(false);
  const { page, perPage, meta, setPage, setMeta } = usePagination(20);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params: Parameters<typeof listDocuments>[0] = {
        page,
        perPage,
      };
      if (docTypeFilter !== "All Types") params.doc_type = docTypeFilter;

      const response = await listDocuments(params);

      if (response.success && response.data) {
        setDocuments(response.data.items);
        setMeta({
          page: response.data.page,
          perPage: response.data.perPage,
          total: response.data.total,
        });
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = useCallback(async (doc: Document) => {
    setPreviewError(null);
    setIsPreviewLoading(true);
    setViewingDoc(doc);
    setViewingDocUrl(null);
    try {
      const url = `${API_URL}/documents/${doc.id}/download`;
      const response = await authFetch(url, {}, 15000);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setViewingDocUrl(objectUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load document';
      setPreviewError(msg);
      console.error("Failed to view document:", error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  // Cleanup blob URL when modal closes
  useEffect(() => {
    return () => {
      if (viewingDocUrl) {
        URL.revokeObjectURL(viewingDocUrl);
      }
    };
  }, [viewingDocUrl]);

  const closePreview = useCallback(() => {
    if (viewingDocUrl) {
      URL.revokeObjectURL(viewingDocUrl);
    }
    setViewingDoc(null);
    setViewingDocUrl(null);
    setPreviewError(null);
    setIsPreviewLoading(false);
  }, [viewingDocUrl]);

  useEffect(() => {
    fetchDocuments();
  }, [page, perPage, docTypeFilter]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        doc.file_name.toLowerCase().includes(searchLower) ||
        `${doc.first_name} ${doc.last_name}`.toLowerCase().includes(searchLower) ||
        doc.user_email.toLowerCase().includes(searchLower);
      return matchesSearch;
    });
  }, [documents, searchTerm]);

  const handleDownload = async (docId: string) => {
    await downloadDocument(docId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const docTypes = ["All Types", "transcript", "id_document", "personal_statement", "recommendation", "other"];

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2 shadow-sm min-h-[60px]">
        <div className="flex items-center gap-3 pl-14 w-full md:w-auto">
          <div className="w-1 h-5 bg-[#FFD700] rounded-none"></div>
          <div className="flex flex-col">
            <h2 className="text-base md:text-lg font-bold text-[#2E004F] dark:text-white tracking-tight uppercase leading-none">
              Document Registry
            </h2>
            <p className="text-[8px] md:text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Admission & Registration Files • Total: {meta.total}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-14 md:pl-0 w-full md:w-auto justify-end">
          <button
            onClick={fetchDocuments}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#4B0082] dark:text-purple-300 rounded-none font-bold text-[9px] uppercase tracking-widest hover:border-[#4B0082] transition-all shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by filename or student..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-xs dark:text-white focus:ring-1 focus:ring-[#4B0082]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-black uppercase outline-none cursor-pointer dark:text-white"
          >
            {docTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-none shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-900 text-gray-400 uppercase text-[9px] font-black tracking-[0.2em] shadow-md">
                  <th className="px-6 py-4 sticky top-0 bg-gray-900 z-10">
                    File
                  </th>
                  <th className="px-6 py-4 sticky top-0 bg-gray-900 z-10">
                    Student
                  </th>
                  <th className="px-6 py-4 sticky top-0 bg-gray-900 z-10">
                    Document Type
                  </th>
                  <th className="px-6 py-4 sticky top-0 bg-gray-900 z-10">
                    Size
                  </th>
                  <th className="px-6 py-4 sticky top-0 bg-gray-900 z-10">
                    Uploaded At
                  </th>
                  <th className="px-6 py-4 text-center sticky top-0 bg-gray-900 z-10">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-purple-50/20 dark:hover:bg-gray-700/20 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <FileText className="text-[#4B0082]" size={20} />
                        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                          {doc.file_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <User className="text-gray-400" size={16} />
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-white uppercase">
                            {doc.first_name} {doc.last_name}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400">
                            {doc.user_email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase">
                      {doc.doc_type}
                    </td>
                    <td className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase">
                      {formatFileSize(doc.file_size_bytes)}
                    </td>
                    <td className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase">
                      {new Date(doc.uploaded_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center flex gap-1 justify-center">
                      {PREVIEWABLE_TYPES.has(doc.mime_type) && (
                        <button
                          onClick={() => handleView(doc)}
                          disabled={isPreviewLoading}
                          className="p-2 text-gray-400 hover:text-[#4B0082] disabled:opacity-40"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc.id)}
                        className="p-2 text-gray-400 hover:text-[#4B0082]"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-6 py-3 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Page {meta.page} of {meta.totalPages} • {meta.total.toLocaleString()} documents
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={meta.page <= 1}
                className="px-3 py-1 text-[10px] font-black uppercase border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082] transition-all"
              >
                <ChevronLeft size={12} />
              </button>
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(meta.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-[10px] font-black uppercase border transition-all ${
                      p === meta.page
                        ? "bg-[#4B0082] text-white border-[#4B0082]"
                        : "border-gray-200 dark:border-gray-700 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={meta.page >= meta.totalPages}
                className="px-3 py-1 text-[10px] font-black uppercase border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082] transition-all"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {viewingDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{viewingDoc.file_name}</h3>
                <button
                  onClick={closePreview}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors ml-4 flex-shrink-0"
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950 relative">
                {isPreviewLoading && !viewingDocUrl && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4B0082]"></div>
                    <p className="text-sm text-gray-500">Loading document...</p>
                  </div>
                )}
                {previewError && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8">
                    <AlertCircle className="text-red-400" size={48} />
                    <p className="text-sm font-medium text-red-500">Failed to load preview</p>
                    <p className="text-xs text-gray-400">{previewError}</p>
                    <button
                      onClick={() => handleView(viewingDoc)}
                      className="mt-2 px-4 py-2 bg-[#4B0082] text-white text-xs font-bold uppercase rounded hover:bg-[#320064] transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {viewingDocUrl && (
                  viewingDoc.mime_type === 'application/pdf' ? (
                    <iframe
                      src={viewingDocUrl}
                      className="w-full h-full"
                      title={viewingDoc.file_name}
                    />
                  ) : (
                    <img
                      src={viewingDocUrl}
                      alt={viewingDoc.file_name}
                      className="w-full h-full object-contain"
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDocuments;
