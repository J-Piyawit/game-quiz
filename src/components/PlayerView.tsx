import React, { useState, useEffect } from 'react';
import { GameRoom, ChoiceKey, Player } from '../types';
import { sounds } from '../utils/soundEffects';
import { 
  Trophy, CheckCircle2, XCircle, Flame, Clock, Sparkles, Volume2, VolumeX 
} from 'lucide-react';

interface PlayerViewProps {
  room: GameRoom;
  playerId: string;
  onSubmitAnswer: (choice: ChoiceKey, timeTakenMs: number) => void;
  onLeave: () => void;
}

const AVATARS = ['🤖', '🧠', '⚡', '🚀', '🔮', '🐱', '🌟', '🎯', '👾', '🔥', '🦊', '🦉'];

export const PlayerView: React.FC<PlayerViewProps> = ({
  room,
  playerId,
  onSubmitAnswer,
  onLeave,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<ChoiceKey | null>(null);
  const [soundOn, setSoundOn] = useState(sounds.isSoundEnabled());
  const [timeLeft, setTimeLeft] = useState(room.timePerQuestion);

  const player = room.players[playerId];
  const currentQ = room.questions[room.currentQuestionIndex];

  // Reset selectedChoice on new question
  useEffect(() => {
    setSelectedChoice(null);
  }, [room.currentQuestionIndex]);

  // Audio effects when player receives result
  useEffect(() => {
    if (room.status === 'reveal' && player?.lastAnswer) {
      if (player.lastAnswer.isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playWrong();
      }
    }
  }, [room.status, player?.lastAnswer]);

  // Timer effect
  useEffect(() => {
    if (room.status !== 'question') return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.questionStartTime) / 1000);
      const remaining = Math.max(0, room.timePerQuestion - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 3 && remaining > 0) {
        sounds.playTick();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [room.status, room.questionStartTime, room.timePerQuestion]);

  const handleSelectChoice = (choice: ChoiceKey) => {
    if (selectedChoice !== null || room.status !== 'question') return;
    setSelectedChoice(choice);
    const timeTakenMs = Math.max(100, Date.now() - room.questionStartTime);
    onSubmitAnswer(choice, timeTakenMs);
    sounds.playTick();
  };

  const choiceStyles: Record<ChoiceKey, { bg: string; activeBg: string; border: string; shape: string }> = {
    ก: {
      bg: 'bg-rose-500 hover:bg-rose-600 text-white',
      activeBg: 'bg-rose-600 ring-4 ring-rose-300',
      border: 'border-rose-400',
      shape: '▲',
    },
    ข: {
      bg: 'bg-sky-500 hover:bg-sky-600 text-white',
      activeBg: 'bg-sky-600 ring-4 ring-sky-300',
      border: 'border-sky-400',
      shape: '◆',
    },
    ค: {
      bg: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold',
      activeBg: 'bg-amber-600 ring-4 ring-amber-300',
      border: 'border-amber-400',
      shape: '●',
    },
    ง: {
      bg: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      activeBg: 'bg-emerald-600 ring-4 ring-emerald-300',
      border: 'border-emerald-400',
      shape: '■',
    },
  };

  // Rank calculation
  const allPlayers = (Object.values(room.players) as Player[]).sort((a, b) => b.score - a.score);
  const myRank = allPlayers.findIndex((p) => p.id === playerId) + 1;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col min-h-[85vh] p-4">
      {/* Top Player Status Bar */}
      <div className="flex items-center justify-between py-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl">{player?.avatar || '🤖'}</span>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">{player?.name}</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{player?.score.toLocaleString()} คะแนน</span>
              {player && player.streak > 1 && (
                <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-rose-500" /> {player.streak}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const res = sounds.toggleSound();
              setSoundOn(res);
            }}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl"
            title="สลับเสียง"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={onLeave}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800/60"
          >
            ออก
          </button>
        </div>
      </div>

      {/* 1. LOBBY */}
      {room.status === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-xl shadow-indigo-500/20 animate-pulse">
            {player?.avatar}
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              เชื่อมต่อห้อง {room.code} สำเร็จ
            </span>
            <h2 className="text-2xl font-bold text-white">คุณพร้อมแล้ว!</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              กำลังรอ Host เริ่มการแข่งขัน เตรียมสายตาและนิ้วให้พร้อม ตอบไวยิ่งได้แต้มเยอะ!
            </p>
          </div>
        </div>
      )}

      {/* 1.5 COUNTDOWN */}
      {room.status === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-200">
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 animate-bounce">
            เตรียมตัว!
          </div>
          <p className="text-sm text-slate-400">คำถามแรกกำลังจะปรากฏบนหน้าจอ...</p>
        </div>
      )}

      {/* 2. QUESTION ACTIVE */}
      {room.status === 'question' && currentQ && (
        <div className="flex-1 flex flex-col justify-between space-y-4 animate-in fade-in duration-200">
          {/* Header & Question prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-400">
                ข้อ {room.currentQuestionIndex + 1} / {room.questions.length}
              </span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className={timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}>
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center shadow-lg">
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block mb-1">
                {currentQ.category}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentQ.question}
              </h3>
            </div>
          </div>

          {/* Answer Buttons */}
          {selectedChoice ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold">
                {selectedChoice}
              </div>
              <h4 className="text-lg font-bold text-white">บันทึกคำตอบแล้ว!</h4>
              <p className="text-xs text-slate-400">
                กำลังรอผู้เล่นคนอื่นๆ ตอบ และรอเวลาหมดเพื่อเปิดเฉลย...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {currentQ.choices.map((choice) => {
                const style = choiceStyles[choice.key];
                return (
                  <button
                    key={choice.key}
                    onClick={() => handleSelectChoice(choice.key)}
                    className={`p-4 rounded-2xl text-left flex items-center gap-3.5 transition-all transform active:scale-95 shadow-lg ${style.bg}`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center font-bold text-base shrink-0">
                      {style.shape}
                    </span>
                    <div className="overflow-hidden">
                      <span className="text-[11px] opacity-80 block font-semibold">ข้อ {choice.key}</span>
                      <p className="text-sm font-semibold leading-tight line-clamp-2">
                        {choice.text}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. REVEAL & EXPLANATION */}
      {room.status === 'reveal' && currentQ && (
        <div className="flex-1 flex flex-col justify-between space-y-4 animate-in fade-in duration-300">
          <div className="text-center space-y-3 pt-2">
            {player?.lastAnswer?.isCorrect ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 flex flex-col items-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <h3 className="text-xl font-extrabold text-white">ถูกต้องสุดยอด!</h3>
                <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  +{player.lastAnswer.pointsEarned.toLocaleString()} คะแนน
                </span>
                {player.streak > 1 && (
                  <span className="text-xs font-semibold text-rose-300 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-rose-400" />
                    ตอบถูกต่อเนื่อง {player.streak} ข้อติด!
                  </span>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex flex-col items-center space-y-2">
                <XCircle className="w-12 h-12 text-rose-400" />
                <h3 className="text-xl font-extrabold text-white">ยังไม่ถูกต้องนะ!</h3>
                <p className="text-xs text-slate-300">
                  คำตอบที่ถูกคือข้อ <span className="font-bold text-emerald-400">{currentQ.answer}</span>
                </p>
              </div>
            )}
          </div>

          {/* Quick Explanation */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-1.5 shadow-md">
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              สาระความรู้ข้อนี้
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {currentQ.explanation}
            </p>
          </div>

          <div className="text-center text-xs text-slate-500 pb-2">
            รอ Host กดไปยังหน้าถัดไป...
          </div>
        </div>
      )}

      {/* 4. LEADERBOARD */}
      {room.status === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-xl shadow-indigo-500/20">
            {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎖️'}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              อันดับของคุณขณะนี้
            </span>
            <h3 className="text-3xl font-black text-white">อันดับที่ {myRank}</h3>
            <p className="text-sm font-bold text-emerald-400">
              {player?.score.toLocaleString()} คะแนน
            </p>
          </div>

          <p className="text-xs text-slate-400 max-w-xs">
            เตรียมพร้อมสำหรับข้อต่อไป Host กำลังจะเปลี่ยนข้อ!
          </p>
        </div>
      )}

      {/* 5. FINISHED */}
      {room.status === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300">
          <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              จบการแข่งขัน
            </span>
            <h3 className="text-2xl font-black text-white">สรุปผลงานของคุณ</h3>
            <p className="text-lg font-extrabold text-white">
              จบอันดับที่ <span className="text-indigo-400 font-black">#{myRank}</span>
            </p>
            <p className="text-sm text-emerald-400 font-bold">
              คะแนนรวม {player?.score.toLocaleString()} แต้ม
            </p>
          </div>

          <button
            onClick={onLeave}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30"
          >
            กลับหน้าหลัก
          </button>
        </div>
      )}
    </div>
  );
};
