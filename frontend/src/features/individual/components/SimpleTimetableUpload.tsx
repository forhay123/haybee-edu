import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, AlertCircle, RotateCw, RefreshCw, FileImage, Monitor, Smartphone, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { timetableApi } from '../api/individualApi';

interface SimpleTimetableUploadProps {
  onUploadSuccess?: (result: any) => void;
  onUploadError?: (error: string) => void;
  studentId: number;
  classId: number;
}

const ImageIcon = FileImage;

export default function SimpleTimetableUpload({
  onUploadSuccess,
  onUploadError,
  studentId,
  classId
}: SimpleTimetableUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [qualityWarning, setQualityWarning] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      
      setIsMobile(isMobileUA || (isTouchDevice && isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return FileImage;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return FileText;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    return FileText;
  };

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ✅ UPDATED: Accept images, PDFs, Excel, and Word documents
    const isImage = file.type.match(/image\/(jpeg|jpg|png)/);
    const isPDF = file.type === 'application/pdf';
    const isExcel = file.type.match(/application\/vnd\.(ms-excel|openxmlformats-officedocument\.spreadsheetml\.sheet)/);
    const isWord = file.type.match(/application\/vnd\.(msword|openxmlformats-officedocument\.wordprocessingml\.document)/);
    
    if (!isImage && !isPDF && !isExcel && !isWord) {
      setError('Please select a valid file (JPG, PNG, PDF, Excel, or Word document)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    
    // For non-images, show a placeholder preview
    if (!isImage) {
      setSelectedImage('DOCUMENT_PLACEHOLDER');
      setQualityWarning('');
    } else {
      // For images, show actual preview and check quality
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setSelectedImage(imageUrl);
        
        // Check image quality
        const img = new Image();
        img.onload = () => {
          checkImageQuality(img);
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const checkImageQuality = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    const warnings = [];
    
    if (avgBrightness < 50) {
      warnings.push('Image is too dark - try better lighting');
    } else if (avgBrightness > 230) {
      warnings.push('Image is overexposed - reduce lighting');
    }
    
    if (img.width < 1280 || img.height < 720) {
      warnings.push('Low resolution - try using a higher quality image');
    }
    
    if (warnings.length > 0) {
      setQualityWarning(warnings.join('. '));
    } else {
      setQualityWarning('');
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // ✅ Use the proper API method with uploadType="camera"
      const response = await timetableApi.uploadFromCamera(
        selectedFile,
        studentId,
        classId,
        (percentage) => {
          setUploadProgress(Math.min(percentage, 95));
        }
      );

      console.log('✅ Upload successful, processing started:', response);
      setUploadProgress(95);
      
      // Poll for processing completion
      try {
        await pollForCompletion(response.timetableId);
        setUploadProgress(100);
        onUploadSuccess?.(response);
        reset();
      } catch (pollError) {
        console.error('❌ Processing failed:', pollError);
        setError('Upload successful but processing failed. Please refresh the page.');
        setUploading(false);
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
      console.error('❌ Upload error:', err);
      setError(errorMessage);
      onUploadError?.(errorMessage);
      setUploading(false);
    }
  };

  const pollForCompletion = async (timetableId: number): Promise<void> => {
    const maxAttempts = 60;
    const pollInterval = 2000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      try {
        const timetable = await timetableApi.getById(timetableId);
        console.log(`📊 Polling attempt ${attempt + 1}: Status = ${timetable.processingStatus}`);
        
        if (timetable.processingStatus === 'COMPLETED') {
          console.log('✅ Processing completed successfully');
          return;
        } else if (timetable.processingStatus === 'FAILED') {
          throw new Error(timetable.processingError || 'Processing failed');
        }
      } catch (error) {
        console.error('Polling error:', error);
        throw error;
      }
    }
    
    throw new Error('Processing timeout - taking longer than expected');
  };

  const reset = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setQualityWarning('');
    setUploadProgress(0);
    setUploading(false);
    setError('');
    
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileTypeDisplay = (file: File) => {
    if (file.type.includes('pdf')) return 'PDF Document';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return 'Excel Spreadsheet';
    if (file.type.includes('word') || file.type.includes('document')) return 'Word Document';
    if (file.type.includes('image')) return 'Image';
    return 'Document';
  };

  if (uploading) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Uploading Timetable...</h3>
          <p className="text-sm text-gray-600 mb-4">Please wait while we process your timetable</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{Math.round(uploadProgress)}%</p>
        </div>
      </Card>
    );
  }

  if (selectedImage && selectedFile) {
    const FileIconComponent = getFileIcon(selectedFile.type);
    
    return (
      <Card className="p-4 max-w-2xl mx-auto">
        <div className="relative">
          {selectedImage === 'DOCUMENT_PLACEHOLDER' ? (
            <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 flex items-center justify-center">
              <div className="text-center">
                <FileIconComponent className="h-20 w-20 mx-auto text-blue-500 mb-3" />
                <p className="text-gray-900 font-semibold text-lg mb-1">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">{getFileTypeDisplay(selectedFile)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
          ) : (
            <img
              src={selectedImage}
              alt="Selected timetable"
              className="w-full rounded-lg border-2 border-gray-200"
            />
          )}
          <Button
            onClick={reset}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {qualityWarning && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {qualityWarning}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-4 flex justify-center gap-4">
          <Button onClick={reset} variant="outline" size="lg">
            <RotateCw className="mr-2 h-4 w-4" />
            Choose Different File
          </Button>
          <Button onClick={uploadImage} size="lg">
            <Check className="mr-2 h-4 w-4" />
            Upload Timetable
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>File:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
          </p>
          <p className="text-sm text-blue-800 mt-1">
            <strong>Type:</strong> {getFileTypeDisplay(selectedFile)}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Upload Your Timetable</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isMobile ? (
            <>
              <Smartphone className="h-4 w-4" />
              <span>Mobile</span>
            </>
          ) : (
            <>
              <Monitor className="h-4 w-4" />
              <span>Desktop</span>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {/* Camera input for mobile devices */}
        {isMobile && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
        )}
        
        {/* ✅ UPDATED: Accept all supported file types on all devices */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleImageCapture}
          className="hidden"
        />

        {/* Camera option ONLY for mobile devices */}
        {isMobile && (
          <Button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full h-20 text-lg"
            variant="default"
          >
            <Camera className="mr-2 h-6 w-6" />
            Take Photo
          </Button>
        )}

        {/* File upload button - always shown */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-20 text-lg"
          variant={isMobile ? "outline" : "default"}
        >
          <Upload className="mr-2 h-6 w-6" />
          {isMobile ? 'Choose File' : 'Select File from Computer'}
        </Button>
      </div>

      {/* Device-specific tips */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-blue-900 mb-2">
              {isMobile ? 'Mobile Upload Tips:' : 'Desktop Upload Tips:'}
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              {isMobile ? (
                <>
                  <li>• <strong>Camera:</strong> Use good lighting and keep timetable flat</li>
                  <li>• <strong>Files:</strong> Select PDF, Excel, or Word documents</li>
                  <li>• Make sure all text is clearly visible</li>
                  <li>• Avoid shadows and glare</li>
                  <li>• Files up to 10MB supported</li>
                </>
              ) : (
                <>
                  <li>• Upload scanned or photographed timetables</li>
                  <li>• PDF, Excel (.xlsx, .xls), Word (.docx, .doc) supported</li>
                  <li>• Ensure good contrast and clear text</li>
                  <li>• High-quality images work best (1280x720+)</li>
                  <li>• Documents should not be password-protected</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Supported: JPG, PNG, PDF, Excel (.xlsx, .xls), Word (.docx, .doc) • Max 10MB
      </div>
    </Card>
  );
}