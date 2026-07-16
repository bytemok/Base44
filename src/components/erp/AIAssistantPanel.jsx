import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";

function Bubble({ message }) {
  const user = message.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${user ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700"}`}>
        {user ? <p>{message.content}</p> : <ReactMarkdown>{message.content || "Analizando..."}</ReactMarkdown>}
      </div>
    </div>
  );
}

export default function AIAssistantPanel() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Soy tu asistente ERP. Podés preguntarme qué sale hoy, qué falta recibir o qué pedidos conviene priorizar." }]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => setMessages(data.messages || []));
    return () => unsub();
  }, [conversation?.id]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    setSending(true);
    let conv = conversation;
    if (!conv) {
      conv = await base44.agents.createConversation({ agent_name: "erp_assistant", metadata: { name: "Asistente ERP", description: "Consultas operativas" } });
      setConversation(conv);
    }
    setMessages((m) => [...m, { role: "user", content }]);
    await base44.agents.addMessage(conv, { role: "user", content });
    setSending(false);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-xl bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-200"><Bot className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Agente IA ERP</h2>
          <p className="text-sm text-slate-500">Consultas rápidas sobre operación, ventas, logística y stock.</p>
        </div>
      </div>
      <div className="mb-3 h-64 space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3">
        {messages.map((m, i) => <Bubble key={i} message={m} />)}
        {sending && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</div>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej: ¿Qué pedidos tengo que coordinar hoy?" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
        <button disabled={sending || !text.trim()} className="rounded-xl bg-slate-900 px-3 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </section>
  );
}