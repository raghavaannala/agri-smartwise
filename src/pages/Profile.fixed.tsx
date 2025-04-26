import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/firestore';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [farmSize, setFarmSize] = useState<string>('');
  const [farmType, setFarmType] = useState<string>('');

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const userProfile = await getUserProfile(currentUser.uid);
      setProfile(userProfile);
      
      if (userProfile) {
        setDisplayName(userProfile.displayName || '');
        setLocation(userProfile.location || '');
        setFarmSize(userProfile.farmSize?.toString() || '');
        setFarmType(userProfile.farmType || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [currentUser, navigate]);

  // Function to format dates consistently
  const formatDate = (date: any): Date => {
    if (date instanceof Date) return date;
    if (date?.seconds) return new Date(date.seconds * 1000);
    if (date?.toDate) return date.toDate();
    if (date) return new Date(date);
    return new Date();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to update your profile');
      navigate('/login');
      return;
    }
    
    try {
      setSaving(true);
      
      // Ensure we have proper date handling for Firestore
      const createdAt = profile?.createdAt ? formatDate(profile.createdAt) : new Date();
      
      const updatedProfile: UserProfile = {
        id: currentUser.uid,
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName,
        photoURL: currentUser.photoURL || '',
        location,
        farmSize: farmSize ? parseFloat(farmSize) : undefined,
        farmType,
        createdAt,
        updatedAt: new Date(),
        crops: profile?.crops || [],
      };
      
      await saveUserProfile(updatedProfile);
      
      // Update the local profile state to reflect changes
      setProfile(updatedProfile);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">User Profile</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Summary Card */}
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-col items-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={currentUser?.photoURL || ''} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="mt-4">{displayName || 'User'}</CardTitle>
                <CardDescription>{currentUser?.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Location</span>
                    <p>{location || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Farm Size</span>
                    <p>{farmSize ? `${farmSize} acres` : 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Farm Type</span>
                    <p>{farmType || 'Not specified'}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                    <p>{profile?.createdAt 
                      ? formatDate(profile.createdAt).toLocaleDateString() 
                      : 'Unknown'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Edit Profile Form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Your location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="farmSize">Farm Size (acres)</Label>
                      <Input
                        id="farmSize"
                        type="number"
                        value={farmSize}
                        onChange={(e) => setFarmSize(e.target.value)}
                        placeholder="Farm size in acres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="farmType">Farm Type</Label>
                      <Select value={farmType} onValueChange={setFarmType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select farm type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Crop">Crop Farming</SelectItem>
                          <SelectItem value="Livestock">Livestock</SelectItem>
                          <SelectItem value="Mixed">Mixed Farming</SelectItem>
                          <SelectItem value="Organic">Organic Farming</SelectItem>
                          <SelectItem value="Plantation">Plantation</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" form="profile-form" disabled={saving} className="bg-agri-green hover:bg-agri-green/90 text-white">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
