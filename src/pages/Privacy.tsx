import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import stylstLogo from '@/assets/stylst-logo.png';

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <nav className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-border">
      <Link to="/" className="flex items-center gap-2">
        <img src={stylstLogo} alt="Stylst" className="w-8 h-8 rounded" />
        <span className="font-display text-xl font-bold text-primary">Stylst</span>
      </Link>
      <Link to="/">
        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
      </Link>
    </nav>

    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: February 13, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>When you use Stylst, we collect:</p>
      <ul>
        <li><strong>Account information:</strong> name, email address, and password when you sign up.</li>
        <li><strong>Closet data:</strong> photos and metadata of clothing items you upload.</li>
        <li><strong>Third-party integrations:</strong> if you connect Pinterest, we access your fashion boards and pins (read-only) to import inspiration images. We store an OAuth access token securely and never access content outside the scopes you authorize (<code>boards:read</code>, <code>pins:read</code>).</li>
        <li><strong>Usage data:</strong> pages visited, features used, and general interaction patterns to improve the service.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>Provide and personalize the Stylst experience (outfit matching, AI styling suggestions).</li>
        <li>Sync your Pinterest boards when you enable the integration.</li>
        <li>Improve our AI models and product features.</li>
        <li>Send transactional emails (e.g. account verification).</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>We do <strong>not</strong> sell your personal data. We share information only with:</p>
      <ul>
        <li>Cloud infrastructure providers that host the service.</li>
        <li>AI model providers to process clothing analysis and styling (images are not stored by third-party AI providers beyond processing).</li>
        <li>Law enforcement if required by applicable law.</li>
      </ul>

      <h2>4. Pinterest Data</h2>
      <p>If you connect your Pinterest account:</p>
      <ul>
        <li>We only read your boards and pins — we never post, delete, or modify anything on your Pinterest account.</li>
        <li>You can disconnect Pinterest at any time in Settings, which revokes our access and deletes your stored tokens.</li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>Your data is retained as long as your account is active. You can delete your account at any time in Settings, which permanently removes all your data within 30 days.</p>

      <h2>6. Security</h2>
      <p>We use industry-standard encryption (TLS in transit, AES-256 at rest) and row-level security policies to protect your data.</p>

      <h2>7. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to access, correct, delete, or export your personal data. Contact us at <a href="mailto:privacy@stylst.app">privacy@stylst.app</a>.</p>

      <h2>8. Changes</h2>
      <p>We may update this policy from time to time. We will notify you of material changes via email or in-app notice.</p>

      <h2>9. Contact</h2>
      <p>For questions about this policy, email <a href="mailto:privacy@stylst.app">privacy@stylst.app</a>.</p>
    </main>
  </div>
);

export default Privacy;
