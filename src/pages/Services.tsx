import { Smartphone, Search, Database, Puzzle } from 'lucide-react';

export default function Services() {
  const services = [
    {
      icon: Smartphone,
      title: 'AI-Accelerated Development',
      description:
        'Websites, mobile apps, and backend systems built with AI-driven speed and architectural precision.',
    },
    {
      icon: Search,
      title: 'Agentic SEO',
      description:
        'Adaptive search systems that learn, adjust, and optimize in real time to increase visibility and authority.',
    },
    {
      icon: Database,
      title: 'Data & Analytics',
      description:
        'Predictive modeling, visualization, dashboards, and intelligence layers that convert raw data into actionable insight.',
    },
    {
      icon: Puzzle,
      title: 'Integrations & Automation',
      description:
        'End-to-end API engineering and platform integration across eCommerce, CRM, ERP, healthcare, and logistics systems.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-white mb-6">Services</h1>
          <p className="text-white text-opacity-90 text-lg">
            We deliver engineering, AI automation, and system integration built for speed and clarity.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-8 hover:border-[#17A2B8] transition-colors group"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#17A2B8] to-[#138C9E] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <service.icon className="w-10 h-10 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-gray-900 mb-4">{service.title}</h2>
                    <p className="text-gray-600">{service.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
