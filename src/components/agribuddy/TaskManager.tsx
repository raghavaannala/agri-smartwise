import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Droplets, 
  Leaf, 
  MapPin, 
  Sprout, 
  Target, 
  AlertTriangle,
  Bell,
  Filter,
  Search,
  Zap,
  User,
  Timer
} from 'lucide-react';
import { CropJourney, CropTask } from '@/services/agriBuddyService';

interface TaskManagerProps {
  journey: CropJourney;
  onTaskComplete: (taskId: string) => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ journey, onTaskComplete }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    let tasks = journey.overallTasks;

    // Status filter
    if (activeFilter === 'pending') {
      tasks = tasks.filter(task => !task.completed && task.dueDate >= new Date());
    } else if (activeFilter === 'completed') {
      tasks = tasks.filter(task => task.completed);
    } else if (activeFilter === 'overdue') {
      tasks = tasks.filter(task => !task.completed && task.dueDate < new Date());
    }

    // Category filter
    if (categoryFilter !== 'all') {
      tasks = tasks.filter(task => task.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      tasks = tasks.filter(task => task.priority === priorityFilter);
    }

    return tasks.sort((a, b) => {
      // Sort by due date, then by priority
      const dateCompare = a.dueDate.getTime() - b.dueDate.getTime();
      if (dateCompare !== 0) return dateCompare;
      
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [journey.overallTasks, activeFilter, categoryFilter, priorityFilter]);

  const taskStats = useMemo(() => {
    const all = journey.overallTasks;
    const completed = all.filter(task => task.completed);
    const pending = all.filter(task => !task.completed && task.dueDate >= new Date());
    const overdue = all.filter(task => !task.completed && task.dueDate < new Date());
    
    return {
      total: all.length,
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      completionRate: all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0
    };
  }, [journey.overallTasks]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'irrigation': return <Droplets className="h-4 w-4" />;
      case 'fertilization': return <Leaf className="h-4 w-4" />;
      case 'pest_control': return <Zap className="h-4 w-4" />;
      case 'monitoring': return <Target className="h-4 w-4" />;
      case 'harvesting': return <Sprout className="h-4 w-4" />;
      case 'soil_management': return <MapPin className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'irrigation': return 'bg-blue-100 text-blue-800';
      case 'fertilization': return 'bg-green-100 text-green-800';
      case 'pest_control': return 'bg-purple-100 text-purple-800';
      case 'monitoring': return 'bg-orange-100 text-orange-800';
      case 'harvesting': return 'bg-emerald-100 text-emerald-800';
      case 'soil_management': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (task: CropTask) => {
    return !task.completed && task.dueDate < new Date();
  };

  const getDaysUntilDue = (task: CropTask) => {
    const now = new Date();
    const diffTime = task.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return (
    <div className="space-y-6">
      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">{taskStats.total}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{taskStats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{taskStats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">{taskStats.overdue}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{taskStats.completionRate}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Task Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: taskStats.total },
                  { key: 'pending', label: 'Pending', count: taskStats.pending },
                  { key: 'completed', label: 'Completed', count: taskStats.completed },
                  { key: 'overdue', label: 'Overdue', count: taskStats.overdue }
                ].map(filter => (
                  <Button
                    key={filter.key}
                    variant={activeFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter.key as any)}
                    className="text-xs"
                  >
                    {filter.label} ({filter.count})
                  </Button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'irrigation', label: 'Irrigation' },
                  { key: 'fertilization', label: 'Fertilization' },
                  { key: 'pest_control', label: 'Pest Control' },
                  { key: 'monitoring', label: 'Monitoring' },
                  { key: 'harvesting', label: 'Harvesting' },
                  { key: 'soil_management', label: 'Soil Mgmt' }
                ].map(filter => (
                  <Button
                    key={filter.key}
                    variant={categoryFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(filter.key)}
                    className="text-xs"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'high', label: 'High' },
                  { key: 'medium', label: 'Medium' },
                  { key: 'low', label: 'Low' }
                ].map(filter => (
                  <Button
                    key={filter.key}
                    variant={priorityFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriorityFilter(filter.key)}
                    className="text-xs"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Tasks ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  task.completed 
                    ? 'bg-green-50 border-green-200' 
                    : isOverdue(task)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getCategoryIcon(task.category)}
                      <h3 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h3>
                      <Badge variant="outline" className={getCategoryColor(task.category)}>
                        {task.category.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>

                    <p className={`text-sm mb-3 ${task.completed ? 'text-gray-500' : 'text-gray-700'}`}>
                      {task.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {task.dueDate.toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {task.estimatedTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className={isOverdue(task) && !task.completed ? 'text-red-600 font-medium' : ''}>
                          {getDaysUntilDue(task)}
                        </span>
                      </div>
                    </div>

                    {task.resources.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">Resources needed:</div>
                        <div className="flex flex-wrap gap-1">
                          {task.resources.map((resource, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {!task.completed && (
                      <Button
                        size="sm"
                        onClick={() => onTaskComplete(task.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    
                    {task.completed && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    )}

                    {isOverdue(task) && !task.completed && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Overdue</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No tasks found</h3>
                <p className="text-sm">Try adjusting your filters to see more tasks.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskManager;
