import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
    alert('Thank you for your inquiry! We will be in touch soon.');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const consultationTopics = [
    'Project consultations',
    'Technical assessments',
    'Integration planning',
    'AI strategy and implementation',
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-6">Contact Us</h1>
          <p className="text-white text-opacity-90 text-lg mb-6">
            Get clarity on your next digital move. Connect with our AI and engineering team. Work 
            with us to see how we can accelerate your growth and help you overcome technological 
            obstacles you might be facing.
          </p>
          <p className="text-white text-opacity-90">
            You can contact us for a free assessment regarding:
          </p>
          <ul className="mt-4 space-y-2">
            {consultationTopics.map((topic, index) => (
              <li key={index} className="flex items-center text-white text-opacity-90">
                <span className="mr-3">•</span>
                {topic}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <h2 className="text-gray-900 mb-6">Get in Touch</h2>
              <p className="text-gray-600 mb-8">
                Ready to transform your digital operations? Reach out to schedule your free assessment.
              </p>

              <div className="space-y-6">
                <div className="flex items-start">
                  <Mail className="w-6 h-6 text-[#17A2B8] mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-gray-900 mb-1">Email</div>
                    <a
                      href="mailto:info@clearways.ai"
                      className="text-gray-600 hover:text-[#17A2B8] transition-colors"
                    >
                      info@clearways.ai
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="w-6 h-6 text-[#17A2B8] mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-gray-900 mb-1">Phone</div>
                    <a
                      href="tel:+15717626973"
                      className="text-gray-600 hover:text-[#17A2B8] transition-colors"
                    >
                      (571) 762-6973
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="w-6 h-6 text-[#17A2B8] mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-gray-900 mb-1">Address</div>
                    <p className="text-gray-600">
                      ClearWays AI
                      <br />
                      United States
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="email" className="block text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full md:w-auto bg-[#17A2B8] text-white px-8 py-3 rounded hover:bg-[#138C9E] transition-colors"
                >
                  Schedule a Consultation
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
