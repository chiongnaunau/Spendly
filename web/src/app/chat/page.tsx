'use client';
import { useEffect, useRef, useState } from 'react';
import { sendMessage } from '@/lib/api';
import type { ChatReply } from '@/lib/types';
import { useTranslation } from '@/hooks/useTranslation';
import { Send, Bot, User, Zap, Database, Search, RotateCcw } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  meta?: ChatReply;
  time?: string;
};

const SUGGESTIONS = [
  'Tháng này tôi đã chi tiêu hết bao nhiêu?',
  'Chi tiêu cho ăn uống trong tháng này là bao nhiêu?',
  'Liệt kê các giao dịch gần đây nhất của tôi',
  'Tìm các giao dịch tương tự tiền mua cà phê hoặc siêu thị',
];

const STORAGE_KEY = 'spendly_chat_history';

function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t('chat.intro') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && messages[0].role === 'user')) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Ignore storage errors
      }
    }
  }, [messages]);

  async function handleSend(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text, time: formatCurrentTime() };
    const nextMessages = [...messages, userMsg];
    setInput('');
    setMessages(nextMessages);
    setLoading(true);

    // Extract previous conversation turns for multi-turn context
    const historyPayload = nextMessages
      .slice(0, -1) // All except current message
      .filter(m => m.content && m.content !== t('chat.intro'))
      .slice(-8) // Last 8 turns
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const reply = await sendMessage(text, historyPayload);
      setMessages(m => [
        ...m,
        { role: 'assistant', content: reply.reply, meta: reply, time: formatCurrentTime() }
      ]);
    } catch (e) {
      setMessages(m => [
        ...m,
        { role: 'assistant', content: e instanceof Error ? e.message : t('chat.error'), time: formatCurrentTime() }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  function handleClearHistory() {
    if (window.confirm(t('chat.clearConfirm'))) {
      const initial: Message[] = [{ role: 'assistant', content: t('chat.intro'), time: formatCurrentTime() }];
      setMessages(initial);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }

  const toolIcon = (tool: string) => {
    if (tool.includes('db')) return <Database size={12} />;
    if (tool.includes('memory') || tool.includes('search')) return <Search size={12} />;
    return <Zap size={12} />;
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div className="page-header" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">{t('chat.title')}</h1>
            <span className="badge badge-success"><Zap size={10} /> LangGraph MCP + RAG</span>
          </div>
          <p className="page-subtitle">{t('chat.subtitle')}</p>
        </div>

        {/* Clear / New Chat Button */}
        {messages.length > 1 && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleClearHistory}
            title={t('chat.clearConfirm')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RotateCcw size={14} />
            <span>{t('chat.newChat')}</span>
          </button>
        )}
      </div>

      {/* Agent info bar */}
      <div className="card mb-4" style={{ padding: '12px 16px', background: 'var(--accent-muted)', border: '1px solid var(--accent-light)' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--accent)', fontWeight: 600, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Database size={12} /> {t('chat.agentBarDb')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Search size={12} /> {t('chat.agentBarMemory')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Bot size={12} /> {t('chat.agentBarGemini')}</span>
        </div>
      </div>

      {/* Messages list */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: msg.role === 'user' ? 'var(--text-on-accent)' : 'var(--accent)',
                }}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className={'chat-bubble ' + (msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant')}>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</div>
                  </div>
                  {msg.time && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, padding: '0 4px' }}>
                      {msg.time}
                    </span>
                  )}
                </div>
              </div>
              {msg.meta && msg.meta.tool_used !== 'none' && (
                <div className="chat-meta" style={{ paddingLeft: msg.role === 'user' ? 0 : 42, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {toolIcon(msg.meta.tool_used)}
                  <span>{t('chat.toolUsed')}: <strong>{msg.meta.tool_used}</strong></span>
                  <span>·</span>
                  <span>{msg.meta.latency_ms}{t('chat.latency')}</span>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Bot size={16} />
              </div>
              <div className="chat-bubble chat-bubble-assistant" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('chat.thinking')}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion Chips */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto', borderTop: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
          {((t('chat.suggestions') as unknown as string[]) || SUGGESTIONS).map((item, idx) => (
            <button
              key={idx}
              className="btn btn-sm btn-secondary"
              onClick={() => void handleSend(item)}
              disabled={loading}
              style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap', borderRadius: 12 }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="chat-input-row" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <textarea
            className="input"
            style={{ flex: 1, minHeight: 44, maxHeight: 120, resize: 'none', padding: '10px 14px' }}
            placeholder={t('chat.placeholder')}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            rows={1}
          />
          <button
            className="btn btn-primary"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            style={{ alignSelf: 'flex-end', padding: '10px 16px' }}
          >
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
              : <Send size={16} />}
            <span style={{ marginLeft: 4 }}>{t('chat.send')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
