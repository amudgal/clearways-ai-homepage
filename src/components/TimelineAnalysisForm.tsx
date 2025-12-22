import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, BarChart3, Check, Download } from 'lucide-react';
import GanttChart from './GanttChart';

interface TimelinePhase {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  milestones: string[];
  instances?: string[];
  dependencies?: string[]; // IDs of phases this phase depends on
}

interface Assumption {
  id: string;
  category: string;
  text: string;
}

interface MethodologyItem {
  id: string;
  title: string;
  description: string;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
}

interface TimelineAnalysisData {
  timeline: TimelinePhase[];
  assumptions: Assumption[];
  methodology: MethodologyItem[];
  qa: QAItem[];
  sectionHeaders?: {
    timeline?: string;
    assumptions?: string;
    methodology?: string;
    qa?: string;
  };
}

interface TimelineAnalysisFormProps {
  data?: TimelineAnalysisData;
  onSave: (data: TimelineAnalysisData) => void;
  onSaveToBackend?: (data: TimelineAnalysisData) => void;
  isEditMode?: boolean;
  isSaving?: boolean;
  onToggleEditMode?: () => void;
  onExportPDF?: () => void;
  analysisTitle?: string;
}

export default function TimelineAnalysisForm({ data, onSave, onSaveToBackend, isEditMode = false, isSaving = false, onToggleEditMode, onExportPDF, analysisTitle }: TimelineAnalysisFormProps) {
  const [timeline, setTimeline] = useState<TimelinePhase[]>(
    data?.timeline || [
      {
        id: 'phase0',
        title: 'PHASE 0 — FOUNDATION',
        startDate: '2025-10-01',
        endDate: '2026-02-28',
        description: 'Program charter approved, CMO formed, governance model locked, tooling baseline',
        milestones: ['Program charter approved', 'CMO formed', 'Governance model locked'],
        instances: [],
        dependencies: [],
      },
    ]
  );

  const [assumptions, setAssumptions] = useState<Assumption[]>(
    data?.assumptions || [
      {
        id: 'assumption1',
        category: 'Technical',
        text: 'One production cutover at a time',
      },
      {
        id: 'assumption2',
        category: 'Operational',
        text: 'Post-migration support is mandatory: Easy/Medium: 2–3 weeks, Hard: 4–6 weeks',
      },
    ]
  );

  const [methodology, setMethodology] = useState<MethodologyItem[]>(
    data?.methodology || [
      {
        id: 'method1',
        title: 'Risk-Weighted Sequencing',
        description: 'Instances classified as Easy / Medium / Hard. Difficulty deliberately interleaved.',
      },
      {
        id: 'method2',
        title: 'Canary-Driven Learning',
        description: 'Canary projects selected for pain, not convenience. Findings feed playbooks and estimates.',
      },
    ]
  );

  const [qa, setQa] = useState<QAItem[]>(
    data?.qa || [
      {
        id: 'qa1',
        question: 'Why does this run into 2027?',
        answer: 'Because compressing the hardest instances into late 2026 would either violate the December freeze or eliminate stabilization. Extending into early 2027 avoids customer risk and preserves predictable delivery.',
      },
    ]
  );

  // Removed edit state - all fields are always editable when isEditMode is true
  const [editingItems, setEditingItems] = useState<Record<string, boolean>>({});
  
  // Section headers state
  const [sectionHeaders, setSectionHeaders] = useState({
    timeline: data?.sectionHeaders?.timeline || 'COMPLETE END-TO-END TIMELINE (2026–2027)',
    assumptions: data?.sectionHeaders?.assumptions || 'EXPLICIT ASSUMPTIONS (WRITE THESE DOWN)',
    methodology: data?.sectionHeaders?.methodology || 'METHODOLOGY (HOW THIS PROGRAM ACTUALLY RUNS)',
    qa: data?.sectionHeaders?.qa || 'HARD LEADERSHIP Q&A (THE REAL ONES)',
  });

  // Update state when data prop changes (e.g., when loading saved analysis)
  useEffect(() => {
    if (data) {
      if (data.timeline && data.timeline.length > 0) {
        setTimeline(data.timeline);
      }
      if (data.assumptions && data.assumptions.length > 0) {
        setAssumptions(data.assumptions);
      }
      if (data.methodology && data.methodology.length > 0) {
        setMethodology(data.methodology);
      }
      if (data.qa && data.qa.length > 0) {
        setQa(data.qa);
      }
      if (data.sectionHeaders) {
        setSectionHeaders({
          timeline: data.sectionHeaders.timeline || 'COMPLETE END-TO-END TIMELINE (2026–2027)',
          assumptions: data.sectionHeaders.assumptions || 'EXPLICIT ASSUMPTIONS (WRITE THESE DOWN)',
          methodology: data.sectionHeaders.methodology || 'METHODOLOGY (HOW THIS PROGRAM ACTUALLY RUNS)',
          qa: data.sectionHeaders.qa || 'HARD LEADERSHIP Q&A (THE REAL ONES)',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.timeline, data?.assumptions, data?.methodology, data?.qa, data?.sectionHeaders]);

  const handleSave = async () => {
    // Prepare complete timeline data with all current state
    // This includes all phases, assumptions, methodology, Q&A, and section headers
    const completeData: TimelineAnalysisData = {
      timeline: timeline.map(phase => ({
        id: phase.id,
        title: phase.title || '',
        startDate: phase.startDate || '',
        endDate: phase.endDate || '',
        description: phase.description || '',
        milestones: phase.milestones ? [...phase.milestones] : [],
        instances: phase.instances ? [...phase.instances] : [],
        dependencies: phase.dependencies ? [...phase.dependencies] : [],
      })),
      assumptions: assumptions.map(assumption => ({
        id: assumption.id,
        category: assumption.category || '',
        text: assumption.text || '',
      })),
      methodology: methodology.map(method => ({
        id: method.id,
        title: method.title || '',
        description: method.description || '',
      })),
      qa: qa.map(item => ({
        id: item.id,
        question: item.question || '',
        answer: item.answer || '',
      })),
      sectionHeaders: {
        timeline: sectionHeaders.timeline || '',
        assumptions: sectionHeaders.assumptions || '',
        methodology: sectionHeaders.methodology || '',
        qa: sectionHeaders.qa || '',
      },
    };
    
    console.log('Saving timeline data:', completeData);
    
    // First update the local state in parent with complete data
    onSave(completeData);
    
    // Small delay to ensure state update is processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Then trigger backend save with the complete data
    if (onSaveToBackend) {
      onSaveToBackend(completeData);
    }
  };

  const addPhase = () => {
    const newPhase: TimelinePhase = {
      id: `phase-${Date.now()}`,
      title: 'New Phase',
      startDate: '',
      endDate: '',
      description: '',
      milestones: [],
      instances: [],
      dependencies: [],
    };
    setTimeline([...timeline, newPhase]);
  };

  const updatePhase = (id: string, updates: Partial<TimelinePhase>) => {
    setTimeline(timeline.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePhase = (id: string) => {
    setTimeline(timeline.filter((p) => p.id !== id));
  };

  const addMilestone = (phaseId: string) => {
    updatePhase(phaseId, {
      milestones: [...(timeline.find((p) => p.id === phaseId)?.milestones || []), ''],
    });
  };

  const updateMilestone = (phaseId: string, index: number, value: string) => {
    const phase = timeline.find((p) => p.id === phaseId);
    if (phase) {
      const newMilestones = [...phase.milestones];
      newMilestones[index] = value;
      updatePhase(phaseId, { milestones: newMilestones });
    }
  };

  const deleteMilestone = (phaseId: string, index: number) => {
    const phase = timeline.find((p) => p.id === phaseId);
    if (phase) {
      const newMilestones = phase.milestones.filter((_, i) => i !== index);
      updatePhase(phaseId, { milestones: newMilestones });
    }
  };

  const addAssumption = () => {
    const newAssumption: Assumption = {
      id: `assumption-${Date.now()}`,
      category: 'Technical',
      text: '',
    };
    setAssumptions([...assumptions, newAssumption]);
  };

  const updateAssumption = (id: string, updates: Partial<Assumption>) => {
    setAssumptions(assumptions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const deleteAssumption = (id: string) => {
    setAssumptions(assumptions.filter((a) => a.id !== id));
  };

  const addMethodology = () => {
    const newMethod: MethodologyItem = {
      id: `method-${Date.now()}`,
      title: '',
      description: '',
    };
    setMethodology([...methodology, newMethod]);
  };

  const updateMethodology = (id: string, updates: Partial<MethodologyItem>) => {
    setMethodology(methodology.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMethodology = (id: string) => {
    setMethodology(methodology.filter((m) => m.id !== id));
  };

  const addQA = () => {
    const newQA: QAItem = {
      id: `qa-${Date.now()}`,
      question: '',
      answer: '',
    };
    setQa([...qa, newQA]);
  };

  const updateQA = (id: string, updates: Partial<QAItem>) => {
    setQa(qa.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQA = (id: string) => {
    setQa(qa.filter((q) => q.id !== id));
  };

  return (
    <div className="space-y-12">
      {/* Report Header with Edit and Export Buttons */}
      <div className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] text-white rounded-lg shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black mb-2" style={{ fontSize: '50px' }}>{analysisTitle || 'Timeline Analysis Report'}</h1>
            <p className="text-[#17A2B8]/90 text-lg">Complete timeline estimation and project planning</p>
          </div>
          <div className="flex items-center gap-3">
            {onToggleEditMode && (
              <button
                onClick={onToggleEditMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isEditMode
                    ? 'bg-white text-[#17A2B8] hover:bg-gray-100'
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {isEditMode ? <X size={18} /> : <Edit2 size={18} />}
                {isEditMode ? 'Exit Edit' : 'Edit Report'}
              </button>
            )}
            {onExportPDF && (
              <button
                onClick={onExportPDF}
                className="flex items-center gap-2 bg-white text-[#17A2B8] hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <Download size={20} />
                Export Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gantt Chart Section */}
      <section className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6 text-[#17A2B8]" />
            <h3 className="text-gray-900 text-xl font-semibold">GANTT CHART VISUALIZATION</h3>
          </div>
          <p className="text-gray-600">
            Visual timeline showing all phases, their durations, and dependencies. The chart updates automatically as you edit phases.
          </p>
        </div>
        <GanttChart
          key={`gantt-${timeline.length}-${timeline.map(p => `${p.id}-${p.startDate}-${p.endDate}`).join('-')}`}
          phases={timeline}
          onPhaseClick={(phaseId) => {
            // Scroll to phase when clicked (optional enhancement)
            const phaseElement = document.getElementById(`phase-${phaseId}`);
            if (phaseElement) {
              phaseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
        />
      </section>

      {/* Section 1: Complete End-to-End Timeline */}
      <section className="bg-white rounded-lg shadow-sm overflow-hidden border-2 border-[#17A2B8] mb-8" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', border: '2px solid #17A2B8' }}>
        <div className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] text-white px-6 py-4 rounded-t-lg mb-6" style={{ backgroundColor: '#17A2B8', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
          <div className="flex items-center justify-between gap-4">
            {isEditMode ? (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-white text-2xl font-bold flex-shrink-0">1.</span>
                <input
                  type="text"
                  value={sectionHeaders.timeline}
                  onChange={(e) => setSectionHeaders({ ...sectionHeaders, timeline: e.target.value })}
                  className="flex-1 text-xl font-bold text-white bg-white/20 border-2 border-white/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white placeholder:text-white/70 min-w-0"
                  placeholder="Section Header"
                  style={{ color: 'white' }}
                />
              </div>
            ) : (
              <h3 className="text-xl font-bold text-white flex-1 min-w-0 break-words" style={{ color: 'white', fontWeight: 'bold' }}>1. {sectionHeaders.timeline}</h3>
            )}
            {isEditMode && (
              <button
                onClick={addPhase}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#17A2B8] rounded-md hover:bg-gray-100 transition-colors text-sm flex-shrink-0"
                type="button"
              >
                <Plus size={16} />
                Add Phase
              </button>
            )}
          </div>
        </div>
        <div className="px-6">
          <p className="text-gray-600 mb-6">
            This timeline includes: Discovery, Upgrade probing via transient infra, CMC migration,
            Post-migration support, Documentation & handover, December freezes.
          </p>

          <div className="space-y-6 pb-6">
            {timeline.map((phase) => (
              <div key={phase.id} id={`phase-${phase.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[#17A2B8]/50 transition-colors mb-6">
                {/* Phase Header */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={phase.title}
                      onChange={(e) => updatePhase(phase.id, { title: e.target.value })}
                      className="w-full text-lg font-semibold text-gray-900 bg-white border-2 border-[#17A2B8] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                      placeholder="Phase Title / Header"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900 break-words">{phase.title}</h3>
                  )}
                </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {isEditMode ? (
                    <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={phase.startDate}
                          onChange={(e) => updatePhase(phase.id, { startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={phase.endDate}
                          onChange={(e) => updatePhase(phase.id, { endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                        />
                      </div>
                    </div>
                    <textarea
                      value={phase.description}
                      onChange={(e) => updatePhase(phase.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                      rows={3}
                      placeholder="Phase description"
                    />
                    {/* Dependencies */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Dependencies (Phases that must complete before this phase starts)
                      </label>
                      <div className="space-y-2">
                        {(phase.dependencies || []).filter((d) => d).map((depId, depIdx) => {
                          const depPhase = timeline.find((p) => p.id === depId);
                          return (
                            <div key={depIdx} className="flex items-center gap-2">
                              <select
                                value={depId}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const newDeps = [...(phase.dependencies || []).filter((d) => d)];
                                    newDeps[depIdx] = e.target.value;
                                    updatePhase(phase.id, { dependencies: newDeps });
                                  }
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">Select a phase...</option>
                                {timeline
                                  .filter((p) => p.id !== phase.id && !(phase.dependencies || []).includes(p.id))
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title}
                                    </option>
                                  ))}
                              </select>
                              <span className="text-sm text-gray-500">
                                {depPhase ? depPhase.title : 'Unknown'}
                              </span>
                              <button
                                onClick={() => {
                                  const newDeps = (phase.dependencies || []).filter((d, i) => i !== depIdx);
                                  updatePhase(phase.id, { dependencies: newDeps });
                                }}
                                className="p-2 text-red-600 hover:bg-gray-100 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                        {timeline.filter((p) => p.id !== phase.id && !(phase.dependencies || []).includes(p.id)).length > 0 && (
                          <button
                            onClick={() => {
                              const availablePhases = timeline.filter(
                                (p) => p.id !== phase.id && !(phase.dependencies || []).includes(p.id)
                              );
                              if (availablePhases.length > 0) {
                                const newDeps = [...(phase.dependencies || []).filter((d) => d), availablePhases[0].id];
                                updatePhase(phase.id, { dependencies: newDeps });
                              }
                            }}
                            className="text-sm text-[#17A2B8] hover:underline flex items-center gap-1"
                          >
                            <Plus size={14} />
                            Add Dependency
                          </button>
                        )}
                        {(phase.dependencies || []).filter((d) => d).length === 0 && (
                          <p className="text-sm text-gray-500 italic">No dependencies. This phase can start independently.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{phase.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {phase.startDate && phase.endDate
                          ? `${new Date(phase.startDate).toLocaleDateString()} - ${new Date(phase.endDate).toLocaleDateString()}`
                          : 'Dates not set'}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">{phase.description}</p>
                  </div>
                )}
                {isEditMode && (
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => deletePhase(phase.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete phase"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                </div>

                {/* Milestones */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Milestones</h4>
                    {isEditMode && (
                      <button
                        onClick={() => addMilestone(phase.id)}
                        className="text-sm text-[#17A2B8] hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Add Milestone
                      </button>
                    )}
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {phase.milestones.map((milestone, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        {isEditMode ? (
                          <>
                            <input
                              type="text"
                              value={milestone}
                              onChange={(e) => updateMilestone(phase.id, idx, e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              placeholder="Milestone description"
                            />
                            <button
                              onClick={() => deleteMilestone(phase.id, idx)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete milestone"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <span>{milestone || 'No milestone'}</span>
                        )}
                      </li>
                    ))}
                    {phase.milestones.length === 0 && !isEditMode && (
                      <li className="text-gray-400 italic">No milestones defined</li>
                    )}
                  </ul>
                </div>

                {/* Dependencies Display */}
                {!isEditMode && (phase.dependencies || []).filter((d) => d).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Dependencies</h4>
                    <div className="flex flex-wrap gap-2">
                      {phase.dependencies
                        .filter((d) => d)
                        .map((depId) => {
                          const dep = timeline.find((p) => p.id === depId);
                          return (
                            <span
                              key={depId}
                              className="px-3 py-1 bg-[#17A2B8]/10 text-[#17A2B8] rounded-full text-xs font-medium border border-[#17A2B8]/20"
                            >
                              {dep ? dep.title : 'Unknown'}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* Section 2: Methodology */}
      <section className="bg-white rounded-lg shadow-sm overflow-hidden border-2 border-[#17A2B8] mb-8" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', border: '2px solid #17A2B8' }}>
        <div className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] text-white px-6 py-4 rounded-t-lg mb-6" style={{ backgroundColor: '#17A2B8', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
          <div className="flex items-center justify-between gap-4">
            {isEditMode ? (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-white text-2xl font-bold flex-shrink-0">2.</span>
                <input
                  type="text"
                  value={sectionHeaders.methodology}
                  onChange={(e) => setSectionHeaders({ ...sectionHeaders, methodology: e.target.value })}
                  className="flex-1 text-xl font-bold text-white bg-white/20 border-2 border-white/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white placeholder:text-white/70 min-w-0"
                  placeholder="Section Header"
                  style={{ color: 'white' }}
                />
              </div>
            ) : (
              <h3 className="text-xl font-bold text-white flex-1 min-w-0 break-words" style={{ color: 'white', fontWeight: 'bold' }}>2. {sectionHeaders.methodology}</h3>
            )}
            {isEditMode && (
              <button
                onClick={addMethodology}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#17A2B8] rounded-md hover:bg-gray-100 transition-colors text-sm flex-shrink-0"
                type="button"
              >
                <Plus size={16} />
                Add Methodology
              </button>
            )}
          </div>
        </div>
        <div className="px-6">
          <p className="text-gray-600 mb-6">
            This is what makes the plan sturdy instead of theoretical.
          </p>

          <div className="space-y-4 pb-6">
            {methodology.map((method, index) => (
              <div key={method.id} className="flex gap-4 group bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[#17A2B8]/50 transition-colors p-4 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#17A2B8] text-white rounded-full flex items-center justify-center font-semibold">{index + 1}</div>
                <div className="flex-1 relative">
                  {isEditMode ? (
                    <>
                      <input
                        type="text"
                        value={method.title}
                        onChange={(e) => updateMethodology(method.id, { title: e.target.value })}
                        className="w-full text-gray-900 mb-1 border border-gray-300 rounded-md px-3 py-1 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                        placeholder="Methodology Title"
                        autoFocus
                      />
                      <div className="flex items-start gap-2">
                        <textarea
                          value={method.description}
                          onChange={(e) => updateMethodology(method.id, { description: e.target.value })}
                          className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                          rows={3}
                          placeholder="Description"
                        />
                        <div className="absolute top-0 right-0 flex gap-1">
                          <button
                            onClick={() => deleteMethodology(method.id)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete methodology"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-900 mb-1 pr-8 break-words">{method.title}</div>
                      <p className="text-sm text-gray-600 pr-8 break-words">{method.description}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Explicit Assumptions */}
      <section className="bg-white rounded-lg shadow-sm overflow-hidden border-2 border-purple-500 mb-8" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', border: '2px solid #a855f7' }}>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-t-lg mb-6" style={{ backgroundColor: '#a855f7', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
          <div className="flex items-center justify-between gap-4">
            {isEditMode ? (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-white text-2xl font-bold flex-shrink-0">3.</span>
                <input
                  type="text"
                  value={sectionHeaders.assumptions}
                  onChange={(e) => setSectionHeaders({ ...sectionHeaders, assumptions: e.target.value })}
                  className="flex-1 text-xl font-bold text-white bg-white/20 border-2 border-white/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white placeholder:text-white/70 min-w-0"
                  placeholder="Section Header"
                  style={{ color: 'white' }}
                />
              </div>
            ) : (
              <h3 className="text-xl font-bold text-white flex-1 min-w-0 break-words" style={{ color: 'white', fontWeight: 'bold' }}>3. {sectionHeaders.assumptions}</h3>
            )}
            {isEditMode && (
              <button
                onClick={addAssumption}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-purple-600 rounded-md hover:bg-gray-100 transition-colors text-sm flex-shrink-0"
                type="button"
              >
                <Plus size={16} />
                Add Assumption
              </button>
            )}
          </div>
        </div>
        <div className="px-6">
          <p className="text-gray-600 mb-6">
            If leadership disagrees with any of these, the plan must change.
          </p>

          <div className="space-y-6 pb-6">
            {Object.entries(
              assumptions.reduce((acc, assumption) => {
                const category = assumption.category;
                if (!acc[category]) acc[category] = [];
                acc[category].push(assumption);
                return acc;
              }, {} as Record<string, Assumption[]>)
            ).map(([category, items]) => (
              <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => {
                        // Update all assumptions in this category
                        const newCategory = e.target.value;
                        setAssumptions(assumptions.map(a => 
                          a.category === category ? { ...a, category: newCategory } : a
                        ));
                      }}
                      className="text-lg font-semibold text-gray-900 bg-white border-2 border-[#17A2B8] rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                      placeholder="Category Label"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900 break-words">{category}</h3>
                  )}
                </div>
                <ul className="space-y-4">
                  {items.map((assumption) => (
                    <li key={assumption.id} className="flex items-start gap-3 group">
                      <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                        {items.indexOf(assumption) + 1}
                      </div>
                      {isEditMode ? (
                        <div className="flex-1 space-y-2">
                          <select
                            value={assumption.category}
                            onChange={(e) => updateAssumption(assumption.id, { category: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                          >
                            <option value="Technical">Technical</option>
                            <option value="Operational">Operational</option>
                            <option value="Governance">Governance</option>
                            <option value="AI Accelerators">AI Accelerators</option>
                          </select>
                          <div className="flex items-start gap-2 relative">
                            <textarea
                              value={assumption.text}
                              onChange={(e) => updateAssumption(assumption.id, { text: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] pr-10"
                              rows={2}
                              placeholder="Assumption text"
                            />
                            <div className="absolute top-0 right-0 flex gap-1">
                              <button
                                onClick={() => deleteAssumption(assumption.id)}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete assumption"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1 break-words">{assumption.text}</div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Hard Leadership Q&A */}
      <section className="bg-white rounded-lg shadow-sm overflow-hidden border-2 border-[#17A2B8] mb-8" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', border: '2px solid #17A2B8' }}>
        <div className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] text-white px-6 py-4 rounded-t-lg mb-6" style={{ backgroundColor: '#17A2B8', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
          <div className="flex items-center justify-between gap-4">
            {isEditMode ? (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-white text-2xl font-bold flex-shrink-0">4.</span>
                <input
                  type="text"
                  value={sectionHeaders.qa}
                  onChange={(e) => setSectionHeaders({ ...sectionHeaders, qa: e.target.value })}
                  className="flex-1 text-xl font-bold text-white bg-white/20 border-2 border-white/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white placeholder:text-white/70 min-w-0"
                  placeholder="Section Header"
                  style={{ color: 'white' }}
                />
              </div>
            ) : (
              <h3 className="text-xl font-bold text-white flex-1 min-w-0 break-words" style={{ color: 'white', fontWeight: 'bold' }}>4. {sectionHeaders.qa}</h3>
            )}
            {isEditMode && (
              <button
                onClick={addQA}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#17A2B8] rounded-md hover:bg-gray-100 transition-colors text-sm flex-shrink-0"
                type="button"
              >
                <Plus size={16} />
                Add Q&A
              </button>
            )}
          </div>
        </div>
        <div className="px-6">
          <div className="space-y-4 pb-6">
            {qa.map((item, index) => {
              const itemKey = `qa-${index}`;
              const isEditing = isEditMode && editingItems[itemKey];
              return (
                <div key={item.id} className="flex gap-4 group bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[#17A2B8]/50 transition-colors p-4 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#17A2B8] text-white rounded-full flex items-center justify-center font-semibold">{index + 1}</div>
                  <div className="flex-1 relative">
                    {isEditing || isEditMode ? (
                      <>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => updateQA(item.id, { question: e.target.value })}
                          className="w-full text-gray-900 mb-1 border border-gray-300 rounded-md px-3 py-1 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                          placeholder="Question"
                          autoFocus
                        />
                        <textarea
                          value={item.answer}
                          onChange={(e) => updateQA(item.id, { answer: e.target.value })}
                          className="w-full text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                          rows={3}
                          placeholder="Answer"
                        />
                      </>
                    ) : (
                      <>
                        <div className="text-gray-900 mb-1 pr-8 break-words">{item.question}</div>
                        <p className="text-sm text-gray-600 pr-8 whitespace-pre-line break-words">{item.answer}</p>
                      </>
                    )}
                    {isEditMode && (
                      <div className="absolute top-0 right-0 flex gap-1">
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingItems({ ...editingItems, [itemKey]: false });
                            } else {
                              setEditingItems({ ...editingItems, [itemKey]: true });
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-[#17A2B8] transition-colors opacity-0 group-hover:opacity-100"
                          title={isEditing ? "Save" : "Edit"}
                        >
                          {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                        </button>
                        <button
                          onClick={() => deleteQA(item.id)}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {isEditMode && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-[#17A2B8] text-white rounded-lg hover:bg-[#138C9E] transition-colors shadow-sm flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Timeline Analysis'}
          </button>
        </div>
      )}
    </div>
  );
}

