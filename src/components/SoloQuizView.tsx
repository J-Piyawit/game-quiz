import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Question, ChoiceKey } from '../types';
import { sounds } from '../utils/soundEffects';
import { 
  Trophy, CheckCircle2, XCircle, ArrowRight, RotateCcw, 
  HelpCircle, Sparkles, Flame, Volume2, VolumeX, Home
} from 'lucide-react';

interface SoloQuizViewProps {
  questions: Question[];
  onBackHome: () => void;
}

export const SoloQuizView: React.FC<SoloQuizViewProps> = ({
  questions,
  onBackHome,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<ChoiceKey | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [soundOn, setSoundOn] = useState(sounds.isSoundEnabled());
  const [userAnswers, setUserAnswers] = useState<Array<{ questionId: string; choice: ChoiceKey; isCorrect: boolean }>>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelectChoice = (key: ChoiceKey) => {
    if (isRevealed || !currentQ) return;
    setSelectedChoice(key);
    setIsRevealed(true);

    const isCorrect = key === currentQ.answer;
    if (isCorrect) {
      sounds.playCorrect();
      setScore((s) => s + 1000 + streak * 100);
      setStreak((st) => st + 1);
    } else {
      sounds.playWrong();
      setStreak(0);
    }

    setUserAnswers((prev) => [
      ...prev,
      { questionId: currentQ.id, choice: key, isCorrect },
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedChoice(null);
      setIsRevealed(false);
    } else {
      setIsFinished(true);
      sounds.playFanfare();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
    setIsRevealed(false);
    setScore(0);
    setStreak(0);
    setUserAnswers([]);
    setIsFinished(false);
  };

  const choiceStyles: Record<ChoiceKey, { bg: string; border: string; text: string }> = {
    ก: { bg: 'bg-rose-500/10 hover:bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-400' },
    ข: { bg: 'bg-sky-500/10 hover:bg-sky-500/20', border: 'border-sky-500/30', text: 'text-sky-400' },
    ค: { bg: 'bg-amber-500/10 hover:bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400' },
    ง: { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  };

  const correctCount = userAnswers.filter((a) => a.isCorrect).length;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col min-h-[85vh] p-4 md:p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            โหมดซ้อมเดี่ยว (Solo Practice)
          </span>
          <span className="text-xs text-slate-400">
            {currentIndex + 1} / {questions.length} ข้อ
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-bold">{score.toLocaleString()} pt</span>
            {streak > 1 && (
              <span className="text-rose-400 font-bold flex items-center gap-0.5">
                <Flame className="w-3.5 h-3.5 fill-rose-500" /> {streak}
              </span>
            )}
          </div>
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
            onClick={onBackHome}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            title="กลับหน้าแรก"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isFinished && currentQ ? (
        <div className="flex-1 flex flex-col justify-between space-y-6">
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Category & Question text */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {currentQ.category}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {currentQ.difficulty}
              </span>
            </div>
            <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center">
              <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                {currentQ.question}
              </h2>
            </div>
          </div>

          {/* 4 Choices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {currentQ.choices.map((choice) => {
              const isSelected = selectedChoice === choice.key;
              const isCorrectAnswer = choice.key === currentQ.answer;
              const meta = choiceStyles[choice.key];

              let cardStyle = `${meta.bg} ${meta.border} hover:border-slate-600`;
              if (isRevealed) {
                if (isCorrectAnswer) {
                  cardStyle = 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50';
                } else if (isSelected && !isCorrectAnswer) {
                  cardStyle = 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/50';
                } else {
                  cardStyle = 'bg-slate-950/60 border-slate-800 opacity-40';
                }
              }

              return (
                <button
                  key={choice.key}
                  disabled={isRevealed}
                  onClick={() => handleSelectChoice(choice.key)}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${cardStyle}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isRevealed && isCorrectAnswer
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : isRevealed && isSelected && !isCorrectAnswer
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {choice.key}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white leading-snug">
                      {choice.text}
                    </p>
                  </div>
                  {isRevealed && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isRevealed && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner when revealed */}
          {isRevealed && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  เหตุผลประกอบเฉลย & เกร็ดความรู้
                </div>
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
                  {currentQ.explanation}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  {currentIndex + 1 < questions.length ? (
                    <>
                      ข้อถัดไป
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      ดูผลคะแนนรวม
                      <Trophy className="w-4 h-4 text-amber-300" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Finished Screen */
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300 py-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-2xl shadow-indigo-500/20">
            {correctCount >= 8 ? '🏆' : correctCount >= 5 ? '⭐' : '💪'}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-white">
              ซ้อมตอบคำถามเสร็จสมบูรณ์!
            </h2>
            <p className="text-slate-400 text-xs">
              คุณตอบถูก <span className="text-emerald-400 font-bold text-base">{correctCount}</span> จาก {questions.length} ข้อ
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>คะแนนสะสม</span>
              <span className="font-bold text-white">{score.toLocaleString()} แต้ม</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>ความแม่นยำ</span>
              <span className="font-bold text-emerald-400">
                {Math.round((correctCount / questions.length) * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRestart}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              ลองใหม่อีกรอบ
            </button>
            <button
              onClick={onBackHome}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors border border-slate-700"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
