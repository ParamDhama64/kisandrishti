import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  X,
  Sparkles,
  Bot,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
  Wheat,
} from 'lucide-react';
import { speechHandler } from '../../services/speechService';
import { FarmerLocation, CurrentWeatherData } from '../../types/weather';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface KisanChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  location: FarmerLocation;
  currentWeather: CurrentWeatherData | null;
  lang: 'hi' | 'en';
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

export const KisanChatbot: React.FC<KisanChatbotProps> = ({
  isOpen,
  onClose,
  location,
  currentWeather,
  lang,
  initialQuery,
  onClearInitialQuery,
}) => {
  const isHi = lang === 'hi';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: isHi
        ? `राम-राम किसान भाई! 🙏\nमैं **किसान मित्र** (Gemini 3.5 Flash AI कृषि मौसम सलाहकार) हूं।\n\n📍 **आपका खेत**: ${location.name}\n🌡️ **वर्तमान मौसम**: ${currentWeather?.temperature ?? 28}°C | हवा: ${currentWeather?.windSpeed ?? 12} km/h\n\nअपनी फसल, खाद, सिंचाई, कीटनाशक छिड़काव अथवा मौसम जोखिम के बारे में कोई भी प्रश्न पूछें।`
        : `Greetings farmer! 🙏\nI am **Kisan Mitra** (Gemini 3.5 Flash Agromet AI Advisor).\n\n📍 **Your Farm**: ${location.name}\n🌡️ **Live Weather**: ${currentWeather?.temperature ?? 28}°C | Wind: ${currentWeather?.windSpeed ?? 12} km/h\n\nAsk any question about crop management, irrigation, spraying timing, or weather risks.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle incoming query passed from the bottom search bar
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery.trim());
      onClearInitialQuery?.();
    }
  }, [isOpen, initialQuery]);

  const quickPrompts = isHi
    ? [
        'क्या आज कीटनाशक छिड़क सकते हैं?',
        'अगले 3 दिनों में बारिश होगी क्या?',
        'यूरिया खाद और सिंचाई का सही समय?',
        'माहू व फफूंद रोग की रोकथाम कैसे करें?',
      ]
    : [
        'Is it safe to spray pesticides today?',
        'Will it rain in the next 3 days?',
        'Optimal timing for irrigation & fertilizer?',
        'How to prevent fungal blight & aphids?',
      ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          language: lang,
          location,
          currentWeather,
          selectedCrop: location.crop,
        }),
      });

      if (!res.ok) throw new Error('Chat API response not ok');
      const data = await res.json();

      const aiMsg: ChatMessage = {
        role: 'model',
        content: data.reply || (isHi ? 'मौसम सलाह उपलब्ध नहीं है।' : 'Advisory unavailable.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackMsg: ChatMessage = {
        role: 'model',
        content: isHi
          ? `🌾 **किसान सलाह (${location.name})**: हवा की गति ${currentWeather?.windSpeed ?? 12} km/h है। तेज हवा होने पर छिड़काव टालें। नमी देखकर हल्की सिंचाई करें।`
          : `🌾 **Advisory (${location.name})**: Wind speed is ${currentWeather?.windSpeed ?? 12} km/h. Postpone spraying if winds exceed 15 km/h. Irrigate based on soil moisture.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMic = () => {
    if (isListening) {
      speechHandler.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    speechHandler.startListening({
      lang,
      onResult: (transcript, isFinal) => {
        setInputMessage(transcript);
        if (isFinal && transcript.trim().length > 3) {
          setIsListening(false);
          handleSendMessage(transcript);
        }
      },
      onError: () => setIsListening(false),
      onEnd: () => setIsListening(false),
    });
  };

  const handleToggleSpeak = (text: string, index: number) => {
    if (speakingIndex === index) {
      speechHandler.stopSpeaking();
      setSpeakingIndex(null);
    } else {
      setSpeakingIndex(index);
      speechHandler.speak(text, lang, () => {
        setSpeakingIndex(null);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-16 right-4 z-[650] w-96 max-w-[calc(100vw-2rem)] flex flex-col rounded-3xl border border-emerald-500/30 bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-white overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-950/60 to-slate-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Bot className="h-5 w-5 text-yellow-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                {isHi ? 'किसान मित्र चैटबॉट' : 'Kisan Mitra AI Chat'}
              </h3>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                gemini-3.5-flash
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {location.name} • {currentWeather?.temperature ?? 28}°C
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setMessages(messages.slice(0, 1));
            }}
            title="Reset Chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              {msg.role === 'model' && (
                <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] text-slate-400">
                  <span>{msg.timestamp}</span>
                  <button
                    onClick={() => handleToggleSpeak(msg.content, idx)}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    {speakingIndex === idx ? (
                      <>
                        <VolumeX className="h-3 w-3 animate-pulse" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3 w-3" />
                        <span>Listen (सुनें)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <span className="mt-0.5 text-[9px] text-slate-500 pr-1">{msg.timestamp}</span>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-3 text-slate-400 w-32 border border-white/5 animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
            <span className="text-[11px]">{isHi ? 'सोच रहा है...' : 'Thinking...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Follow-up Chips */}
      <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto scrollbar-none border-t border-white/5 bg-slate-950/80">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="whitespace-nowrap rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-white/10 bg-slate-950/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 p-1.5 focus-within:border-emerald-500/50"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isHi ? 'पूछें: खाद, कीटनाशक, बारिश या रोग के बारे में...' : 'Ask about crops, pests, fertilizer, rain...'
            }
            className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-slate-400 outline-none"
          />

          <button
            type="button"
            onClick={handleStartMic}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-slate-300 hover:text-white'
            }`}
            title="Speak message"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
