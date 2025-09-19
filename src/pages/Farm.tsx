import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserFarms, FarmData, saveFarmData, getFarmById, updateFarmData, analyzeFarmData, deleteFarm } from '@/lib/firestore';
import { auth, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Plus, X, Upload, Image as ImageIcon, AlertCircle, Wifi, WifiOff, Activity, Sprout, Droplets, Bug, Leaf, BarChart3, Calendar, Tractor, CloudRain } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from 'lucide-react';

const Farm = () => {
  console.log('============= Farm component rendering - Step 2 =============');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<FarmData[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // New farm dialog state
  const [showNewFarmDialog, setShowNewFarmDialog] = useState(false);
  const [creatingFarm, setCreatingFarm] = useState(false);
  const [farmDetailsForm, setFarmDetailsForm] = useState({
    name: '',
    location: '',
    size: 0,
    farmType: 'Mixed farming',
    soilType: 'Loamy',
    crops: [''],
    irrigationSystem: 'Drip irrigation'
  });
  
  // Farm image upload state
  const [showFarmImageDialog, setShowFarmImageDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [useDirectUpload, setUseDirectUpload] = useState<boolean>(true);
  
  // Add new state for analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Add state for delete farm dialog and selected farm for deletion
  const [showDeleteFarmDialog, setShowDeleteFarmDialog] = useState(false);
  const [farmToDelete, setFarmToDelete] = useState<FarmData | null>(null);

  // Load farms without authentication requirement
  useEffect(() => {
    console.log('Farm component useEffect running');
    
    const loadFarms = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated, if so load their farms
        if (auth?.currentUser) {
          console.log('Loading farms for user:', auth.currentUser.uid);
          const userFarms = await getUserFarms(auth.currentUser.uid);
          console.log(`Loaded ${userFarms.length} farms`);
          
          setFarms(userFarms);
          
          // Select first farm if available
          if (userFarms.length > 0) {
            console.log('Selecting first farm:', userFarms[0].name);
            setSelectedFarm(userFarms[0]);

            // Check if analysis exists and notify user
            if (userFarms[0].analysis) {
              console.log('Farm analysis data found');
              toast({
                title: "Farm Analysis Available",
                description: "Your farm analysis data has been loaded",
              });
            }
          }
        } else {
          // User not authenticated - show demo/guest mode
          console.log('No user authenticated - running in demo mode');
          setFarms([]);
          toast({
            title: "Demo Mode",
            description: "Sign in to save and manage your farms",
            variant: "default"
          });
        }
      } catch (error) {
        console.error('Error loading farms:', error);
        toast({
          title: "Data Loading Error",
          description: "Unable to load farms. You can still create demo farms.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadFarms();
  }, [navigate, toast]);

  // Check network connectivity
  useEffect(() => {
    // Update network status
    const handleOnline = () => {
      console.log("Network status: online");
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log("Network status: offline");
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Select a farm handler
  const handleSelectFarm = (farm: FarmData) => {
    console.log('Selecting farm:', farm.id);
    setSelectedFarm(farm);
    toast({
      title: "Farm Selected",
      description: `${farm.name} selected`,
    });
  };
  
  // Create new farm handler
  const handleCreateFarm = async () => {
    if (!farmDetailsForm.name) {
        toast({
        title: "Name Required",
        description: "Please provide a name for your farm.",
          variant: "destructive"
        });
      return;
    }
    
    try {
      setCreatingFarm(true);
      
      // Create the farm data
      const newFarm: Partial<FarmData> = {
        name: farmDetailsForm.name,
        location: farmDetailsForm.location,
        size: farmDetailsForm.size,
        farmType: farmDetailsForm.farmType,
        soilType: farmDetailsForm.soilType,
        crops: farmDetailsForm.crops.filter(c => c.trim() !== ''),
        irrigationSystem: farmDetailsForm.irrigationSystem,
        userId: auth?.currentUser?.uid || 'demo-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        imageUrls: []
      };
      
      console.log('Creating new farm:', newFarm);
      
      let savedFarm;
      if (auth?.currentUser) {
        // User is authenticated - save to Firestore
        const farmId = await saveFarmData(newFarm);
        console.log('Farm created with ID:', farmId);
        savedFarm = await getFarmById(farmId);
      } else {
        // Demo mode - create local farm with temporary ID
        const tempId = `demo-farm-${Date.now()}`;
        savedFarm = {
          ...newFarm,
          id: tempId,
          userId: 'demo-user'
        } as FarmData;
        console.log('Demo farm created with ID:', tempId);
      }
      
      if (savedFarm) {
        // Update the farms list
        setFarms([...farms, savedFarm]);
        
        // Select the new farm
        setSelectedFarm(savedFarm);
      
      toast({
        title: "Farm Created",
        description: auth?.currentUser ? "Your new farm has been created successfully." : "Demo farm created. Sign in to save permanently.",
      });
        
        // Reset the form
        setFarmDetailsForm({
          name: '',
          location: '',
          size: 0,
          farmType: 'Mixed farming',
          soilType: 'Loamy',
          crops: [''],
          irrigationSystem: 'Drip irrigation'
        });
        
        // Close the dialog
        setShowNewFarmDialog(false);
      }
    } catch (error) {
      console.error("Error creating farm:", error);
      toast({
        title: "Error",
        description: "Failed to create farm. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreatingFarm(false);
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null); // Reset any previous errors
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log("File selected:", file.name, "Size:", (file.size / 1024).toFixed(2), "KB", "Type:", file.type);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError("Please select an image file (JPG, PNG, etc.)");
      return;
    }
    
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        console.error("Error reading file:", reader.error);
        setUploadError("Failed to read file. Please try another image.");
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Function to compress image before storing
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        console.log(`Image compressed: ${file.size} bytes -> ${Math.round(compressedDataUrl.length * 0.75)} bytes`);
        resolve(compressedDataUrl);
      };
      
      img.onerror = reject;
      
      // Create object URL for the image
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle image upload
  const handleUploadImage = async () => {
    if (!selectedFarm || !selectedFile) {
      toast({
        title: "Error",
        description: "Please select a farm and an image file",
        variant: "destructive"
      });
      return;
    }

    // Check online status
    if (!isOnline) {
    toast({
        title: "Network Error",
        description: "You appear to be offline. Please check your connection.",
        variant: "destructive"
      });
      return;
    }

    // Check file size (limit to 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    // Reset any previous errors
    setUploadError(null);
    
    try {
      console.log("Starting image upload for farm:", selectedFarm.id);
      console.log("File details:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: `${(selectedFile.size / 1024).toFixed(2)} KB`
      });
      
      setUploadingImage(true);
      setUploadProgress(1); // Start with 1% to show something is happening
      
      // Compress the image before uploading
      const compressedDataUrl = await compressImage(selectedFile);
      
      // Use the compressed data URL directly
      await updateFarmWithNewImage(compressedDataUrl);
      
      setUploadProgress(100);
      console.log("Image upload completed successfully");
    } catch (error) {
      console.error("Error initializing upload:", error);
      setUploadError("Failed to start upload process. Please try again.");
      toast({
        title: "Error",
        description: "Failed to start upload process. Please try again.",
        variant: "destructive"
      });
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  // Update farm with new image URL (common code for both upload methods)
  const updateFarmWithNewImage = async (imageUrl: string) => {
    if (!selectedFarm || !selectedFarm.id) return;
    
    try {
      const updatedImageUrls = [...(selectedFarm.imageUrls || []), imageUrl];
      
      console.log("Updating farm with new image URL");
      console.log("Current imageUrls count:", selectedFarm.imageUrls?.length || 0);
      console.log("New imageUrls count:", updatedImageUrls.length);
      console.log("Image URL preview:", imageUrl.substring(0, 100) + "...");
      
      await updateFarmData(selectedFarm.id, {
        imageUrls: updatedImageUrls,
      });
      console.log("Farm data updated successfully");
      
      // Update local state
      const updatedFarm = {
        ...selectedFarm,
        imageUrls: updatedImageUrls
      };
      setSelectedFarm(updatedFarm);
      
      // Update farms list
      setFarms(farms.map(farm => 
        farm.id === selectedFarm.id ? updatedFarm : farm
      ));
      
      console.log("Local state updated with new image URLs:", updatedImageUrls.length);
      
      toast({
        title: "Upload Complete",
        description: "Farm image uploaded successfully",
      });
      
      // Reset state
      setShowFarmImageDialog(false);
      setSelectedFile(null);
      setImagePreview(null);
      setUploadProgress(0);
      setUploadError(null);
      setUploadingImage(false);
    } catch (error) {
      console.error("Error updating farm data:", error);
      setUploadError("Image uploaded but failed to update farm record. Please try again.");
      setUploadingImage(false);
    }
  };

  // Function to analyze the farm
  const handleAnalyzeFarm = async () => {
    if (!selectedFarm || !selectedFarm.id) {
      toast({
        title: "No Farm Selected",
        description: "Please select a farm to analyze",
        variant: "destructive"
      });
      return;
    }

    try {
      setAnalyzing(true);
      
      // Show initial toast
      toast({
        title: "Analysis Started",
        description: "AI analysis of your farm has started...",
      });
      
      console.log("Starting farm analysis for:", selectedFarm.id);
      
      let analyzedFarm;
      if (auth?.currentUser && !selectedFarm.id.startsWith('demo-farm-')) {
        // Real user with saved farm - use Firestore analysis with latest image
        const latestImageUrl = selectedFarm.imageUrls && selectedFarm.imageUrls.length > 0 
          ? selectedFarm.imageUrls[selectedFarm.imageUrls.length - 1] 
          : undefined;
        
        console.log('Using image URL for AI analysis:', latestImageUrl ? 'Image available' : 'No image available');
        analyzedFarm = await analyzeFarmData(selectedFarm.id, latestImageUrl);
      } else {
        // Demo mode or demo farm - generate mock analysis
        analyzedFarm = {
          ...selectedFarm,
          analysis: {
            soilHealth: Math.floor(Math.random() * 30) + 70, // 70-100%
            cropHealth: Math.floor(Math.random() * 25) + 75, // 75-100%
            waterManagement: Math.floor(Math.random() * 20) + 80, // 80-100%
            pestRisk: Math.floor(Math.random() * 40) + 10, // 10-50%
            overallScore: Math.floor(Math.random() * 20) + 80, // 80-100%
            recommendations: [
              "Consider implementing drip irrigation for better water efficiency",
              "Regular soil testing recommended for optimal nutrient management",
              "Monitor crop rotation to maintain soil health",
              "Consider organic pest control methods"
            ],
            recommendedCrops: ["Tomatoes", "Peppers", "Lettuce", "Carrots"],
            detailedAnalysis: "This is a demo analysis. Your farm shows good potential with some areas for improvement in water management and pest control. The soil quality appears to be in good condition."
          },
          lastAnalyzed: new Date()
        };
        console.log('Generated demo analysis for farm');
      }
      
      if (analyzedFarm) {
        // Update the selected farm with analysis results
        setSelectedFarm(analyzedFarm);
        
        // Update the farms list
        setFarms(farms.map(farm => 
          farm.id === analyzedFarm.id ? analyzedFarm : farm
        ));
      
      toast({
          title: "Analysis Complete",
          description: "Your farm has been analyzed successfully!",
        });

        // Save to local storage as backup
        try {
          localStorage.setItem(`farm_analysis_${analyzedFarm.id}`, JSON.stringify(analyzedFarm.analysis));
          console.log('Analysis saved to local storage');
        } catch (storageError) {
          console.error('Could not save to local storage:', storageError);
        }
      }
    } catch (error) {
      console.error("Error analyzing farm:", error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze farm. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Function to toggle detailed analysis dialog
  const toggleDetailedAnalysis = () => {
    setShowDetailedAnalysis(!showDetailedAnalysis);
  };

  // Function to format analysis text for better display
  const formatAnalysisText = (text: string) => {
    if (!text) return null;
    
    // Split text into sections and format
    const sections = text.split('\n\n');
    
    return sections.map((section, index) => {
      // Handle headers (text with **)
      if (section.includes('**')) {
        const parts = section.split('**');
        return (
          <div key={index} className="mb-4">
            {parts.map((part, partIndex) => {
              if (partIndex % 2 === 1) {
                // This is bold text
                return <strong key={partIndex} className="text-gray-800 font-semibold">{part}</strong>;
              } else if (part.trim()) {
                // Regular text
                return <span key={partIndex}>{part}</span>;
              }
              return null;
            })}
          </div>
        );
      }
      
      // Handle bullet points
      if (section.includes('*') && !section.includes('**')) {
        const lines = section.split('\n');
        const bulletPoints = lines.filter(line => line.trim().startsWith('*'));
        const otherText = lines.filter(line => !line.trim().startsWith('*')).join(' ');
        
        return (
          <div key={index} className="mb-4">
            {otherText && <p className="mb-2 text-gray-700">{otherText}</p>}
            {bulletPoints.length > 0 && (
              <ul className="space-y-1 ml-4">
                {bulletPoints.map((point, pointIndex) => (
                  <li key={pointIndex} className="text-sm text-gray-600 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                    {point.replace(/^\*\s*/, '')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }
      
      // Handle numbered points
      if (/^\d+\./.test(section.trim())) {
        return (
          <div key={index} className="mb-4">
            <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-200">
              <p className="text-sm text-gray-700 font-medium">{section}</p>
            </div>
          </div>
        );
      }
      
      // Regular paragraph
      if (section.trim()) {
        return (
          <p key={index} className="mb-3 text-sm text-gray-700 leading-relaxed">
            {section}
          </p>
        );
      }
      
      return null;
    });
  };

  // Add a function to handle farm deletion
  const handleDeleteFarm = async () => {
    if (!farmToDelete || !farmToDelete.id) {
      toast({
        title: "No Farm Selected",
        description: "Please select a farm to delete",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      await deleteFarm(farmToDelete.id);
      
      // Update the local state by removing the deleted farm
      setFarms(farms.filter(farm => farm.id !== farmToDelete.id));
      
      // If the deleted farm was the selected farm, select another farm if available
      if (selectedFarm && selectedFarm.id === farmToDelete.id) {
        if (farms.length > 1) {
          const remainingFarms = farms.filter(farm => farm.id !== farmToDelete.id);
          handleSelectFarm(remainingFarms[0]);
        } else {
          setSelectedFarm(null);
        }
      }
    
      
      toast({
        title: "Farm Deleted",
        description: `${farmToDelete.name} has been deleted successfully.`
      });
      
      // Close the delete dialog
      setShowDeleteFarmDialog(false);
      setFarmToDelete(null);
    } catch (error) {
      console.error("Error deleting farm:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete farm. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {authError ? (
        <MainLayout>
          <div className="container mx-auto p-4">
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </MainLayout>
      ) : (
        <MainLayout>
          <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold">Farm Management</h1>
                {!auth?.currentUser && (
                  <p className="text-sm text-gray-600 mt-1">Demo Mode - Sign in to save your farms permanently</p>
                )}
              </div>
                <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowNewFarmDialog(true)}
                >
                <Plus className="h-4 w-4 mr-2" />
                Add Farm
                </Button>
              </div>
            
            {/* Loading state */}
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <span className="ml-3 text-gray-500">Loading farm data...</span>
                </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Farms list sidebar */}
                <div className="md:col-span-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Farms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {farms.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-gray-500 mb-4">No farms yet</p>
                <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setShowNewFarmDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                        Add Your First Farm
                </Button>
              </div>
                      ) : (
                        <div className="space-y-2">
                          {farms.map(farm => (
                            <div 
                              key={farm.id} 
                              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedFarm?.id === farm.id ? 'bg-green-100 border-green-300' : 'hover:bg-gray-100 border-transparent'
                              } border mb-2`}
                              onClick={() => handleSelectFarm(farm)}
                            >
                              <div className="flex-1 truncate">
                                <h3 className="font-medium">{farm.name}</h3>
                                <p className="text-xs text-gray-500">{farm.location} • {farm.size} hectares</p>
                </div>
                              <button
                                className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFarmToDelete(farm);
                                  setShowDeleteFarmDialog(true);
                                }}
                                aria-label="Delete farm"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              
            {/* Main content area */}
            <div className="md:col-span-9">
              {selectedFarm ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedFarm.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <span className="text-sm text-gray-500">Location</span>
                        <div className="font-medium">{selectedFarm.location}</div>
                    </div>
                    <div>
                        <span className="text-sm text-gray-500">Size</span>
                        <div className="font-medium">{selectedFarm.size} ha</div>
                    </div>
                    <div>
                        <span className="text-sm text-gray-500">Farm Type</span>
                        <div className="font-medium">{selectedFarm.farmType}</div>
                    </div>
                    <div>
                        <span className="text-sm text-gray-500">Soil Type</span>
                        <div className="font-medium">{selectedFarm.soilType}</div>
                    </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500">Crops</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFarm.crops?.map((crop, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            {crop}
                          </span>
                        ))}
                    </div>
                  </div>
                  
                    {/* Farm Images Section */}
                      <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">Farm Images</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setShowFarmImageDialog(true)}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Image
                        </Button>
                </div>
                
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {selectedFarm.imageUrls && selectedFarm.imageUrls.length > 0 ? (
                      selectedFarm.imageUrls.map((url, index) => (
                            <div 
                              key={index} 
                              className="relative aspect-square rounded-md overflow-hidden border border-gray-200"
                            >
                          <img 
                            src={url} 
                            alt={`Farm image ${index + 1}`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', url);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              // Show a placeholder or error message
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.image-error')) {
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'image-error flex flex-col items-center justify-center h-full bg-gray-100 text-gray-500 text-xs p-2';
                                errorDiv.innerHTML = '<div class="text-center"><svg class="h-8 w-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg><div>Image failed to load</div></div>';
                                parent.appendChild(errorDiv);
                              }
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', url.substring(0, 50) + '...');
                            }}
                          />
                        </div>
                      ))
                    ) : (
                          <div className="col-span-full flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-lg">
                            <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">No images yet</p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-2"
                              onClick={() => setShowFarmImageDialog(true)}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Upload Image
                            </Button>
                      </div>
                    )}
                  </div>
                    </div>
                    
                    {/* Farm Analysis Status */}
                    <div className="mt-4">
                      <span className="text-sm text-gray-500">Farm Analysis Status</span>
                      {selectedFarm.analysis ? (
                        <div className="mt-1 text-green-600 flex items-center">
                          <Activity className="h-4 w-4 mr-1" />
                          Analysis data available
                          {selectedFarm.lastAnalyzed && (
                            <span className="ml-2 text-xs text-gray-500">
                              Last analyzed: {new Date(selectedFarm.lastAnalyzed).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-gray-500">No analysis available</div>
                      )}
                </div>
                    
                    {/* AI Analysis Summary Card */}
                    <Card className="mb-6">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-green-600" />
                          AI Analysis Summary
                          {selectedFarm.lastAnalyzed && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              {new Date(selectedFarm.lastAnalyzed.seconds * 1000).toLocaleDateString()}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Detailed Analysis Text */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold mb-3 text-gray-800">Farm Assessment</h4>
                          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {formatAnalysisText(selectedFarm.analysis?.detailedAnalysis)}
                          </div>
                        </div>
                    
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Key Recommendations */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-3 text-blue-800 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" />
                              Key Recommendations
                            </h4>
                            <ul className="space-y-2">
                              {selectedFarm.analysis?.recommendations?.slice(0, 4).map((rec, index) => (
                                <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                  {rec}
                                </li>
                              )) || (
                                <li className="text-sm text-blue-600 italic">
                                  No recommendations available. Click "Analyze Farm" to generate AI-powered insights.
                                </li>
                              )}
                              {selectedFarm.analysis?.recommendations && selectedFarm.analysis.recommendations.length > 4 && (
                                <li className="text-xs text-blue-600 italic pl-4">
                                  + {selectedFarm.analysis.recommendations.length - 4} more recommendations in detailed view
                                </li>
                              )}
                            </ul>
                          </div>
                          
                          {/* Recommended Crops */}
                          <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-3 text-green-800 flex items-center gap-2">
                              <Sprout className="h-4 w-4" />
                              Recommended Crops
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedFarm.analysis?.recommendedCrops?.map((crop, index) => (
                                <Badge key={index} variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                  {crop}
                                </Badge>
                              ))}
                            </div>
                            {selectedFarm.analysis?.recommendedCrops?.length === 0 && (
                              <p className="text-sm text-green-600 italic">No specific crop recommendations available</p>
                            )}
                          </div>
                        </div>

                        {/* Analysis Insights Grid */}
                        {selectedFarm.analysis?.detailedAnalysis && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-amber-50 rounded-lg p-4 text-center">
                              <div className="text-2xl font-bold text-amber-700 mb-1">
                                {selectedFarm.analysis?.soilHealth || 0}%
                              </div>
                              <Progress 
                                value={selectedFarm.analysis?.soilHealth || 0} 
                                className="h-2 mb-4" 
                              />
                              
                              <div className="text-xs text-amber-600 mt-1">
                                {(selectedFarm.analysis?.soilHealth || 0) >= 80 ? 'Excellent' : 
                                 (selectedFarm.analysis?.soilHealth || 0) >= 60 ? 'Good' : 
                                 (selectedFarm.analysis?.soilHealth || 0) >= 40 ? 'Fair' : 'Needs Attention'}
                              </div>
                            </div>
                            
                            <div className="bg-green-50 rounded-lg p-4 text-center">
                              <div className="text-2xl font-bold text-green-700 mb-1">
                                {selectedFarm.analysis?.cropHealth || 0}%
                              </div>
                              <Progress 
                                value={selectedFarm.analysis?.cropHealth || 0} 
                                className="h-2 mb-4" 
                              />
                              
                              <div className="text-xs text-green-600 mt-1">
                                {(selectedFarm.analysis?.cropHealth || 0) >= 80 ? 'Excellent' : 
                                 (selectedFarm.analysis?.cropHealth || 0) >= 60 ? 'Good' : 
                                 (selectedFarm.analysis?.cropHealth || 0) >= 40 ? 'Fair' : 'Needs Attention'}
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                              <div className="text-2xl font-bold text-blue-700 mb-1">
                                {selectedFarm.analysis?.waterManagement || 0}%
                              </div>
                              <Progress 
                                value={selectedFarm.analysis?.waterManagement || 0} 
                                className="h-2 mb-4" 
                              />
                              
                              <div className="text-xs text-blue-600 mt-1">
                                {(selectedFarm.analysis?.waterManagement || 0) >= 80 ? 'Excellent' : 
                                 (selectedFarm.analysis?.waterManagement || 0) >= 60 ? 'Good' : 
                                 (selectedFarm.analysis?.waterManagement || 0) >= 40 ? 'Fair' : 'Needs Attention'}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Analyze Farm Button */}
                    <div className="mt-6">
                  <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleAnalyzeFarm}
                        disabled={analyzing}
                      >
                        {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                            <Activity className="h-4 w-4 mr-2" />
                            {selectedFarm.analysis ? 'Re-Analyze Farm' : 'Analyze Farm'}
                        </>
                      )}
                  </Button>
                  </div>
                </CardContent>
              </Card>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No farm selected</p>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowNewFarmDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Farm
                  </Button>
            </div>
              )}
          </div>
          </div>
        )}
        
        {/* New Farm Dialog */}
        <Dialog open={showNewFarmDialog} onOpenChange={setShowNewFarmDialog}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
              <DialogTitle>Add New Farm</DialogTitle>
                <DialogDescription>
                Enter details about your farm to get started with analysis.
                </DialogDescription>
              </DialogHeader>
              
                  <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="farm-name">Farm Name</Label>
                      <Input 
                  id="farm-name" 
                  placeholder="e.g. Green Acres" 
                        value={farmDetailsForm.name} 
                  onChange={(e) => setFarmDetailsForm({...farmDetailsForm, name: e.target.value})}
                      />
                  </div>
                    
              <div className="space-y-2">
                <Label htmlFor="farm-location">Location</Label>
                      <Input 
                  id="farm-location" 
                  placeholder="e.g. Riverside County, CA" 
                        value={farmDetailsForm.location} 
                  onChange={(e) => setFarmDetailsForm({...farmDetailsForm, location: e.target.value})}
                      />
                      </div>
                    
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="farm-size">Size (hectares)</Label>
                      <Input 
                    id="farm-size" 
                        type="number" 
                    placeholder="e.g. 10" 
                    value={farmDetailsForm.size.toString()}
                    onChange={(e) => setFarmDetailsForm({...farmDetailsForm, size: parseFloat(e.target.value) || 0})}
                      />
                        </div>
                    
                <div className="space-y-2">
                  <Label htmlFor="farm-type">Farm Type</Label>
                  <Select 
                    onValueChange={(value) => setFarmDetailsForm({...farmDetailsForm, farmType: value})}
                    defaultValue={farmDetailsForm.farmType}
                  >
                    <SelectTrigger id="farm-type">
                      <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                      <SelectItem value="Mixed farming">Mixed farming</SelectItem>
                      <SelectItem value="Arable farming">Arable farming</SelectItem>
                      <SelectItem value="Dairy farming">Dairy farming</SelectItem>
                      <SelectItem value="Plantation">Plantation</SelectItem>
                      <SelectItem value="Orchard">Orchard</SelectItem>
                      <SelectItem value="Livestock farming">Livestock farming</SelectItem>
                      <SelectItem value="Vegetable farming">Vegetable farming</SelectItem>
                        </SelectContent>
                      </Select>
                        </div>
                        </div>
                    
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="soil-type">Soil Type</Label>
                  <Select 
                    onValueChange={(value) => setFarmDetailsForm({...farmDetailsForm, soilType: value})}
                    defaultValue={farmDetailsForm.soilType}
                  >
                    <SelectTrigger id="soil-type">
                      <SelectValue placeholder="Select soil" />
                        </SelectTrigger>
                        <SelectContent>
                      <SelectItem value="Loamy">Loamy</SelectItem>
                      <SelectItem value="Sandy">Sandy</SelectItem>
                      <SelectItem value="Clay">Clay</SelectItem>
                      <SelectItem value="Silt">Silt</SelectItem>
                      <SelectItem value="Peaty">Peaty</SelectItem>
                      <SelectItem value="Chalky">Chalky</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                <div className="space-y-2">
                  <Label htmlFor="irrigation">Irrigation System</Label>
                  <Select 
                    onValueChange={(value) => setFarmDetailsForm({...farmDetailsForm, irrigationSystem: value})}
                    defaultValue={farmDetailsForm.irrigationSystem}
                  >
                    <SelectTrigger id="irrigation">
                      <SelectValue placeholder="Select irrigation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Drip irrigation">Drip irrigation</SelectItem>
                      <SelectItem value="Sprinkler system">Sprinkler system</SelectItem>
                      <SelectItem value="Flood irrigation">Flood irrigation</SelectItem>
                      <SelectItem value="Center pivot">Center pivot</SelectItem>
                      <SelectItem value="Manual irrigation">Manual irrigation</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                    </div>
                    
              <div className="space-y-2">
                <Label>Main Crops</Label>
                <div className="flex flex-wrap gap-2">
                      {farmDetailsForm.crops.map((crop, index) => (
                    <div key={index} className="flex items-center">
                          <Input 
                        className="w-32"
                        placeholder="e.g. Corn" 
                            value={crop} 
                        onChange={(e) => {
                          const newCrops = [...farmDetailsForm.crops];
                          newCrops[index] = e.target.value;
                          setFarmDetailsForm({...farmDetailsForm, crops: newCrops});
                        }}
                          />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => {
                          if (farmDetailsForm.crops.length > 1) {
                            const newCrops = [...farmDetailsForm.crops];
                            newCrops.splice(index, 1);
                            setFarmDetailsForm({...farmDetailsForm, crops: newCrops});
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                        </div>
                      ))}
                      <Button 
                    type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                      const newCrops = [...farmDetailsForm.crops, ''];
                      setFarmDetailsForm({...farmDetailsForm, crops: newCrops});
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                        Add Crop
                      </Button>
                    </div>
                  </div>
              </div>
              
            <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:space-x-2 gap-2 mt-4">
                <Button 
                type="button"
                  variant="outline" 
                onClick={() => setShowNewFarmDialog(false)}
                >
                  Cancel
                </Button>
              
                  <Button 
                type="button"
                className="bg-green-600 hover:bg-green-700"
                disabled={!farmDetailsForm.name || creatingFarm}
                onClick={handleCreateFarm}
              >
                {creatingFarm ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                      </>
                    ) : (
                      <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Farm
                      </>
                    )}
                  </Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Farm Image Upload Dialog */}
        <Dialog open={showFarmImageDialog} onOpenChange={(isOpen) => {
          // Only allow closing if not currently uploading
          if (!uploadingImage || !isOpen) {
            setShowFarmImageDialog(isOpen);
            // Reset the file and preview if the dialog is closed
            if (!isOpen) {
              setSelectedFile(null);
              setImagePreview(null);
              setUploadProgress(0);
              setUploadError(null);
            }
          } else if (uploadingImage && !isOpen) {
            toast({
              title: "Upload in Progress",
              description: "Please wait for the upload to complete or click Cancel",
            });
          }
        }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Farm Image</DialogTitle>
                <DialogDescription>
                Upload an image of your farm for analysis and record keeping.
                </DialogDescription>
              </DialogHeader>
              
                <div className="space-y-4">
              {/* Network Status Indicator */}
              <div className="flex items-center justify-end text-xs text-gray-500">
                {isOnline ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <WifiOff className="h-3 w-3 mr-1" />
                    <span>Offline - Check Connection</span>
                  </div>
                )}
              </div>
              
              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Upload Error</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
              
              {/* Developer note */}
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                Note: Using simulated upload mode. Images will be stored locally.
              </div>
              
              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <ImageIcon className="h-10 w-10 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500 mb-2">Drag and drop an image here, or click to select</p>
                  <Label 
                    htmlFor="farm-image-upload" 
                    className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm inline-flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select Image
                    <Input 
                      id="farm-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </Label>
                  <p className="text-xs text-gray-400 mt-2">Supported formats: JPG, PNG, WEBP (max 5MB)</p>
                  </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-video rounded-md overflow-hidden border border-gray-200">
                    {imagePreview && (
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                    )}
                      </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                    {!uploadingImage && (
                      <Button
                        type="button" 
                        variant="ghost" 
                          size="sm"
                          onClick={() => {
                          setSelectedFile(null);
                          setImagePreview(null);
                          setUploadError(null);
                          }}
                        >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    )}
                    </div>
                    
                  {uploadingImage && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                          </div>
                      <p className="text-xs text-gray-500">
                        Uploading: {uploadProgress.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        Please keep this window open while uploading...
                      </p>
                          </div>
                  )}
                  </div>
                )}
              </div>
              
            <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:space-x-2 gap-2 mt-4">
                <Button
                  type="button"
                variant="outline"
                  onClick={() => {
                  if (uploadingImage) {
                    const confirmCancel = window.confirm("Cancelling will abort the upload. Are you sure?");
                    if (confirmCancel) {
                    setUploadingImage(false);
                      setShowFarmImageDialog(false);
                      setSelectedFile(null);
                      setImagePreview(null);
                      setUploadProgress(0);
                      setUploadError(null);
                    }
                  } else {
                    setShowFarmImageDialog(false);
                    setSelectedFile(null);
                    setImagePreview(null);
                    setUploadProgress(0);
                    setUploadError(null);
                  }
                }}
                disabled={uploadingImage && uploadProgress > 0 && uploadProgress < 100}
              >
                Cancel
              </Button>
              
              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700"
                disabled={!selectedFile || uploadingImage || !!uploadError || !isOnline}
                onClick={handleUploadImage}
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </>
                )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Detailed Analysis Dialog */}
        <Dialog open={showDetailedAnalysis} onOpenChange={setShowDetailedAnalysis}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Detailed Farm Analysis</DialogTitle>
              <DialogDescription>
                Comprehensive analysis of {selectedFarm?.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedFarm?.analysis && (
              <Tabs defaultValue="summary" className="mt-4 flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid grid-cols-6">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="soil">Soil</TabsTrigger>
                  <TabsTrigger value="crops">Crops</TabsTrigger>
                  <TabsTrigger value="irrigation">Irrigation</TabsTrigger>
                  <TabsTrigger value="sustainability">Sustainability</TabsTrigger>
                  <TabsTrigger value="economics">Economics</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto">
                  {/* Summary Tab */}
                  <TabsContent value="summary" className="pt-4 h-full">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">Overall Score</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-purple-700">
                              {selectedFarm.analysis?.overallScore || 0}%
                            </div>
                            <Progress 
                              value={selectedFarm.analysis?.overallScore || 0} 
                              className="mt-2" 
                            />
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">Sustainability Score</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-700">
                              {selectedFarm.analysis?.sustainabilityScore || 0}%
                    </div>
                          <Progress 
                            value={selectedFarm.analysis?.sustainabilityScore || 0} 
                            className="mt-2" 
                          />
                        </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">Climate Resilience</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-blue-700">
                              {selectedFarm.analysis?.climateResilience?.score || 0}%
                        </div>
                          <Progress 
                            value={selectedFarm.analysis?.climateResilience?.score || 0} 
                            className="mt-2" 
                          />
                        </CardContent>
                        </Card>
                      </div>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Analysis Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">
                            {formatAnalysisText(selectedFarm.analysis?.detailedAnalysis)}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Recommendations */}
                        <div>
                          <h4 className="text-sm font-medium">Key Recommendations</h4>
                          <ul className="mt-2 space-y-1 list-disc pl-5">
                            {selectedFarm.analysis?.recommendations?.slice(0, 3).map((rec, index) => (
                              <li key={index} className="text-sm text-gray-700">{rec}</li>
                            ))}
                            {selectedFarm.analysis?.recommendations && selectedFarm.analysis.recommendations.length > 3 && (
                              <li className="text-sm text-gray-500 italic">
                                + {selectedFarm.analysis.recommendations.length - 3} more recommendations
                              </li>
                            )}
                          </ul>
                    </div>
                              
                              {/* Recommended crops */}
                              <div>
                                <h4 className="text-sm font-medium">Recommended Crops</h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedFarm.analysis?.recommendedCrops?.map((crop, index) => (
                                    <Badge key={index} variant="outline" className="bg-green-50">
                                      <Sprout className="h-3 w-3 mr-1" />
                                      {crop}
                                    </Badge>
                                  ))}
                  </div>
              </div>
                            </div>
              

                        {/* View detailed analysis button */}
                        <div className="text-center">
                  <Button 
                  variant="outline" 
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            onClick={toggleDetailedAnalysis}
                >
                            <Activity className="h-4 w-4 mr-2" />
                            View Detailed Analysis
                  </Button>
              </div>
                  </div>
                </TabsContent>
                  
                  {/* Soil Tab */}
                  <TabsContent value="soil" className="pt-4 h-full">
                    <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Soil Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Soil Type</div>
                            <div className="font-medium">{selectedFarm.analysis?.soilAnalysis?.type}</div>
                    </div>
                    
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Fertility</div>
                            <div className="font-medium">{selectedFarm.analysis?.soilAnalysis?.fertility}</div>
                        </div>
                        
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">pH Level</div>
                            <div className="font-medium">{selectedFarm.analysis?.soilAnalysis?.phLevel}</div>
                        </div>
                        
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Organic Matter</div>
                            <div className="font-medium">{selectedFarm.analysis?.soilAnalysis?.organicMatter}%</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                            <h4 className="text-sm font-medium">Problems Identified</h4>
                            <ul className="mt-2 space-y-1 list-disc pl-5">
                              {selectedFarm.analysis?.soilAnalysis?.problems?.map((problem, index) => (
                                <li key={index} className="text-sm text-gray-700">{problem}</li>
                              ))}
                            </ul>
                    </div>
                    
                    <div>
                            <h4 className="text-sm font-medium">Improvement Suggestions</h4>
                            <ul className="mt-2 space-y-1 list-disc pl-5">
                              {selectedFarm.analysis?.soilAnalysis?.improvementSuggestions?.map((suggestion, index) => (
                                <li key={index} className="text-sm text-gray-700">{suggestion}</li>
                              ))}
                            </ul>
                        </div>
                    </div>
                      </CardContent>
                    </Card>
                </div>
                </TabsContent>
                
                {/* Crops Tab */}
                <TabsContent value="crops" className="pt-4 h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Crop Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                <div className="space-y-4">
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Growth Stage</div>
                            <div className="font-medium">{selectedFarm.analysis?.cropAnalysis?.growthStage}</div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium">Health Indicators</h4>
                            <ul className="mt-2 space-y-1 list-disc pl-5">
                              {selectedFarm.analysis?.cropAnalysis?.healthIndicators?.map((indicator, index) => (
                                <li key={index} className="text-sm text-gray-700">{indicator}</li>
                              ))}
                            </ul>
                    </div>
                    
                    <div>
                            <h4 className="text-sm font-medium">Nutrient Deficiencies</h4>
                            <ul className="mt-2 space-y-1 list-disc pl-5">
                              {selectedFarm.analysis?.cropAnalysis?.nutrientDeficiencies?.map((deficiency, index) => (
                                <li key={index} className="text-sm text-gray-700">{deficiency}</li>
                              ))}
                            </ul>
                    </div>
                  </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Crop Projections</CardTitle>
                      </CardHeader>
                      <CardContent>
                    <div className="space-y-4">
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Estimated Yield</div>
                            <div className="font-medium">{selectedFarm.analysis?.cropAnalysis?.estimatedYield}</div>
              </div>
              
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Time to Harvest</div>
                            <div className="font-medium">{selectedFarm.analysis?.cropAnalysis?.harvestTime}</div>
              </div>
                        
                          <div>
                            <h4 className="text-sm font-medium">Recommended Crops</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedFarm.analysis?.recommendedCrops?.map((crop, index) => (
                                <Badge key={index} variant="outline" className="bg-green-50">
                                {crop}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                            <h4 className="text-sm font-medium">Climate Resilience</h4>
                            <div className="text-sm text-gray-700">
                              {selectedFarm.analysis?.climateResilience?.score}% 
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                </div>
                </TabsContent>
                
                {/* Irrigation Tab */}
                <TabsContent value="irrigation" className="pt-4 h-full">
                <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Droplets className="h-5 w-5 text-blue-600" />
                          Irrigation System Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">System Type</div>
                            <div className="font-medium">{selectedFarm.irrigationSystem}</div>
                          </div>
                          
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Efficiency Rating</div>
                            <div className="font-medium">
                              {selectedFarm.analysis?.waterManagement}% 
                              <span className="text-xs ml-1 text-blue-600">
                                {(selectedFarm.analysis?.waterManagement || 0) > 75 ? 'Good' : 
                                  (selectedFarm.analysis?.waterManagement || 0) > 50 ? 'Average' : 'Poor'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Water Usage</div>
                            <div className="font-medium">{selectedFarm.analysis?.irrigationRecommendations?.waterAmount || '~450 m³/ha'}</div>
                          </div>
                          
                          <div className="border rounded-md p-3">
                            <div className="text-sm font-medium text-gray-500">Schedule Optimization</div>
                            <div className="font-medium">{selectedFarm.analysis?.irrigationRecommendations?.efficiency || '72%'}</div>
                    </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="border-blue-100">
                            <CardHeader className="py-3 bg-blue-50">
                              <CardTitle className="text-sm text-blue-700">Water Conservation Potential</CardTitle>
                            </CardHeader>
                            <CardContent className="py-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">Current Usage</span>
                                <span>{selectedFarm.analysis?.irrigationRecommendations?.waterAmount || '100%'}</span>
                      </div>
                              <Progress 
                                value={100} 
                                className="h-2 mb-4" 
                              />
                              
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">Potential Savings</span>
                                <span>25%</span>
                    </div>
                              <Progress 
                                value={25} 
                                className="h-2 bg-blue-100" 
                              />
                              
                              <div className="mt-4 border-t border-gray-100 pt-3">
                                <h4 className="text-sm font-medium mb-2">Saving Strategies</h4>
                                <ul className="space-y-1 list-disc pl-5">
                                  {(selectedFarm.analysis?.irrigationRecommendations?.techniques || [
                                    "Implement drip irrigation for row crops",
                                    "Schedule irrigation based on soil moisture sensors",
                                    "Apply mulch to reduce evaporation",
                                    "Maintain and repair irrigation system regularly"
                                  ]).map((strategy, index) => (
                                    <li key={index} className="text-sm text-gray-700">{strategy}</li>
                                  ))}
                                </ul>
                    </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="border-blue-100">
                            <CardHeader className="py-3 bg-blue-50">
                              <CardTitle className="text-sm text-blue-700">Irrigation Sustainability Score</CardTitle>
                            </CardHeader>
                            <CardContent className="py-4">
                              <div className="text-3xl font-bold text-blue-700 mb-2">
                                68%
                      </div>
                              <Progress 
                                value={68} 
                                className="mb-4" 
                              />
                              
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="border rounded-md p-2">
                                  <div className="text-xs text-gray-500">Water Source</div>
                                  <div className="text-sm font-medium">Groundwater</div>
                          </div>
                                
                                <div className="border rounded-md p-2">
                                  <div className="text-xs text-gray-500">Reliability</div>
                                  <div className="text-sm font-medium">Medium</div>
                          </div>
                          
                                <div className="border rounded-md p-2">
                                  <div className="text-xs text-gray-500">Water Quality</div>
                                  <div className="text-sm font-medium">Good</div>
                          </div>
                          
                                <div className="border rounded-md p-2">
                                  <div className="text-xs text-gray-500">Energy Use</div>
                                  <div className="text-sm font-medium">Medium</div>
                          </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Sustainability Tab */}
                <TabsContent value="sustainability" className="pt-4 h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Overall Sustainability Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          {selectedFarm.analysis?.sustainabilityScore || 0}%
                          </div>
                        <Progress
                          value={selectedFarm.analysis?.sustainabilityScore || 0}
                          className="h-2 mt-2"
                        />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Carbon Footprint
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-3xl font-bold text-emerald-600">
                            {selectedFarm.analysis?.carbonFootprint?.rating === 'Low' ? '8.5' : 
                             selectedFarm.analysis?.carbonFootprint?.rating === 'High' ? '18.2' : '12.5'}
                            <span className="text-sm font-normal ml-1">tons CO₂e/year</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-3">
                          <div className="text-center p-1 bg-emerald-50 rounded">
                            <div className="text-xs text-gray-500">Per Hectare</div>
                            <div className="text-sm font-medium">
                              {selectedFarm.analysis?.carbonFootprint?.rating === 'Low' ? '1.5' : 
                               selectedFarm.analysis?.carbonFootprint?.rating === 'High' ? '3.2' : '2.1'} tons
                      </div>
                    </div>
                          <div className="text-center p-1 bg-emerald-50 rounded">
                            <div className="text-xs text-gray-500">Farm Avg</div>
                            <div className="text-sm font-medium">
                              {selectedFarm.analysis?.carbonFootprint?.rating || 'Medium'}
                </div>
                          </div>
                          <div className="text-center p-1 bg-emerald-50 rounded">
                            <div className="text-xs text-gray-500">Industry Avg</div>
                            <div className="text-sm font-medium">
                              15% below
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
              </div>
              
                <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Sustainability Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">Biodiversity</span>
                              <span className="text-sm">65%</span>
                    </div>
                            <Progress value={65} className="h-2" />
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">Soil Health Management</span>
                              <span className="text-sm">78%</span>
                      </div>
                            <Progress value={78} className="h-2" />
                    </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">Water Conservation</span>
                              <span className="text-sm">68%</span>
                    </div>
                            <Progress value={68} className="h-2" />
                      </div>
                      
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">Energy Efficiency</span>
                              <span className="text-sm">60%</span>
                            </div>
                            <Progress value={60} className="h-2" />
                        </div>
                        
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">Waste Management</span>
                              <span className="text-sm">72%</span>
                        </div>
                            <Progress value={72} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Sustainability Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium mb-3">Short-term Actions</h4>
                            <ul className="space-y-2 list-disc pl-5">
                              {[
                                "Implement cover crops during fallow periods",
                                "Reduce tillage frequency to preserve soil structure",
                                "Install rainwater harvesting system",
                                "Optimize fertilizer application using soil tests"
                              ].map((rec, index) => (
                                <li key={index} className="text-sm text-gray-700">{rec}</li>
                              ))}
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="text-sm font-medium mb-3">Long-term Strategy</h4>
                            <ul className="space-y-2 list-disc pl-5">
                              {[
                                "Transition to renewable energy sources for farm operations",
                                "Establish wildlife corridors and habitat areas",
                                "Implement precision agriculture technologies",
                                "Develop closed-loop systems for farm waste"
                              ].map((rec, index) => (
                                <li key={index} className="text-sm text-gray-700">{rec}</li>
                              ))}
                            </ul>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                    </div>
                </TabsContent>
                
                {/* Economics Tab */}
                <TabsContent value="economics" className="pt-4 h-full">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="py-3 bg-green-50">
                          <CardTitle className="text-sm text-green-700">Profitability Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <div className="text-3xl font-bold text-green-700 mb-2">
                            {selectedFarm.analysis?.profitabilityAnalysis?.roi || "72%"}
                </div>
                          <Progress 
                            value={72} 
                            className="h-2 mb-4" 
                          />
                          
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Est. Revenue</div>
                              <div className="text-sm font-medium">{selectedFarm.analysis?.profitabilityAnalysis?.marketValue || "₹380,000/ha"}</div>
              </div>
              
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Est. Costs</div>
                              <div className="text-sm font-medium">₹190,000/ha</div>
                            </div>
                            
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Est. Profit</div>
                              <div className="text-sm font-medium">₹190,000/ha</div>
                            </div>
                            
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">ROI</div>
                              <div className="text-sm font-medium">100%</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="py-3 bg-amber-50">
                          <CardTitle className="text-sm text-amber-700">Market Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <div className="space-y-3">
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Market Demand</div>
                              <div className="flex items-center mt-1">
                                <span className="text-sm font-medium mr-2">High</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700">↑ Rising</Badge>
                              </div>
                            </div>
                            
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Price Stability</div>
                              <div className="text-sm font-medium">Medium</div>
                            </div>
                            
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Market Access</div>
                              <div className="text-sm font-medium">Good - Multiple channels</div>
                    </div>
                            
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Competition Level</div>
                              <div className="text-sm font-medium">Medium</div>
                      </div>
                    </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="py-3 bg-blue-50">
                          <CardTitle className="text-sm text-blue-700">Financial Sustainability</CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <div className="text-3xl font-bold text-blue-700 mb-2">
                            68%
                    </div>
                          <Progress 
                            value={68} 
                            className="h-2 mb-4" 
                          />
                          
                          <div className="space-y-3">
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Risk Level</div>
                              <div className="text-sm font-medium">Medium</div>
                      </div>
                      
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Diversification</div>
                              <div className="text-sm font-medium">Moderate</div>
                        </div>
                        
                            <div className="border rounded-md p-2">
                              <div className="text-xs text-gray-500">Long-term Viability</div>
                              <div className="text-sm font-medium">Good</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                        </div>
                        
                    <Card>
                      <CardHeader>
                        <CardTitle>Economic Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium mb-3">Cost Optimization</h4>
                            <ul className="space-y-2 list-disc pl-5">
                              {[
                                "Implement precision farming to reduce input waste",
                                "Share equipment with neighboring farms",
                                "Bulk purchase of inputs with other farmers",
                                "Explore renewable energy to reduce operational costs"
                              ].map((strategy, index) => (
                                <li key={index} className="text-sm text-gray-700">{strategy}</li>
                              ))}
                            </ul>
                        </div>
                        
                          <div>
                            <h4 className="text-sm font-medium mb-3">Revenue Enhancement</h4>
                            <ul className="space-y-2 list-disc pl-5">
                              {[
                                "Direct marketing to consumers for premium pricing",
                                "Value-added processing of farm products",
                                "Explore organic certification for higher margins",
                                "Diversify into complementary crops or products"
                              ].map((strategy, index) => (
                                <li key={index} className="text-sm text-gray-700">{strategy}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-medium mb-3">Investment Opportunities</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                              {
                                name: "Drip Irrigation System",
                                roi: "125%",
                                payback: "2 years",
                                initialCost: "₹85,000"
                              },
                              {
                                name: "Solar Pumping System",
                                roi: "90%",
                                payback: "3 years",
                                initialCost: "₹120,000"
                              },
                              {
                                name: "Storage Facility Upgrade",
                                roi: "75%",
                                payback: "4 years",
                                initialCost: "₹180,000"
                              }
                            ].map((opportunity, index) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="font-medium mb-2">{opportunity.name}</div>
                                <div className="grid grid-cols-3 gap-1 text-xs">
                        <div>
                                    <div className="text-gray-500">ROI</div>
                                    <div className="font-medium text-green-600">{opportunity.roi}</div>
                        </div>
                                  <div>
                                    <div className="text-gray-500">Payback</div>
                                    <div className="font-medium">{opportunity.payback}</div>
                      </div>
                                  <div>
                                    <div className="text-gray-500">Cost</div>
                                    <div className="font-medium">{opportunity.initialCost}</div>
                    </div>
                </div>
              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

        {/* Delete Farm Dialog */}
        <Dialog open={showDeleteFarmDialog} onOpenChange={setShowDeleteFarmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Farm</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {farmToDelete?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
                <Button
                variant="outline"
                onClick={() => setShowDeleteFarmDialog(false)}
                disabled={loading}
              >
                Cancel
                </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteFarm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Farm'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
      )}
      </>
  );
};

export default Farm;