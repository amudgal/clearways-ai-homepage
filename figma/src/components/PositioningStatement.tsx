import { Zap, Link2, Target } from 'lucide-react';

export default function PositioningStatement() {
  const pillars = [
    {
      icon: Zap,
      title: 'Speed',
      description: 'AI-enabled engineering and accelerated delivery cycles.',
    },
    {
      icon: Link2,
      title: 'Integration',
      description: 'Unified systems across eCommerce, CRM, data, and backend.',
    },
    {
      icon: Target,
      title: 'Precision',
      description: 'Analytics, automation, and compliance embedded from the start.',
    },
  ];

  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-gray-900 mb-6">
            AI That Drives Execution, Not Hype
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            Unlock speed to market, operational precision, and scalable growth. Clearways.ai applies 
            AI across development, data, search, and integrations to eliminate friction and 
            force-multiply output.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#17A2B8] to-[#138C9E] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <pillar.icon className="w-12 h-12 text-white" strokeWidth={2} />
                </div>
              </div>
              <h3 className="text-center text-gray-900 mb-3">{pillar.title}</h3>
              <p className="text-center text-gray-600">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
