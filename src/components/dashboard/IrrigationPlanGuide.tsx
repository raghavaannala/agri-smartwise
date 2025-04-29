import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplet, Calendar, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAuth } from 'firebase/auth';
import { getActiveIrrigationPlan, IrrigationPlan } from '@/lib/firestore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Component that displays the active irrigation plan as a guide for farmers on the dashboard
 */
const IrrigationPlanGuide: React.FC = () => {
  const [activePlan, setActivePlan] = useState<IrrigationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchActivePlan = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const plan = await getActiveIrrigationPlan(user.uid);
          setActivePlan(plan);
        }
      } catch (error) {
        console.error("Error fetching active irrigation plan:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivePlan();
  }, []);
  
  // Helper function to extract key information from the plan text
  const extractPlanHighlights = (planText: string) => {
    // Extract weekly schedule if it exists
    const scheduleMatch = planText.match(/Weekly schedule:?([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const schedule = scheduleMatch ? scheduleMatch[1].trim() : null;
    
    // Extract time of day recommendations
    const timeMatch = planText.match(/Time of day recommendations?:?([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const timeOfDay = timeMatch ? timeMatch[1].trim() : null;
    
    // Extract water conservation strategies
    const conservationMatch = planText.match(/Water conservation strategies?:?([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const conservation = conservationMatch ? conservationMatch[1].trim() : null;
    
    return { schedule, timeOfDay, conservation };
  };
  
  // If still loading or no active plan
  if (loading) {
    return (
      <Card className="w-full bg-white border-blue-100">
        <CardContent className="pt-6">
          <div className="animate-pulse flex flex-col">
            <div className="h-5 bg-slate-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-full mb-3"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6 mb-3"></div>
            <div className="h-4 bg-slate-200 rounded w-4/6 mb-3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!activePlan) {
    return (
      <Card className="w-full bg-white border-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-agri-blue flex items-center">
            <Droplet className="h-5 w-5 mr-2" />
            Irrigation Guide
          </CardTitle>
          <CardDescription>Optimize your water usage with a customized plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              No active irrigation plan found. Create a detailed plan to optimize your water usage.
            </p>
            <Button 
              onClick={() => navigate('/farm')}
              className="bg-agri-blue hover:bg-agri-blue/90"
            >
              Create Irrigation Plan <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Extract highlights from plan
  const { schedule, timeOfDay, conservation } = extractPlanHighlights(activePlan.planText);
  
  return (
    <>
      <Card className="w-full bg-white border-blue-100">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-agri-blue flex items-center">
              <Droplet className="h-5 w-5 mr-2" />
              Irrigation Guide
            </CardTitle>
            <Badge className="bg-green-600">Active Plan</Badge>
          </div>
          <CardDescription>{activePlan.title}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-4">
            {schedule && (
              <div className="flex items-start">
                <Calendar className="h-5 w-5 mr-2 text-agri-blue shrink-0" />
                <div>
                  <p className="font-medium text-sm">Weekly Schedule</p>
                  <p className="text-sm text-gray-600">
                    {schedule.length > 100 
                      ? schedule.substring(0, 100) + '...' 
                      : schedule}
                  </p>
                </div>
              </div>
            )}
            
            {timeOfDay && (
              <div className="flex items-start">
                <Clock className="h-5 w-5 mr-2 text-agri-blue shrink-0" />
                <div>
                  <p className="font-medium text-sm">Recommended Time</p>
                  <p className="text-sm text-gray-600">
                    {timeOfDay.length > 100 
                      ? timeOfDay.substring(0, 100) + '...' 
                      : timeOfDay}
                  </p>
                </div>
              </div>
            )}
            
            <div className={cn(
              "flex items-center justify-between",
              "bg-blue-50 p-2 rounded-lg text-sm text-agri-blue"
            )}>
              <span>System: {activePlan.system}</span>
              <span>{activePlan.waterRequirement.toLocaleString()} L/day</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs w-full border-agri-blue text-agri-blue"
            onClick={() => setShowDetailsDialog(true)}
          >
            View Complete Irrigation Plan <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personalized Irrigation Plan</DialogTitle>
            <DialogDescription>
              Detailed irrigation recommendations for your farm
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 whitespace-pre-line text-gray-700">
            {activePlan.planText}
          </div>
          
          {conservation && (
            <div className="mt-4 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-agri-blue mb-2">Water Conservation Strategies</h3>
              <p className="text-sm">{conservation}</p>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={() => navigate('/farm')}
              className="bg-agri-blue hover:bg-agri-blue/90"
            >
              Go To Irrigation Management
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IrrigationPlanGuide; 