import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_QUESTIONS } from './src/data/defaultQuestions';
import { GameRoom, Player, Question, ChoiceKey } from './src/types';

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json());

// In-memory Room store
const rooms = new Map<string, GameRoom>();

// Map WebSocket to metadata
interface ClientMetadata {
  roomCode?: string;
  playerId?: string;
  isHost?: boolean;
}
const socketClients = new Map<WebSocket, ClientMetadata>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastToRoom(roomCode: string, data: object) {
  const payload = JSON.stringify(data);
  for (const [ws, meta] of socketClients.entries()) {
    if (meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// Create Room
app.post('/api/rooms/create', (req, res) => {
  const { roomName, questions, timePerQuestion } = req.body;
  const code = generateRoomCode();
  const newRoom: GameRoom = {
    code,
    hostId: 'host-' + Math.random().toString(36).substring(2, 9),
    roomName: roomName || 'ห้องแข่งขันทายปัญหา AI',
    questions: Array.isArray(questions) && questions.length > 0 ? questions : DEFAULT_QUESTIONS,
    currentQuestionIndex: 0,
    status: 'lobby',
    timePerQuestion: Number(timePerQuestion) || 20,
    questionStartTime: 0,
    players: {},
    createdAt: Date.now(),
  };

  rooms.set(code, newRoom);
  res.json({ success: true, room: newRoom });
});

// Check Room existence
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'ไม่พบห้องที่ระบุ กรุณาตรวจสอบรหัสห้องอีกครั้ง' });
  }
  res.json({ success: true, room });
});

// AI Generate Question Endpoint
app.post('/api/ai/generate-question', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const { topic = 'RTCFC Prompt Engineering & Google AI Studio' } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `คุณคือผู้เชี่ยวชาญด้าน Generative AI, Gemini, RTCFC Prompting และ Google AI Studio
จงสร้างคำถามสำหรับเกม Quiz ภาษาไทย 1 ข้อ ในหัวข้อ: "${topic}"
ระดับความยาก: ปานกลาง สำหรับบุคคลทั่วไป ภาษาตื่นเต้น กระชับ ชวนคิด สนุกสนาน

โครงสร้าง JSON ที่ต้องการ:
{
  "question": "คำถามสั้นกระชับเข้าใจง่าย",
  "category": "หมวดหมู่ (เช่น RTCFC AI, Gemini (Gem), Google AI Studio, Prompt, Generative AI)",
  "difficulty": "ปานกลาง",
  "choices": [
    { "key": "ก", "text": "ตัวเลือก ก" },
    { "key": "ข", "text": "ตัวเลือก ข" },
    { "key": "ค", "text": "ตัวเลือก ค" },
    { "key": "ง", "text": "ตัวเลือก ง" }
  ],
  "answer": "ก" (หรือ ข หรือ ค หรือ ง),
  "explanation": "คำอธิบายสั้นๆ สนุกๆ เหตุผลประกอบเฉลย เพื่อความรู้เพิ่มเติม"
}
ตอบกลับเฉพาะ JSON เท่านั้น ห้ามใส่ markdown code block หรือคำเกริ่นใดๆ`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);
    const newQuestion: Question = {
      id: 'ai-' + Date.now(),
      question: parsed.question,
      category: parsed.category || 'Generative AI',
      difficulty: parsed.difficulty || 'ปานกลาง',
      choices: parsed.choices || [
        { key: 'ก', text: 'ตัวเลือก ก' },
        { key: 'ข', text: 'ตัวเลือก ข' },
        { key: 'ค', text: 'ตัวเลือก ค' },
        { key: 'ง', text: 'ตัวเลือก ง' },
      ],
      answer: parsed.answer as ChoiceKey,
      explanation: parsed.explanation || '',
    };

    res.json({ success: true, question: newQuestion });
  } catch (err: unknown) {
    console.error('Error generating AI question:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างคำถามด้วย AI' });
  }
});

