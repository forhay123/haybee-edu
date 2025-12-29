import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle, RotateCw, RefreshCw, FileImage } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('Please select a valid image file (JPG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    
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
      warnings.push('Image is overexposed - reduce lighting or move away from bright areas');
    }
    
    if (img.width < 1280 || img.height < 720) {
      warnings.push('Low resolution - try moving closer or using a better camera');
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
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('studentProfileId', studentId.toString());
      formData.append('classId', classId.toString());
      formData.append('academicYear', '2024/2025');

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          onUploadSuccess?.(result);
          reset();
        } else {
          const errorData = JSON.parse(xhr.responseText);
          const errorMessage = errorData.error || 'Upload failed';
          setError(errorMessage);
          onUploadError?.(errorMessage);
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        const errorMessage = 'Network error during upload';
        setError(errorMessage);
        onUploadError?.(errorMessage);
        setUploading(false);
      };

      xhr.open('POST', '/individual/timetable/upload');
      
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);

    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
      setUploading(false);
    }
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
    return (
      <Card className="p-4 max-w-2xl mx-auto">
        <div className="relative">
          <img
            src={selectedImage}
            alt="Selected timetable"
            className="w-full rounded-lg border-2 border-gray-200"
          />
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
            Choose Different Image
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
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Upload Your Timetable</h3>
      
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          className="hidden"
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleImageCapture}
          className="hidden"
        />

        {/* Camera button - works on mobile */}
        <Button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full h-20 text-lg"
          variant="default"
        >
          <Camera className="mr-2 h-6 w-6" />
          Take Photo
        </Button>

        {/* File picker button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-20 text-lg"
          variant="outline"
        >
          <Upload className="mr-2 h-6 w-6" />
          Choose from Gallery
        </Button>
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-blue-900 mb-2">Tips for Best Results:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use good lighting (natural light works best)</li>
              <li>• Avoid shadows and glare on the paper</li>
              <li>• Keep the timetable flat and centered</li>
              <li>• Make sure all text is clearly visible</li>
              <li>• Hold your phone steady when taking the photo</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Supported formats: JPG, PNG (max 10MB)
      </div>
    </Card>
  );
}