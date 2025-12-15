import { Rocket, TrendingUp, Settings, LineChart } from 'lucide-react';

export default function UseCaseStrips() {
  const useCases = [
    {
      icon: Rocket,
      title: 'Product Acceleration',
      description: 'Websites, apps, prototypes, QA automation.',
      color: 'bg-blue-50',
    },
    {
      icon: TrendingUp,
      title: 'Growth Intelligence',
      description: 'Predictive SEO, AI-driven content expansion, competitor modeling.',
      color: 'bg-teal-50',
    },
    {
      icon: Settings,
      title: 'Operations Optimization',
      description: 'AI routing, RPA workflows, CRM enrichment, automated document processing.',
      color: 'bg-cyan-50',
    },
    {
      icon: LineChart,
      title: 'Data & Decisioning',
      description: 'Forecasting, attribution, churn prediction, revenue modeling.',
      color: 'bg-indigo-50',
    },
  ];

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-gray-900 mb-12">
          Where AI Produces Immediate Impact
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className={`${useCase.color} p-6 rounded-lg hover:shadow-md transition-shadow`}
            >
              <div className="mb-4">
                <useCase.icon className="w-8 h-8 text-[#17A2B8]" />
              </div>
              <h3 className="text-gray-900 mb-2">{useCase.title}</h3>
              <p className="text-gray-600 text-sm">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
