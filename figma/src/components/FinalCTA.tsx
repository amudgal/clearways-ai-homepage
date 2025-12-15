import { Link } from 'react-router-dom';

export default function FinalCTA() {
  return (
    <section className="bg-gradient-to-r from-[#17A2B8] to-[#138C9E] py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-white mb-6">Turn Chaos Into Clarity</h2>
        <p className="text-white text-opacity-90 mb-8 text-lg">
          Transform your digital ecosystem with AI-driven precision, speed, and integrated execution.
        </p>
        <Link
          to="/contact"
          className="inline-block bg-white text-[#17A2B8] px-8 py-3 rounded hover:bg-gray-100 transition-colors"
        >
          Schedule a Consultation
        </Link>
      </div>
    </section>
  );
}
