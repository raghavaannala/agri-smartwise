import { getFarmingRecommendation } from './geminiService';

export interface CropStage {
  id: string;
  name: string;
  duration: number; // days
  startDay: number;
  endDay: number;
  description: string;
  tasks: CropTask[];
  criticalActions: string[];
  expectedOutcome: string;
  weatherConsiderations: string[];
  riskFactors: string[];
}

export interface CropTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'irrigation' | 'fertilization' | 'pest_control' | 'monitoring' | 'harvesting' | 'soil_management';
  dueDate: Date;
  estimatedTime: string; // e.g., "2-3 hours"
  resources: string[];
  completed: boolean;
  reminders: TaskReminder[];
}

export interface TaskReminder {
  id: string;
  type: 'before' | 'on_due' | 'overdue';
  message: string;
  daysOffset: number; // days before/after due date
}

export interface IrrigationPlan {
  frequency: string;
  amount: string;
  method: string;
  schedule: IrrigationSchedule[];
  seasonalAdjustments: string[];
}

export interface IrrigationSchedule {
  stage: string;
  frequency: string;
  amount: string;
  timing: string;
  notes: string[];
}

export interface PesticideRecommendation {
  name: string;
  type: 'fungicide' | 'insecticide' | 'herbicide' | 'organic';
  applicationStage: string[];
  dosage: string;
  frequency: string;
  safetyPrecautions: string[];
  alternatives: string[];
}

export interface CropJourney {
  id: string;
  farmId: string;
  cropName: string;
  variety: string;
  plantingDate: Date;
  expectedHarvestDate: Date;
  totalDuration: number; // days
  currentStage: string;
  progress: number; // percentage
  stages: CropStage[];
  irrigationPlan: IrrigationPlan;
  pesticideRecommendations: PesticideRecommendation[];
  overallTasks: CropTask[];
  milestones: Milestone[];
  weatherAlerts: WeatherAlert[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: Date;
  description: string;
  completed: boolean;
  completedDate?: Date;
  importance: 'critical' | 'important' | 'normal';
}

export interface WeatherAlert {
  id: string;
  type: 'rain' | 'drought' | 'frost' | 'heat_wave' | 'storm';
  severity: 'low' | 'medium' | 'high';
  message: string;
  actionRequired: string[];
  validUntil: Date;
}

export interface FarmData {
  id: string;
  name: string;
  location: string;
  size: number;
  soilType: string;
  crops: string[];
  irrigationSystem: string;
  farmType: string;
  climate?: string;
  previousCrops?: string[];
  existingAnalysis?: {
    soilHealth?: number;
    cropHealth?: number;
    waterManagement?: number;
    recommendations?: string[];
    lastAnalyzed?: string;
  };
}

class AgriBuddyService {
  private async generateCropJourneyPlan(farmData: FarmData, cropName: string): Promise<CropJourney> {
    // Enhanced prompt with actual farm analysis data
    const prompt = `
    Create a comprehensive crop cultivation journey for a farmer with the following REAL farm data:
    
    Farm Information:
    - Crop: ${cropName}
    - Location: ${farmData.location}
    - Farm Size: ${farmData.size} hectares
    - Soil Type: ${farmData.soilType}
    - Irrigation System: ${farmData.irrigationSystem}
    - Farm Type: ${farmData.farmType}
    - Previous Crops: ${farmData.previousCrops?.join(', ') || 'None specified'}
    - Climate: ${farmData.climate || 'Not specified'}
    
    ${farmData.previousCrops && farmData.previousCrops.length > 0 ? 
      `Previous Crop History: This farm has grown ${farmData.previousCrops.join(', ')} before, so consider crop rotation benefits and soil nutrient management.` : ''}
    
    Generate a detailed, location-specific cultivation plan including:
    1. Complete crop lifecycle stages optimized for ${farmData.location} climate
    2. Specific tasks for each stage with realistic timelines for ${farmData.soilType} soil
    3. Irrigation schedule optimized for ${farmData.irrigationSystem} system
    4. Fertilizer and pesticide recommendations based on local conditions
    5. Critical milestones and checkpoints specific to ${cropName} in ${farmData.location}
    6. Weather considerations for ${farmData.location} region
    7. Expected outcomes and yield predictions for ${farmData.size} hectares
    8. Risk factors specific to ${farmData.location} and ${farmData.soilType}
    
    Consider local farming practices, seasonal patterns, and regional agricultural conditions.
    Provide specific dates, quantities, and actionable instructions.
    Focus on sustainable and efficient farming practices suitable for ${farmData.farmType} farming.
    `;

    try {
      const userProfile = {
        location: farmData.location,
        farmType: farmData.farmType,
        crops: farmData.crops,
        soilType: farmData.soilType
      };
      
      console.log('🤖 Generating AI crop journey for:', cropName, 'at', farmData.location);
      const aiResponse = await getFarmingRecommendation(userProfile, prompt);
      console.log('✅ AI Response received, length:', aiResponse.length);
      
      return this.parseAIResponseToCropJourney(aiResponse, farmData, cropName);
    } catch (error) {
      console.error('❌ Error generating crop journey:', error);
      return this.createDefaultCropJourney(farmData, cropName);
    }
  }

