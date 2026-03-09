import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Calendar,
  BookOpen,
  Code,
  Award,
  GraduationCap,
  Loader2,
  Sparkles,
  X,
  Plus,
  Edit2,
  Trash2,
  Save,
  User,
  Users,
  LogOut,
  MessageCircle,
  Send,
  Bell,
  AlertCircle,
  UserPlus,
  RotateCcw,
  FileText,
  BrainCircuit,
  Camera,
  Lock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

// Firebase SDKs
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// ============================================================================
// 1. Firebase Configuration
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAVA5IBeKdwpfJbYZkrKKJ4ctaxyYZvZag",
  authDomain: "manager-82ba9.firebaseapp.com",
  projectId: "manager-82ba9",
  storageBucket: "manager-82ba9.firebasestorage.app",
  messagingSenderId: "466267450055",
  appId: "1:466267450055:web:bc5722ab97e82eec1d2ce2",
  measurementId: "G-X1XB0WLPFV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================================
// 2. Constants
// ============================================================================

// Collection paths
const COLLECTIONS = {
  USERS: 'users',
  SCHEDULES: 'schedules',
  MESSAGES: 'messages'
};

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student'
};

// Schedule categories
const CATEGORIES = ['전공진로', 'IT컨셉', '교과진로', '교내행사', '학습'];

// ============================================================================
// 3. Utility Functions
// ============================================================================