async function startServer() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    socketClients.set(ws, {});

    ws.on('message', (messageRaw: string) => {
      try {
        const msg = JSON.parse(messageRaw.toString());
        const { type } = msg;

        if (type === 'join_room') {
          const roomCode = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(roomCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'ไม่พบรหัสห้องนี้ในระบบ' }));
            return;
          }

          socketClients.set(ws, {
            roomCode,
            playerId: msg.playerId,
            isHost: !!msg.isHost,
          });

          // Add or update player in room
          if (msg.playerId && msg.name) {
            room.players[msg.playerId] = {
              id: msg.playerId,
              name: msg.name,
              avatar: msg.avatar || '🤖',
              score: room.players[msg.playerId]?.score || 0,
              streak: room.players[msg.playerId]?.streak || 0,
              isHost: !!msg.isHost,
              connected: true,
            };
          }

          broadcastToRoom(roomCode, { type: 'sync_room', room });
        } else if (type === 'start_game') {
          const roomCode = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(roomCode);
          if (room) {
            room.status = 'countdown';
            room.currentQuestionIndex = 0;
            // Reset player answers and streaks
            for (const p of Object.values(room.players)) {
              p.score = 0;
              p.streak = 0;
              delete p.lastAnswer;
            }
            broadcastToRoom(roomCode, { type: 'sync_room', room });

            // After 3-second countdown, transition to question
            setTimeout(() => {
              if (rooms.has(roomCode) && room.status === 'countdown') {
                room.status = 'question';
                room.questionStartTime = Date.now();
                broadcastToRoom(roomCode, { type: 'sync_room', room });
              }
            }, 3000);
          }
        } else if (type === 'submit_answer') {
          const roomCode = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(roomCode);
          if (!room || room.status !== 'question') return;

          const { playerId, choice, timeTakenMs } = msg;
          const currentQ = room.questions[room.currentQuestionIndex];
          const player = room.players[playerId];

          if (player && currentQ && !player.lastAnswer) {
            const isCorrect = choice === currentQ.answer;
            let pointsEarned = 0;

            if (isCorrect) {
              // Base points 1000 + speed bonus up to 500
              const maxTimeMs = room.timePerQuestion * 1000;
              const remainingRatio = Math.max(0, (maxTimeMs - timeTakenMs) / maxTimeMs);
              const speedBonus = Math.round(500 * remainingRatio);
              const streakBonus = Math.min(player.streak * 50, 250);
              pointsEarned = 1000 + speedBonus + streakBonus;

              player.score += pointsEarned;
              player.streak += 1;
            } else {
              player.streak = 0;
            }

            player.lastAnswer = {
              choice,
              timeTakenMs,
              isCorrect,
              pointsEarned,
            };

            broadcastToRoom(roomCode, { type: 'sync_room', room });
          }
        } else if (type === 'next_phase') {
          const roomCode = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(roomCode);
          if (!room) return;

          if (room.status === 'question') {
            room.status = 'reveal';
          } else if (room.status === 'reveal') {
            room.status = 'leaderboard';
          } else if (room.status === 'leaderboard') {
            if (room.currentQuestionIndex + 1 < room.questions.length) {
              room.currentQuestionIndex += 1;
              room.status = 'question';
              room.questionStartTime = Date.now();
              // Clear previous answer states for next question
              for (const p of Object.values(room.players)) {
                delete p.lastAnswer;
              }
            } else {
              room.status = 'finished';
            }
          }

          broadcastToRoom(roomCode, { type: 'sync_room', room });
        } else if (type === 'update_questions') {
          const roomCode = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(roomCode);
          if (room && Array.isArray(msg.questions)) {
            room.questions = msg.questions;
            broadcastToRoom(roomCode, { type: 'sync_room', room });
          }
        } else if (type === 'restart_game') {
          const roomCode = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(roomCode);
          if (room) {
            room.status = 'lobby';
            room.currentQuestionIndex = 0;
            for (const p of Object.values(room.players)) {
              p.score = 0;
              p.streak = 0;
              delete p.lastAnswer;
            }
            broadcastToRoom(roomCode, { type: 'sync_room', room });
          }
        }
      } catch (err) {
        console.error('WebSocket parsing error:', err);
      }
    });

    ws.on('close', () => {
      const meta = socketClients.get(ws);
      if (meta?.roomCode && meta?.playerId) {
        const room = rooms.get(meta.roomCode);
        if (room && room.players[meta.playerId]) {
          room.players[meta.playerId].connected = false;
          broadcastToRoom(meta.roomCode, { type: 'sync_room', room });
        }
      }
      socketClients.delete(ws);
    });
  });

  // Vite middleware in dev mode, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Prompt Game Quiz server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server boot failure:', err);
});
