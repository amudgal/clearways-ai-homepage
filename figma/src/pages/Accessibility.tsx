export default function Accessibility() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-6">Accessibility Statement</h1>
          <p className="text-white text-opacity-90 text-lg">
            ClearWays AI is committed to ensuring digital accessibility for people with disabilities.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-gray-600 mb-6">
              ClearWays AI is committed to making our website accessible to all users, including those with disabilities. We strive to comply with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.
            </p>

            <h2 className="text-gray-900 mb-4">Accessibility Features</h2>
            <p className="text-gray-600 mb-4">
              Our website includes the following accessibility features:
            </p>
            <ul className="text-gray-600 mb-6 space-y-2">
              <li>Semantic HTML markup for screen reader compatibility</li>
              <li>Keyboard navigation support throughout the site</li>
              <li>Alternative text for images and graphics</li>
              <li>Sufficient color contrast ratios for text and backgrounds</li>
              <li>Responsive design that works across different devices and screen sizes</li>
              <li>Clear and consistent navigation structure</li>
              <li>Form labels and error messages that are accessible</li>
            </ul>

            <h2 className="text-gray-900 mb-4">Ongoing Efforts</h2>
            <p className="text-gray-600 mb-6">
              We are continuously working to improve the accessibility of our website. We regularly review our content and features to ensure they meet accessibility standards and provide a positive user experience for all visitors.
            </p>

            <h2 className="text-gray-900 mb-4">Third-Party Content</h2>
            <p className="text-gray-600 mb-6">
              While we strive to ensure that all content on our website is accessible, some third-party content may not fully meet accessibility standards. We are working with our partners to address these issues.
            </p>

            <h2 className="text-gray-900 mb-4">Assistive Technologies</h2>
            <p className="text-gray-600 mb-6">
              Our website is designed to be compatible with common assistive technologies, including screen readers, screen magnification software, and speech recognition software.
            </p>

            <h2 className="text-gray-900 mb-4">Feedback</h2>
            <p className="text-gray-600 mb-6">
              We welcome feedback on the accessibility of our website. If you encounter any accessibility barriers or have suggestions for improvement, please contact us:
            </p>
            <ul className="text-gray-600 mb-6 space-y-2">
              <li>Email: info@clearways.ai</li>
              <li>Phone: 571-762-6973</li>
            </ul>
            <p className="text-gray-600 mb-6">
              We will make every effort to respond to your feedback promptly and work to resolve any issues you report.
            </p>

            <h2 className="text-gray-900 mb-4">Conformance Status</h2>
            <p className="text-gray-600 mb-6">
              We aim to conform to WCAG 2.1 Level AA standards. We conduct regular accessibility audits and updates to maintain and improve our conformance level.
            </p>

            <h2 className="text-gray-900 mb-4">Last Updated</h2>
            <p className="text-gray-600 mb-6">
              This accessibility statement was last updated on November 27, 2025.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