  private parseAIResponseToCropJourney(aiResponse: string, farmData: FarmData, cropName: string): CropJourney {
    const now = new Date();
    const plantingDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    // Parse AI response and create structured crop journey
    // This is a simplified version - you can enhance the parsing logic
    const stages = this.createCropStages(cropName, aiResponse, farmData);
    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);
    const expectedHarvestDate = new Date(plantingDate.getTime() + totalDuration * 24 * 60 * 60 * 1000);
    
    const cropJourney: CropJourney = {
      id: `journey_${Date.now()}`,
      farmId: farmData.id,
      cropName,
      variety: this.getCropVariety(cropName),
      plantingDate,
      expectedHarvestDate,
      totalDuration,
      currentStage: stages[0]?.id || 'preparation',
      progress: 0,
      stages,
      irrigationPlan: this.createIrrigationPlan(cropName, farmData),
      pesticideRecommendations: this.createPesticideRecommendations(cropName),
      overallTasks: this.generateTasksFromStages(stages, plantingDate),
      milestones: this.createMilestones(stages, plantingDate),
      weatherAlerts: [],
      createdAt: now,
      updatedAt: now
    };

    return cropJourney;
  }

  private createCropStages(cropName: string, aiResponse: string, farmData?: FarmData): CropStage[] {
    // Location and crop-specific stage durations
    const cropStageTemplates = {
      rice: {
        stages: [
          { name: 'Land Preparation', duration: 10, actions: ['Soil testing', 'Land leveling', 'Plowing', 'Organic matter incorporation'] },
          { name: 'Seed Preparation & Sowing', duration: 5, actions: ['Seed treatment', 'Nursery preparation', 'Transplanting', 'Initial irrigation'] },
          { name: 'Vegetative Growth', duration: 35, actions: ['Regular irrigation', 'Fertilizer application', 'Weed management', 'Pest monitoring'] },
          { name: 'Reproductive Phase', duration: 30, actions: ['Panicle initiation care', 'Flowering support', 'Disease prevention', 'Water management'] },
          { name: 'Grain Filling', duration: 25, actions: ['Nutrient management', 'Water regulation', 'Pest control', 'Maturity monitoring'] },
          { name: 'Harvesting', duration: 7, actions: ['Timely harvesting', 'Proper drying', 'Storage preparation', 'Yield recording'] }
        ]
      },
      wheat: {
        stages: [
          { name: 'Land Preparation', duration: 8, actions: ['Soil preparation', 'Fertilizer application', 'Seed bed preparation'] },
          { name: 'Sowing', duration: 3, actions: ['Seed treatment', 'Sowing', 'Initial irrigation'] },
          { name: 'Germination & Establishment', duration: 15, actions: ['Germination monitoring', 'Weed control', 'Thinning'] },
          { name: 'Vegetative Growth', duration: 40, actions: ['Regular irrigation', 'Fertilization', 'Pest management'] },
          { name: 'Reproductive Phase', duration: 35, actions: ['Flowering care', 'Disease prevention', 'Grain development'] },
          { name: 'Maturation & Harvesting', duration: 10, actions: ['Maturity assessment', 'Harvesting', 'Post-harvest handling'] }
        ]
      },
      // Default template for other crops
      default: {
        stages: [
          { name: 'Land Preparation', duration: 7, actions: ['Soil testing', 'Land clearing', 'Plowing', 'Fertilizer application'] },
          { name: 'Seed Preparation & Planting', duration: 3, actions: ['Seed treatment', 'Sowing', 'Initial watering'] },
          { name: 'Germination & Early Growth', duration: 14, actions: ['Daily monitoring', 'Weed control', 'Light irrigation'] },
          { name: 'Vegetative Growth', duration: 30, actions: ['Regular irrigation', 'Fertilizer application', 'Pest monitoring'] },
          { name: 'Flowering & Fruit Development', duration: 21, actions: ['Pollination support', 'Disease prevention', 'Nutrient management'] },
          { name: 'Maturation', duration: 14, actions: ['Reduce irrigation', 'Monitor ripeness', 'Harvest preparation'] },
          { name: 'Harvesting', duration: 7, actions: ['Timely harvesting', 'Proper handling', 'Storage preparation'] }
        ]
      }
    };

    const template = cropStageTemplates[cropName.toLowerCase() as keyof typeof cropStageTemplates] || cropStageTemplates.default;
    
    let currentDay = 0;
    return template.stages.map((stage, index) => {
      const stageData: CropStage = {
        id: `stage_${index + 1}`,
        name: stage.name,
        duration: stage.duration,
        startDay: currentDay,
        endDay: currentDay + stage.duration - 1,
        description: this.getStageDescription(stage.name, cropName, farmData),
        tasks: [],
        criticalActions: stage.actions,
        expectedOutcome: this.getExpectedOutcome(stage.name, cropName, farmData),
        weatherConsiderations: this.getWeatherConsiderations(stage.name, farmData?.location, farmData?.climate),
        riskFactors: this.getRiskFactors(stage.name, farmData?.location, farmData?.soilType),
      };
      
      currentDay += stage.duration;
      return stageData;
    });
  }

