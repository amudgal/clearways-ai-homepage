export default function Industries() {
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
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-gray-900 mb-12">
          Organizations and Small Business that are looking to gain speed and efficiency
        </h2>

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
  );
}
