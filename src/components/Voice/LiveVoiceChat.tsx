import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, Radio, AlertCircle, Sparkles, VolumeX } from 'lucide-react';
import { FarmerLocation, CurrentWeatherData } from '../../types/weather';
import { speechHandler } from '../../services/speechService';

interface LiveVoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
  location: FarmerLocation;
  currentWeather: CurrentWeatherData | null;
  lang: 'hi' | 'en';
}

export const LiveVoiceChat: React.FC<LiveVoiceChatProps> = ({
  isOpen,
  onClose,
  location,
  currentWeather,
  lang,
}) => {
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [conversation, setConversation] = useState<{ sender: 'farmer' | 'gemini'; text: string }[]>([]);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const isHi = lang === 'hi';

  // Ask microphone permission and start voice loop
  const requestMicAndStart = async () => {
    try {
      setStatusMessage(isHi ? 'माइक्रोफ़ोन अनुमति मांग रहे हैं...' : 'Requesting microphone permission...');

      // 1. Prompt browser microphone permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setMicPermissionGranted(true);
      setIsMicActive(true);

      // 2. Setup Web Audio API & volume analyser meter
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Volume monitoring loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitorVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(monitorVolume);
      };
      monitorVolume();

      setStatusMessage(isHi ? 'माइक सक्रिय है। अपनी फसल या मौसम के बारे में बोलें...' : 'Microphone active! Speak your agricultural question...');

      // 3. Connect WebSocket to /live
      connectWebSocket();

      // 4. Start Speech Recognition listener
      startSpeechRecognition();
    } catch (err: any) {
      console.warn('Microphone permission denied or failed:', err);
      setMicPermissionGranted(false);
      setIsMicActive(false);
      setStatusMessage(
        isHi
          ? 'माइक्रोफ़ोन की अनुमति अस्वीकृत या उपलब्ध नहीं है। कृपया ब्राउज़र सेटिंग्स में माइक चालू करें।'
          : 'Microphone permission denied. Please allow microphone access in browser settings.'
      );
    }
  };

  // Connect to backend /live WebSocket
  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'speech_response' && msg.text) {
            handleGeminiResponse(msg.text);
          } else if (msg.type === 'audio' && msg.audio) {
            playRawPcmChunk(msg.audio);
          }
        } catch (e) {
          console.warn('WS parse error:', e);
        }
      };

      ws.onerror = () => {
        console.warn('WebSocket /live error');
      };
    } catch (err) {
      console.warn('WS connect error:', err);
    }
  };

  // Continuous speech recognition for real-time talk
  const startSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spoken = (final || interim).trim();
        if (spoken) {
          setCurrentSpokenText(spoken);
        }

        // When farmer finishes a sentence
        if (final && final.trim().length > 3) {
          sendFarmerVoiceQuery(final.trim());
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Speech rec error:', e.error);
        }
      };

      recognition.onend = () => {
        if (isMicActive) {
          try {
            recognition.start();
          } catch (_) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition init error:', err);
    }
  };

  // Play audio chunk from Gemini
  const playRawPcmChunk = (base64Audio: string) => {
    try {
      setIsAiSpeaking(true);
      const audioCtx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const binary = atob(base64Audio);
      const buffer = new ArrayBuffer(binary.length);
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }
      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();

      source.onended = () => {
        setIsAiSpeaking(false);
      };
    } catch (err) {
      console.warn('PCM chunk playback error:', err);
      setIsAiSpeaking(false);
    }
  };

  // Send farmer query to server
  const sendFarmerVoiceQuery = async (queryText: string) => {
    setConversation((prev) => [...prev, { sender: 'farmer', text: queryText }]);
    setCurrentSpokenText('');
    setStatusMessage(isHi ? 'Gemini उत्तर दे रहा है...' : 'Gemini is answering...');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          text: queryText,
          lang,
          location,
          weather: currentWeather,
        })
      );
    } else {
      // Fallback via HTTP
      try {
        const res = await fetch('/api/farmer-advisory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryText,
            language: lang,
            location,
            currentWeather,
            selectedCrop: location.crop,
          }),
        });
        const data = await res.json();
        handleGeminiResponse(data.advisory || '');
      } catch (err) {
        console.warn('Advisory query error:', err);
      }
    }
  };

  // Speaks Gemini response out loud so farmer HEARS it clearly
  const handleGeminiResponse = (text: string) => {
    setConversation((prev) => [...prev, { sender: 'gemini', text }]);
    setStatusMessage(isHi ? 'Gemini बोल रहा है...' : 'Gemini speaking...');
    setIsAiSpeaking(true);

    speechHandler.speak(text, lang, () => {
      setIsAiSpeaking(false);
      setStatusMessage(isHi ? 'माइक चालू है, अगला प्रश्न पूछें...' : 'Listening, ask your next question...');
    });
  };

  const stopAllAudio = () => {
    speechHandler.stopSpeaking();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsMicActive(false);
    setIsAiSpeaking(false);
    setMicVolume(0);
  };

  useEffect(() => {
    if (isOpen) {
      requestMicAndStart();
    } else {
      stopAllAudio();
    }
    return () => {
      stopAllAudio();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl text-white flex flex-col items-center text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
          <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
          <span>Gemini 3.8 Live Voice Chat</span>
        </div>

        {/* Pulsing Audio Orb with Visualizer Volume */}
        <div className="relative my-7 flex h-36 w-36 items-center justify-center">
          {/* Animated Wave Rings */}
          <div
            className={`absolute inset-0 rounded-full border-2 transition-all duration-150 ${
              isAiSpeaking
                ? 'border-cyan-400/80 scale-125 animate-ping'
                : isMicActive && micVolume > 10
                ? 'border-emerald-400/60 scale-110'
                : 'border-white/10'
            }`}
          />

          <div
            className="absolute rounded-full bg-gradient-to-tr transition-all duration-150"
            style={{
              width: `${100 + micVolume * 0.4}px`,
              height: `${100 + micVolume * 0.4}px`,
              background: isAiSpeaking
                ? 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(37, 99, 235, 0.1) 70%)'
                : 'radial-gradient(circle, rgba(52, 211, 153, 0.4) 0%, rgba(13, 148, 136, 0.1) 70%)',
            }}
          />

          {/* Central Orb */}
          <div
            className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all duration-200 ${
              isAiSpeaking
                ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/50 scale-110'
                : isMicActive
                ? 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/50'
                : 'bg-slate-800'
            }`}
          >
            {isAiSpeaking ? (
              <Volume2 className="h-10 w-10 text-white animate-bounce" />
            ) : isMicActive ? (
              <Mic className="h-10 w-10 text-white animate-pulse" />
            ) : (
              <MicOff className="h-10 w-10 text-slate-400" />
            )}
          </div>
        </div>

        {/* Live Mic Input Volume Meter */}
        {isMicActive && (
          <div className="w-48 mb-3">
            <div className="flex justify-between text-[10px] text-slate-400 pb-1">
              <span>{isHi ? 'माइक आवाज स्तर' : 'Mic Input Level'}</span>
              <span className="text-emerald-400 font-bold">{micVolume}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-75"
                style={{ width: `${Math.max(5, micVolume)}%` }}
              />
            </div>
          </div>
        )}

        {/* Current State / Transcript Display */}
        <h3 className="text-base font-bold text-slate-100">
          {isAiSpeaking
            ? isHi
              ? 'Gemini आपको सलाह दे रहा है...'
              : 'Gemini speaking to you...'
            : isMicActive
            ? currentSpokenText
              ? `"${currentSpokenText}"`
              : isHi
              ? 'आपकी आवाज सुन रहा है... बोलिए'
              : 'Listening to your voice... Speak now'
            : isHi
            ? 'माइक अनुमति की प्रतीक्षा...'
            : 'Awaiting microphone access...'}
        </h3>

        {/* Status Prompt */}
        <p className="mt-2 text-xs text-emerald-300/90 max-w-sm leading-relaxed bg-white/5 rounded-xl p-2.5 border border-white/5">
          {statusMessage}
        </p>

        {/* Last Gemini Audio Text Snippet */}
        {conversation.length > 0 && (
          <div className="mt-3 max-h-28 w-full overflow-y-auto rounded-xl bg-slate-900/90 border border-white/10 p-2.5 text-left text-[11px] text-slate-300 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
            {conversation.slice(-3).map((item, i) => (
              <div key={i} className="leading-relaxed">
                <span className="font-bold text-emerald-400">
                  {item.sender === 'farmer' ? (isHi ? 'आप: ' : 'You: ') : 'Gemini: '}
                </span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-5 flex items-center gap-2">
          {!micPermissionGranted ? (
            <button
              onClick={requestMicAndStart}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl hover:bg-emerald-500 transition active:scale-95"
            >
              <Mic className="h-4 w-4" />
              <span>{isHi ? 'माइक अनुमति दें व बात करें' : 'Allow Mic & Start Talking'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (isMicActive) {
                  stopAllAudio();
                } else {
                  requestMicAndStart();
                }
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold shadow-xl transition active:scale-95 ${
                isMicActive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isMicActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span>{isMicActive ? (isHi ? 'माइक बंद करें' : 'Stop Listening') : isHi ? 'माइक पुनः चालू करें' : 'Restart Mic'}</span>
            </button>
          )}

          {isAiSpeaking && (
            <button
              onClick={() => speechHandler.stopSpeaking()}
              className="flex items-center gap-1 rounded-2xl bg-white/10 px-3 py-2.5 text-xs text-slate-300 hover:text-white"
            >
              <VolumeX className="h-4 w-4 text-amber-400" />
              <span>{isHi ? 'रोकें' : 'Mute'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
