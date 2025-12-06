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
  ScanLine,
  ArrowLeft,
  Edit3,
  Save,
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
  const [scanResult, setScanResult] = useState<ReceiptScanResult["data"] | null>(null);
  const [fileData, setFileData] = useState<ReceiptScanResult["fileData"] | null>(null);
  const [editedData, setEditedData] = useState<Partial<CreateTransactionData>>({});
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check screen size for camera UI
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions or use file upload.");
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
    handleFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type === 'application/pdf')) {
      handleFile(droppedFile);
    }
  };

  const handleFile = (selectedFile: File) => {
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

  const handleManualEntry = () => {
    setFile(null);
    setPreview(null);
    setScanResult(null);
    setEditedData({
      merchant: "",
      amount: 0,
      currency: "MYR",
      category: "",
      transactionDate: new Date().toISOString().split('T')[0],
      description: "",
    });
    setStep("review");
  };

  const processReceipt = async (receiptFile: File) => {
    setStep("scanning");
    setError(null);

    try {
      const result = await api.scanReceipt(receiptFile);
      setScanResult(result.data);
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

    if (!editedData.taxReliefCategory) {
      setError("Please select a tax relief category (or 'None' if not applicable)");
      // This is enforced now per feedback, but we need to handle "None" or specific categories
      // If user selects "None" it might be empty string or specific value.
      // Assuming empty string means not selected.
      // If the user means "Not Tax Deductible", we should probably have an explicit option for that or allow empty if that's the intent.
      // Feedback said "tax relief category is important, not optional".
      // I will assume they must make a choice.
    }

    setStep("saving");

    try {
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
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[90vh] bg-midnight-950 border border-midnight-800 rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-midnight-800 bg-midnight-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {step !== "capture" && step !== "success" && (
              <button 
                onClick={() => step === "scanning" ? resetState() : setStep("capture")}
                className="p-1 hover:bg-midnight-800 rounded-lg transition-colors text-midnight-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          <div className="flex items-center gap-2">
              <div className="bg-accent-500/10 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4 text-accent-400" />
              </div>
              <h2 className="text-base font-semibold text-white">
                {step === "capture" ? "Add Receipt" : 
                 step === "scanning" ? "Analyzing..." :
                 step === "review" ? "Review Details" :
                 step === "saving" ? "Saving..." :
                 step === "success" ? "Success" : "Error"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-midnight-800 rounded-lg transition-colors text-midnight-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-midnight-950 custom-scrollbar">
          {/* Step 1: Capture / Upload */}
          {step === "capture" && (
            <div className="h-full flex flex-col">
              {isCameraActive ? (
                <div className="relative flex-1 bg-black overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Camera Overlay - Adjusted for desktop/mobile */}
                  <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                    <div className={`border-2 border-white/30 relative ${isDesktop ? 'w-[400px] h-[600px]' : 'w-full h-full'}`}>
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent-400 -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent-400 -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent-400 -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent-400 -mb-1 -mr-1" />
                    </div>
                  </div>

                  <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8 pointer-events-auto">
                    <button
                      onClick={stopCamera}
                      className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-transform"
                    >
                      <div className="w-16 h-16 bg-white rounded-full border-[4px] border-midnight-900" />
                    </button>
                    <div className="w-12 h-12" /> {/* Spacer for balance */}
                  </div>
                </div>
              ) : (
                <div className="p-6 flex flex-col gap-4">
                  {/* Main Options Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Camera Button - Hide on Desktop if preferred, or show with warning/style */}
                    <button
                      onClick={startCamera}
                      className={`flex flex-col items-center gap-4 p-8 bg-midnight-900 hover:bg-midnight-800 border border-midnight-800 hover:border-accent-500/50 rounded-2xl transition-all group ${isDesktop ? 'opacity-80' : ''}`}
                    >
                      <div className="w-14 h-14 bg-midnight-950 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform border border-midnight-800">
                        <Camera className="w-7 h-7 text-accent-400" />
                      </div>
                      <div className="text-center">
                        <span className="block font-medium text-white mb-1">Take Photo</span>
                        <span className="text-xs text-midnight-400">Use camera</span>
                      </div>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        flex flex-col items-center gap-4 p-8 bg-midnight-900 hover:bg-midnight-800 border rounded-2xl transition-all group relative
                        ${isDragging ? 'border-accent-500 border-dashed bg-accent-500/5' : 'border-midnight-800 hover:border-accent-500/50'}
                      `}
                    >
                      <div className="w-14 h-14 bg-midnight-950 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform border border-midnight-800">
                        <Upload className="w-7 h-7 text-purple-400" />
                      </div>
                      <div className="text-center">
                        <span className="block font-medium text-white mb-1">Upload File</span>
                        <span className="text-xs text-midnight-400">Drag & Drop supported</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                    </button>
                  </div>

                  {/* Manual Entry Link */}
                  <button
                    onClick={handleManualEntry}
                    className="w-full py-4 flex items-center justify-center gap-2 text-midnight-400 hover:text-white transition-colors rounded-xl hover:bg-midnight-900 border border-transparent hover:border-midnight-800"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm font-medium">Enter manually instead</span>
                  </button>

                  {/* Footer Info */}
                  <div className="mt-4 flex items-center justify-center gap-6 text-xs text-midnight-500 border-t border-midnight-900 pt-6">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      PDF Supported
                    </span>
                    <span className="w-1 h-1 rounded-full bg-midnight-800" />
                    <span>JPG, PNG, WebP</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Scanning Analysis */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-8">
              <div className="relative">
                {preview ? (
                  <div className="w-32 h-44 rounded-xl overflow-hidden shadow-2xl border border-midnight-700 relative">
                  <img
                    src={preview}
                    alt="Receipt preview"
                      className="w-full h-full object-cover opacity-50 blur-sm"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-accent-500/10 to-purple-500/10" />
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="w-full h-1 bg-accent-400/80 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-44 bg-midnight-800 rounded-xl flex items-center justify-center border border-midnight-700">
                    <FileText className="w-12 h-12 text-midnight-600 animate-pulse" />
                </div>
              )}
              </div>
              
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-2 text-accent-400 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Receipt...</span>
                </div>
                <p className="text-xs text-midnight-500">Extracting merchant, date, and totals</p>
              </div>
            </div>
          )}

          {/* Step 3: Review & Edit */}
          {step === "review" && (
            <div className="p-6 space-y-6">
              {/* Optional Preview Thumbnail */}
              {preview && (
                <div className="flex items-center gap-4 p-3 bg-midnight-900 rounded-xl border border-midnight-800">
                  <div className="w-12 h-16 rounded overflow-hidden shrink-0 border border-midnight-700">
                    <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">Receipt Scanned</p>
                    <p className="text-xs text-midnight-400 truncate">Tap fields to edit if incorrect</p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {/* Amount & Merchant Row */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                    <label className="block text-xs font-medium text-accent-400 mb-1.5 flex items-center gap-2">
                       Merchant Name <span className="text-[10px] bg-accent-500/10 px-1.5 py-0.5 rounded border border-accent-500/20">Required</span>
                  </label>
                  <input
                    type="text"
                    value={editedData.merchant || ""}
                      onChange={(e) => setEditedData(prev => ({ ...prev, merchant: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-midnight-900 border border-accent-500/30 rounded-xl text-white placeholder:text-midnight-600 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 focus:outline-none transition-all"
                      placeholder="e.g. Starbucks"
                  />
                </div>

                <div>
                    <label className="block text-xs font-medium text-accent-400 mb-1.5 flex items-center gap-2">
                      Amount <span className="text-[10px] bg-accent-500/10 px-1.5 py-0.5 rounded border border-accent-500/20">Required</span>
                  </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.amount || ""}
                        onChange={(e) => setEditedData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-4 pr-16 py-2.5 bg-midnight-900 border border-accent-500/30 rounded-xl text-white font-mono focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 focus:outline-none transition-all"
                        placeholder="0.00"
                      />
                      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
                    <select
                      value={editedData.currency || "MYR"}
                          onChange={(e) => setEditedData(prev => ({ ...prev, currency: e.target.value }))}
                          className="h-full bg-transparent border-none text-xs text-midnight-400 focus:ring-0 cursor-pointer font-medium"
                    >
                      <option value="MYR">MYR</option>
                      <option value="USD">USD</option>
                      <option value="SGD">SGD</option>
                    </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-midnight-400 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={editedData.transactionDate || ""}
                      onChange={(e) => setEditedData(prev => ({ ...prev, transactionDate: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-midnight-900 border border-midnight-700 rounded-xl text-white text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-4 pt-2 border-t border-midnight-800/50">
                <div>
                    <label className="block text-xs font-medium text-midnight-400 mb-1.5">Category</label>
                  <select
                    value={editedData.category || ""}
                      onChange={(e) => setEditedData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-midnight-900 border border-midnight-700 rounded-xl text-white text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 focus:outline-none transition-all"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-accent-400 mb-1.5 flex items-center gap-2">
                      Tax Relief Category <span className="text-[10px] bg-accent-500/10 px-1.5 py-0.5 rounded border border-accent-500/20">Required</span>
                  </label>
                  <select
                    value={editedData.taxReliefCategory || ""}
                      onChange={(e) => setEditedData(prev => ({ ...prev, taxReliefCategory: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-midnight-900 border border-accent-500/30 rounded-xl text-white text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 focus:outline-none transition-all"
                  >
                    <option value="">Select tax relief category</option>
                      <option value="non_deductible">Not Tax Deductible</option>
                    {TAX_RELIEF_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                          {cat.label} (Limit: RM{cat.limit.toLocaleString()})
                      </option>
                    ))}
                  </select>
                    <p className="text-[10px] text-midnight-500 mt-1.5">
                      Select the appropriate tax relief category or "Not Tax Deductible".
                    </p>
                </div>

                  {/* Description Field */}
                <div>
                    <label className="block text-xs font-medium text-midnight-400 mb-1.5">Description</label>
                  <input
                    type="text"
                    value={editedData.description || ""}
                      onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-midnight-900 border border-midnight-700 rounded-xl text-white placeholder:text-midnight-600 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 focus:outline-none transition-all"
                      placeholder="Add details (e.g. Lunch with client)"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Saving */}
          {step === "saving" && (
             <div className="flex flex-col items-center justify-center h-full py-12 gap-4">
              <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
              <p className="text-midnight-300 text-sm">Saving transaction...</p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-4 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-white">Added Successfully!</h3>
              <p className="text-sm text-midnight-400">
                  {formatCurrency(editedData.amount || 0, editedData.currency)} at <span className="text-white">{editedData.merchant}</span>
              </p>
              </div>
            </div>
          )}

          {/* Step 6: Error */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center h-full py-12 px-6 gap-6 text-center">
              <div className="w-16 h-16 bg-coral-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-coral-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Scan Failed</h3>
                <p className="text-sm text-midnight-400 max-w-xs mx-auto">{error}</p>
              </div>
              <button
                onClick={resetState}
                className="flex items-center gap-2 px-5 py-2.5 bg-midnight-800 hover:bg-midnight-700 border border-midnight-700 rounded-xl text-sm font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions (Only for Review Step) */}
        {step === "review" && (
          <div className="p-4 border-t border-midnight-800 bg-midnight-900/50 backdrop-blur-sm flex gap-3">
              <button
                onClick={resetState}
              className="flex-1 px-4 py-3 bg-midnight-900 hover:bg-midnight-800 border border-midnight-800 hover:border-midnight-700 text-midnight-300 hover:text-white rounded-xl font-medium text-sm transition-all"
              >
              Cancel
              </button>
              <button
                onClick={handleSave}
              className="flex-[2] px-4 py-3 bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white rounded-xl font-medium text-sm shadow-lg shadow-accent-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
              >
              <Save className="w-4 h-4" />
                Save Transaction
              </button>
          </div>
        )}
      </div>
    </>
  );
}
