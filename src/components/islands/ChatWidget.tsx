import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Send, Phone, Mail, MessageCircle, Sparkles, CircleCheck } from 'lucide-react';
import { business } from '../../data/business';
import { LEAD_LIMITS } from '../../lib/contactSchema';
import { chatMarkdownToPlainText, renderChatMarkdown } from '../../lib/chat/renderChatMarkdown';
import { trackLead } from '../../lib/analytics';
import { Turnstile, turnstileEnabled } from './Turnstile';
import type { Assistant, ConversationState } from '../../lib/assistant/brain';
import type { AssistantKnowledge, BotReply, LeadDraft } from '../../lib/assistant/types';

/**
 * The website's chat assistant. All of the language work happens in
 * `lib/assistant` - no API key, no network round trip per message - so replies
 * are instant and the widget keeps working if anything else is down. The
 * knowledge file and the engine itself load only when the chat is opened.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const TEASER_SEEN_KEY = 'aph-chat-teaser-seen';

type Message = { id: string; from: 'bot' | 'user'; content: React.ReactNode; kind?: 'text' | 'lead' };
type TranscriptLine = { from: 'bot' | 'user'; text: string };
type LeadStatus = 'ready' | 'sending' | 'sent' | 'error';
type Engine = typeof import('../../lib/assistant/brain');

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

/** Pathname for the lead email, only when it is a plain site path the API accepts. */
function currentPagePath(): string {
  const path = typeof window === 'undefined' ? '/' : window.location.pathname;
  return /^\/[\w\-./]*$/.test(path) ? path.slice(0, LEAD_LIMITS.pageUrl) : '/';
}

