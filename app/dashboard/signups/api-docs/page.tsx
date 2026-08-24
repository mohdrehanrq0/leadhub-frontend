'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { IconArrowLeft, IconCopy, IconExternalLink, IconKey } from '@tabler/icons-react';

export default function SignupAPIDocsPage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiEndpoint, setApiEndpoint] = useState<string>('');

  useEffect(() => {
    // Get the API endpoint from environment or construct it
    const baseUrl = window.location.origin.replace(':3002', ':4001'); // Adjust for backend port
    setApiEndpoint(`${baseUrl}/api/signups/ingest`);
    
    // Fetch existing API key if available
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    try {
      const res = await api.get('/api/service-api-keys');
      if (res.data.data && res.data.data.length > 0) {
        setApiKey(res.data.data[0].maskedKey);
      }
    } catch (error) {
      // Ignore error
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const curlExample = `curl -X POST '${apiEndpoint}' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "companyName": "Acme Inc",
    "companyWebsite": "https://acme.com",
    "companyAddress": "123 Main St, San Francisco, CA"
  }'`;

  const nodeExample = `const axios = require('axios');

const signupData = {
  email: 'john@example.com',
  name: 'John Doe',
  companyName: 'Acme Inc',
  companyWebsite: 'https://acme.com',
  companyAddress: '123 Main St, San Francisco, CA'
};

axios.post('${apiEndpoint}', signupData, {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Signup created:', response.data);
})
.catch(error => {
  console.error('Error:', error.response?.data || error.message);
});`;

  const pythonExample = `import requests

signup_data = {
    "email": "john@example.com",
    "name": "John Doe",
    "companyName": "Acme Inc",
    "companyWebsite": "https://acme.com",
    "companyAddress": "123 Main St, San Francisco, CA"
}

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.post("${apiEndpoint}", json=signup_data, headers=headers)

if response.status_code == 201:
    print("Signup created:", response.json())
else:
    print("Error:", response.text)`;

  const phpExample = `<?php
$apiKey = 'YOUR_API_KEY';
$endpoint = '${apiEndpoint}';

$signupData = [
    'email' => 'john@example.com',
    'name' => 'John Doe',
    'companyName' => 'Acme Inc',
    'companyWebsite' => 'https://acme.com',
    'companyAddress' => '123 Main St, San Francisco, CA'
];

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($signupData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($statusCode === 201) {
    echo "Signup created: " . $response;
} else {
    echo "Error: " . $response;
}`;

  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'node' | 'python' | 'php'>('curl');

  const codeExamples = {
    curl: curlExample,
    node: nodeExample,
    python: pythonExample,
    php: phpExample,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in text-text">
      {/* Back Button */}
      <Link
        href="/dashboard/signups"
        className="inline-flex items-center space-x-2 text-sm text-text-200 hover:text-primary transition-colors"
      >
        <IconArrowLeft size={16} />
        <span>Back to Sign-ups</span>
      </Link>

      <PageHeader
        eyebrow="Developers"
        title="Signup API"
        description="Push sign-ups from your platform for enrichment and personalized onboarding emails."
      />

      {/* Authentication */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-100 flex items-center space-x-2">
            <IconKey size={20} />
            <span>Authentication</span>
          </h2>
          <Link
            href="/dashboard/settings/api-keys"
            className="text-xs text-primary hover:underline flex items-center space-x-1"
          >
            <span>Manage API Keys</span>
            <IconExternalLink size={12} />
          </Link>
        </div>
        <p className="text-sm text-text-300">
          All API requests must be authenticated using a Service API Key. Include the key in the{' '}
          <code className="px-1.5 py-0.5 bg-bg-200 rounded text-xs font-mono">Authorization</code> header
          as a Bearer token.
        </p>
        {apiKey ? (
          <div className="bg-bg-200 p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between gap-3">
              <code className="text-xs font-mono text-text-100">{apiKey}</code>
              <span className="text-[10px] text-text-300 shrink-0">Masked</span>
            </div>
            <p className="text-xs text-text-300">
              The full key is only shown once when you create it. Go to{' '}
              <Link href="/dashboard/settings/api-keys" className="text-primary hover:underline">
                Settings → API Keys → LeadSniper Autopilot keys
              </Link>
              , click <strong>Create key</strong>, and copy it immediately. If you lost an old key, revoke it and create a new one.
            </p>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-500">
              No API key found. Please{' '}
              <Link href="/dashboard/settings/api-keys" className="underline">
                create one under LeadSniper Autopilot keys
              </Link>
              {' '}— the full key is shown only once at creation.
            </p>
          </div>
        )}
      </div>

      {/* Endpoint */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100">API Endpoint</h2>
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs font-semibold">
              POST
            </span>
            <code className="text-sm font-mono text-text-100">/api/signups/ingest</code>
          </div>
          <div className="bg-bg-200 p-3 rounded-lg border border-border flex items-center justify-between">
            <code className="text-xs font-mono text-text-100">{apiEndpoint}</code>
            <button
              onClick={() => copyToClipboard(apiEndpoint, 'Endpoint')}
              className="text-primary hover:text-primary-600 transition-colors"
            >
              <IconCopy size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Request Parameters */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100">Request Body Parameters</h2>
        <div className="space-y-3">
          <div className="border-l-2 border-primary pl-4">
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-text-100">email</code>
              <span className="text-xs text-red-500">required</span>
              <span className="text-xs text-text-300">string</span>
            </div>
            <p className="text-xs text-text-300 mt-1">Email address of the sign-up user</p>
          </div>
          
          <div className="border-l-2 border-border pl-4">
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-text-100">name</code>
              <span className="text-xs text-text-300">string (optional)</span>
            </div>
            <p className="text-xs text-text-300 mt-1">Full name of the sign-up user</p>
          </div>

          <div className="border-l-2 border-border pl-4">
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-text-100">companyName</code>
              <span className="text-xs text-red-500">string (required)</span>
            </div>
            <p className="text-xs text-text-300 mt-1">
              Company name — required for enrichment. Without it, ingest fails.
            </p>
          </div>

          <div className="border-l-2 border-border pl-4">
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-text-100">companyWebsite</code>
              <span className="text-xs text-text-300">string (optional)</span>
            </div>
            <p className="text-xs text-text-300 mt-1">Company website URL</p>
          </div>

          <div className="border-l-2 border-border pl-4">
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-text-100">companyAddress</code>
              <span className="text-xs text-red-500">string (required)</span>
            </div>
            <p className="text-xs text-text-300 mt-1">
              Company location (city/country or full address) — required for enrichment so research can match the right company.
            </p>
          </div>

          <div className="border-l-2 border-border pl-4">
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-text-100">sourceMeta</code>
              <span className="text-xs text-text-300">object (optional)</span>
            </div>
            <p className="text-xs text-text-300 mt-1">Additional metadata about the sign-up source</p>
          </div>
        </div>
      </div>

      {/* Response */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100">Response</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-text-200 mb-2">Success Response (201 Created):</p>
            <pre className="bg-bg-200 p-4 rounded-lg text-xs font-mono text-text-100 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "enriching",
    "enrichmentStatus": "in_progress"
  }
}`}
            </pre>
          </div>
          <div>
            <p className="text-sm text-text-200 mb-2">Error Response (400 Bad Request):</p>
            <pre className="bg-bg-200 p-4 rounded-lg text-xs font-mono text-text-100 overflow-x-auto">
{`{
  "success": false,
  "errors": {
    "fieldErrors": {
      "email": ["Invalid email"]
    }
  }
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100">Code Examples</h2>
        
        {/* Language Tabs */}
        <div className="flex items-center space-x-2 border-b border-border">
          {(['curl', 'node', 'python', 'php'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedLanguage === lang
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-300 hover:text-text-100'
              }`}
            >
              {lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : lang === 'python' ? 'Python' : 'PHP'}
            </button>
          ))}
        </div>

        {/* Code Block */}
        <div className="relative">
          <button
            onClick={() => copyToClipboard(codeExamples[selectedLanguage], 'Code')}
            className="absolute top-3 right-3 p-2 bg-bg-300 hover:bg-bg-400 rounded-lg transition-colors"
          >
            <IconCopy size={16} className="text-text-200" />
          </button>
          <pre className="bg-bg-200 p-4 rounded-lg text-xs font-mono text-text-100 overflow-x-auto">
            {codeExamples[selectedLanguage]}
          </pre>
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100">What Happens After You Push a Sign-up</h2>
        <ol className="space-y-3 text-sm text-text-200">
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              1
            </span>
            <div>
              <p className="font-medium text-text-100">Lead Created & Added to List</p>
              <p className="text-xs text-text-300">
                A new signup lead record is created in Lead Hub and automatically added to the "Signup Leads" list
              </p>
            </div>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              2
            </span>
            <div>
              <p className="font-medium text-text-100">Auto-Enrichment Starts</p>
              <p className="text-xs text-text-300">
                The lead is automatically enriched with company data, pain points, and buying signals (costs 1 credit)
              </p>
            </div>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              3
            </span>
            <div>
              <p className="font-medium text-text-100">AI Email Generated</p>
              <p className="text-xs text-text-300">
                A personalized onboarding email is created using enrichment data and your founder profile
              </p>
            </div>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              4
            </span>
            <div>
              <p className="font-medium text-text-100">Auto-Categorized</p>
              <p className="text-xs text-text-300">Lead is categorized as HOT, WARM, or COLD based on ICP and intent scores</p>
            </div>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              5
            </span>
            <div>
              <p className="font-medium text-text-100">Ready for Pull</p>
              <p className="text-xs text-text-300">
                Your platform can pull enriched leads with generated emails via{' '}
                <code className="px-1 py-0.5 bg-bg-200 rounded">GET /api/signups</code>
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Fetching Leads by Category */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100">Fetching Enriched Leads (for Lead Sniper)</h2>
        <p className="text-sm text-text-200">
          After enrichment and email generation, Lead Sniper can pull the enriched leads with generated emails
          filtered by category.
        </p>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-xs font-semibold">
                GET
              </span>
              <code className="text-sm font-mono text-text-100">/api/signups</code>
            </div>
            <p className="text-xs text-text-300 mb-2">Query Parameters:</p>
            <ul className="text-xs text-text-300 space-y-1 ml-4">
              <li>• <code className="px-1 py-0.5 bg-bg-200 rounded">category</code> - Filter by category (hot, warm, cold)</li>
              <li>• <code className="px-1 py-0.5 bg-bg-200 rounded">status</code> - Filter by status (ready, sent, etc.)</li>
              <li>• <code className="px-1 py-0.5 bg-bg-200 rounded">since</code> - Get leads created after this timestamp</li>
              <li>• <code className="px-1 py-0.5 bg-bg-200 rounded">limit</code> - Number of results (default: 50)</li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-text-200 mb-2">Example Request:</p>
            <pre className="bg-bg-200 p-3 rounded-lg text-xs font-mono text-text-100 overflow-x-auto">
{`curl -X GET '${apiEndpoint}?category=hot&status=ready' \\
  -H 'Authorization: Bearer YOUR_API_KEY'`}
            </pre>
          </div>

          <div>
            <p className="text-sm text-text-200 mb-2">Response includes generated email:</p>
            <pre className="bg-bg-200 p-3 rounded-lg text-xs font-mono text-text-100 overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "...",
      "email": "john@example.com",
      "name": "John Doe",
      "companyName": "Acme Inc",
      "category": "hot",
      "status": "ready",
      "generatedEmailSubject": "Welcome to Lead Sniper, John!",
      "generatedEmailBody": "Hi John, ...",
      "generatedEmailBodyHtml": "<p>Hi John, ...</p>",
      "emailGeneratedAt": "2026-07-27T12:00:00Z"
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-500 mb-2">Important Notes</h4>
        <ul className="text-xs text-text-300 space-y-1 list-disc list-inside">
          <li>Each sign-up enrichment costs 1 credit from your workspace balance</li>
          <li>Enrichment typically takes 1-3 minutes depending on data availability</li>
          <li>Signup leads are automatically organized in a dedicated system list (not visible in regular CRM lists)</li>
          <li>The system list is protected and cannot be modified manually - only via API</li>
          <li>You can filter and import leads by category (hot/warm/cold) using the API endpoints</li>
          <li>Make sure to configure your founder profile in settings for personalized emails</li>
          <li>Use the <code className="px-1 py-0.5 bg-bg-200 rounded">signups:write</code> scope for your API key</li>
        </ul>
      </div>
    </div>
  );
}
