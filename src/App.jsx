import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
  Camera,
  Image as ImageIcon,
  Lock,
  UserPlus,
  Clock,
  RotateCcw,
  FileText,
  BrainCircuit,
  ArrowDown,
  Newspaper,
  Zap,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
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
} from 'firebase/firestore';

// --- 1. Firebase Configuration & Init ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- 2. Constants & Helpers ---
const CATEGORIES = ['전공진로', 'IT컨셉', '교과진로', '교내행사', '학습'];
const ADMIN_ID = 'PKPK';
const ADMIN_PW = '1111';

const getCategoryColor = (category) => {
  switch (category) {
    case '전공진로':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'IT컨셉':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case '교과진로':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case '교내행사':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case '학습':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getCategoryIcon = (category) => {
  const className = 'w-4 h-4';
  switch (category) {
    case '전공진로':
      return <GraduationCap className={className} />;
    case 'IT컨셉':
      return <Code className={className} />;
    case '교과진로':
      return <BookOpen className={className} />;
    case '교내행사':
      return <Award className={className} />;
    case '학습':
      return <Calendar className={className} />;
    default:
      return <Calendar className={className} />;
  }
};

// --- 3. Login Component ---
const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('student'); // 'student' | 'admin'
  const [formData, setFormData] = useState({ id: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Firebase Auth Handling
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (authErr) {
        console.warn(
          'Authentication fallback to anonymous due to error:',
          authErr
        );
        await signInAnonymously(auth);
      }

      const authUser = auth.currentUser;

      if (mode === 'admin') {
        const inputId = formData.id.trim();
        const inputPw = formData.password.trim();

        if (inputId.toUpperCase() === ADMIN_ID && inputPw === ADMIN_PW) {
          onLogin({ uid: 'admin_master_uid', name: '관리자', role: 'admin' });
        } else {
          throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
      } else {
        // FIX: Fetch ALL users and filter in memory to avoid index/permission errors
        const q = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        const querySnapshot = await getDocs(q);

        const inputName = formData.name.trim();
        const inputPw = formData.password.trim();

        const studentDocSnap = querySnapshot.docs.find((doc) => {
          const data = doc.data();
          return (
            data.role === 'student' &&
            data.name === inputName &&
            data.password === inputPw
          );
        });

        if (studentDocSnap) {
          const studentData = studentDocSnap.data();
          onLogin({
            uid: studentData.uid,
            name: studentData.name,
            role: 'student',
          });

          const userRef = doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'users',
            studentDocSnap.id
          );
          await updateDoc(userRef, { lastLogin: serverTimestamp() });
        } else {
          throw new Error('학생 정보를 찾을 수 없거나 비밀번호가 틀립니다.');
        }
      }
    } catch (err) {
      console.error(err);
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
      </div>
    </div>
  );
};

// --- 4. Weekly News & Activity Recommendation Widget ---
const WeeklyNewsWidget = ({ apiKey, onAddToSchedule }) => {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      // FIX: Improved Prompt & Removed responseMimeType to avoid "No response" error with Search
      const systemPrompt = `
        당신은 고등학생을 위한 생기부 탐구 활동 큐레이터입니다.
        이번 주 최신 과학/기술/사회 이슈 중 고등학생이 탐구하기 좋은 주제를 하나 선정하여 추천해주세요.
        
        응답은 반드시 아래와 같은 순수한 JSON 포맷이어야 합니다. 
        마크다운 코드 블록(\`\`\`json ... \`\`\`)을 사용해도 좋습니다.
        다른 설명이나 사족을 붙이지 마세요.
        
        {
          "title": "활동 제목",
          "category": "전공진로" | "IT컨셉" | "교과진로" | "교내행사" | "학습",
          "month": 현재 월(숫자),
          "detail": "뉴스 요약 및 탐구 활동 내용 (한국어)"
        }
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: '이번 주 고등학생이 주목해야 할 최신 과학 뉴스나 이슈를 찾고, 이를 바탕으로 생기부 탐구 활동 하나를 추천해줘.',
                  },
                ],
              },
            ],
            tools: [{ google_search: {} }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            // REMOVED: responseMimeType: "application/json" -> This caused empty response with Search tool
          }),
        }
      );

      const data = await response.json();

      if (!data.candidates || !data.candidates[0].content) {
        throw new Error('No response from AI');
      }

      const text = data.candidates[0].content.parts[0].text;

      // Robust JSON extraction using Regex to find the first { and last }
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON');
      }

      const recData = JSON.parse(jsonMatch[0]);

      // Add source if available
      const source =
        data.candidates[0].groundingMetadata?.groundingAttributions?.[0]?.web
          ?.title;
      if (source) recData.source = source;

      setRecommendation(recData);
    } catch (e) {
      console.error('News fetch error:', e);
      alert('추천 활동을 불러오는 데 실패했습니다: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm p-5 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Newspaper className="w-24 h-24 text-indigo-900" />
      </div>

      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className="p-1.5 bg-indigo-100 rounded-lg">
          <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" />
        </div>
        <h2 className="font-bold text-indigo-900 text-sm">
          금주의 생기부 추천 활동
        </h2>
      </div>

      {!recommendation && !loading && (
        <div className="text-center py-4 relative z-10">
          <p className="text-xs text-indigo-600 mb-3 leading-relaxed">
            매주 월요일 업데이트!
            <br />
            최신 뉴스를 기반으로 AI가
            <br />
            탐구 주제를 추천해드려요.
          </p>
          <button
            onClick={fetchRecommendation}
            className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
          >
            이번 주 추천 보기
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-6 relative z-10">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
          <p className="text-xs text-indigo-500 animate-pulse">
            최신 트렌드 분석 중...
          </p>
        </div>
      )}

      {recommendation && (
        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-indigo-100 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                {recommendation.category}
              </span>
              <span className="text-[10px] text-slate-400">
                {recommendation.month}월 추천
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 leading-tight">
              {recommendation.title}
            </h3>
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
              {recommendation.detail}
            </p>
            {recommendation.source && (
              <p className="text-[10px] text-slate-400 mt-2 text-right">
                출처: {recommendation.source}
              </p>
            )}
          </div>
          <button
            onClick={() => onAddToSchedule(recommendation)}
            className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-md active:scale-95"
          >
            <Plus className="w-3 h-3" /> 내 일정에 추가
          </button>
        </div>
      )}
    </div>
  );
};

// --- 4. Main Application Component ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null); // Track Firebase Auth State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentList, setStudentList] = useState([]);

  const [schedules, setSchedules] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI States
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isAdviceModalOpen, setIsAdviceModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Student Management States
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Report & OCR States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const fileInputRef = useRef(null);

  // API Key (For Gemini 2.5)
  const [apiKey, setApiKey] = useState(
    'AIzaSyDGcN0zYWyLsbo_PK9VV8idJwFp02Ihtwo'
  );

  // --- Auth Initialization ---
  useEffect(() => {
    // Check initial auth or sign in anonymously if needed
    const initAuth = async () => {
      if (!auth.currentUser) {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      }
    };
    initAuth();

    // Listen to Auth State
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // --- Data Effects ---

  // 1. Fetch Users (Admin Only)
  useEffect(() => {
    // Only fetch if logical user is admin AND firebase auth is ready
    if (currentUser?.role !== 'admin' || !firebaseUser) return;

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'users');

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allUsers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const students = allUsers.filter((u) => u.role === 'student');
        setStudentList(students);

        if (!selectedStudent && students.length > 0) {
          setSelectedStudent(students[0]);
        }
      },
      (error) => {
        console.error('User fetch error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, firebaseUser]);

  // 2. Fetch Schedules
  useEffect(() => {
    if (!currentUser || !firebaseUser) return;

    let targetUid = currentUser.uid;
    if (currentUser.role === 'admin') {
      // If admin hasn't selected a student, don't fetch schedules yet or clear them
      if (!selectedStudent) {
        setSchedules([]);
        return;
      }
      targetUid = selectedStudent.uid;
    }

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allSchedules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // In-memory filter
        const mySchedules = allSchedules.filter(
          (s) => s.studentId === targetUid
        );
        setSchedules(mySchedules);
      },
      (error) => {
        console.error('Schedule fetch error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, selectedStudent, firebaseUser]);

  // 3. Fetch Messages
  useEffect(() => {
    if (!currentUser || !firebaseUser) return;

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'messages');

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allMsgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort in JS
        allMsgs.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA; // Descending
        });

        let myMsgs = [];
        if (currentUser.role === 'student') {
          myMsgs = allMsgs.filter((m) => m.toUid === currentUser.uid);
          const unread = myMsgs.filter((m) => !m.read).length;
          setUnreadCount(unread);
        } else {
          if (selectedStudent) {
            myMsgs = allMsgs.filter(
              (m) =>
                (m.fromUid === currentUser.uid &&
                  m.toUid === selectedStudent.uid) ||
                (m.fromUid === selectedStudent.uid &&
                  m.toUid === currentUser.uid)
            );
          }
        }
        setMessages(myMsgs);
      },
      (error) => {
        console.error('Message fetch error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, selectedStudent, firebaseUser]);

  // 4. Derived State for Recent Updates
  const recentUpdates = useMemo(() => {
    return [...schedules]
      .sort((a, b) => {
        const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [schedules]);

  // --- Actions ---

  const handleSaveStudent = async (name, password) => {
    if (!name || !password) return;
    try {
      if (editingStudent) {
        const userRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'users',
          editingStudent.id
        );
        await updateDoc(userRef, {
          name: name,
          password: password,
          updatedAt: serverTimestamp(),
        });
        alert('학생 정보가 수정되었습니다.');
      } else {
        const newUid = `student_${Date.now()}`;
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'users'),
          {
            uid: newUid,
            name: name,
            password: password,
            role: 'student',
            createdAt: serverTimestamp(),
          }
        );
        alert(`${name} 학생 계정이 생성되었습니다.`);
      }
      setIsStudentModalOpen(false);
      setEditingStudent(null);
    } catch (e) {
      console.error(e);
      alert('처리 중 오류가 발생했습니다: ' + e.message);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (
      !window.confirm(
        `'${studentName}' 학생의 계정을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`
      )
    )
      return;
    try {
      await deleteDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'users', studentId)
      );
      alert('삭제되었습니다.');
    } catch (e) {
      console.error(e);
      alert('삭제 실패: ' + e.message);
    }
  };

  const handleSaveSchedule = async (data) => {
    // GUARD CLAUSE FOR ADMIN
    if (currentUser.role === 'admin' && !selectedStudent) {
      alert('스케줄을 추가할 학생을 먼저 선택해주세요.');
      return;
    }

    const targetUid =
      currentUser.role === 'admin' ? selectedStudent.uid : currentUser.uid;
    try {
      // FIX: Check if editingItem has an ID. If it comes from 'recommendation', it might not have an ID yet.
      if (editingItem && editingItem.id) {
        const docRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'schedules',
          editingItem.id
        );
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'schedules'),
          {
            ...data,
            studentId: targetUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      }
      setIsFormOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error('Save error:', e);
      alert('저장 중 오류가 발생했습니다: ' + e.message);
    }
  };

  // Pre-fill schedule form with recommendation
  const handleAddRecommendation = (recItem) => {
    setEditingItem({
      month: recItem.month || new Date().getMonth() + 1,
      category: recItem.category || '학습',
      title: recItem.title || '',
      detail: recItem.detail || '',
    });
    setIsFormOpen(true);
  };

  // Specific function to update only the detail from AI advice
  const handleUpdateScheduleDetail = async (id, newDetail) => {
    try {
      const docRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'schedules',
        id
      );
      await updateDoc(docRef, {
        detail: newDetail,
        updatedAt: serverTimestamp(),
      });
      alert('상세 내용이 업데이트되었습니다.');
    } catch (e) {
      console.error(e);
      alert('업데이트 실패: ' + e.message);
    }
  };

  const handleDeleteSchedule = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'schedules', id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    // GUARD CLAUSE FOR ADMIN
    if (currentUser.role === 'admin' && !selectedStudent) {
      alert('메시지를 전송할 학생을 선택해주세요.');
      return;
    }

    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'messages'),
        {
          content: text,
          fromUid: currentUser.uid,
          fromName: currentUser.name,
          toUid:
            currentUser.role === 'admin'
              ? selectedStudent.uid
              : 'admin_placeholder_uid',
          read: false,
          createdAt: serverTimestamp(),
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!currentUser || currentUser.role !== 'admin' || !selectedStudent) {
      alert('학생을 먼저 선택한 후 이미지를 업로드해주세요.');
      return;
    }

    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];

        const prompt = `
          Analyze this image of a study schedule. 
          Extract all schedule items into a JSON array.
          Each item must have:
          - "month": number (1-12)
          - "category": string (One of: "전공진로", "IT컨셉", "교과진로", "교내행사", "학습") - map similar terms if needed.
          - "title": string (short title)
          - "detail": string (description)
          
          Return ONLY the JSON array. Do not use markdown blocks.
        `;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: file.type, data: base64Data } },
                  ],
                },
              ],
            }),
          }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        text = text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        const extractedSchedules = JSON.parse(text);

        let count = 0;
        for (const item of extractedSchedules) {
          await addDoc(
            collection(db, 'artifacts', appId, 'public', 'data', 'schedules'),
            {
              ...item,
              studentId: selectedStudent.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          );
          count++;
        }

        alert(`${count}개의 일정이 이미지에서 추출되어 등록되었습니다!`);
      };
    } catch (err) {
      console.error(err);
      alert('이미지 분석 실패: ' + err.message);
    } finally {
      setIsOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Rendering ---

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const filteredData = selectedMonth
    ? schedules.filter((item) => item.month === selectedMonth)
    : schedules;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar (Admin Only) */}
      {currentUser.role === 'admin' && (
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

                {/* Edit/Delete Buttons */}
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
          currentUser.role === 'admin' && isSidebarOpen ? 'ml-64' : ''
        }`}
      >
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <Users className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                  {currentUser.role === 'admin'
                    ? `${
                        selectedStudent?.name || '학생 선택 필요'
                      }의 생기부 로드맵`
                    : '나의 생기부/통합과학 로드맵'}
                </h1>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  {currentUser.role === 'admin' ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  {currentUser.role === 'admin'
                    ? '관리자 모드'
                    : `${currentUser.name} 학생`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUser.role === 'admin' && (
                <>
                  {/* AI Roadmap Report Button */}
                  <button
                    onClick={() => {
                      if (!selectedStudent)
                        return alert('학생을 먼저 선택해주세요.');
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
                      if (!selectedStudent)
                        return alert('학생을 먼저 선택해주세요.');
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

              {currentUser.role === 'student' && (
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
            {/* 1. Weekly News Recommendation Widget (New!) */}
            <WeeklyNewsWidget
              apiKey={apiKey}
              onAddToSchedule={handleAddRecommendation}
            />

            {/* 2. Recent Updates Feed */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-800">최신 업데이트</h2>
              </div>

              {recentUpdates.length > 0 ? (
                <div className="space-y-3">
                  {recentUpdates.map((item) => {
                    const isNew =
                      item.createdAt?.seconds &&
                      Date.now() / 1000 - item.createdAt.seconds < 86400 * 3;
                    const isUpdated =
                      item.updatedAt?.seconds &&
                      item.createdAt?.seconds &&
                      item.updatedAt.seconds > item.createdAt.seconds;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (currentUser.role === 'admin') {
                            setSelectedEvent(item);
                            setIsAdviceModalOpen(true);
                          } else {
                            alert(
                              `[${item.month}월] ${item.title}\n\n${item.detail}`
                            );
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
                              ? new Date(
                                  item.updatedAt.seconds * 1000
                                ).toLocaleDateString()
                              : 'New'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 leading-tight mb-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">
                              NEW
                            </span>
                          )}
                          {isUpdated && (
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
                              if (currentUser.role === 'admin') {
                                setSelectedEvent(item);
                                setIsAdviceModalOpen(true);
                              }
                            }}
                            className={`group relative bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                              currentUser.role === 'admin'
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
                                    onClick={(e) =>
                                      handleDeleteSchedule(item.id, e)
                                    }
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

      {/* --- Modals --- */}

      {/* 1. Schedule Form Modal */}
      {isFormOpen && (
        <ScheduleFormModal
          isOpen={isFormOpen}
          initialData={editingItem}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveSchedule}
          categories={CATEGORIES}
        />
      )}

      {/* 2. AI Advice Modal (Updated with Edit & Save to Detail) */}
      {isAdviceModalOpen && selectedEvent && (
        <AIAdviceModal
          event={selectedEvent}
          apiKey={apiKey}
          studentName={selectedStudent?.name}
          onUpdate={handleUpdateScheduleDetail}
          onClose={() => {
            setIsAdviceModalOpen(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* 3. Messaging Modal */}
      {isMessageModalOpen && (
        <MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          messages={messages}
          currentUser={currentUser}
          onSend={handleSendMessage}
          targetName={
            currentUser.role === 'admin' ? selectedStudent?.name : '선생님'
          }
        />
      )}

      {/* 4. Student Account Modal */}
      {isStudentModalOpen && (
        <StudentModal
          isOpen={isStudentModalOpen}
          initialData={editingStudent}
          onClose={() => {
            setIsStudentModalOpen(false);
            setEditingStudent(null);
          }}
          onSave={handleSaveStudent}
        />
      )}

      {/* 5. AI Comprehensive Report Modal */}
      {isReportModalOpen && (
        <AIReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          apiKey={apiKey}
          schedules={schedules}
          studentName={selectedStudent?.name}
          onSendToStudent={handleSendMessage}
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

// 1. Schedule Form
function ScheduleFormModal({
  isOpen,
  initialData,
  onClose,
  onSave,
  categories,
}) {
  const [formData, setFormData] = useState({
    month: initialData?.month || 1,
    category: initialData?.category || categories[0],
    title: initialData?.title || '',
    detail: initialData?.detail || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">
            {initialData ? '일정 수정' : '새 일정 등록'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                월 선택
              </label>
              <select
                value={formData.month}
                onChange={(e) =>
                  setFormData({ ...formData, month: parseInt(e.target.value) })
                }
                className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}월
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                카테고리
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              제목
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              placeholder="일정 제목"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              상세 내용
            </label>
            <textarea
              value={formData.detail}
              onChange={(e) =>
                setFormData({ ...formData, detail: e.target.value })
              }
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
              placeholder="구체적인 내용을 입력하세요..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> 저장하기
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. AI Advice Modal (Refactored: Interactive & Update capable)
function AIAdviceModal({ event, apiKey, studentName, onUpdate, onClose }) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // No auto fetch on mount anymore

  const fetchAdvice = async () => {
    setLoading(true);
    setAdvice('');

    const systemPrompt = `
      당신은 대한민국 최고의 고등학교 생기부(세특) 및 통합과학 교육 전문가입니다.
      '${studentName}' 학생의 활동을 분석하여, 대학 입학사정관이 주목할 만한 깊이 있는 생기부를 만들 수 있도록 구체적인 전략을 제시해야 합니다.
      단순한 나열보다는 '심화 탐구', '과목 간 융합', '진로 연계성'을 강조하세요.
    `;

    const userPrompt = `
      활동명: ${event.title}
      카테고리: ${event.category} (${event.month}월)
      상세내용: ${event.detail}

      위 활동에 대해 다음 관점에서 조언해주세요 (짧고 굵게):
      1. [심화 탐구 가이드]: 이 활동을 학술적 탐구로 발전시킬 구체적 주제 (실험, 논문 등)
      2. [독서/자료 추천]: 해당 주제의 깊이를 더해줄 전공 서적이나 학술 자료
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
            ],
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      setAdvice(
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
          '조언을 생성하지 못했습니다.'
      );
      setIsGenerated(true);
    } catch (err) {
      alert(`오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDetail = () => {
    // Append advice to original detail with a separator
    const newDetail = `${event.detail}\n\n--- [선생님 피드백] ---\n${advice}`;
    onUpdate(event.id, newDetail);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 flex justify-between items-start text-white">
          <div>
            <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" /> 생기부 활동 분석
            </div>
            <h2 className="text-2xl font-bold">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
          {/* Original Detail View */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <FileText className="w-3 h-3" /> 현재 상세 내용
            </h4>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              {event.detail}
            </p>
          </div>

          {/* Action Area */}
          {!isGenerated && !loading && (
            <div className="flex justify-center">
              <button
                onClick={fetchAdvice}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
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

          {/* AI Advice Result (Editable) */}
          {isGenerated && (
            <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 animate-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-xs font-bold text-indigo-600 uppercase mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> AI 선생님 조언 (수정 가능)
              </h4>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full h-40 p-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-800 leading-relaxed resize-none bg-white"
                placeholder="AI 조언 내용을 수정하거나 추가할 멘트를 작성하세요."
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-medium transition-colors"
          >
            취소
          </button>
          {isGenerated && (
            <button
              onClick={handleSaveToDetail}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md"
            >
              <Save className="w-4 h-4" /> 상세 내용에 추가하여 저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. Message Modal (Existing code)
function MessageModal({
  isOpen,
  onClose,
  messages,
  currentUser,
  onSend,
  targetName,
}) {
  const [input, setInput] = useState('');
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    onSend(input);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-[500px] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            {targetName ? `${targetName}님과의 대화` : '메시지'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
          ref={scrollRef}
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
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="p-3 bg-white border-t border-slate-100 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="메시지를 입력하세요..."
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// 4. Student Modal (Existing code)
function StudentModal({ isOpen, initialData, onClose, onSave }) {
  const [name, setName] = useState(initialData?.name || '');
  const [password, setPassword] = useState(initialData?.password || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(name, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h3 className="font-bold text-indigo-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />{' '}
            {initialData ? '학생 정보 수정' : '학생 계정 생성'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
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
                : '생성된 이름과 비밀번호를 학생에게 전달해주세요.'}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              학생 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="예: 홍길동"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              비밀번호
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border-slate-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="예: 1234"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            {initialData ? '수정사항 저장' : '계정 생성하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

// 5. AI Report Modal (Existing code)
function AIReportModal({
  isOpen,
  onClose,
  apiKey,
  schedules,
  studentName,
  onSendToStudent,
}) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Generate Report on Mount
  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setReport('');

    // Sort schedules for better context
    const sortedSchedules = [...schedules].sort((a, b) => a.month - b.month);
    const scheduleSummary = sortedSchedules
      .map((s) => `- [${s.month}월] ${s.category}: ${s.title} (${s.detail})`)
      .join('\n');

    const systemPrompt = `
      당신은 고등학생의 '생기부(세특)'와 '통합과학' 활동을 설계하는 전문 컨설턴트입니다.
      학생의 연간 일정을 분석하여, 대학 진학에 유리한 '조직적인 활동 로드맵'을 제안해야 합니다.
      
      목표:
      1. 파편화된 활동들을 하나의 강력한 '과학적 탐구 주제'로 연결하십시오.
      2. '통합과학' 교과 내용과 연계된 심화 탐구 방향을 제시하십시오.
      3. 학생이 바로 실행할 수 있는 구체적인 액션 플랜을 포함하십시오.
    `;

    const userPrompt = `
      학생 이름: ${studentName}
      
      [학생의 연간 일정]
      ${scheduleSummary}

      위 일정을 바탕으로 다음 항목을 포함한 '생기부 디자인 리포트'를 작성해주세요:
      1. **핵심 테마 제안**: 이 학생의 활동을 관통하는 하나의 과학적 키워드/테마는 무엇인가?
      2. **활동 연결 고리**: 기존 활동들을 어떻게 연결해야 스토리가 생기는가? (예: 3월 활동의 의문을 8월 R&E로 해결)
      3. **부족한 점 보완**: 현재 일정에서 생기부의 완성도를 높이기 위해 추가해야 할 활동 (독서, 실험 등)
      4. **선생님의 조언**: 학생에게 전하는 격려와 구체적인 실천 지침.
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
            ],
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      setReport(
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
          '리포트를 생성하지 못했습니다.'
      );
      setGenerated(true);
    } catch (err) {
      setReport(`오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!report.trim()) return;
    onSendToStudent(`[AI 생기부 로드맵 리포트]\n\n${report}`);
    onClose();
    alert('학생에게 로드맵 리포트를 전송했습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-6 h-6" />
            <h2 className="text-xl font-bold">AI 생기부 로드맵 설계</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
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
                  <strong>AI 분석 완료!</strong> 내용을 검토하고 필요하면 수정한
                  뒤 학생에게 전송하세요.
                </div>
              </div>
              <textarea
                value={report}
                onChange={(e) => setReport(e.target.value)}
                className="w-full h-[400px] p-5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-sans leading-relaxed text-slate-700 resize-none shadow-sm"
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          {generated && (
            <button
              onClick={handleSend}
              className="px-6 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl transform active:scale-95"
            >
              <Send className="w-4 h-4" /> 학생에게 전송
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
