'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { IconX, IconInfoCircle, IconCode } from '@tabler/icons-react';

interface EmailPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PROMPT = `You are writing a personalized onboarding email for someone who just signed up on {{sourcePlatform}}.

**Sign-up User:**
- Name: {{signupUserName}}
- Email: {{signupUserEmail}}
- Company: {{signupCompanyName}}
- Website: {{signupCompanyWebsite}}

**Enrichment Insights:**
- Company Summary: {{companySummary}}
- Likely Pain Points: {{painPoints}}
- Email Opener: {{emailOpener}}
- Industry: {{companyIndustry}}
- Company Size: {{companySize}}

**Founder/Platform Context:**
- Founder Name: {{founderName}}
- Platform: {{platformName}}
- Platform Website: {{platformWebsite}}
- Calendar Link: {{founderCalendarLink}}
- WhatsApp: {{founderWhatsapp}}
- LinkedIn: {{founderLinkedin}}
- Email: {{founderEmail}}

**Task:**
Write a warm, helpful, non-salesy onboarding email. The goal is to:
1. Congratulate them on signing up
2. Show we researched their company and understand their challenges
3. Offer genuine help and resources
4. Provide clear next steps (e.g., schedule a call, reach out via WhatsApp/LinkedIn)
5. Make them feel supported, not sold to

**Tone:** Friendly, supportive, knowledgeable. Like a helpful advisor, not a salesperson.

**Format:**
Return ONLY a JSON object with these fields:
{
  "subject": "Email subject line (50 chars max)",
  "bodyPlainText": "Plain text email body",
  "bodyHtml": "HTML email body (use simple HTML: <p>, <strong>, <a>, <ul>, <li>)"
}

Do NOT include any markdown code fences, only the raw JSON.`;

const AVAILABLE_VARIABLES = [
  { var: '{{sourcePlatform}}', desc: 'The platform name (e.g., Lead Sniper)' },
  { var: '{{signupUserName}}', desc: "Sign-up user's name" },
  { var: '{{signupUserEmail}}', desc: "Sign-up user's email" },
  { var: '{{signupCompanyName}}', desc: "Sign-up user's company name" },
  { var: '{{signupCompanyWebsite}}', desc: "Company website URL" },
  { var: '{{companySummary}}', desc: 'AI-generated company summary from enrichment' },
  { var: '{{painPoints}}', desc: 'Identified pain points from enrichment' },
  { var: '{{emailOpener}}', desc: 'AI-generated email opener suggestion' },
  { var: '{{companyIndustry}}', desc: 'Company industry' },
  { var: '{{companySize}}', desc: 'Company size/employee count' },
  { var: '{{founderName}}', desc: "Your name (from founder profile)" },
  { var: '{{platformName}}', desc: "Your platform/company name" },
  { var: '{{platformWebsite}}', desc: "Your platform website" },
  { var: '{{founderCalendarLink}}', desc: "Your calendar booking link" },
  { var: '{{founderWhatsapp}}', desc: "Your WhatsApp number" },
  { var: '{{founderLinkedin}}', desc: "Your LinkedIn profile URL" },
  { var: '{{founderEmail}}', desc: "Your contact email" },
  { var: '{{resourceLinks}}', desc: "Auto-injected resource links (from Resources tab)" },
];

export default function EmailPromptModal({ isOpen, onClose }: EmailPromptModalProps) {
  const [promptTemplate, setPromptTemplate] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVariables, setShowVariables] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentPrompt();
    }
  }, [isOpen]);

  const fetchCurrentPrompt = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/onboarding/email-prompt');
      if (res.data.success && res.data.data) {
        setPromptTemplate(res.data.data.signupEmailPromptTemplate || DEFAULT_PROMPT);
        setGuidelines(res.data.data.signupEmailGuidelines || '');
      } else {
        setPromptTemplate(DEFAULT_PROMPT);
        setGuidelines('');
      }
    } catch (error) {
      toast.error('Failed to load email prompt');
      setPromptTemplate(DEFAULT_PROMPT);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/api/onboarding/email-prompt', {
        signupEmailPromptTemplate: promptTemplate,
        signupEmailGuidelines: guidelines,
      });
      toast.success('Email prompt template saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save email prompt template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPromptTemplate(DEFAULT_PROMPT);
    setGuidelines('');
    toast.info('Reset to default prompt');
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success('Variable copied to clipboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-text-100">Email Prompt Template</h2>
            <p className="text-sm text-text-300 mt-1">
              Customize the AI prompt for generating signup onboarding emails
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-200 rounded-lg transition-colors"
          >
            <IconX size={20} className="text-text-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-40 skeleton" />
          ) : (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start space-x-3">
                <IconInfoCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-text-300">
                  <p>
                    This template is sent to the AI to generate personalized onboarding emails for signup leads.
                    Use the variables below to insert dynamic data. The AI will replace them with actual values
                    from enrichment and your founder profile.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Prompt Template */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-100">Prompt Template</label>
                    <textarea
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      rows={20}
                      className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary transition-colors text-text-100 resize-none"
                      placeholder="Enter your custom prompt template..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-100">Additional Guidelines (Optional)</label>
                    <textarea
                      value={guidelines}
                      onChange={(e) => setGuidelines(e.target.value)}
                      rows={4}
                      className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors text-text-100"
                      placeholder="Add any specific instructions or guidelines for the AI (e.g., 'Always mention our free trial', 'Keep it under 200 words', etc.)"
                    />
                  </div>
                </div>

                {/* Variables Sidebar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-100">Available Variables</label>
                    <button
                      onClick={() => setShowVariables(!showVariables)}
                      className="text-xs text-primary hover:underline"
                    >
                      {showVariables ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {showVariables && (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto bg-bg-200 rounded-lg p-3">
                      {AVAILABLE_VARIABLES.map((item) => (
                        <div
                          key={item.var}
                          className="bg-bg-100 border border-border rounded p-2 hover:border-primary transition-colors cursor-pointer group"
                          onClick={() => copyVariable(item.var)}
                        >
                          <div className="flex items-start justify-between space-x-2">
                            <code className="text-xs font-mono text-primary break-all">{item.var}</code>
                            <IconCode size={12} className="text-text-300 group-hover:text-primary flex-shrink-0 mt-1" />
                          </div>
                          <p className="text-[10px] text-text-300 mt-1">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-xs text-text-300">
                      💡 Click any variable to copy it to your clipboard, then paste it into your prompt template.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-bg-200 text-text-100 rounded-lg text-sm font-medium hover:bg-bg-300 transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-bg-200 text-text-100 rounded-lg text-sm font-medium hover:bg-bg-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
