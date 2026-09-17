import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { GameRoom, Question, ChoiceKey, Player } from '../types';
import { sounds } from '../utils/soundEffects';
import { 
  Users, Play, FastForward, Trophy, Volume2, VolumeX, 
  Copy, Check, Edit3, ArrowRight, RotateCcw, Clock, Sparkles, AlertCircle
} from 'lucide-react';

interface HostViewProps {
  room: GameRoom;
  onStartGame: () => void;
  onNextPhase: () => void;
  onRestartGame: () => void;
  onOpenEditor: () => void;
  onLeave: () => void;
}

export const HostView: React.FC<HostViewProps> = ({
  room,
  onStartGame,
  onNextPhase,
  onRestartGame,
  onOpenEditor,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(sounds.isSoundEnabled());
  const [timeLeft, setTimeLeft] = useState(room.timePerQuestion);

  const playersList: Player[] = (Object.values(room.players || {}) as Player[]).filter(
    (p) => !p.isHost || Object.keys(room.players).length === 1
  );
  const totalPlayers = playersList.length;
  const answeredCount = playersList.filter((p) => p.lastAnswer !== undefined).length;
  const currentQ: Question | undefined = room.questions[room.currentQuestionIndex];

  // Sound toggle
  const toggleSound = () => {
    const newState = sounds.toggleSound();
    setSoundOn(newState);
  };

  // Copy join link
  const copyJoinLink = () => {
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Timer effect during active question
  useEffect(() => {
    if (room.status !== 'question') return;

    setTimeLeft(room.timePerQuestion);
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.questionStartTime) / 1000);
      const remaining = Math.max(0, room.timePerQuestion - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 5 && remaining > 0) {
        sounds.playTick();
      }

      if (remaining === 0) {
        clearInterval(interval);
        sounds.playCountdownUrgent();
        // Trigger reveal when time expires
        onNextPhase();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [room.status, room.currentQuestionIndex, room.questionStartTime, room.timePerQuestion, onNextPhase]);

  // Audio & confetti on phase changes
  useEffect(() => {
    if (room.status === 'reveal') {
      sounds.playCorrect();
    } else if (room.status === 'finished') {
      sounds.playFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      const timeout = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [room.status]);

  // Choice metadata colors and icons
  const choiceMeta: Record<ChoiceKey, { bg: string; border: string; text: string; shape: string }> = {
    ก: { bg: 'bg-rose-500/15 hover:bg-rose-500/25', border: 'border-rose-500/40', text: 'text-rose-400', shape: '▲' },
    ข: { bg: 'bg-sky-500/15 hover:bg-sky-500/25', border: 'border-sky-500/40', text: 'text-sky-400', shape: '◆' },
    ค: { bg: 'bg-amber-500/15 hover:bg-amber-500/25', border: 'border-amber-500/40', text: 'text-amber-400', shape: '●' },
    ง: { bg: 'bg-emerald-500/15 hover:bg-emerald-500/25', border: 'border-emerald-500/40', text: 'text-emerald-400', shape: '■' },
  };

  // Answer distribution stats
  const answerStats: Record<ChoiceKey, number> = { ก: 0, ข: 0, ค: 0, ง: 0 };
  playersList.forEach((p) => {
    if (p.lastAnswer) {
      answerStats[p.lastAnswer.choice] = (answerStats[p.lastAnswer.choice] || 0) + 1;
    }
  });

  // Ranked players
  const sortedPlayers = [...playersList].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col min-h-[85vh] p-4 md:p-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-xl font-mono font-bold text-lg border border-indigo-500/30 flex items-center gap-2">
            <span>PIN:</span>
            <span className="text-white tracking-widest text-xl">{room.code}</span>
          </div>
          <button
            onClick={copyJoinLink}
            className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'คัดลอกลิงก์แล้ว!' : 'คัดลอกลิงก์ชวนเพื่อน'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
            title={soundOn ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={onLeave}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            ออกจากห้อง
          </button>
        </div>
      </div>

      {/* PHASE 1: LOBBY */}
      {room.status === 'lobby' && (
        <div className="flex-1 flex flex-col justify-between space-y-8 animate-in fade-in duration-300">
          <div className="text-center space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              ห้องรอเริ่มเกม (Host Lobby)
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              เข้าเล่นที่ลิงก์นี้ แล้วใส่ PIN
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="text-5xl md:text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 tracking-wider py-2">
                {room.code}
              </div>
            </div>
            <p className="text-sm text-slate-400">
              ผู้เล่นสามารถเปิดเล่นบนมือถือหรือแท็บเบราว์เซอร์อื่นได้พร้อมกันแบบเรียลไทม์!
            </p>
          </div>

          {/* Connected Players Grid */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  ผู้เล่นในห้อง ({playersList.length} คน)
                </h3>
              </div>
              <button
                onClick={onOpenEditor}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                ปรับแต่งชุดคำถาม ({room.questions.length} ข้อ)
              </button>
            </div>

            {playersList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6 animate-pulse" />
                </div>
                <p className="text-sm font-medium">กำลังรอผู้เล่นเข้าร่วมห้อง...</p>
                <p className="text-xs text-slate-600 max-w-sm">
                  แชร์รหัส <span className="font-mono text-indigo-400">{room.code}</span> หรือลิงก์เพื่อชวนเพื่อนเข้ามาเล่น
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto max-h-72 p-1">
                {playersList.map((player) => (
                  <div
                    key={player.id}
                    className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center gap-2.5 shadow-sm hover:border-indigo-500/40 transition-colors"
                  >
                    <span className="text-2xl">{player.avatar}</span>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        พร้อมเล่น
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              เวลาต่อข้อ: <span className="font-semibold text-white">{room.timePerQuestion} วินาที</span> • จำนวนโจทย์: <span className="font-semibold text-white">{room.questions.length} ข้อ</span>
            </div>
            <button
              onClick={onStartGame}
              disabled={playersList.length === 0}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-base rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-white" />
              เริ่มเกมเลย!
            </button>
          </div>
        </div>
      )}

      {/* PHASE 1.5: COUNTDOWN */}
      {room.status === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-32 h-32 rounded-full bg-indigo-600/20 border-4 border-indigo-500 flex items-center justify-center text-6xl font-black text-white shadow-2xl shadow-indigo-500/50 animate-bounce">
            !
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-white">เตรียมตัวให้พร้อม...</h2>
            <p className="text-slate-400 text-sm">เกมกำลังจะเริ่มใน 3 วินาที!</p>
          </div>
        </div>
      )}

      {/* PHASE 2: QUESTION */}
      {room.status === 'question' && currentQ && (
        <div className="flex-1 flex flex-col justify-between space-y-6 animate-in fade-in duration-200">
          {/* Top Question Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold">
                  ข้อ {room.currentQuestionIndex + 1} / {room.questions.length}
                </span>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-medium">
                  {currentQ.category}
                </span>
                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-[11px]">
                  {currentQ.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className={`text-base font-bold ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  ตอบแล้ว: <span className="font-bold text-emerald-400">{answeredCount}</span> / {totalPlayers} คน
                </div>
              </div>
            </div>

            {/* Timer Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-linear rounded-full ${
                  timeLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                }`}
                style={{ width: `${(timeLeft / room.timePerQuestion) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl text-center flex flex-col justify-center min-h-[160px]">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
              {currentQ.question}
            </h2>
          </div>

          {/* 4 Choices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQ.choices.map((choice) => {
              const meta = choiceMeta[choice.key];
              return (
                <div
                  key={choice.key}
                  className={`p-4 md:p-5 rounded-2xl border ${meta.border} ${meta.bg} transition-all flex items-center gap-4`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center font-bold text-lg ${meta.text}`}>
                    {meta.shape}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">
                      ข้อ {choice.key}.
                    </span>
                    <p className="text-base font-semibold text-white leading-snug">
                      {choice.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Host Next Phase Control */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onNextPhase}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors border border-slate-700 flex items-center gap-2"
            >
              <FastForward className="w-4 h-4" />
              เฉลยทันที (ข้ามเวลา)
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: REVEAL & EXPLANATION */}
      {room.status === 'reveal' && currentQ && (
        <div className="flex-1 flex flex-col justify-between space-y-6 animate-in fade-in duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                เฉลยคำตอบข้อ {room.currentQuestionIndex + 1}
              </span>
              <span className="text-xs text-slate-400">{currentQ.category}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {currentQ.question}
            </h2>
          </div>

          {/* Choices with answer distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {currentQ.choices.map((choice) => {
              const isCorrect = choice.key === currentQ.answer;
              const votes = answerStats[choice.key] || 0;
              const pct = totalPlayers > 0 ? Math.round((votes / totalPlayers) * 100) : 0;

              return (
                <div
                  key={choice.key}
                  className={`relative p-4 rounded-2xl border transition-all overflow-hidden ${
                    isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/40'
                      : 'bg-slate-900/50 border-slate-800/80 opacity-60'
                  }`}
                >
                  {/* Background progress fill for votes */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all ${
                      isCorrect ? 'bg-emerald-500/15' : 'bg-slate-700/20'
                    }`}
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-3 z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isCorrect
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {choice.key}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isCorrect ? 'text-white' : 'text-slate-300'}`}>
                          {choice.text}
                        </p>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-300 block">{votes} คน</span>
                      <span className="text-[11px] text-slate-500">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Educational Explanation Box */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
                เหตุผลประกอบเฉลย & สาระน่ารู้
              </h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {currentQ.explanation}
            </p>
          </div>

          {/* Host Button */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onNextPhase}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              ดูตารางคะแนน (Leaderboard)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 4: LEADERBOARD */}
      {room.status === 'leaderboard' && (
        <div className="flex-1 flex flex-col justify-between space-y-6 animate-in fade-in duration-300">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5" />
              ตารางคะแนนประจำรอบ (Leaderboard)
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              อันดับคะแนนสูงสุด
            </h2>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 max-w-2xl mx-auto w-full space-y-2.5 overflow-y-auto max-h-[50vh]">
            {sortedPlayers.map((player, idx) => {
              const isTop3 = idx < 3;
              const badgeColors = [
                'bg-amber-400 text-slate-950',
                'bg-slate-300 text-slate-950',
                'bg-amber-700 text-white',
              ];

              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isTop3 ? badgeColors[idx] : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {player.name}
                        {player.streak >= 2 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            🔥 {player.streak}
                          </span>
                        )}
                      </p>
                      {player.lastAnswer && (
                        <span className="text-[10px] text-slate-400">
                          ข้อล่าสุด: {player.lastAnswer.isCorrect ? (
                            <span className="text-emerald-400 font-medium">+{player.lastAnswer.pointsEarned} pt</span>
                          ) : (
                            <span className="text-rose-400">ตอบผิด</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-white tracking-tight">
                      {player.score.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 block">คะแนน</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              ข้อถัดไป: {room.currentQuestionIndex + 2} / {room.questions.length}
            </span>
            <button
              onClick={onNextPhase}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {room.currentQuestionIndex + 1 < room.questions.length ? (
                <>
                  ไปข้อถัดไป
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 text-amber-300" />
                  ดูผลการแข่งขันรอบชิงชนะเลิศ (Podium)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PHASE 5: FINISHED & PODIUM */}
      {room.status === 'finished' && (
        <div className="flex-1 flex flex-col justify-between space-y-8 animate-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              การแข่งขันสิ้นสุดแล้ว!
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              🏆 ทำเนียบแชมป์ Prompt Game Quiz
            </h1>
            <p className="text-xs text-slate-400">
              ขอแสดงความยินดีกับผู้เข้าแข่งขันทุกท่านที่มีความรู้เรื่อง AI และ Prompting อย่างยอดเยี่ยม!
            </p>
          </div>

          {/* Podium Top 3 */}
          <div className="flex items-end justify-center gap-3 md:gap-6 py-6 max-w-xl mx-auto w-full">
            {/* 2nd Place */}
            {sortedPlayers[1] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-4xl mb-2">{sortedPlayers[1].avatar}</div>
                <p className="text-xs font-bold text-white truncate max-w-[100px] text-center mb-1">
                  {sortedPlayers[1].name}
                </p>
                <span className="text-xs font-bold text-slate-300 mb-2">
                  {sortedPlayers[1].score.toLocaleString()}
                </span>
                <div className="w-full h-28 bg-slate-800 border-t-4 border-slate-400 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-lg">
                  <span className="text-2xl font-black text-slate-400">2</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">รองชนะเลิศ</span>
                </div>
              </div>
            )}

            {/* 1st Place Champion */}
            {sortedPlayers[0] && (
              <div className="flex-1 flex flex-col items-center -mt-6">
                <div className="text-amber-400 text-xl mb-1 animate-bounce">👑</div>
                <div className="text-5xl mb-2">{sortedPlayers[0].avatar}</div>
                <p className="text-sm font-black text-white truncate max-w-[120px] text-center mb-1">
                  {sortedPlayers[0].name}
                </p>
                <span className="text-sm font-extrabold text-amber-400 mb-2">
                  {sortedPlayers[0].score.toLocaleString()} pts
                </span>
                <div className="w-full h-40 bg-gradient-to-b from-amber-500/30 to-slate-900 border-t-4 border-amber-400 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-2xl shadow-amber-500/20">
                  <span className="text-4xl font-black text-amber-400">1</span>
                  <span className="text-[10px] text-amber-300 uppercase tracking-widest font-bold">ชนะเลิศ</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {sortedPlayers[2] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-4xl mb-2">{sortedPlayers[2].avatar}</div>
                <p className="text-xs font-bold text-white truncate max-w-[100px] text-center mb-1">
                  {sortedPlayers[2].name}
                </p>
                <span className="text-xs font-bold text-slate-300 mb-2">
                  {sortedPlayers[2].score.toLocaleString()}
                </span>
                <div className="w-full h-20 bg-slate-800/80 border-t-4 border-amber-700 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-lg">
                  <span className="text-xl font-black text-amber-600">3</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">อันดับ 3</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={onRestartGame}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              เล่นใหม่อีกรอบ
            </button>
            <button
              onClick={onLeave}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors border border-slate-700"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
