'use client';

import { useState } from 'react';
import Link from 'next/link';

type FeedbackType = 'wrong_stop' | 'wrong_route' | 'missing_data' | 'suggestion' | 'other';

interface FeedbackForm {
    type: FeedbackType;
    stopName: string;
    routeId: string;
    description: string;
    contactInfo: string;
}

export default function FeedbackPage() {
    const [form, setForm] = useState<FeedbackForm>({
        type: 'wrong_stop',
        stopName: '',
        routeId: '',
        description: '',
        contactInfo: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [copying, setCopying] = useState(false);

    const feedbackTypes = [
        { id: 'wrong_stop' as FeedbackType, label: 'မှတ်တိုင်တည်နေရာမှား', labelEn: 'Wrong Stop Location', icon: '📍' },
        { id: 'wrong_route' as FeedbackType, label: 'လမ်းကြောင်းအချက်အလက်မှား', labelEn: 'Wrong Route Info', icon: '🚌' },
        { id: 'missing_data' as FeedbackType, label: 'လိုအပ်သောအချက်အလက်ပျောက်နေ', labelEn: 'Missing Data', icon: '❓' },
        { id: 'suggestion' as FeedbackType, label: 'အကြံပြုချက်', labelEn: 'Suggestion', icon: '💡' },
        { id: 'other' as FeedbackType, label: 'အခြား', labelEn: 'Other', icon: '📝' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Generate GitHub issue body
        const issueTitle = encodeURIComponent(`[Feedback] ${feedbackTypes.find(t => t.id === form.type)?.labelEn || 'Feedback'}`);
        const issueBody = encodeURIComponent(
            `## Feedback Type
${feedbackTypes.find(t => t.id === form.type)?.labelEn || form.type}

## Stop Name
${form.stopName || 'N/A'}

## Route ID
${form.routeId || 'N/A'}

## Description
${form.description}

## Contact Info
${form.contactInfo || 'Not provided'}

---
*Submitted via YBS Feedback Form*`
        );

        // Open GitHub issue in new tab
        window.open(
            `https://github.com/aungphone-mm/yangon-bus/issues/new?title=${issueTitle}&body=${issueBody}`,
            '_blank'
        );

        setSubmitted(true);
    };

    const handleCopyToClipboard = async () => {
        const feedbackText =
            `YBS Feedback
============
Type: ${feedbackTypes.find(t => t.id === form.type)?.labelEn || form.type}
Stop Name: ${form.stopName || 'N/A'}
Route ID: ${form.routeId || 'N/A'}
Description: ${form.description}
Contact: ${form.contactInfo || 'Not provided'}`;

        try {
            await navigator.clipboard.writeText(feedbackText);
            setCopying(true);
            setTimeout(() => setCopying(false), 2000);
        } catch (err) {
            alert('ကူးယူ၍မရပါ။ ကျေးဇူးပြု၍ ကိုယ်တိုင်ကူးယူပါ။');
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">ကျေးဇူးတင်ပါသည်!</h2>
                    <p className="text-gray-600 mb-6">
                        သင်၏အကြံပြုချက်ကို GitHub Issue တွင်ဖွင့်လှစ်နိုင်ပါပြီ။
                        ကျွန်ုပ်တို့ တတ်နိုင်သမျှ အမြန်ဆုံး ပြင်ဆင်ပေးပါမည်။
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setSubmitted(false);
                                setForm({
                                    type: 'wrong_stop',
                                    stopName: '',
                                    routeId: '',
                                    description: '',
                                    contactInfo: '',
                                });
                            }}
                            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
                        >
                            နောက်ထပ်အကြံပြုချက်ပေးရန်
                        </button>
                        <Link
                            href="/"
                            className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                            ပင်မစာမျက်နှာသို့ပြန်သွားရန်
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-primary text-white shadow-lg">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">အကြံပြုချက်ပေးရန်</h1>
                            <p className="text-sm text-white/80">Feedback & Suggestions</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border-b border-blue-100 p-4">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-blue-800">
                                    မှတ်တိုင်တည်နေရာမှားနေလျှင်၊ လမ်းကြောင်းအချက်အလက်မှားနေလျှင် ဒီဖောင်မှတဆင့် အကြံပြုနိုင်ပါသည်။
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Your feedback helps improve this app for everyone!
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                        {/* Feedback Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                အကြံပြုချက်အမျိုးအစား <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {feedbackTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setForm({ ...form, type: type.id })}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${form.type === type.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-2xl">{type.icon}</span>
                                        <p className="text-xs font-medium text-gray-800 mt-1">{type.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stop Name */}
                        {(form.type === 'wrong_stop' || form.type === 'missing_data') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    မှတ်တိုင်အမည်
                                </label>
                                <input
                                    type="text"
                                    value={form.stopName}
                                    onChange={(e) => setForm({ ...form, stopName: e.target.value })}
                                    placeholder="ဥပမာ - ဆူးလေ"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        )}

                        {/* Route ID */}
                        {(form.type === 'wrong_route' || form.type === 'missing_data') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    လမ်းကြောင်းနံပါတ်
                                </label>
                                <input
                                    type="text"
                                    value={form.routeId}
                                    onChange={(e) => setForm({ ...form, routeId: e.target.value })}
                                    placeholder="ဥပမာ - 36"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                အသေးစိတ်ရှင်းပြချက် <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="သင်တွေ့ရှိသောပြဿနာ သို့မဟုတ် အကြံပြုချက်ကို ရေးပါ..."
                                rows={4}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                            />
                        </div>

                        {/* Contact Info */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ဆက်သွယ်ရန် (optional)
                            </label>
                            <input
                                type="text"
                                value={form.contactInfo}
                                onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                                placeholder="Email, Telegram, သို့မဟုတ် Facebook"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                နောက်ထပ်မေးခွန်းများရှိပါက ဆက်သွယ်နိုင်ရန်
                            </p>
                        </div>

                        {/* Submit Buttons */}
                        <div className="space-y-3 pt-2">
                            <button
                                type="submit"
                                disabled={!form.description.trim()}
                                className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                GitHub Issue ဖွင့်၍ ပေးပို့ရန်
                            </button>

                            <button
                                type="button"
                                onClick={handleCopyToClipboard}
                                disabled={!form.description.trim()}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {copying ? (
                                    <>
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        ကူးယူပြီးပါပြီ!
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        Clipboard သို့ ကူးယူရန်
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Alternative Contact */}
                <div className="mt-6 bg-white rounded-xl shadow p-4">
                    <h3 className="font-medium text-gray-800 mb-3">GitHub မရှိပါက အခြားနည်းလမ်းများ</h3>
                    <div className="space-y-2">
                        {/* Email Option */}
                        <a
                            href={`mailto:aungphone111@gmail.com?subject=${encodeURIComponent('[YBS Feedback] ' + (feedbackTypes.find(t => t.id === form.type)?.labelEn || 'Feedback'))}&body=${encodeURIComponent(
                                `Feedback Type: ${feedbackTypes.find(t => t.id === form.type)?.labelEn || form.type}
Stop Name: ${form.stopName || 'N/A'}
Route ID: ${form.routeId || 'N/A'}

Description:
${form.description || '(Please describe your feedback here)'}

Contact: ${form.contactInfo || 'Not provided'}
`)}`}
                            className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">Email ပို့ရန်</p>
                                <p className="text-xs text-gray-500">GitHub account မလိုပါ</p>
                            </div>
                        </a>

                        {/* GitHub Issues */}
                        <a
                            href="https://github.com/aungphone-mm/yangon-bus/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">GitHub Issues</p>
                                <p className="text-xs text-gray-500">GitHub account ရှိလျှင်</p>
                            </div>
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
