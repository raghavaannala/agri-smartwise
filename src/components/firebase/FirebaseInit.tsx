import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, saveUserProfile } from '@/lib/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

// Helper function to format dates
const formatDate = (date: any): Date => {
  if (date instanceof Date) return date;
  if (date?.seconds) return new Date(date.seconds * 1000);
  if (date?.toDate) return date.toDate();
  if (date) return new Date(date);
  return new Date();
};

const FirebaseInit = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    const createUserProfileIfNeeded = async (user: any) => {
      if (!user) return;

      try {
        // Check if user profile exists
        const userProfile = await getUserProfile(user.uid);
        
        // If profile doesn't exist, create one
        if (!userProfile) {
          await saveUserProfile({
            id: user.uid,
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log('User profile created successfully');
          // Notify user but only on first creation
          toast.success('Welcome to SmartAgroX!');
        } else {
          // Update the profile with the latest user data
          // This ensures displayName and photoURL are updated from auth
          const updatedFields = {
            email: user.email || userProfile.email,
            displayName: user.displayName || userProfile.displayName,
            photoURL: user.photoURL || userProfile.photoURL,
            updatedAt: new Date(),
          };
          
          // Ensure createdAt is properly formatted
          const createdAt = formatDate(userProfile.createdAt);
          
          // Only update if there are changes and don't show errors for routine updates
          if (
            updatedFields.email !== userProfile.email ||
            updatedFields.displayName !== userProfile.displayName ||
            updatedFields.photoURL !== userProfile.photoURL
          ) {
            try {
              await saveUserProfile({
                ...userProfile,
                ...updatedFields,
                createdAt
              });
              console.log('User profile updated with latest auth data');
            } catch (updateError) {
              // Log error but don't show to user during routine updates
              console.error('Error updating profile with latest auth data:', updateError);
            }
          }
        }
      } catch (error) {
        console.error('Error checking/creating user profile:', error);
        // Only show error if we can't get the profile, not for routine updates
        if (!currentUser) {
          toast.error('Error setting up your profile');
        }
      }
    };

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Add small delay to avoid race conditions
        setTimeout(() => {
          createUserProfileIfNeeded(user);
        }, 1000);
      }
    });

    // Clean up the listener on unmount
    return () => unsubscribe();
  }, []);

  // Check for existing user on component mount
  useEffect(() => {
    if (currentUser) {
      const createProfileIfNeeded = async () => {
        try {
          // Check if user profile exists
          const userProfile = await getUserProfile(currentUser.uid);
          
          // If profile doesn't exist, create one
          if (!userProfile) {
            await saveUserProfile({
              id: currentUser.uid,
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log('User profile created successfully');
          } else {
            // Ensure profile is up to date with latest auth data
            const updatedFields = {
              email: currentUser.email || userProfile.email,
              displayName: currentUser.displayName || userProfile.displayName,
              photoURL: currentUser.photoURL || userProfile.photoURL,
              updatedAt: new Date(),
            };
            
            // Only update if there are changes
            if (
              updatedFields.email !== userProfile.email ||
              updatedFields.displayName !== userProfile.displayName ||
              updatedFields.photoURL !== userProfile.photoURL
            ) {
              await saveUserProfile({
                ...userProfile,
                ...updatedFields
              });
              console.log('User profile updated with latest auth data');
            }
          }
        } catch (error) {
          console.error('Error checking/creating user profile:', error);
        }
      };
      
      createProfileIfNeeded();
    }
  }, [currentUser]);

  // This component doesn't render anything
  return null;
};

export default FirebaseInit; 