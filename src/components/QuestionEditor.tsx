import React, { useState } from 'react';
import { Question, ChoiceKey } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { 
  Plus, Trash2, RotateCcw, Download, Upload, Sparkles, Check, 
  HelpCircle, Edit3, X, Copy, BookOpen
} from 'lucide-react';

interface QuestionEditorProps {
  questions: Question[];
  onSave: (newQuestions: Question[]) => void;
  onClose: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  questions,
  onSave,
  onClose,
}) => {
  const [list, setList] = useState<Question[]>(JSON.parse(JSON.stringify(questions)));
  const [activeTab, setActiveTab] = useState<'list' | 'ai' | 'json'>('list');
  const [editingId, setEditingId] = useState<string | null>(list[0]?.id || null);
  const [aiTopic, setAiTopic] = useState('RTCFC AI & Gemini Prompt Engineering');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentQuestion = list.find((q) => q.id === editingId) || list[0];

  const handleUpdateCurrent = (field: keyof Question, value: any) => {
    if (!currentQuestion) return;
    setList((prev) =>
      prev.map((q) => (q.id === currentQuestion.id ? { ...q, [field]: value } : q))
    );
  };

  const handleUpdateChoice = (key: ChoiceKey, text: string) => {
    if (!currentQuestion) return;
    const newChoices = currentQuestion.choices.map((c) =>
      c.key === key ? { ...c, text } : c
    );
    handleUpdateCurrent('choices', newChoices);
  };

  const handleAddNew = () => {
    const newQ: Question = {
      id: 'q-' + Date.now(),
      category: 'Prompt',
      difficulty: 'ปานกลาง',
      question: 'พิมพ์คำถามใหม่ของคุณที่นี่...',
      choices: [
        { key: 'ก', text: 'ตัวเลือก ก' },
        { key: 'ข', text: 'ตัวเลือก ข' },
        { key: 'ค', text: 'ตัวเลือก ค' },
        { key: 'ง', text: 'ตัวเลือก ง' },
      ],
      answer: 'ก',
      explanation: 'พิมพ์คำอธิบายเหตุผลของเฉลยที่ถูกต้อง...',
    };
    setList([...list, newQ]);
    setEditingId(newQ.id);
  };

  const handleDelete = (id: string) => {
    if (list.length <= 1) {
      alert('ต้องมีคำถามอย่างน้อย 1 ข้อในชุดคำถาม');
      return;
    }
    const filtered = list.filter((q) => q.id !== id);
    setList(filtered);
    if (editingId === id) {
      setEditingId(filtered[0]?.id || null);
    }
  };

  const handleResetToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตคำถามทั้งหมดกลับเป็นชุดคำถามเริ่มต้น 10 ข้อหรือไม่?')) {
      setList(JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)));
      setEditingId(DEFAULT_QUESTIONS[0].id);
    }
  };

  const handleAiGenerate = async () => {
    setIsAiLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic }),
      });
      const data = await res.json();
      if (data.success && data.question) {
        setList((prev) => [...prev, data.question]);
        setEditingId(data.question.id);
        setActiveTab('list');
      } else {
        setErrorMsg(data.error || 'สร้างคำถามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ AI');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExportJson = () => {
    setJsonText(JSON.stringify(list, null, 2));
    setActiveTab('json');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('รูปแบบ JSON ต้องเป็น Array ของคำถาม');
      }
      setList(parsed);
      setEditingId(parsed[0]?.id || null);
      setActiveTab('list');
    } catch (err: any) {
      setErrorMsg('JSON ไม่ถูกต้อง: ' + (err.message || 'โปรดตรวจสอบรูปแบบ'));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(list, null, 2));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleFinalSave = () => {
    onSave(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                จัดการและแก้ไขชุดคำถาม Quiz
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {list.length} ข้อ
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ปรับปรุงคำถาม ตัวเลือก ก ข ค ง เฉลย และคำอธิบายความรู้เพิ่มเติม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFinalSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              บันทึกและนำไปใช้
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sub-bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'list'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1.5" />
              รายการคำถาม
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'ai'
                  ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/20'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-1.5 text-indigo-400" />
              สร้างด้วย AI (Gemini)
            </button>
            <button
              onClick={handleExportJson}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'json'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Download className="w-4 h-4 inline mr-1.5" />
              JSON นำเข้า / ส่งออก
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="text-xs text-amber-400 hover:text-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-400/10 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              คืนค่า 10 ข้อเดิม
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {activeTab === 'list' && (
            <>
              {/* Sidebar Question List */}
              <div className="w-full md:w-72 border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    คำถามทั้งหมด
                  </span>
                  <button
                    onClick={handleAddNew}
                    className="text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30 px-2.5 py-1 rounded-md flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มข้อ
                  </button>
                </div>

                <div className="space-y-1.5 flex-1">
                  {list.map((q, idx) => {
                    const isSelected = q.id === editingId;
                    return (
                      <div
                        key={q.id}
                        onClick={() => setEditingId(q.id)}
                        className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/70 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            ข้อ {idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {q.category}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(q.id);
                              }}
                              className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                              title="ลบข้อนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs font-medium line-clamp-2 leading-relaxed">
                          {q.question}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Editing Form */}
              <div className="flex-1 p-5 md:p-6 overflow-y-auto bg-slate-900/40 space-y-5">
                {currentQuestion ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          หมวดหมู่เนื้อหา (Category)
                        </label>
                        <select
                          value={currentQuestion.category}
                          onChange={(e) => handleUpdateCurrent('category', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="RTCFC AI">RTCFC AI</option>
                          <option value="Gemini (Gem)">Gemini (Gem)</option>
                          <option value="Google AI Studio">Google AI Studio</option>
                          <option value="Prompt">Prompt Engineering</option>
                          <option value="Generative AI">Generative AI</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          ระดับความยาก
                        </label>
                        <select
                          value={currentQuestion.difficulty}
                          onChange={(e) => handleUpdateCurrent('difficulty', e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="ง่าย">ง่าย</option>
                          <option value="ปานกลาง">ปานกลาง</option>
                          <option value="ท้าทาย">ท้าทาย</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        โจทย์คำถาม (สั้นกระชับเข้าใจง่าย)
                      </label>
                      <textarea
                        rows={3}
                        value={currentQuestion.question}
                        onChange={(e) => handleUpdateCurrent('question', e.target.value)}
                        placeholder="พิมพ์โจทย์คำถามที่น่าสนใจ..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">
                        ตัวเลือกคำตอบ 4 ตัวเลือก (คลิกเลือกปุ่มวิทยุเพื่อตั้งเป็นเฉลยข้อที่ถูกต้อง)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQuestion.choices.map((choice) => {
                          const isCorrect = currentQuestion.answer === choice.key;
                          return (
                            <div
                              key={choice.key}
                              className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                isCorrect
                                  ? 'bg-emerald-950/25 border-emerald-500/60 ring-1 ring-emerald-500/40'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateCurrent('answer', choice.key)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                                title="คลิกเพื่อตั้งให้ข้อนี้เป็นคำตอบที่ถูกต้อง"
                              >
                                {choice.key}
                              </button>
                              <input
                                type="text"
                                value={choice.text}
                                onChange={(e) => handleUpdateChoice(choice.key, e.target.value)}
                                className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-600"
                                placeholder={`ข้อความตัวเลือก ${choice.key}`}
                              />
                              {isCorrect && (
                                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap">
                                  เฉลย
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        คำอธิบายสั้นๆ (เหตุผลประกอบเฉลย เพื่อความรู้เพิ่มเติม)
                      </label>
                      <textarea
                        rows={3}
                        value={currentQuestion.explanation}
                        onChange={(e) => handleUpdateCurrent('explanation', e.target.value)}
                        placeholder="คำอธิบายเกร็ดความรู้สไตล์สนุกสนาน ช่วยให้ผู้เล่นเข้าใจทันที..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    โปรดเลือกคำถามจากแถบด้านซ้ายเพื่อแก้ไข
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'ai' && (
            <div className="flex-1 p-6 md:p-8 bg-slate-900/60 flex flex-col justify-center max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  สร้างคำถามอัตโนมัติด้วย Google Gemini AI
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  ระบบจะใช้ Gemini 3.8 Flash ในการวิเคราะห์และแต่งคำถาม Quiz พร้อม 4 ตัวเลือก เฉลย และคำอธิบายความรู้ในสไตล์สนุกตื่นเต้น
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  หัวข้อที่ต้องการเน้น
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="เช่น RTCFC Prompting, Google AI Studio Multimodal, Zero-shot vs Few-shot"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    'RTCFC Framework ตัวอย่าง Prompt เจ๋งๆ',
                    'Google AI Studio System Instructions & API',
                    'Gemini Multimodal และ Context Window',
                    'Prompt Engineering: Few-shot & Chain-of-Thought',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAiTopic(preset)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                disabled={isAiLoading || !aiTopic.trim()}
                onClick={handleAiGenerate}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
              >
                {isAiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังให้ Gemini คิดคำถามสุดเจ๋ง...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    สร้างคำถาม 1 ข้อเพิ่มในชุด
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="flex-1 p-6 bg-slate-900/60 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">JSON Data Manager</h3>
                  <p className="text-xs text-slate-400">
                    นำเข้าชุดคำถามของคุณ หรือคัดลอก JSON ไปใช้งานกับระบบอื่นได้ทันที
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    {copiedNotification ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        คัดลอกแล้ว!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        คัดลอก JSON
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleImportJson}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    นำเข้าจากกล่องข้อความ
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={15}
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
                placeholder="วางโค้ด JSON ชุดคำถามที่นี่..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
