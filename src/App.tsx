import { useState, useEffect, useRef, FormEvent } from 'react';
import { GameRoom, Question, ChoiceKey, WSMessage } from './types';
import { DEFAULT_QUESTIONS } from './data/defaultQuestions';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';
import { SoloQuizView } from './components/SoloQuizView';
import { QuestionEditor } from './components/QuestionEditor';
import { 
  Sparkles, Users, Play, BookOpen, Volume2, VolumeX, 
  ArrowRight, ShieldAlert, Cpu
} from 'lucide-react';
import { sounds } from './utils/soundEffects';

const AVATARS = ['🤖', '🧠', '⚡', '🚀', '🔮', '🐱', '🌟', '🎯', '👾', '🔥', '🦊', '🦉'];

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('prompt_quiz_questions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignore
      }
    }
    return DEFAULT_QUESTIONS;
  });

  const [activeMode, setActiveMode] = useState<'home' | 'host' | 'player' | 'solo'>('home');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(sounds.isSoundEnabled());

  // Join Room State
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('🤖');
  const [playerId, setPlayerId] = useState('');

  // Host Create Room State
  const [roomName, setRoomName] = useState('ห้องทายปัญหา AI & RTCFC');
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Active Live Room
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('room');
    if (codeParam) {
      setJoinCode(codeParam.toUpperCase());
    }
  }, []);

  // Save questions to localStorage
  const handleSaveQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    localStorage.setItem('prompt_quiz_questions', JSON.stringify(newQuestions));
    // If in host mode, update active room questions too
    if (currentRoom && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'update_questions',
          roomCode: currentRoom.code,
          questions: newQuestions,
        })
      );
    }
  };

  // Connect WebSocket helper
  const connectWebSocket = (onOpenCallback: (ws: WebSocket) => void) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      onOpenCallback(wsRef.current);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      wsRef.current = ws;
      onOpenCallback(ws);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type === 'sync_room') {
          setCurrentRoom(msg.room);
        } else if (msg.type === 'error') {
          setErrorMsg(msg.message);
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setErrorMsg('การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง');
    };

    ws.onclose = () => {
      // ws closed
    };
  };

  // Host creates room
  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          questions,
          timePerQuestion,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setCurrentRoom(data.room);
        connectWebSocket((ws) => {
          ws.send(
            JSON.stringify({
              type: 'join_room',
              roomCode: data.room.code,
              playerId: data.room.hostId,
              name: 'Host ผู้จัด',
              avatar: '👑',
              isHost: true,
            })
          );
        });
        setActiveMode('host');
      } else {
        setErrorMsg('สร้างห้องไม่สำเร็จ กรุณาลองใหม่');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Player joins room
  const handleJoinRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !playerName.trim()) {
      setErrorMsg('กรุณากรอกรหัสห้องและชื่อเล่นของคุณ');
      return;
    }
    setErrorMsg('');

    const formattedCode = joinCode.trim().toUpperCase();
    try {
      const res = await fetch(`/api/rooms/${formattedCode}`);
      const data = await res.json();
      if (!data.success || !data.room) {
        setErrorMsg(data.error || 'ไม่พบรหัสห้องนี้');
        return;
      }

      const pId = 'p-' + Math.random().toString(36).substring(2, 9);
      setPlayerId(pId);
      setCurrentRoom(data.room);

      connectWebSocket((ws) => {
        ws.send(
          JSON.stringify({
            type: 'join_room',
            roomCode: formattedCode,
            playerId: pId,
            name: playerName.trim(),
            avatar: playerAvatar,
            isHost: false,
          })
        );
      });
      setActiveMode('player');
    } catch {
      setErrorMsg('ไม่สามารถเข้าร่วมห้องได้ โปรดตรวจสอบการเชื่อมต่อ');
    }
  };

  // Host starts game
  const handleHostStartGame = () => {
    if (wsRef.current && currentRoom) {
      wsRef.current.send(
        JSON.stringify({
          type: 'start_game',
          roomCode: currentRoom.code,
        })
      );
    }
  };

  // Host advances next phase
  const handleHostNextPhase = () => {
    if (wsRef.current && currentRoom) {
      wsRef.current.send(
        JSON.stringify({
          type: 'next_phase',
          roomCode: currentRoom.code,
        })
      );
    }
  };

  // Host restarts game
  const handleHostRestartGame = () => {
    if (wsRef.current && currentRoom) {
      wsRef.current.send(
        JSON.stringify({
          type: 'restart_game',
          roomCode: currentRoom.code,
        })
      );
    }
  };

  // Player submits answer
  const handlePlayerSubmitAnswer = (choice: ChoiceKey, timeTakenMs: number) => {
    if (wsRef.current && currentRoom && playerId) {
      wsRef.current.send(
        JSON.stringify({
          type: 'submit_answer',
          roomCode: currentRoom.code,
          playerId,
          choice,
          timeTakenMs,
        })
      );
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setCurrentRoom(null);
    setActiveMode('home');
  };

  const toggleSound = () => {
    const s = sounds.toggleSound();
    setSoundOn(s);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Prompt',sans-serif]">
      {/* Global Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div 
            onClick={() => {
              if (activeMode !== 'home') {
                if (confirm('คุณต้องการออกจากหน้าปัจจุบันกลับไปหน้าหลักหรือไม่?')) {
                  handleLeaveRoom();
                }
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Prompt Game Quiz
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  AI Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generative AI • Gemini • RTCFC • Google AI Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">จัดการคำถาม</span> ({questions.length})
            </button>
            <button
              onClick={toggleSound}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
              title={soundOn ? 'ปิดเสียง' : 'เปิดเสียง'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main View Switcher */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {activeMode === 'home' && (
          <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-10 animate-in fade-in duration-300">
            {/* Hero Greeting */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                เกมตอบคำถามออนไลน์ Real-time บนคลาวด์
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                ประลองปัญญา AI & Prompt Engineering
              </h1>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                ชุดคำถาม 10 ข้อ เจาะลึก Generative AI, สูตร RTCFC Prompting, Google AI Studio และ Gemini พร้อมระบบสร้างห้องเล่นสดพร้อมกันแบบเรียลไทม์
              </p>
            </div>

            {errorMsg && (
              <div className="max-w-md mx-auto p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Action Cards: 1. Host Game | 2. Join Game */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Card 1: Join Game */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <Users className="w-4 h-4" />
                    เข้าร่วมห้องเล่นเกม (Join Room)
                  </div>
                  <h3 className="text-xl font-bold text-white">ใส่รหัส PIN เพื่อเข้าเล่น</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ใส่รหัสห้อง 4 หลักจาก Host แล้วตั้งชื่อเล่นเพื่อแข่งขันกับเพื่อนทันที
                  </p>
                </div>

                <form onSubmit={handleJoinRoom} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      รหัสห้อง (Room PIN)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="เช่น B4X9"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base font-mono font-bold tracking-widest text-center text-indigo-300 focus:outline-none focus:border-indigo-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      ชื่อเล่นของคุณ
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="เช่น PromptMaster, น้องกูเกิล"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      เลือก Avatar
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVATARS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setPlayerAvatar(av)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                            playerAvatar === av
                              ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-110 shadow-md'
                              : 'bg-slate-950 hover:bg-slate-800'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 hover:scale-[1.01]"
                  >
                    เข้าร่วมห้องเลย!
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Card 2: Create / Host Game */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Play className="w-4 h-4 fill-emerald-400" />
                    สร้างห้องใหม่ (Host Game)
                  </div>
                  <h3 className="text-xl font-bold text-white">เป็นผู้จัดห้องแข่งขัน</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    สร้างห้อง ฉายจอคำถามบนหน้าจอใหญ่ มีสถิติคำตอบ และตารางคะแนนแบบเรียลไทม์
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      ชื่อห้องแข่งขัน
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      เวลาตอบต่อข้อ (วินาที)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 20, 30, 45].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setTimePerQuestion(sec)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            timePerQuestion === sec
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {sec} วิ
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">ชุดคำถามที่ใช้:</span>
                    <span className="font-bold text-indigo-300">{questions.length} ข้อ</span>
                  </div>

                  <button
                    type="button"
                    disabled={isCreatingRoom}
                    onClick={handleCreateRoom}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 hover:scale-[1.01]"
                  >
                    {isCreatingRoom ? 'กำลังสร้างห้อง...' : 'สร้างห้องและเริ่มเป็น Host'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Solo Practice Mode Shortcut */}
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-2xl gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">ต้องการลองเล่นคนเดียวก่อน?</h4>
                  <p className="text-xs text-slate-400">
                    เข้าสู่โหมดซ้อมเดี่ยวเพื่อทำความคุ้นเคยกับคำถาม 10 ข้อและอ่านคำอธิบายได้ทันที
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMode('solo')}
                className="whitespace-nowrap px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                เข้าโหมดซ้อมเดี่ยว
              </button>
            </div>
          </div>
        )}

        {/* HOST SCREEN */}
        {activeMode === 'host' && currentRoom && (
          <HostView
            room={currentRoom}
            onStartGame={handleHostStartGame}
            onNextPhase={handleHostNextPhase}
            onRestartGame={handleHostRestartGame}
            onOpenEditor={() => setIsEditorOpen(true)}
            onLeave={handleLeaveRoom}
          />
        )}

        {/* PLAYER SCREEN */}
        {activeMode === 'player' && currentRoom && (
          <PlayerView
            room={currentRoom}
            playerId={playerId}
            onSubmitAnswer={handlePlayerSubmitAnswer}
            onLeave={handleLeaveRoom}
          />
        )}

        {/* SOLO PRACTICE SCREEN */}
        {activeMode === 'solo' && (
          <SoloQuizView
            questions={questions}
            onBackHome={() => setActiveMode('home')}
          />
        )}
      </main>

      {/* Question Editor Modal */}
      {isEditorOpen && (
        <QuestionEditor
          questions={questions}
          onSave={handleSaveQuestions}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}
