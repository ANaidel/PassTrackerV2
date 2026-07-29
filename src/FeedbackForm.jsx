import React, { useEffect, useState } from 'react';
import { Loader2, MessageSquare, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'bug', label: 'Bug report' },
  { id: 'idea', label: 'Feature idea' },
  { id: 'other', label: 'Other' },
];

const FeedbackForm = ({
  open,
  onClose,
  cloudUser = null,
  activeTab = 'dashboard',
}) => {
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return;
    setCategory('general');
    setMessage('');
    setEmail(cloudUser?.email || '');
    setBusy(false);
    setError('');
    setNotice('');
  }, [open, cloudUser?.email]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();

    if (trimmedMessage.length < 3) {
      setError('Please enter at least a few words of feedback.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Feedback is not available yet. Cloud sync/Supabase is not configured.');
      return;
    }

    setBusy(true);
    try {
      const { error: insertError } = await supabase.from('app_feedback').insert({
        category,
        message: trimmedMessage,
        email: trimmedEmail || null,
        user_id: cloudUser?.id || null,
        page: activeTab || null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setNotice('Thanks — your feedback was sent.');
      setMessage('');
      setCategory('general');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send feedback.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close feedback form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={20} />
            <h2 id="feedback-title" className="text-lg font-bold text-gray-900">
              Send feedback
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 p-1.5 text-gray-600 transition hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Share a bug, idea, or anything else that would make PassTracker better.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm text-gray-700">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-gray-700">
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={busy}
              rows={5}
              maxLength={4000}
              placeholder="What went well? What could be better?"
              className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </label>

          <label className="block text-sm text-gray-700">
            Email <span className="font-normal text-gray-500">(optional, if you want a reply)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />}
              {busy ? 'Sending...' : 'Send feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
