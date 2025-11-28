import { Smartphone, Search, Database, Puzzle } from 'lucide-react';

export default function CoreServiceGrid() {
  const services = [
    {
      icon: Smartphone,
      title: 'AI-Accelerated Web & Mobile Development',
      description:
        'High-performance websites and mobile apps. Fast cycles, AI-driven prototyping, clean architecture, WCAG-compliant interfaces.',
    },
    {
      icon: Search,
      title: 'Agentic SEO',
      description:
        'Self-learning SEO systems. Automatic clustering, real-time adjustments, semantic search, structured data creation.',
    },
    {
      icon: Database,
      title: 'Data & Analytics Consulting',
      description:
        'Unified analytics. Predictive modeling. KPI frameworks. Operational dashboards. Data transformation and intelligent forecasting.',
    },
    {
      icon: Puzzle,
      title: 'Integration & Automation',
      description:
        'eCommerce, CRM, ERP, healthcare, finance, logistics, and subscription platforms connected into a cohesive ecosystem. API engineering and workflow automation included.',
    },
  ];

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-gray-900 mb-12">What We Deliver</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-8 hover:border-[#17A2B8] transition-colors group"
            >
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#17A2B8] to-[#138C9E] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <service.icon className="w-10 h-10 text-white" strokeWidth={2} />
                </div>
              </div>
              <h3 className="text-gray-900 mb-3 text-center">{service.title}</h3>
              <p className="text-gray-600 text-center">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
