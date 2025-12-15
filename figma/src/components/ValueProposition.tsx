import { Brain, Users, Shield, Network } from 'lucide-react';

export default function ValueProposition() {
  const values = [
    {
      icon: Brain,
      title: 'AI-Native Delivery',
      description: 'AI embedded across build, QA, prototyping, and optimization.',
    },
    {
      icon: Users,
      title: 'Senior Engineering, No Bloat',
      description: 'Direct access to architects and integration leaders.',
    },
    {
      icon: Shield,
      title: 'Compliance & Security First',
      description: 'Controls for healthcare, finance, consumer privacy, and regulated environments.',
    },
    {
      icon: Network,
      title: 'Integration Expertise',
      description: 'We solve the system complexity others avoid.',
    },
  ];

  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-gray-900 mb-12">Why Clearways.ai</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#17A2B8] to-[#138C9E] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <value.icon className="w-10 h-10 text-white" strokeWidth={2} />
                </div>
              </div>
              <h3 className="text-gray-900 mb-3 text-center">{value.title}</h3>
              <p className="text-gray-600 text-sm text-center">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
