export type ChoiceKey = 'ก' | 'ข' | 'ค' | 'ง';

export interface Choice {
  key: ChoiceKey;
  text: string;
}

export interface Question {
  id: string;
  question: string;
  choices: Choice[];
  answer: ChoiceKey;
  explanation: string;
  difficulty: 'ง่าย' | 'ปานกลาง' | 'ท้าทาย';
  category: 'RTCFC AI' | 'Gemini (Gem)' | 'Google AI Studio' | 'Prompt' | 'Generative AI' | string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  isHost: boolean;
  connected: boolean;
  lastAnswer?: {
    choice: ChoiceKey;
    timeTakenMs: number;
    isCorrect: boolean;
    pointsEarned: number;
  };
}

export type RoomStatus = 'lobby' | 'countdown' | 'question' | 'reveal' | 'leaderboard' | 'finished';

export interface GameRoom {
  code: string;
  hostId: string;
  roomName: string;
  questions: Question[];
  currentQuestionIndex: number;
  status: RoomStatus;
  timePerQuestion: number; // in seconds, e.g. 20
  questionStartTime: number; // epoch ms
  players: Record<string, Player>;
  createdAt: number;
}

// WebSocket message payloads
export type WSMessage =
  | { type: 'join_room'; roomCode: string; playerId: string; name: string; avatar: string; isHost?: boolean }
  | { type: 'leave_room'; roomCode: string; playerId: string }
  | { type: 'start_game'; roomCode: string }
  | { type: 'submit_answer'; roomCode: string; playerId: string; questionIndex: number; choice: ChoiceKey; timeTakenMs: number }
  | { type: 'next_phase'; roomCode: string; forceReveal?: boolean }
  | { type: 'restart_game'; roomCode: string }
  | { type: 'update_questions'; roomCode: string; questions: Question[] }
  | { type: 'sync_room'; room: GameRoom }
  | { type: 'error'; message: string };