  private getStageDescription(stageName: string, cropName: string, farmData?: FarmData): string {
    const descriptions: { [key: string]: string } = {
      'Land Preparation': `Prepare ${farmData?.size || 'your'} hectares of ${farmData?.soilType || 'soil'} for ${cropName} cultivation in ${farmData?.location || 'your area'}`,
      'Seed Preparation & Sowing': `Plant ${cropName} seeds using ${farmData?.irrigationSystem || 'appropriate irrigation'} system`,
      'Vegetative Growth': `Monitor ${cropName} growth with focus on ${farmData?.soilType || 'soil'} conditions and ${farmData?.climate || 'local'} climate`,
      'Reproductive Phase': `Critical flowering and fruit development stage for ${cropName} in ${farmData?.location || 'your location'}`,
      'Maturation': `Final maturation phase before harvesting ${cropName} from ${farmData?.size || 'your'} hectares`,
      'Harvesting': `Harvest mature ${cropName} and prepare for storage`
    };
    
    return descriptions[stageName] || `${stageName} stage for ${cropName} cultivation`;
  }

  private createIrrigationPlan(cropName: string, farmData: FarmData): IrrigationPlan {
    const baseSchedule: IrrigationSchedule[] = [
      {
        stage: 'Germination',
        frequency: 'Daily',
        amount: '10-15mm',
        timing: 'Early morning',
        notes: ['Light, frequent watering', 'Avoid waterlogging']
      },
      {
        stage: 'Vegetative Growth',
        frequency: 'Every 2-3 days',
        amount: '20-25mm',
        timing: 'Early morning or evening',
        notes: ['Deep watering', 'Check soil moisture']
      },
      {
        stage: 'Flowering',
        frequency: 'Every 2 days',
        amount: '25-30mm',
        timing: 'Early morning',
        notes: ['Critical water needs', 'Avoid water stress']
      },
      {
        stage: 'Maturation',
        frequency: 'Every 3-4 days',
        amount: '15-20mm',
        timing: 'Early morning',
        notes: ['Reduce frequency', 'Monitor soil moisture']
      }
    ];

    return {
      frequency: 'Variable by stage',
      amount: 'Stage-dependent',
      method: farmData.irrigationSystem,
      schedule: baseSchedule,
      seasonalAdjustments: [
        'Increase frequency during hot weather',
        'Reduce during rainy season',
        'Monitor soil moisture regularly'
      ]
    };
  }

  private createPesticideRecommendations(cropName: string): PesticideRecommendation[] {
    return [
      {
        name: 'Neem Oil',
        type: 'organic',
        applicationStage: ['Vegetative Growth', 'Flowering'],
        dosage: '2-3ml per liter',
        frequency: 'Weekly',
        safetyPrecautions: ['Apply in evening', 'Wear protective gear'],
        alternatives: ['Soap solution', 'Garlic spray']
      },
      {
        name: 'Copper Fungicide',
        type: 'fungicide',
        applicationStage: ['Early Growth', 'Flowering'],
        dosage: '2g per liter',
        frequency: 'Bi-weekly',
        safetyPrecautions: ['Avoid during flowering for pollinators', 'Follow label instructions'],
        alternatives: ['Baking soda solution', 'Milk spray']
      }
    ];
  }

