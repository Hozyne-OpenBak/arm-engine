import React from 'react';

const About: React.FC = () => {
  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-center">About ARM Engine</h1>
        
        <div className="prose prose-lg mx-auto">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-4">
              ARM Engine is built to automate complex workflows through intelligent,
              multi-tenant infrastructure. We believe automation should be accessible,
              secure, and scalable for businesses of all sizes.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
            <p className="text-gray-700 mb-4">
              Our platform provides:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Automated user account management and authentication</li>
              <li>Secure, isolated tenant environments using Kubernetes</li>
              <li>Integrated billing and subscription management with Stripe</li>
              <li>Seamless provisioning and deployment automation</li>
              <li>Scalable infrastructure that grows with your needs</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Technology</h2>
            <p className="text-gray-700 mb-4">
              Built on modern technologies:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Node.js and Express for backend services</li>
              <li>React and TypeScript for responsive frontends</li>
              <li>Kubernetes for multi-tenant orchestration</li>
              <li>PostgreSQL for reliable data storage</li>
              <li>Stripe for secure payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-gray-700">
              Have questions? Visit our{' '}
              <a href="/contact" className="text-blue-600 hover:underline">
                contact page
              </a>{' '}
              or check out our{' '}
              <a href="/pricing" className="text-blue-600 hover:underline">
                pricing plans
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;
