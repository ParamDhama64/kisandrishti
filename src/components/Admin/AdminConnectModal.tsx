import React, { useState } from 'react';
import { X, Check, Copy, Terminal, ShieldCheck, RefreshCw, Send } from 'lucide-react';
import { AdminTelemetryPayload } from '../../services/adminIntegration';

interface AdminConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: AdminTelemetryPayload;
  lang: 'hi' | 'en';
}

export const AdminConnectModal: React.FC<AdminConnectModalProps> = ({
  isOpen,
  onClose,
  payload,
  lang,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [testWebhookUrl, setTestWebhookUrl] = useState<string>('');
  const [webhookSent, setWebhookSent] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWebhook = async () => {
    if (!testWebhookUrl) return;
    setIsSending(true);
    try {
      await fetch(testWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString,
        mode: 'no-cors',
      });
      setWebhookSent(true);
      setTimeout(() => setWebhookSent(false), 3000);
    } catch (err) {
      console.warn('Webhook test failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Admin Panel Connector (एडमिन पैनल इंटीग्रेशन)
              </h3>
              <p className="text-[11px] text-slate-400">
                Live state broadcast for your secondary admin app or crop dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
          <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 text-[11px] text-emerald-300">
            <span className="font-bold">✓ Active Bridge:</span> Listening on{' '}
            <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">
              window.addEventListener('kisanDrishtiTelemetry', handler)
            </code>{' '}
            and <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">window.KisanDrishtiBridge</code>.
          </div>

          <div>
            <div className="flex items-center justify-between pb-1 text-slate-400 text-[11px]">
              <span>Current Live Telemetry Payload (JSON)</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-emerald-400 hover:underline"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="rounded-xl border border-white/10 bg-slate-900 p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56 scrollbar-thin scrollbar-thumb-slate-700">
              {jsonString}
            </pre>
          </div>

          {/* Test Webhook Sync */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <div className="font-semibold text-slate-200 text-xs">
              Test Webhook Dispatch to Your Admin Server
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={testWebhookUrl}
                onChange={(e) => setTestWebhookUrl(e.target.value)}
                placeholder="https://your-admin-app.com/api/farmer-webhook"
                className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
              />
              <button
                onClick={handleSendWebhook}
                disabled={isSending || !testWebhookUrl}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {webhookSent ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                <span>{webhookSent ? 'Dispatched' : 'Push'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