  private generateTasksFromStages(stages: CropStage[], plantingDate: Date): CropTask[] {
    const tasks: CropTask[] = [];
    
    stages.forEach(stage => {
      stage.criticalActions.forEach((action, index) => {
        const taskDate = new Date(plantingDate.getTime() + (stage.startDay + index) * 24 * 60 * 60 * 1000);
        
        tasks.push({
          id: `task_${stage.id}_${index}`,
          title: action,
          description: `${action} during ${stage.name} stage`,
          priority: index === 0 ? 'high' : 'medium',
          category: this.categorizeTask(action),
          dueDate: taskDate,
          estimatedTime: this.estimateTaskTime(action),
          resources: this.getTaskResources(action),
          completed: false,
          reminders: [
            {
              id: `reminder_${stage.id}_${index}`,
              type: 'before',
              message: `Reminder: ${action} is due tomorrow`,
              daysOffset: 1
            }
          ]
        });
      });
    });

    return tasks;
  }

  private createMilestones(stages: CropStage[], plantingDate: Date): Milestone[] {
    return stages.map((stage, index) => ({
      id: `milestone_${stage.id}`,
      name: `Complete ${stage.name}`,
      targetDate: new Date(plantingDate.getTime() + stage.endDay * 24 * 60 * 60 * 1000),
      description: stage.expectedOutcome,
      completed: false,
      importance: index === 0 || index === stages.length - 1 ? 'critical' : 'important'
    }));
  }

  private createDefaultCropJourney(farmData: FarmData, cropName: string): CropJourney {
    const now = new Date();
    const plantingDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const stages = this.createCropStages(cropName, '');
    const totalDuration = 90; // Default 90 days
    
    return {
      id: `journey_${Date.now()}`,
      farmId: farmData.id,
      cropName,
      variety: 'Standard',
      plantingDate,
      expectedHarvestDate: new Date(plantingDate.getTime() + totalDuration * 24 * 60 * 60 * 1000),
      totalDuration,
      currentStage: stages[0]?.id || 'preparation',
      progress: 0,
      stages,
      irrigationPlan: this.createIrrigationPlan(cropName, farmData),
      pesticideRecommendations: this.createPesticideRecommendations(cropName),
      overallTasks: this.generateTasksFromStages(stages, plantingDate),
      milestones: this.createMilestones(stages, plantingDate),
      weatherAlerts: [],
      createdAt: now,
      updatedAt: now
    };
  }

  // Helper methods
  private getCropVariety(cropName: string): string {
    const varieties: { [key: string]: string } = {
      'rice': 'Basmati',
      'wheat': 'Durum',
      'corn': 'Sweet Corn',
      'tomato': 'Roma',
      'potato': 'Russet'
    };
    return varieties[cropName.toLowerCase()] || 'Standard';
  }

  private getExpectedOutcome(stageName: string, cropName: string, farmData?: FarmData): string {
    const outcomes: { [key: string]: string } = {
      'Land Preparation': `Well-prepared, fertile ${farmData?.soilType || 'soil'} ready for ${cropName} planting`,
      'Seed Preparation & Sowing': `Seeds properly planted with optimal spacing for ${cropName}`,
      'Vegetative Growth': `Strong, healthy ${cropName} plants with good leaf development in ${farmData?.location || 'your area'}`,
      'Reproductive Phase': `Successful flowering and fruit development for ${cropName} in ${farmData?.location || 'your location'}`,
      'Maturation': `Fully mature ${cropName} ready for harvest from ${farmData?.size || 'your'} hectares`,
      'Harvesting': `Maximum yield with quality ${cropName} produce`
    };
    return outcomes[stageName] || `Successful completion of ${stageName} stage for ${cropName}`;
  }

  private getWeatherConsiderations(stageName: string, location?: string, climate?: string): string[] {
    const considerations: { [key: string]: string[] } = {
      'Land Preparation': ['Avoid working in wet soil', 'Check weather forecast for dry period'],
      'Seed Preparation & Sowing': ['Plant after last frost', 'Ensure adequate soil moisture'],
      'Vegetative Growth': ['Provide shade during heat waves', 'Ensure adequate water'],
      'Reproductive Phase': ['Protect from strong winds', 'Avoid water stress'],
      'Maturation': ['Monitor for rain before harvest', 'Protect from hail'],
      'Harvesting': ['Choose dry weather for harvesting', 'Avoid harvesting in rain']
    };
    
    if (location && climate) {
      considerations['Land Preparation'].push(`Consider ${climate} climate in ${location} for land preparation`);
      considerations['Vegetative Growth'].push(`Monitor temperature and humidity in ${location} during vegetative growth`);
      considerations['Reproductive Phase'].push(`Protect from extreme weather conditions in ${location} during reproductive phase`);
    }
    
    return considerations[stageName] || ['Monitor weather conditions'];
  }

