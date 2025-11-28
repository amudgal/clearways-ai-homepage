export default function About() {
  const beliefs = [
    'Clarity over complexity.',
    'Speed without compromise.',
    'Integration as the foundation for growth.',
    'AI as an execution multiplier, not a buzzword.',
  ];

  const capabilities = [
    'AI-accelerated web and mobile development',
    'Agentic SEO and search intelligence',
    'Data and analytics engineering',
    'eCommerce, CRM, and ERP integration',
    'Automation and AI-driven workflows',
    'Secure, compliant system design',
  ];

  const industries = [
    'Healthcare',
    'Logistics',
    'Insurance',
    'Finance',
    'Real Estate',
    'Multi-Location Services',
    'eCommerce',
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-6">About Clearways.ai</h1>
          <p className="text-white text-opacity-90 text-lg">
            Clearways.ai's goal is to turn digital chaos into operational clarity. We are an 
            AI-native engineering and integration firm focused on delivering fast, stable, and 
            scalable systems for organizations that depend on precision.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-6">Our Mission</h2>
          <p className="text-gray-600 text-lg">
            To replace slow, fragmented, and inefficient digital operations with AI-powered clarity, 
            speed, and integrated execution.
          </p>
        </div>
      </section>

      {/* How We Work */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-6">How We Work</h2>
          <p className="text-gray-600 text-lg">
            We build lean, senior-led teams that use AI to accelerate every phase of delivery—from 
            requirements to deployment. No bloated processes. No recycled templates. Direct, technical 
            execution with measurable outcomes.
          </p>
        </div>
      </section>

      {/* What We Believe */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-6">What We Believe</h2>
          <ul className="space-y-3">
            {beliefs.map((belief, index) => (
              <li key={index} className="flex items-start">
                <span className="text-[#17A2B8] mr-3 mt-1">•</span>
                <span className="text-gray-600 text-lg">{belief}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Where We Excel */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-8">Where We Excel</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((capability, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:border-[#17A2B8] transition-colors"
              >
                <p className="text-gray-700">{capability}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-gray-900 mb-12">Who We Serve</h2>
          <p className="text-center text-gray-600 mb-8 text-lg">
            Organizations and Small Business that are looking to gain speed and efficiency
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {industries.map((industry, index) => (
              <span key={index} className="text-gray-600 text-lg">
                {industry}
                {index < industries.length - 1 && (
                  <span className="mx-3 text-[#17A2B8]">•</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
