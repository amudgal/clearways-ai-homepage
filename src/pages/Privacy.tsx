export default function Privacy() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-6">Privacy Policy</h1>
          <p className="text-white text-opacity-90 text-lg">
            Your privacy is important to us. This policy outlines how we collect and use your information.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-gray-900 mb-4">Information We Collect</h2>
            <p className="text-gray-600 mb-6">
              We collect information that you provide directly to us, including your name, email address, phone number, company name, and any other information you choose to provide when you contact us or use our services.
            </p>

            <h2 className="text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">
              We use the information we collect to:
            </p>
            <ul className="text-gray-600 mb-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Send you technical notices and support messages</li>
              <li>Communicate with you about services, offers, and events</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>

            <h2 className="text-gray-900 mb-4">Information Sharing</h2>
            <p className="text-gray-600 mb-6">
              We do not share your personal information with third parties except as described in this policy. We may share information with service providers who perform services on our behalf, such as hosting, data analysis, and customer service.
            </p>

            <h2 className="text-gray-900 mb-4">Data Security</h2>
            <p className="text-gray-600 mb-6">
              We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
            </p>

            <h2 className="text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-600 mb-6">
              You have the right to access, update, or delete your personal information at any time. You may also opt out of receiving promotional communications from us by following the instructions in those messages.
            </p>

            <h2 className="text-gray-900 mb-4">Cookies and Tracking</h2>
            <p className="text-gray-600 mb-6">
              We use cookies and similar tracking technologies to collect information about your browsing activities and to provide a better user experience. You can control cookies through your browser settings.
            </p>

            <h2 className="text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our services are not directed to children under 13, and we do not knowingly collect personal information from children under 13.
            </p>

            <h2 className="text-gray-900 mb-4">Changes to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
            </p>

            <h2 className="text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600 mb-6">
              If you have any questions about this privacy policy, please contact us at info@clearways.ai or call us at 571-762-6973.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