  private getRiskFactors(stageName: string, location?: string, soilType?: string): string[] {
    const risks: { [key: string]: string[] } = {
      'Land Preparation': ['Soil compaction', 'Nutrient depletion'],
      'Seed Preparation & Sowing': ['Poor germination', 'Pest damage to seeds'],
      'Vegetative Growth': ['Nutrient deficiency', 'Pest infestation'],
      'Reproductive Phase': ['Poor pollination', 'Disease outbreak'],
      'Maturation': ['Overripening', 'Weather damage'],
      'Harvesting': ['Harvest losses', 'Quality deterioration']
    };
    
    if (location && soilType) {
      risks['Land Preparation'].push(`Soil erosion risk in ${location} with ${soilType} soil`);
      risks['Vegetative Growth'].push(`Soil-borne diseases in ${location} with ${soilType} soil`);
      risks['Reproductive Phase'].push(`Pest and disease risks in ${location} during reproductive phase`);
    }
    
    return risks[stageName] || ['General crop risks'];
  }

  private categorizeTask(action: string): CropTask['category'] {
    const keywords: { [key: string]: CropTask['category'] } = {
      'water': 'irrigation',
      'irrigat': 'irrigation',
      'fertil': 'fertilization',
      'pest': 'pest_control',
      'spray': 'pest_control',
      'monitor': 'monitoring',
      'harvest': 'harvesting',
      'soil': 'soil_management',
      'plow': 'soil_management'
    };

    const actionLower = action.toLowerCase();
    for (const [keyword, category] of Object.entries(keywords)) {
      if (actionLower.includes(keyword)) {
        return category;
      }
    }
    return 'monitoring';
  }

  private estimateTaskTime(action: string): string {
    const timeEstimates: { [key: string]: string } = {
      'soil testing': '1-2 hours',
      'plowing': '4-6 hours',
      'sowing': '2-4 hours',
      'irrigation': '30-60 minutes',
      'fertilizer application': '1-2 hours',
      'pest monitoring': '30-45 minutes',
      'harvesting': '6-8 hours'
    };

    const actionLower = action.toLowerCase();
    for (const [task, time] of Object.entries(timeEstimates)) {
      if (actionLower.includes(task)) {
        return time;
      }
    }
    return '1-2 hours';
  }

  private getTaskResources(action: string): string[] {
    const resources: { [key: string]: string[] } = {
      'plowing': ['Tractor/Plow', 'Fuel'],
      'sowing': ['Seeds', 'Seeder/Manual tools'],
      'irrigation': ['Water', 'Irrigation equipment'],
      'fertilizer': ['Fertilizer', 'Spreader'],
      'pest control': ['Pesticide', 'Sprayer', 'Protective gear'],
      'harvesting': ['Harvesting tools', 'Storage containers']
    };

    const actionLower = action.toLowerCase();
    for (const [task, resourceList] of Object.entries(resources)) {
      if (actionLower.includes(task)) {
        return resourceList;
      }
    }
    return ['Basic farming tools'];
  }

  // Public methods
  async createCropJourney(farmData: FarmData, cropName: string): Promise<CropJourney> {
    return await this.generateCropJourneyPlan(farmData, cropName);
  }

  async updateTaskStatus(journeyId: string, taskId: string, completed: boolean): Promise<void> {
    // Implementation for updating task status in database
    console.log(`Updating task ${taskId} in journey ${journeyId} to ${completed ? 'completed' : 'pending'}`);
  }

  async updateStageProgress(journeyId: string, stageId: string, progress: number): Promise<void> {
    // Implementation for updating stage progress
    console.log(`Updating stage ${stageId} progress to ${progress}%`);
  }

  async addWeatherAlert(journeyId: string, alert: WeatherAlert): Promise<void> {
    // Implementation for adding weather alerts
    console.log(`Adding weather alert for journey ${journeyId}:`, alert);
  }

  getUpcomingTasks(journey: CropJourney, days: number = 7): CropTask[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return journey.overallTasks.filter(task => 
      !task.completed && 
      task.dueDate >= now && 
      task.dueDate <= futureDate
    ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  getOverdueTasks(journey: CropJourney): CropTask[] {
    const now = new Date();
    return journey.overallTasks.filter(task => 
      !task.completed && task.dueDate < now
    );
  }

  calculateJourneyProgress(journey: CropJourney): number {
    const completedTasks = journey.overallTasks.filter(task => task.completed).length;
    const totalTasks = journey.overallTasks.length;
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }
}

export const agriBuddyService = new AgriBuddyService();
export default agriBuddyService;