const getCategoryColor = (category) => {
  const colors = {
    '전공진로': 'bg-blue-50 text-blue-700 border-blue-200',
    'IT컨셉': 'bg-violet-50 text-violet-700 border-violet-200',
    '교과진로': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '교내행사': 'bg-amber-50 text-amber-700 border-amber-200',
    '학습': 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return colors[category] || 'bg-slate-50 text-slate-700 border-slate-200';
};

const getCategoryIcon = (category) => {
  const className = 'w-4 h-4';
  const icons = {
    '전공진로': <GraduationCap className={className} />,
    'IT컨셉': <Code className={className} />,
    '교과진로': <BookOpen className={className} />,
    '교내행사': <Award className={className} />,
    '학습': <Calendar className={className} />
  };
  return icons[category] || <Calendar className={className} />;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const isNew = (timestamp) => {
  if (!timestamp) return false;
  const now = Date.now();
  const created = timestamp.toDate().getTime();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return now - created < threeDays;
};

const isUpdated = (created, updated) => {
  if (!created || !updated) return false;
  return updated.toDate().getTime() > created.toDate().getTime();
};

// ============================================================================
// 4. Login Component (with Student/Admin tabs)
// ============================================================================

const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('student'); // 'student' | 'admin'
  const [formData, setFormData] = useState({ id: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Firebase Auth 익명 로그인 (Firestore 접근을 위해)
  const ensureFirebaseAuth = async () => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Firebase Auth 익명 로그인 (항상 백그라운드에서)
      await ensureFirebaseAuth();

      if (mode === 'admin') {
        // 관리자 로그인 (하드코딩)
        const inputId = formData.id.trim();
        const inputPw = formData.password.trim();
        const ADMIN_ID = 'PKPK';
        const ADMIN_PW = '1111';

        if (inputId.toUpperCase() === ADMIN_ID && inputPw === ADMIN_PW) {
          onLogin({ uid: 'admin_master_uid', name: '관리자', role: 'admin' });
        } else {
          throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
      } else {
        // 학생 로그인: Firestore에서 이름+비밀번호로 사용자 찾기
        const q = collection(db, COLLECTIONS.USERS);
        const querySnapshot = await getDocs(q);

        const inputName = formData.name.trim();
        const inputPw = formData.password.trim();

        const studentDoc = querySnapshot.docs.find((doc) => {
          const data = doc.data();
          return data.role === 'student' && data.name === inputName && data.password === inputPw;
        });

        if (studentDoc) {
          const studentData = studentDoc.data();
          // 마지막 로그인 시간 업데이트
          await updateDoc(doc(db, COLLECTIONS.USERS, studentDoc.id), {
            lastLogin: serverTimestamp()
          });
          onLogin({
            uid: studentData.uid,
            name: studentData.name,
            role: 'student'
          });
        } else {
          throw new Error('학생 정보를 찾을 수 없거나 비밀번호가 틀립니다.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-3">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            고교 생기부 매니저
          </h1>
          <p className="text-slate-500 mt-2">통합과학 & 세특 완벽 대비</p>
        </div>

        {/* 탭 전환 */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
          <button
            onClick={() => {
              setMode('student');
              setError('');
              setFormData({ id: '', password: '', name: '' });
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              mode === 'student'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            학생 로그인
          </button>
          <button
            onClick={() => {
              setMode('admin');
              setError('');
              setFormData({ id: '', password: '', name: '' });
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              mode === 'admin'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            관리자 로그인
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {mode === 'admin' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  관리자 ID
                </label>
                <input
                  name="id"
                  type="text"
                  value={formData.id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="아이디 입력"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  비밀번호
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="비밀번호 입력"
                  required
                />
              </div>
              <div className="text-xs text-slate-400 text-center bg-slate-50 p-2 rounded">
                (초기 ID: PKPK / PW: 1111)
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  이름
                </label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="본명 입력"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  비밀번호
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="관리자에게 받은 비밀번호"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>문의사항은 관리자에게 연락하세요</p>
        </div>
      </div>
    </div>
  );
};
// ============================================================================
// 5. Schedule Form Modal Component
// ============================================================================

const ScheduleFormModal = ({
  isOpen,
  initialData,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    month: initialData?.month || 1,
    category: initialData?.category || CATEGORIES[0],
    title: initialData?.title || '',
    detail: initialData?.detail || ''
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 id="modal-title" className="font-bold text-slate-800">
            {initialData?.id ? '일정 수정' : '새 일정 등록'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="month" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                월 선택
              </label>
              <select
                id="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}월
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                카테고리
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="title" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              제목
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              placeholder="일정 제목"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="detail" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              상세 내용
            </label>
            <textarea
              id="detail"
              value={formData.detail}
              onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
              placeholder="구체적인 내용을 입력하세요..."
              maxLength={1000}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="저장하기"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            저장하기
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 6. Message Modal Component
// ============================================================================

const MessageModal = ({
  isOpen,
  onClose,
  messages,
  currentUser,
  onSend,
  targetName
}) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      await onSend(input);
      setInput('');
    } catch (error) {
      console.error('Send error:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/30 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-modal-title"
    >
      <div 
        className="bg-white w-full max-w-md h-[500px] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
          <h3 id="message-modal-title" className="font-bold text-slate-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            {targetName ? `${targetName}님과의 대화` : '메시지'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
          ref={scrollRef}
          role="log"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-10">
              주고받은 메시지가 없습니다.
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.fromUid === currentUser.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm break-words ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                    <div className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {formatDate(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            placeholder="메시지를 입력하세요..."
            disabled={sending}
            maxLength={500}
            aria-label="메시지 입력"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="전송"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 7. Student Modal Component
// ============================================================================

const StudentModal = ({
  isOpen,
  initialData,
  onClose,
  onSave
}) => {
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(initialData?.name || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(email, password, name);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-modal-title"
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h3 id="student-modal-title" className="font-bold text-indigo-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {initialData ? '학생 정보 수정' : '학생 계정 생성'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-700 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {initialData
                ? '수정된 정보는 즉시 반영됩니다.'
                : '생성된 계정 정보를 학생에게 전달해주세요.'}
            </span>
          </div>

          <div>
            <label htmlFor="student-email" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              이메일
            </label>
            <input
              id="student-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="student@example.com"
              required
              disabled={!!initialData}
            />
          </div>

          <div>
            <label htmlFor="student-password" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              비밀번호
            </label>
            <input
              id="student-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={initialData ? '변경 시에만 입력' : '초기 비밀번호'}
              required={!initialData}
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="student-name" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              학생 이름
            </label>
            <input
              id="student-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="홍길동"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-label={initialData ? '수정사항 저장' : '계정 생성하기'}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {initialData ? '수정사항 저장' : '계정 생성하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 8. AI Advice Modal Component
// ============================================================================

const AIAdviceModal = ({
  event,
  studentName,
  onUpdate,
  onClose
}) => {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateAdvice = useCallback(async () => {
    setLoading(true);
    setAdvice('');

    // Simulated AI response (replace with actual API call)
    setTimeout(() => {
      const mockAdvice = `[심화 탐구 가이드]
- ${event.title} 활동을 더 깊이 있게 발전시키려면 관련 논문을 찾아보고 비판적으로 분석해보세요.
- 실험 설계를 개선하거나 변수를 추가하여 자신만의 가설을 검증해볼 수 있습니다.

[추천 도서/자료]
- 관련 분야의 기초 서적부터 시작하여 점차 전문 서적으로 확장하세요.
- 학술 데이터베이스(Google Scholar, RISS)에서 키워드 검색을 해보는 것을 추천합니다.

[진로 연계성]
- 이 활동을 ${studentName || '학생'}님의 희망 진로와 어떻게 연결할지 고민해보세요.
- 실제 현장에서는 어떤 식으로 활용되는지 조사해보는 것도 좋습니다.`;

      setAdvice(mockAdvice);
      setGenerated(true);
      setLoading(false);
    }, 1500);
  }, [event.title, studentName]);

  const handleSave = async () => {
    const newDetail = `${event.detail}\n\n--- [AI 선생님 피드백] ---\n${advice}`;
    await onUpdate(event.id, newDetail);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="advice-modal-title"
    >
      <div 
        className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 flex justify-between items-start text-white shrink-0">
          <div>
            <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" />
              생기부 활동 분석
            </div>
            <h2 id="advice-modal-title" className="text-2xl font-bold">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <FileText className="w-3 h-3" />
              현재 상세 내용
            </h3>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              {event.detail}
            </p>
          </div>

          {!generated && !loading && (
            <div className="flex justify-center">
              <button
                onClick={generateAdvice}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                aria-label="AI 조언 받기"
              >
                <BrainCircuit className="w-5 h-5" />
                AI 선생님 조언 받기
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-slate-500 font-medium animate-pulse text-sm">
                심화 탐구 전략을 수립하고 있습니다...
              </p>
            </div>
          )}

          {generated && (
            <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xs font-bold text-indigo-600 uppercase mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                AI 선생님 조언 (수정 가능)
              </h3>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full h-40 p-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-800 leading-relaxed resize-none bg-white"
                placeholder="AI 조언 내용을 수정하거나 추가할 멘트를 작성하세요."
                aria-label="AI 조언 내용"
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-medium transition-colors"
            aria-label="취소"
          >
            취소
          </button>
          {generated && (
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md"
              aria-label="상세 내용에 추가하여 저장"
            >
              <Save className="w-4 h-4" />
              상세 내용에 추가
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 9. AI Report Modal Component
// ============================================================================

const AIReportModal = ({
  isOpen,
  onClose,
  schedules,
  studentName,
  onSend
}) => {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (isOpen && !generated) {
      generateReport();
    }
  }, [isOpen, generated]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setReport('');

    // Simulated AI response (replace with actual API call)
    setTimeout(() => {
      const sortedSchedules = [...schedules].sort((a, b) => a.month - b.month);
      const summary = sortedSchedules
        .map(s => `- ${s.month}월 (${s.category}): ${s.title}`)
        .join('\n');

      const mockReport = `# ${studentName || '학생'}님의 생기부 로드맵 리포트

## 1. 핵심 테마 제안
학생님의 활동을 관통하는 키워드는 **"융합적 사고와 실천"** 입니다. 
다양한 카테고리의 활동들이 서로 연결되어 하나의 이야기를 만들 수 있습니다.

## 2. 활동 연결 고리
${summary}

위 활동들을 다음과 같이 연결해보세요:
- 이론 학습(학습) → 개념 적용(IT컨셉) → 진로 탐색(전공진로) → 결과 공유(교내행사)

## 3. 보완 제안
- 독서 활동을 추가하여 깊이를 더하세요
- 실험/조사 활동을 계획하여 실제 데이터를 수집해보세요
- 결과물을 교내 대회나 보고서로 발전시키세요

## 4. 실천 지침
매월 1개의 핵심 활동에 집중하고, 이를 기록으로 남기세요.
질문이 있다면 언제든 선생님께 문의하세요!`;

      setReport(mockReport);
      setGenerated(true);
      setLoading(false);
    }, 2000);
  }, [schedules, studentName]);

  const handleSend = async () => {
    if (!report.trim()) return;
    await onSend(`[AI 생기부 로드맵 리포트]\n\n${report}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div 
        className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-6 h-6" />
            <h2 id="report-modal-title" className="text-xl font-bold">AI 생기부 로드맵 설계</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-6" />
              <p className="text-lg font-bold text-slate-700">
                학생의 모든 일정을 분석 중입니다...
              </p>
              <p className="text-slate-500 mt-2">
                통합과학 연계성 및 생기부 스토리라인 도출 중
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 text-sm flex items-start gap-2">
                <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong>AI 분석 완료!</strong> 내용을 검토하고 필요하면 수정한 뒤 학생에게 전송하세요.
                </div>
              </div>
              <textarea
                value={report}
                onChange={(e) => setReport(e.target.value)}
                className="w-full h-96 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-sans leading-relaxed text-slate-700 resize-none shadow-sm"
                placeholder="AI 리포트가 여기에 표시됩니다."
                aria-label="AI 리포트 내용"
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            aria-label="취소"
          >
            취소
          </button>
          {generated && (
            <button
              onClick={handleSend}
              className="px-6 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-lg"
              aria-label="학생에게 전송"
            >
              <Send className="w-4 h-4" />
              학생에게 전송
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 10. Main App Component
// ============================================================================

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isAdviceModalOpen, setIsAdviceModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && currentUser) {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch students (admin only)
  useEffect(() => {
    if (!currentUser || currentUser.role !== USER_ROLES.ADMIN) return;

    const q = query(collection(db, COLLECTIONS.USERS), where('role', '==', USER_ROLES.STUDENT));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentList(students);
      if (!selectedStudent && students.length > 0) {
        setSelectedStudent(students[0]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch schedules
  useEffect(() => {
    if (!currentUser) return;

    let targetUid = currentUser.uid;
    if (currentUser.role === USER_ROLES.ADMIN) {
      if (!selectedStudent) return;
      targetUid = selectedStudent.uid;
    }

    const q = query(
      collection(db, COLLECTIONS.SCHEDULES),
      where('studentId', '==', targetUid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(items);
    });

    return () => unsubscribe();
  }, [currentUser, selectedStudent]);

  // Fetch messages
  useEffect(() => {
    if (!currentUser) return;

    let q;
    if (currentUser.role === USER_ROLES.STUDENT) {
      q = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('toUid', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      if (!selectedStudent) return;
      q = query(
        collection(db, COLLECTIONS.MESSAGES),
        where('fromUid', 'in', [currentUser.uid, selectedStudent.uid]),
        where('toUid', 'in', [currentUser.uid, selectedStudent.uid]),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      if (currentUser.role === USER_ROLES.STUDENT) {
        const unread = msgs.filter(m => !m.read).length;
        setUnreadCount(unread);
      }
    });

    return () => unsubscribe();
  }, [currentUser, selectedStudent]);

  const recentUpdates = useMemo(() => {
    return [...schedules]
      .sort((a, b) => {
        const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [schedules]);

  const handleSaveStudent = async (email, password, name) => {
    try {
      if (editingStudent) {
        const userRef = doc(db, COLLECTIONS.USERS, editingStudent.id);
        await updateDoc(userRef, { email, name, password });
        alert('학생 정보가 수정되었습니다.');
      } else {
        // In a real app, you'd create Firebase Auth user first
        const newUser = {
          uid: `student_${Date.now()}`,
          email,
          name,
          password,
          role: USER_ROLES.STUDENT,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, COLLECTIONS.USERS), newUser);
        alert('학생 계정이 생성되었습니다.');
      }
      setIsStudentModalOpen(false);
      setEditingStudent(null);
    } catch (error) {
      console.error(error);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`'${studentName}' 학생을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, studentId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error(error);
      alert('삭제 실패');
    }
  };

  const handleSaveSchedule = async (data) => {
    if (currentUser.role === USER_ROLES.ADMIN && !selectedStudent) {
      alert('학생을 먼저 선택하세요.');
      return;
    }

    const targetUid = currentUser.role === USER_ROLES.ADMIN ? selectedStudent.uid : currentUser.uid;

    try {
      if (editingItem?.id) {
        const docRef = doc(db, COLLECTIONS.SCHEDULES, editingItem.id);
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, COLLECTIONS.SCHEDULES), {
          ...data,
          studentId: targetUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsFormOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error(error);
      alert('저장 실패');
    }
  };

  const handleDeleteSchedule = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.SCHEDULES, id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateScheduleDetail = async (id, newDetail) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.SCHEDULES, id), {
        detail: newDetail,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      alert('업데이트 실패');
    }
  };

  const handleSendMessage = async (text) => {
    if (currentUser.role === USER_ROLES.ADMIN && !selectedStudent) {
      alert('학생을 선택하세요.');
      return;
    }

    const toUid = currentUser.role === USER_ROLES.ADMIN ? selectedStudent.uid : 'admin_uid'; // 실제 관리자 UID 필요

    try {
      await addDoc(collection(db, COLLECTIONS.MESSAGES), {
        content: text,
        fromUid: currentUser.uid,
        fromName: currentUser.name,
        toUid,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      alert('메시지 전송 실패');
    }
  };

  const handleImageUpload = async (e) => {
    // OCR 구현은 생략 (API 키 필요)
    alert('이미지 업로드 기능은 별도 API 키가 필요합니다.');
  };

  const filteredData = selectedMonth
    ? schedules.filter(item => item.month === selectedMonth)
    : schedules;

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Admin Sidebar */}
      {currentUser.role === USER_ROLES.ADMIN && (
        <aside
          className={`${
            isSidebarOpen ? 'w-64' : 'w-0'
          } bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden flex flex-col fixed h-full z-20`}
        >
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              학생 관리
            </h2>
          </div>

          <div className="p-4">
            <button
              onClick={() => {
                setEditingStudent(null);
                setIsStudentModalOpen(true);
              }}
              className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-indigo-100 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> 학생 계정 생성
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2">
            {studentList.map((student) => (
              <div
                key={student.id}
                className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                  selectedStudent?.uid === student.uid
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
                onClick={() => setSelectedStudent(student)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedStudent?.uid === student.uid
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {student.name[0]}
                  </div>
                  <span className="font-medium">{student.name}</span>
                </div>

                <div
                  className={`flex gap-1 ${
                    selectedStudent?.uid === student.uid
                      ? 'text-slate-300'
                      : 'text-slate-400 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingStudent(student);
                      setIsStudentModalOpen(true);
                    }}
                    className="p-1 hover:bg-white/20 rounded hover:text-indigo-400"
                    title="수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStudent(student.id, student.name);
                    }}
                    className="p-1 hover:bg-white/20 rounded hover:text-red-400"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentUser(null)}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 px-4 py-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> 로그아웃
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          currentUser.role === USER_ROLES.ADMIN && isSidebarOpen ? 'ml-64' : ''
        }`}
      >
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentUser.role === USER_ROLES.ADMIN && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <Users className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                  {currentUser.role === USER_ROLES.ADMIN
                    ? `${selectedStudent?.name || '학생 선택 필요'}의 생기부 로드맵`
                    : '나의 생기부/통합과학 로드맵'}
                </h1>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  {currentUser.role === USER_ROLES.ADMIN ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  {currentUser.role === USER_ROLES.ADMIN
                    ? '관리자 모드'
                    : `${currentUser.name} 학생`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUser.role === USER_ROLES.ADMIN && (
                <>
                  <button
                    onClick={() => {
                      if (!selectedStudent) return alert('학생을 먼저 선택해주세요.');
                      setIsReportModalOpen(true);
                    }}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-bold active:scale-95"
                    title="전체 일정 분석 및 로드맵 제안"
                  >
                    <BrainCircuit className="w-4 h-4" />
                    <span className="hidden lg:inline">AI 로드맵</span>
                  </button>

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      if (!selectedStudent) return alert('학생을 먼저 선택해주세요.');
                      fileInputRef.current?.click();
                    }}
                    disabled={isOcrLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium disabled:opacity-50"
                    title="스케줄 이미지 업로드 (OCR)"
                  >
                    {isOcrLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-indigo-600" />
                    )}
                    <span className="hidden sm:inline">이미지 등록</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setIsMessageModalOpen(true)}
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <MessageCircle className="w-6 h-6 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium shadow-md hover:shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">일정 추가</span>
              </button>

              {currentUser.role === USER_ROLES.STUDENT && (
                <button
                  onClick={() => setCurrentUser(null)}
                  className="p-2 text-slate-400 hover:text-red-500"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Main Area */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8">
          {/* LEFT COLUMN: Recent Updates & News */}
          <div className="lg:w-80 shrink-0 space-y-4">
            {/* Recent Updates Feed */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800">최신 업데이트</h2>
              </div>

              {recentUpdates.length > 0 ? (
                <div className="space-y-3">
                  {recentUpdates.map((item) => {
                    const newFlag = isNew(item.createdAt);
                    const updatedFlag = isUpdated(item.createdAt, item.updatedAt);

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (currentUser.role === USER_ROLES.ADMIN) {
                            setSelectedEvent(item);
                            setIsAdviceModalOpen(true);
                          } else {
                            alert(`[${item.month}월] ${item.title}\n\n${item.detail}`);
                          }
                        }}
                        className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(
                              item.category
                            )}`}
                          >
                            {item.month}월
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.updatedAt
                              ? new Date(item.updatedAt.seconds * 1000).toLocaleDateString()
                              : 'New'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 leading-tight mb-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {newFlag && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">
                              NEW
                            </span>
                          )}
                          {updatedFlag && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded font-bold flex items-center gap-0.5">
                              <RotateCcw className="w-3 h-3" /> Upd
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-slate-400 text-sm py-10">
                  <p>최근 변경된 일정이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Main Schedule Grid */}
          <div className="flex-1 min-w-0">
            {/* Month Filter */}
            <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedMonth(null)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap shadow-sm border
                  ${
                    selectedMonth === null
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                전체
              </button>
              {[...Array(12)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSelectedMonth(i + 1)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap shadow-sm border
                    ${
                      selectedMonth === i + 1
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {i + 1}월
                </button>
              ))}
            </div>

            {/* Schedule Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {CATEGORIES.map((category) => {
                const items = filteredData
                  .filter((item) => item.category === category)
                  .sort((a, b) => a.month - b.month);

                return (
                  <div key={category} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <div
                        className={`p-1.5 rounded-lg ${
                          getCategoryColor(category).split(' ')[0]
                        } ${getCategoryColor(category).split(' ')[1]}`}
                      >
                        {getCategoryIcon(category)}
                      </div>
                      <h2 className="font-bold text-slate-700 text-sm">
                        {category}
                      </h2>
                      <span className="ml-auto text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {items.length > 0 ? (
                        items.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (currentUser.role === USER_ROLES.ADMIN) {
                                setSelectedEvent(item);
                                setIsAdviceModalOpen(true);
                              }
                            }}
                            className={`group relative bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                              currentUser.role === USER_ROLES.ADMIN
                                ? 'cursor-pointer'
                                : ''
                            }`}
                          >
                            <div
                              className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${getCategoryColor(
                                item.category
                              )
                                .split(' ')[0]
                                .replace('bg-', 'bg-')}`}
                            />

                            <div className="pl-2.5">
                              <div className="flex justify-between items-start mb-1.5">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(
                                    item.category
                                  )}`}
                                >
                                  {item.month}월
                                </span>

                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem(item);
                                      setIsFormOpen(true);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteSchedule(item.id, e)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                                {item.title}
                              </h3>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {item.detail}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-16 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-xs font-medium">
                          일정 없음
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <ScheduleFormModal
        isOpen={isFormOpen}
        initialData={editingItem}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveSchedule}
      />

      {isAdviceModalOpen && selectedEvent && (
        <AIAdviceModal
          event={selectedEvent}
          studentName={selectedStudent?.name}
          onUpdate={handleUpdateScheduleDetail}
          onClose={() => {
            setIsAdviceModalOpen(false);
            setSelectedEvent(null);
          }}
        />
      )}

      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        messages={messages}
        currentUser={currentUser}
        onSend={handleSendMessage}
        targetName={
          currentUser.role === USER_ROLES.ADMIN ? selectedStudent?.name : '선생님'
        }
      />

      <StudentModal
        isOpen={isStudentModalOpen}
        initialData={editingStudent}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSaveStudent}
      />

      <AIReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        schedules={schedules}
        studentName={selectedStudent?.name}
        onSend={handleSendMessage}
      />
    </div>
  );
}