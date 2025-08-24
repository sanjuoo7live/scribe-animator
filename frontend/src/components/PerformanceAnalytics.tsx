import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import './PerformanceAnalytics.css';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  description: string;
  trend: 'up' | 'down' | 'stable';
  history: number[];
}

interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
  category: 'rendering' | 'memory' | 'animation' | 'assets';
  action: () => void;
}

const PerformanceAnalytics: React.FC = () => {
  const { currentProject } = useAppStore();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('1h');

  useEffect(() => {
    // Generate performance metrics based on current project
    if (currentProject) {
      const generatedMetrics: PerformanceMetric[] = [
        {
          id: 'render-time',
          name: 'Render Time',
          value: calculateRenderTime(currentProject),
          unit: 'ms',
          status: calculateRenderTime(currentProject) > 100 ? 'warning' : 'good',
          description: 'Average time to render a single frame',
          trend: 'stable',
          history: generateHistoryData()
        },
        {
          id: 'memory-usage',
          name: 'Memory Usage',
          value: calculateMemoryUsage(currentProject),
          unit: 'MB',
          status: calculateMemoryUsage(currentProject) > 500 ? 'critical' : 'good',
          description: 'Current memory consumption',
          trend: 'up',
          history: generateHistoryData()
        },
        {
          id: 'fps',
          name: 'Actual FPS',
          value: currentProject.fps * 0.95, // Simulate slightly lower actual FPS
          unit: 'fps',
          status: currentProject.fps * 0.95 < currentProject.fps * 0.9 ? 'warning' : 'good',
          description: 'Current frames per second during playback',
          trend: 'stable',
          history: generateHistoryData()
        },
        {
          id: 'objects-count',
          name: 'Active Objects',
          value: currentProject.objects.length,
          unit: 'objects',
          status: currentProject.objects.length > 50 ? 'warning' : 'good',
          description: 'Number of objects in the scene',
          trend: currentProject.objects.length > 10 ? 'up' : 'stable',
          history: generateHistoryData()
        },
        {
          id: 'animation-complexity',
          name: 'Animation Complexity',
          value: calculateAnimationComplexity(currentProject),
          unit: 'score',
          status: calculateAnimationComplexity(currentProject) > 7 ? 'warning' : 'good',
          description: 'Complexity score based on animations and effects',
          trend: 'stable',
          history: generateHistoryData()
        }
      ];

      setMetrics(generatedMetrics);

      // Generate optimization suggestions
      const generatedSuggestions: OptimizationSuggestion[] = [];

      if (currentProject.objects.length > 20) {
        generatedSuggestions.push({
          id: 'reduce-objects',
          title: 'Reduce Object Count',
          description: 'Consider combining similar objects or using sprite sheets to reduce complexity',
          impact: 'medium',
          effort: 'moderate',
          category: 'rendering',
          action: () => alert('Object reduction tools would be implemented here')
        });
      }

      if (calculateRenderTime(currentProject) > 80) {
        generatedSuggestions.push({
          id: 'optimize-rendering',
          title: 'Optimize Rendering',
          description: 'Enable GPU acceleration and use simpler animation curves',
          impact: 'high',
          effort: 'easy',
          category: 'rendering',
          action: () => alert('Rendering optimization applied')
        });
      }

      if (calculateMemoryUsage(currentProject) > 300) {
        generatedSuggestions.push({
          id: 'optimize-memory',
          title: 'Optimize Memory Usage',
          description: 'Compress large assets and enable texture streaming',
          impact: 'high',
          effort: 'moderate',
          category: 'memory',
          action: () => alert('Memory optimization applied')
        });
      }

      setSuggestions(generatedSuggestions);
    }
  }, [currentProject]);

  const calculateRenderTime = (project: any): number => {
    // Simulate render time calculation based on complexity
    const baseTime = 30;
    const objectPenalty = project.objects.length * 2;
    const durationPenalty = project.duration * 0.5;
    return Math.round(baseTime + objectPenalty + durationPenalty + Math.random() * 20);
  };

  const calculateMemoryUsage = (project: any): number => {
    // Simulate memory usage calculation
    const baseMemory = 50;
    const objectMemory = project.objects.length * 15;
    const durationMemory = project.duration * 2;
    return Math.round(baseMemory + objectMemory + durationMemory + Math.random() * 50);
  };

  const calculateAnimationComplexity = (project: any): number => {
    // Calculate complexity score based on animations
    let score = 0;
    project.objects.forEach((obj: any) => {
      if (obj.animationType !== 'none') score += 1;
      if (obj.animationDuration > 5) score += 0.5;
    });
    return Math.min(10, Math.round(score + Math.random() * 2));
  };

  const generateHistoryData = (): number[] => {
    return Array.from({ length: 20 }, () => Math.random() * 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good': return '#28a745';
      case 'warning': return '#ffc107';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    // In a real app, this would start actual performance monitoring
    setTimeout(() => {
      setIsMonitoring(false);
      alert('Performance monitoring completed! Data has been collected for analysis.');
    }, 3000);
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      project: currentProject?.name,
      metrics: metrics.map(m => ({ name: m.name, value: m.value, unit: m.unit, status: m.status })),
      suggestions: suggestions.length,
      overallScore: metrics.reduce((acc, m) => acc + (m.status === 'good' ? 100 : m.status === 'warning' ? 70 : 40), 0) / metrics.length
    };
    
    console.log('Performance Report:', report);
    alert(`Performance report exported!\nOverall Score: ${Math.round(report.overallScore)}/100\nSuggestions: ${report.suggestions}`);
  };

  if (!currentProject) {
    return (
      <div className="performance-analytics">
        <div className="no-project">
          <h3>📊 Performance Analytics</h3>
          <p>Please load a project to view performance analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-analytics">
      <div className="analytics-header">
        <h3>📊 Performance Analytics</h3>
        <div className="header-controls">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="time-range-selector"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button 
            onClick={startMonitoring} 
            disabled={isMonitoring}
            className="monitor-btn"
          >
            {isMonitoring ? '🔄 Monitoring...' : '🎯 Start Monitor'}
          </button>
          <button onClick={exportReport} className="export-btn">
            📤 Export Report
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        {metrics.map(metric => (
          <div key={metric.id} className="metric-card">
            <div className="metric-header">
              <h4>{metric.name}</h4>
              <div className="metric-trend">
                <span className="trend-icon">{getTrendIcon(metric.trend)}</span>
                <span 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(metric.status) }}
                ></span>
              </div>
            </div>
            
            <div className="metric-value">
              <span className="value">{metric.value}</span>
              <span className="unit">{metric.unit}</span>
            </div>
            
            <div className="metric-description">
              {metric.description}
            </div>

            <div className="metric-chart">
              <div className="mini-chart">
                {metric.history.slice(-10).map((value, index) => (
                  <div 
                    key={index} 
                    className="chart-bar"
                    style={{ 
                      height: `${(value / 100) * 40}px`,
                      backgroundColor: getStatusColor(metric.status)
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="suggestions-section">
        <h3>💡 Optimization Suggestions</h3>
        
        {suggestions.length === 0 ? (
          <div className="no-suggestions">
            <div className="success-icon">✅</div>
            <h4>Great Performance!</h4>
            <p>Your project is well-optimized. No immediate suggestions available.</p>
          </div>
        ) : (
          <div className="suggestions-list">
            {suggestions.map(suggestion => (
              <div key={suggestion.id} className="suggestion-card">
                <div className="suggestion-header">
                  <h4>{suggestion.title}</h4>
                  <div className="suggestion-badges">
                    <span 
                      className="impact-badge"
                      style={{ backgroundColor: getImpactColor(suggestion.impact) }}
                    >
                      {suggestion.impact} impact
                    </span>
                    <span className="effort-badge">
                      {suggestion.effort} effort
                    </span>
                    <span className="category-badge">
                      {suggestion.category}
                    </span>
                  </div>
                </div>
                
                <p className="suggestion-description">
                  {suggestion.description}
                </p>
                
                <button 
                  onClick={suggestion.action}
                  className="apply-suggestion-btn"
                >
                  ⚡ Apply Optimization
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="project-overview">
        <h3>📋 Project Overview</h3>
        <div className="overview-stats">
          <div className="stat-item">
            <span className="stat-label">Project Name:</span>
            <span className="stat-value">{currentProject.name}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{currentProject.duration}s</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Objects:</span>
            <span className="stat-value">{currentProject.objects.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Target FPS:</span>
            <span className="stat-value">{currentProject.fps}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Resolution:</span>
            <span className="stat-value">{currentProject.width}x{currentProject.height}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Estimated Export Time:</span>
            <span className="stat-value">~{Math.ceil(currentProject.duration * 0.8)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
