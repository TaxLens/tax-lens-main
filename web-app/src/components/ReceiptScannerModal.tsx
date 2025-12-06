"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { api, ReceiptScanResult, CreateTransactionData } from "@/lib/api";
import { CATEGORIES, TAX_RELIEF_CATEGORIES, formatCurrency } from "@/lib/utils";
import {
  X,
  Camera,
  Upload,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: () => void;
}

type Step = "capture" | "scanning" | "review" | "saving" | "success" | "error";

export function ReceiptScannerModal({
  isOpen,
  onClose,
  onTransactionCreated,
}: ReceiptScannerModalProps) {
  const [step, setStep] = useState<Step>("capture");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<
    ReceiptScanResult["data"] | null
  >(null);
  const [fileData, setFileData] = useState<ReceiptScanResult["fileData"] | null>(null);
  const [editedData, setEditedData] = useState<Partial<CreateTransactionData>>(
    {}
  );
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = useCallback(() => {
    setStep("capture");
    setError(null);
    setPreview(null);
    setFile(null);
    setScanResult(null);
    setFileData(null);
    setEditedData({});
    stopCamera();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      setIsCameraActive(true); // Render video element first, then connect stream in useEffect
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Unable to access camera. Please check permissions or use file upload."
      );
    }
  };

  // Connect stream to video element after it renders
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [isCameraActive]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const capturedFile = new File([blob], `receipt-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setFile(capturedFile);
          setPreview(canvas.toDataURL("image/jpeg"));
          stopCamera();
          processReceipt(capturedFile);
        }
      },
      "image/jpeg",
      0.9
    );
  }, [stopCamera]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Generate preview
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === "application/pdf") {
      setPreview(null); // No preview for PDFs
    }

    processReceipt(selectedFile);
  };

  const processReceipt = async (receiptFile: File) => {
    setStep("scanning");
    setError(null);

    try {
      const result = await api.scanReceipt(receiptFile);
      setScanResult(result.data);
      // Store file data for later upload
      if (result.fileData) {
        setFileData(result.fileData);
      }
      setEditedData({
        merchant: result.data.merchant || "",
        amount: result.data.amount || 0,
        currency: result.data.currency || "MYR",
        category: result.data.category,
        taxReliefCategory: result.data.taxReliefCategory,
        transactionDate: result.data.transactionDate,
        description: result.data.description,
      });
      setStep("review");
    } catch (err) {
      console.error("Error scanning receipt:", err);
      setError(err instanceof Error ? err.message : "Failed to scan receipt");
      setStep("error");
    }
  };

  const handleSave = async () => {
    if (!editedData.merchant || !editedData.amount) {
      setError("Merchant and amount are required");
      return;
    }

    setStep("saving");

    try {
      // Include fileData for storage upload
      const dataWithFile: CreateTransactionData = {
        ...(editedData as CreateTransactionData),
        fileData: fileData || undefined,
      };
      await api.createTransactionFromReceipt(dataWithFile);
      setStep("success");
      setTimeout(() => {
        onTransactionCreated?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error creating transaction:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save transaction"
      );
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[90vh] bg-midnight-900 border border-midnight-700 rounded-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-midnight-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-400" />
            <h2 className="text-lg font-semibold">Scan Receipt</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-midnight-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Capture Step */}
          {step === "capture" && (
            <div className="space-y-4">
              {/* Camera View */}
              {isCameraActive ? (
                <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2 bg-midnight-800/80 backdrop-blur rounded-xl text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <div className="w-14 h-14 bg-white rounded-full border-4 border-midnight-900" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Upload/Camera Options */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={startCamera}
                      className="flex flex-col items-center gap-3 p-6 bg-midnight-800 hover:bg-midnight-700 border border-midnight-700 hover:border-accent-500/50 rounded-xl transition-all"
                    >
                      <div className="w-12 h-12 bg-accent-500/20 rounded-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-accent-400" />
                      </div>
                      <span className="font-medium">Take Photo</span>
                      <span className="text-xs text-midnight-400">
                        Use camera
                      </span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-6 bg-midnight-800 hover:bg-midnight-700 border border-midnight-700 hover:border-accent-500/50 rounded-xl transition-all"
                    >
                      <div className="w-12 h-12 bg-accent-500/20 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-accent-400" />
                      </div>
                      <span className="font-medium">Upload</span>
                      <span className="text-xs text-midnight-400">
                        Image or PDF
                      </span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Supported formats */}
                  <div className="flex items-center justify-center gap-4 text-xs text-midnight-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      PDF
                    </span>
                    <span>•</span>
                    <span>JPG, PNG, WebP</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Scanning Step */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              {preview && (
                <div className="w-32 h-40 rounded-lg overflow-hidden opacity-50">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {!preview && file?.type === "application/pdf" && (
                <div className="w-32 h-40 bg-midnight-800 rounded-lg flex items-center justify-center opacity-50">
                  <FileText className="w-12 h-12 text-midnight-500" />
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
                <p className="text-midnight-300">
                  Analyzing receipt with AI...
                </p>
                <p className="text-xs text-midnight-500">
                  This may take a few seconds
                </p>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === "review" && scanResult && (
            <div className="space-y-4">
              {/* Review prompt */}
              <div className="text-center text-sm text-midnight-400">
                Please review the details below before saving
              </div>

              {/* Preview thumbnail */}
              {preview && (
                <div className="flex justify-center">
                  <div className="w-24 h-32 rounded-lg overflow-hidden border border-midnight-700">
                    <img
                      src={preview}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Editable fields */}
              <div className="space-y-4">
                {/* Merchant */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-1.5">
                    Merchant
                  </label>
                  <input
                    type="text"
                    value={editedData.merchant || ""}
                    onChange={(e) =>
                      setEditedData((prev) => ({
                        ...prev,
                        merchant: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    placeholder="Enter merchant name"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-1.5">
                    Amount
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editedData.currency || "MYR"}
                      onChange={(e) =>
                        setEditedData((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      className="px-3 py-2.5 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    >
                      <option value="MYR">MYR</option>
                      <option value="USD">USD</option>
                      <option value="SGD">SGD</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.amount || ""}
                      onChange={(e) =>
                        setEditedData((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="flex-1 px-4 py-2.5 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editedData.transactionDate || ""}
                    onChange={(e) =>
                      setEditedData((prev) => ({
                        ...prev,
                        transactionDate: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editedData.category || ""}
                    onChange={(e) =>
                      setEditedData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tax Relief Category */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-1.5">
                    Tax Relief Category
                  </label>
                  <select
                    value={editedData.taxReliefCategory || ""}
                    onChange={(e) =>
                      setEditedData((prev) => ({
                        ...prev,
                        taxReliefCategory: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                  >
                    <option value="">Select tax relief category</option>
                    {TAX_RELIEF_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label} (RM{cat.limit.toLocaleString()} limit)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editedData.description || ""}
                    onChange={(e) =>
                      setEditedData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    placeholder="Brief description (optional)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Saving Step */}
          {step === "saving" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
              <p className="text-midnight-300">Saving transaction...</p>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-lg font-medium">Transaction Added!</p>
              <p className="text-sm text-midnight-400">
                {formatCurrency(editedData.amount || 0, editedData.currency)} at{" "}
                {editedData.merchant}
              </p>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-lg font-medium">Something went wrong</p>
              <p className="text-sm text-midnight-400 text-center">{error}</p>
              <button
                onClick={resetState}
                className="flex items-center gap-2 px-4 py-2 bg-midnight-800 hover:bg-midnight-700 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div className="p-4 border-t border-midnight-800">
            <div className="flex gap-3">
              <button
                onClick={resetState}
                className="flex-1 px-4 py-3 bg-midnight-800 hover:bg-midnight-700 rounded-xl font-medium transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-accent-500 hover:bg-accent-600 rounded-xl font-medium text-midnight-950 transition-colors"
              >
                Save Transaction
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
