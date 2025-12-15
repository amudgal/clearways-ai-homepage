import { Search, CheckCircle, Wrench, RefreshCw } from 'lucide-react';

export default function ProcessOverview() {
  const steps = [
    {
      icon: Search,
      number: '01',
      title: 'Identify Opportunities',
      description: 'We isolate high-ROI AI and engineering targets.',
    },
    {
      icon: CheckCircle,
      number: '02',
      title: 'Validate Quickly',
      description: 'Rapid prototyping and feasibility confirmation.',
    },
    {
      icon: Wrench,
      number: '03',
      title: 'Build & Integrate',
      description: 'Full implementation across product, data, and automation.',
    },
    {
      icon: RefreshCw,
      number: '04',
      title: 'Optimize & Evolve',
      description: 'Continuous tuning, analytics, and AI model refinement.',
    },
  ];

  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-gray-900 mb-12">A Straight Path to Clarity</h2>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Connector Line - from center of step 1 to center of step 4 */}
          <div className="hidden lg:block absolute top-8 h-0.5 bg-gray-300" style={{ left: 'calc(12.5% + 2rem)', right: 'calc(12.5% + 2rem)' }} />
          
          {steps.map((step, index) => (
            <div key={index} className="relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-[#17A2B8] rounded-full flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="text-[#17A2B8] mb-2 text-sm tracking-wider">
                  STEP {step.number}
                </div>
                <h3 className="text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
