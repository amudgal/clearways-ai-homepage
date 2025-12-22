import { useMemo, useState } from 'react';
import { Calendar, CalendarDays, FileText, Target, Link2 } from 'lucide-react';

interface TimelinePhase {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  milestones: string[];
  dependencies?: string[];
}

interface GanttChartProps {
  phases: TimelinePhase[];
  onPhaseClick?: (phaseId: string) => void;
}

export default function GanttChart({ phases, onPhaseClick }: GanttChartProps) {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Calculate chart dimensions and positions
  const chartData = useMemo(() => {
    if (phases.length === 0) return { minDate: new Date(), maxDate: new Date(), phasePositions: [] };

    // Find min and max dates
    const dates = phases
      .filter((p) => p.startDate && p.endDate)
      .flatMap((p) => [new Date(p.startDate), new Date(p.endDate)]);
    
    if (dates.length === 0) return { minDate: new Date(), maxDate: new Date(), phasePositions: [] };

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    
    // Set to start of month for min, end of month for max
    minDate.setDate(1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    maxDate.setDate(0);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const months: { month: string; days: number }[] = [];
    
    let currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.toLocaleString('default', { month: 'short' });
      const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
      months.push({ month: `${month} ${year}`, days: daysInMonth });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Calculate positions for each phase
    const phasePositions = phases
      .filter((p) => p.startDate && p.endDate)
      .map((phase) => {
        const start = new Date(phase.startDate);
        const end = new Date(phase.endDate);
        const startOffset = Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const percentageStart = (startOffset / totalDays) * 100;
        const percentageWidth = (duration / totalDays) * 100;

        return {
          phase,
          startOffset,
          duration,
          percentageStart: Math.max(0, percentageStart),
          percentageWidth: Math.min(100 - percentageStart, percentageWidth),
        };
      });

    return { minDate, maxDate, totalDays, months, phasePositions };
  }, [phases]);

  // Use TCO theme colors with gradients for better visibility - using inline styles for better browser support
  const getGradientStyle = (idx: number) => {
    const gradients = [
      { from: '#17A2B8', to: '#138C9E' },           // Primary cyan gradient
      { from: '#06b6d4', to: '#0891b2' },           // Cyan gradient
      { from: '#14b8a6', to: '#0d9488' },            // Teal gradient
      { from: '#17A2B8', to: '#06b6d4' },            // Mixed gradient
      { from: '#22d3ee', to: '#06b6d4' },            // Lighter cyan gradient
      { from: '#2dd4bf', to: '#14b8a6' },            // Lighter teal gradient
      { from: '#0891b2', to: '#138C9E' },            // Darker gradient
      { from: '#0d9488', to: '#17A2B8' },            // Dark teal gradient
      { from: '#17A2B8', to: '#14b8a6' },            // Primary to teal
    ];
    const gradient = gradients[idx % gradients.length];
    return {
      background: `linear-gradient(to right, ${gradient.from}, ${gradient.to})`,
    };
  };

  if (phases.length === 0 || chartData.phasePositions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No phases with dates to display</p>
        <p className="text-sm text-gray-400 mt-2">Add phases with start and end dates to see the Gantt chart</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 overflow-x-auto shadow-sm">
      <div className="min-w-[800px]">
        {/* Header with month labels */}
        <div className="mb-4">
          <div className="flex border-b-2 border-[#17A2B8]/30">
            <div className="w-48 flex-shrink-0 border-r border-[#17A2B8]/20 p-2 font-semibold text-[#17A2B8]">
              Phase
            </div>
            <div className="flex-1">
              <div className="flex">
                {chartData.months?.map((month, idx) => (
                  <div
                    key={idx}
                    className="flex-1 border-r border-gray-200 p-2 text-center text-sm font-medium text-gray-700"
                    style={{ minWidth: `${(month.days / chartData.totalDays) * 100}%` }}
                  >
                    {month.month}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Phase rows */}
        <div className="space-y-2">
          {chartData.phasePositions.map((pos, idx) => {
            const phase = pos.phase;
            const hasDependencies = phase.dependencies && phase.dependencies.length > 0;

            return (
              <div key={phase.id} className="relative">
                <div className="flex items-center h-16 border-b border-gray-100 hover:bg-[#17A2B8]/5 transition-colors">
                  {/* Phase name column */}
                  <div
                    className="w-48 flex-shrink-0 border-r border-[#17A2B8]/20 p-2 cursor-pointer hover:bg-[#17A2B8]/5 transition-colors"
                    onClick={() => onPhaseClick?.(phase.id)}
                  >
                    <div className="font-medium text-gray-900 text-sm">{phase.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Timeline bar area */}
                  <div className="flex-1 relative h-full bg-gray-50" style={{ zIndex: 1 }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 flex" style={{ zIndex: 0 }}>
                      {chartData.months?.map((_, monthIdx) => (
                        <div
                          key={monthIdx}
                          className="flex-1 border-r border-[#17A2B8]/10"
                          style={{ minWidth: `${(chartData.months[monthIdx].days / chartData.totalDays) * 100}%` }}
                        />
                      ))}
                    </div>

                    {/* Phase bar */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-10 rounded-md shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all flex items-center px-3 text-white text-xs font-semibold border-2 border-white/30"
                      style={{
                        left: `${pos.percentageStart}%`,
                        width: `${pos.percentageWidth}%`,
                        minWidth: '4px',
                        zIndex: 10,
                        position: 'absolute',
                        ...getGradientStyle(idx),
                      }}
                      onClick={() => onPhaseClick?.(phase.id)}
                      onMouseEnter={(e) => {
                        setHoveredPhase(phase.id);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredPhase(null);
                        setTooltipPosition(null);
                      }}
                    >
                      <span className="truncate drop-shadow-sm">{phase.title}</span>
                    </div>

                    {/* Dependencies arrows */}
                    {hasDependencies &&
                      phase.dependencies!.map((depId) => {
                        const depPhase = chartData.phasePositions.find((p) => p.phase.id === depId);
                        if (!depPhase) return null;

                        const depEnd = depPhase.percentageStart + depPhase.percentageWidth;
                        const currentStart = pos.percentageStart;
                        const arrowStart = Math.min(depEnd, 100);
                        const arrowEnd = Math.max(currentStart, 0);
                        const arrowWidth = arrowEnd - arrowStart;

                        if (arrowWidth <= 0) return null;

                        return (
                          <div
                            key={depId}
                            className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[#17A2B8]"
                            style={{
                              left: `${arrowStart}%`,
                              width: `${arrowWidth}%`,
                            }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-[#17A2B8] border-t-2 border-t-transparent border-b-2 border-b-transparent" />
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Milestones indicator */}
                {phase.milestones && phase.milestones.length > 0 && (
                  <div className="ml-48 pl-2 text-xs text-gray-500 mt-1">
                    {phase.milestones.length} milestone{phase.milestones.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-[#17A2B8]/20">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#17A2B8] rounded"></div>
              <span className="text-[#17A2B8] font-medium">Phase Timeline</span>
            </div>
            {chartData.phasePositions.some((p) => p.phase.dependencies && p.phase.dependencies.length > 0) && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#17A2B8]"></div>
                <span className="text-[#17A2B8] font-medium">Dependencies</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover Tooltip Card */}
      {hoveredPhase && tooltipPosition && (() => {
        const phase = phases.find((p) => p.id === hoveredPhase);
        if (!phase) return null;

        const startDate = phase.startDate ? new Date(phase.startDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Not set';
        const endDate = phase.endDate ? new Date(phase.endDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Not set';
        
        const duration = phase.startDate && phase.endDate 
          ? Math.ceil((new Date(phase.endDate).getTime() - new Date(phase.startDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const dependentPhases = phase.dependencies 
          ? phases.filter((p) => phase.dependencies!.includes(p.id)).map((p) => p.title)
          : [];

        return (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-[#17A2B8] p-6 max-w-md"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              marginTop: '-10px',
            }}
            onMouseEnter={() => setHoveredPhase(hoveredPhase)}
            onMouseLeave={() => {
              setHoveredPhase(null);
              setTooltipPosition(null);
            }}
          >
            {/* Arrow pointing down */}
            <div
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-[#17A2B8]"
            />
            
            {/* Header */}
            <div className="mb-4 pb-3 border-b border-[#17A2B8]/20">
              <h3 className="text-xl font-bold text-[#17A2B8] mb-1">{phase.title}</h3>
              {phase.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{phase.description}</p>
              )}
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              {/* Dates */}
              <div className="flex items-start gap-3">
                <CalendarDays className="w-5 h-5 text-[#17A2B8] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">Timeline</div>
                  <div className="text-sm font-medium text-gray-900">
                    {startDate} → {endDate}
                  </div>
                  {duration !== null && (
                    <div className="text-xs text-gray-500 mt-1">
                      Duration: {duration} day{duration !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Milestones */}
              {phase.milestones && phase.milestones.length > 0 && phase.milestones.some(m => m.trim()) && (
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-[#17A2B8] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Milestones</div>
                    <ul className="text-sm text-gray-900 space-y-1">
                      {phase.milestones.filter(m => m.trim()).map((milestone, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#17A2B8] mt-1">•</span>
                          <span>{milestone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {dependentPhases.length > 0 && (
                <div className="flex items-start gap-3">
                  <Link2 className="w-5 h-5 text-[#17A2B8] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Depends On</div>
                    <div className="text-sm text-gray-900">
                      {dependentPhases.map((dep, idx) => (
                        <span key={idx}>
                          {dep}
                          {idx < dependentPhases.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Instances */}
              {phase.instances && phase.instances.length > 0 && phase.instances.some(i => i.trim()) && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#17A2B8] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Instances</div>
                    <div className="text-sm text-gray-900">
                      {phase.instances.filter(i => i.trim()).map((instance, idx) => (
                        <span key={idx}>
                          {instance}
                          {idx < phase.instances!.filter(i => i.trim()).length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