function BotAvatar() {
  return (
    <span className="bg-navy-900 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white">
      <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-label="Assistant is typing">
      <BotAvatar />
      <div className="border-ink-100 flex items-center gap-1 rounded-2xl rounded-bl-md border bg-white px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="bg-ink-300 h-1.5 w-1.5 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-ink-200 text-ink-800 flex min-h-11 items-center justify-center rounded-xl border bg-white px-2 py-2 text-center text-xs leading-tight font-medium transition-colors hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

/** A human-feeling pause: long enough to read as thinking, short enough to feel instant. */
const typingPause = (text: string) => Math.min(1100, 320 + text.length * 6);

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [unread, setUnread] = useState(0);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [leadCard, setLeadCard] = useState<{ draft: LeadDraft; status: LeadStatus; messageId: string } | null>(null);
  const [isPhone, setIsPhone] = useState(false);
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileFailed, setTurnstileFailed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const engineRef = useRef<{ engine: Engine; assistant: Assistant } | null>(null);
  const loadingRef = useRef<Promise<{ engine: Engine; assistant: Assistant } | null> | null>(null);
  const convRef = useRef<ConversationState | null>(null);
  const leadCardRef = useRef(leadCard);
  const turnstileTokenRef = useRef<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const greetedRef = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  leadCardRef.current = leadCard;
  turnstileTokenRef.current = turnstileToken;

  // ---- loading the assistant ------------------------------------------------

  /** Pulls in the engine and the site's knowledge file, once, on first open. */
  function loadEngine() {
    if (engineRef.current) return Promise.resolve(engineRef.current);
    if (loadingRef.current) return loadingRef.current;
    loadingRef.current = (async () => {
      try {
        const [engine, response] = await Promise.all([
          import('../../lib/assistant/brain'),
          fetch('/assistant-knowledge.json', { headers: { Accept: 'application/json' } })
        ]);
        if (!response.ok) throw new Error('knowledge unavailable');
        const knowledge = (await response.json()) as AssistantKnowledge;
        const loaded = { engine, assistant: engine.createAssistant(knowledge) };
        engineRef.current = loaded;
        convRef.current = engine.initialState(currentPagePath());
        return loaded;
      } catch {
        loadingRef.current = null;
        return null;
      }
    })();
    return loadingRef.current;
  }

  function pushBot(reply: BotReply) {
    const id = nextId();
    setMessages((m) => [...m, { id, from: 'bot', content: renderChatMarkdown(reply.text) }]);
    transcriptRef.current.push({ from: 'bot', text: chatMarkdownToPlainText(reply.text) });
    setQuickReplies(reply.quickReplies ?? []);
    if (reply.lead) {
      const leadId = nextId();
      setMessages((m) => [...m, { id: leadId, from: 'bot', kind: 'lead', content: null }]);
      setLeadCard({ draft: reply.lead, status: 'ready', messageId: leadId });
    }
    if (!openRef.current) setUnread((n) => n + 1);
  }

  function offlineNotice() {
    pushBot({
      text: `Sorry - I'm having trouble loading right now. Please call us at **${business.hotline.display}**; a real person answers 24/7.`
    });
  }

  /** One message in, one reply out - queued so fast typing keeps its order. */
  function handleUserInput(text: string) {
    const clean = text.trim().slice(0, 500);
    if (!clean || busy) return;
    setMessages((m) => [...m, { id: nextId(), from: 'user', content: clean }]);
    transcriptRef.current.push({ from: 'user', text: clean });
    setQuickReplies([]);
    setBusy(true);
    setTyping(true);
    queueRef.current = queueRef.current.then(async () => {
      const loaded = await loadEngine();
      if (!loaded || !convRef.current) {
        setTyping(false);
        setBusy(false);
        offlineNotice();
        return;
      }
      const { state, reply } = loaded.engine.respond(convRef.current, clean, loaded.assistant, { now: new Date() });
      convRef.current = state;
      await new Promise((r) => setTimeout(r, typingPause(reply.text)));
      setTyping(false);
      setBusy(false);
      pushBot(reply);
    });
  }

  async function sendLead() {
    const current = leadCardRef.current;
    if (!current || current.status === 'sending' || current.status === 'sent') return;
    if (turnstileEnabled && !turnstileTokenRef.current) return;
    const { draft, messageId } = current;
    setLeadCard({ draft, status: 'sending', messageId });
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'chatbot',
          name: draft.name,
          phone: draft.phone,
          email: draft.email ?? '',
          city: draft.city ?? '',
          service: draft.service ?? '',
          propertyType: draft.propertyType ?? '',
          message: draft.details ?? '',
          urgent: draft.urgent,
          summary: draft.summary,
          topicsDiscussed: 'Website chat assistant conversation',
          pageUrl: currentPagePath(),
          transcript: transcriptRef.current
            .map((line) => `${line.from === 'bot' ? 'Assistant' : 'Visitor'}: ${line.text}`)
            .join('\n')
            .slice(-LEAD_LIMITS.transcript),
          company: '',
          turnstileToken: turnstileTokenRef.current ?? undefined
        })
      });
      if (!res.ok) throw new Error('Request failed');
      setLeadCard({ draft, status: 'sent', messageId });
      trackLead({ source: 'chatbot', service: draft.service, urgent: draft.urgent });
      const engine = engineRef.current?.engine;
      if (engine && convRef.current) convRef.current = engine.markLeadSent(convRef.current);
      const note = draft.urgent
        ? `Sent! The team has your details. Since it's urgent, calling **${business.hotline.display}** is the fastest way to reach someone right now.`
        : `Sent! Thanks, ${draft.name.split(' ')[0]}. The team will give you a call soon${draft.email ? `, and a confirmation is on its way to ${draft.email}` : ''}. Anything else I can help with?`;
      pushBot({ text: note, quickReplies: ['Any coupons?', 'Your hours', 'Talk to a person'] });
    } catch {
      setLeadCard({ draft, status: 'error', messageId });
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    }
  }

  // ---- open, greet, and keep the panel usable -------------------------------

  useEffect(() => {
    if (!open || greetedRef.current) return;
    greetedRef.current = true;
    setTyping(true);
    let cancelled = false;
    void (async () => {
      const loaded = await loadEngine();
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      setTyping(false);
      if (!loaded || !convRef.current) offlineNotice();
      else pushBot(loaded.engine.greeting(convRef.current, loaded.assistant, { now: new Date() }));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    // Storage can throw (Safari private mode, blocked site data); the teaser
    // is a nicety, so it simply shows once per page view in that case.
    try {
      if (sessionStorage.getItem(TEASER_SEEN_KEY)) return;
    } catch {
      /* storage unavailable */
    }
    const t = setTimeout(() => {
      setTeaser(true);
      try {
        sessionStorage.setItem(TEASER_SEEN_KEY, '1');
      } catch {
        /* storage unavailable */
      }
    }, 4500);
    return () => clearTimeout(t);
  }, []);

  // `open` belongs in here: the transcript survives a close, so reopening a
  // conversation with no new message left the scroller parked at the top.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Return focus to the launcher when the dialog closes, so a keyboard user
  // isn't dropped back at the top of the document.
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      return;
    }
    if (!hasOpenedRef.current) return;
    const t = window.setTimeout(() => launcherRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Phones get a full-screen chat. Track the breakpoint, lock page scroll
  // behind the panel, and follow the visual viewport so the on-screen
  // keyboard never covers the message box.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open || !isPhone) {
      setViewport(null);
      return;
    }
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const vv = window.visualViewport;
    const sync = () => {
      if (vv) setViewport({ height: vv.height, top: vv.offsetTop });
    };
    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    return () => {
      root.style.overflow = previousOverflow;
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
    };
  }, [open, isPhone]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      // aria-modal promises focus stays inside the dialog: wrap Tab at the ends.
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = [
          ...panelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
          )
        ].filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!panelRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const launcher = (e.target as HTMLElement).closest('[aria-label="Open chat"], [aria-label="Close chat"]');
        if (!launcher) setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  function handleSend() {
    const text = input;
    setInput('');
    handleUserInput(text);
  }

  const awaitingSend = leadCard?.status === 'ready' || leadCard?.status === 'error';

  return (
    <aside
      aria-label="Chat assistant"
      className={`fixed right-4 bottom-24 lg:right-6 lg:bottom-6 ${open ? 'z-[60]' : 'z-40'}`}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={isPhone ? { opacity: 0, y: 24 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={isPhone ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isPhone ? { opacity: 0, y: 24 } : { opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: EASE }}
            // Phones: the whole screen (height follows the visual viewport so the
            // keyboard never hides the input). Larger screens: floating panel.
            style={isPhone && viewport ? { height: viewport.height, top: viewport.top } : undefined}
            className="border-ink-100 fixed inset-x-0 top-0 z-[70] flex h-[100dvh] w-full flex-col overflow-hidden bg-white sm:static sm:mb-4 sm:h-[min(640px,75vh)] sm:w-[400px] sm:rounded-[1.75rem] sm:border sm:shadow-2xl sm:shadow-black/15"
            role="dialog"
            aria-modal="true"
            aria-label={`Chat with ${business.name}`}
          >
            <div className="bg-navy-900 relative shrink-0 overflow-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 sm:pt-5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(circle at 18% 0%, rgba(236,87,19,0.35), transparent 60%)' }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/20 bg-white">
                    <MessageCircle className="h-5 w-5 text-orange-600" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-white">{business.shortName}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs whitespace-nowrap text-white/75">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                      Assistant, here 24/7
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close chat"
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative mt-4 flex flex-wrap gap-2">
                <a
                  href={`tel:${business.hotline.tel}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                >
                  <Phone className="h-3 w-3" /> Call
                </a>
                <a
                  href={`mailto:${business.email}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                >
                  <Mail className="h-3 w-3" /> Email
                </a>
              </div>
            </div>

            <div ref={scrollRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) =>
                m.kind === 'lead' ? (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pl-9"
                  >
                    {leadCard && leadCard.messageId === m.id ? (
                      <div
                        className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 text-sm"
                        aria-label="Your service request details"
                      >
                        <p className="font-display text-ink-900 font-bold">
                          {leadCard.status === 'sent' ? 'Sent to our team' : 'Ready to send to our team'}
                        </p>
                        <dl className="text-ink-700 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                          <dt className="text-ink-500">Name</dt>
                          <dd>{leadCard.draft.name}</dd>
                          <dt className="text-ink-500">Phone</dt>
                          <dd>{leadCard.draft.phone}</dd>
                          {leadCard.draft.email && (
                            <>
                              <dt className="text-ink-500">Email</dt>
                              <dd className="break-all">{leadCard.draft.email}</dd>
                            </>
                          )}
                          {leadCard.draft.city && (
                            <>
                              <dt className="text-ink-500">City</dt>
                              <dd>{leadCard.draft.city}</dd>
                            </>
                          )}
                          {leadCard.draft.service && (
                            <>
                              <dt className="text-ink-500">Service</dt>
                              <dd>{leadCard.draft.service}</dd>
                            </>
                          )}
                          {leadCard.draft.urgent && (
                            <>
                              <dt className="text-ink-500">Priority</dt>
                              <dd className="font-semibold text-red-700">Urgent</dd>
                            </>
                          )}
                        </dl>
                        {leadCard.status === 'sent' ? (
                          <p className="mt-3 flex items-center gap-1.5 font-semibold text-emerald-700">
                            <CircleCheck className="h-4 w-4" aria-hidden="true" /> Received. We&rsquo;ll call you soon.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <Turnstile
                              key={turnstileKey}
                              onVerify={(token) => {
                                setTurnstileToken(token);
                                setTurnstileFailed(false);
                              }}
                              onExpire={() => setTurnstileToken(null)}
                              onError={() => setTurnstileFailed(true)}
                              theme="light"
                            />
                            {turnstileFailed && (
                              <p role="alert" className="text-xs font-medium text-red-700">
                                The security check couldn&rsquo;t load. Please call {business.hotline.display}.
                              </p>
                            )}
                            {leadCard.status === 'error' && (
                              <p role="alert" className="text-xs font-medium text-red-700">
                                That didn&rsquo;t go through. Try again, or call{' '}
                                <a href={`tel:${business.hotline.tel}`} className="underline">
                                  {business.hotline.display}
                                </a>
                                .
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => void sendLead()}
                                disabled={leadCard.status === 'sending' || (turnstileEnabled && !turnstileToken)}
                                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                {leadCard.status === 'sending' ? 'Sending…' : 'Send'}
                              </button>
                              <ActionButton
                                label="Change details"
                                disabled={leadCard.status === 'sending' || busy}
                                onClick={() => {
                                  pushBot({
                                    text: 'Sure - tell me what to change and I\'ll update it. For example: "my number is 719-555-0100" or "make it Monument".'
                                  });
                                  inputRef.current?.focus();
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-ink-400 text-xs italic">Details updated below.</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.from === 'bot' && <BotAvatar />}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed break-words sm:max-w-[78%] sm:text-sm ${
                        m.from === 'user'
                          ? 'rounded-br-md bg-orange-600 text-white'
                          : 'border-ink-100 text-ink-700 rounded-bl-md border bg-white'
                      }`}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                )
              )}
              {typing && <TypingIndicator />}
            </div>

            {quickReplies.length > 0 && !awaitingSend && (
              <div className="border-ink-100 bg-ink-50/60 shrink-0 border-t px-3 py-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {quickReplies.slice(0, 6).map((label) => (
                    <ActionButton key={label} label={label} disabled={busy} onClick={() => handleUserInput(label)} />
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="border-ink-100 flex shrink-0 items-center gap-2 border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                placeholder="Type a message…"
                aria-label="Message"
                enterKeyHint="send"
                // 16px on phones: iOS zooms the whole page into any smaller input.
                className="border-ink-200 text-ink-900 placeholder:text-ink-400 min-w-0 flex-1 rounded-full border bg-white px-4 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 sm:text-sm"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!input.trim() || busy}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-600 text-white transition-transform active:scale-95 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-ink-400 shrink-0 px-4 pb-3 text-center text-[11px]">
              {awaitingSend
                ? 'Your info goes straight to our team.'
                : `Automated assistant. For anything urgent, call ${business.hotline.display}.`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The teaser is absolutely positioned beside the launcher, outside the
          flex flow: as a flex sibling it resized this fixed container when it
          appeared and moved the launcher (a layout shift on every page). Desktop
          only: on a phone it covered the hero's call button. */}
      <div className="relative flex justify-end">
        <AnimatePresence>
          {teaser && !open && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="border-ink-100 absolute right-full bottom-0 mr-3 hidden w-[220px] items-start gap-2 rounded-2xl rounded-br-md border bg-white p-3.5 pr-2.5 shadow-xl shadow-black/10 lg:flex"
            >
              <p className="text-ink-700 flex-1 text-sm leading-snug">
                Got a plumbing, HVAC, or electrical question? I can help, or connect you to a real person.
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setTeaser(false)}
                className="text-ink-400 hover:bg-ink-100 hover:text-ink-700 grid h-6 w-6 shrink-0 place-items-center rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!open && (
            <motion.button
              ref={launcherRef}
              type="button"
              onClick={() => {
                setOpen(true);
                setTeaser(false);
                setUnread(0);
              }}
              aria-label="Open chat"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2, ease: EASE }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="group bg-navy-900 relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-[0_0_0_3px_var(--color-orange-400),var(--shadow-card-hover)] lg:h-16 lg:w-16"
            >
              <span
                aria-hidden
                className="animate-pulse-ring absolute inset-0 rounded-full border-2"
                style={{ borderColor: 'color-mix(in oklab, var(--color-orange-500) 55%, transparent)' }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle at 32% 26%, rgba(236,87,19,0.35), transparent 60%)' }}
              />
              <MessageCircle className="relative h-6 w-6 lg:h-7 lg:w-7" strokeWidth={2.25} />
              {unread > 0 && (
                <span className="border-ink-50 absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 bg-orange-600 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
