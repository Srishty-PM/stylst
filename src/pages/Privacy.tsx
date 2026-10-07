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
      <p className="text-muted-foreground">Last updated: October 7, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>When you use Stylst, we collect:</p>
      <ul>
        <li><strong>Account information:</strong> name, email address, and password when you sign up.</li>
        <li><strong>Closet and inspiration data:</strong> photos, clothing names, categories, colours, brands, outfit inspirations, saved looks, calendar plans, style prompts, and the influencer names or handles you choose.</li>
        <li><strong>Third-party integrations:</strong> if you connect Pinterest, we access your fashion boards and pins (read-only) to import inspiration images. We store an OAuth access token securely and never access content outside the scopes you authorize (<code>boards:read</code>, <code>pins:read</code>).</li>
        <li><strong>Usage data:</strong> pages visited, features used, session duration, a randomly generated device identifier, and your account ID when signed in. These support first-party product analytics; we do not use them to track you across other companies' apps or websites.</li>
        <li><strong>Shopping activity:</strong> product views, saves and retailer-link clicks are recorded in our usage analytics. Saved product IDs are stored on your device and kept separate for each signed-in account.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>Provide and personalize the Stylst experience (outfit matching, AI styling suggestions).</li>
        <li>Sync your Pinterest boards when you enable the integration.</li>
        <li>Understand feature usage and improve product features. Stylst does not train its own AI models on your wardrobe.</li>
        <li>Send transactional emails (e.g. account verification).</li>
      </ul>

      <h2>3. Data Sharing and AI Processing</h2>
      <p>We do <strong>not</strong> sell your personal data. We share information only with:</p>
      <ul>
        <li><strong>Supabase:</strong> provides account authentication, database, image storage, and server functions. It processes account details, uploaded content, and usage events to operate Stylst. Its <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer">Data Processing Addendum</a> describes its confidentiality, security, and subprocessor obligations.</li>
        <li><strong>Google (Gemini AI):</strong> only after you explicitly allow it in the app, selected clothing and inspiration photos, clothing details, style prompts, and chosen influencer names or handles are sent through Supabase server functions to Google. Relevant wardrobe details and inspiration images may be included when matching or generating an outfit. Google uses the request to identify clothing, clean up images, match outfits, and generate styling suggestions. Stylst does not include your account password or email address in these AI requests.</li>
        <li>Law enforcement if required by applicable law.</li>
      </ul>
      <p><strong>Your AI choice:</strong> permission is off by default, applies to one account on one device, and is recorded with the disclosure version. You may choose “Not now” or “Skip for now” and continue without AI. You can turn permission off in Settings at any time. This stops new AI requests, including requests waiting for a photo upload to finish; it cannot recall content already sent to Google. A changed disclosure or a new device requires permission again.</p>
      <p><strong>Google's processing and protection:</strong> the <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">Gemini API terms</a> distinguish paid and unpaid services. For paid services, Google does not use submitted content or responses to improve its products and processes them under its <a href="https://business.safety.google/processorterms/" target="_blank" rel="noopener noreferrer">Data Processing Addendum</a>. Limited retention for safety and legal purposes can still apply. Unpaid services can involve model improvement and human review, so sensitive or personal information should not be submitted to them. Stylst's released iOS service requires Google's paid-service data protections.</p>
      <p><strong>Service-provider safeguards:</strong> data is sent over encrypted HTTPS connections. Supabase access policies separate account data, and AI keys remain on the server. The processor terms above describe provider security, confidentiality, and processing limits. We do not promise zero retention by Google or that withdrawing permission deletes Google's existing records.</p>
      <p><strong>Retailer and affiliate links:</strong> opening a shopping link takes you to the retailer, sometimes through an affiliate network that attributes the referral. The retailer and network handle that visit under their own privacy policies. STYLST does not include your account ID, email, wardrobe photos or style prompts in these links, and does not collect payment or delivery details for retailer purchases.</p>

      <h2>4. Pinterest Data</h2>
      <p>If you connect your Pinterest account:</p>
      <ul>
        <li>We only read your boards and pins — we never post, delete, or modify anything on your Pinterest account.</li>
        <li>You can revoke Stylst's access in your Pinterest account's connected-app settings. Deleting your Stylst account also removes the stored integration credentials.</li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>Account and wardrobe data is retained while your account is active. You can request account deletion in Settings; the deletion service removes your sign-in account and associated application records and uploaded images. Device-local preferences, such as saved shopping items and the AI permission record, remain on that device until its app data is cleared or the app is removed. Google's retention of data already processed follows the provider terms described above.</p>

      <h2>6. Security</h2>
      <p>We use encrypted HTTPS connections, authenticated server functions, and database access policies to protect your data. Only photos you select are uploaded; the app does not upload your entire photo library. Camera and photo-library permissions are separate from permission to send selected content to Google Gemini.</p>

      <h2>7. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to access, correct, delete, or export your personal data. Contact us at <a href="mailto:privacy@stylst.app">privacy@stylst.app</a>.</p>

      <h2>8. Changes</h2>
      <p>We may update this policy from time to time. We will notify you of material changes via email or in-app notice.</p>

      <h2>9. Age Requirements</h2>
      <p>Stylst is intended for adults aged 18 or older. AI processing is optional and requires a separate confirmation that you are 18 or older.</p>

      <h2>10. Contact</h2>
      <p>For questions about this policy, email <a href="mailto:privacy@stylst.app">privacy@stylst.app</a>.</p>
    </main>
  </div>
);

export default Privacy;
