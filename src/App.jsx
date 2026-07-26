import React, { Fragment, useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle, Circle, Clock, TrendingUp, Home, BookOpen, FlaskConical, ExternalLink, ArrowLeft, Menu, X, Moon, Sun, Cloud, Loader2, LogOut, Mail, Lock, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

const DEFAULT_TASK_TEMPLATES = [
  { label: 'Preview', offsetDays: -1 },
  { label: 'Lecture', offsetDays: 0 },
  { label: 'Notes', offsetDays: 1 },
  { label: 'Questions', offsetDays: 2 },
  { label: 'Review Missed Questions', offsetDays: 2 },
  { label: 'Additional Review', offsetDays: 4 },
];

const LEGACY_TASK_LABEL_MAP = {
  Review: 'Review Missed Questions',
  Additional: 'Additional Review',
};

const cloneTaskTemplates = (templates) =>
  templates.map(template => ({
    label: template.label,
    offsetDays: Number(template.offsetDays) || 0,
  }));

const getUniqueTaskLabel = (baseLabel, existingLabels) => {
  const trimmed = baseLabel.trim();
  const candidateBase = trimmed || 'New Task';
  let candidate = candidateBase;
  let suffix = 2;

  while (existingLabels.has(candidate)) {
    candidate = `${candidateBase} ${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const loadTaskTemplates = () => {
  const saved = localStorage.getItem('passTrackerTaskTemplates');
  if (!saved) return cloneTaskTemplates(DEFAULT_TASK_TEMPLATES);

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return cloneTaskTemplates(DEFAULT_TASK_TEMPLATES);

    const normalized = parsed
      .map(template => ({
        label: template.label === 'Review' ? 'Review Missed Questions' : template.label === 'Additional' ? 'Additional Review' : template.label,
        offsetDays: Number(template.offsetDays) || 0,
      }))
      .filter(template => template.label);

    return normalized.length > 0 ? normalized : cloneTaskTemplates(DEFAULT_TASK_TEMPLATES);
  } catch {
    return cloneTaskTemplates(DEFAULT_TASK_TEMPLATES);
  }
};

const normalizeTasksForTemplates = (rawTasks, templates, excludedTasks = []) => {
  const tasks = {};
  templates.forEach(template => {
    if (excludedTasks.includes(template.label)) return;
    const legacyKey = Object.entries(LEGACY_TASK_LABEL_MAP).find(([, newLabel]) => newLabel === template.label)?.[0];
    tasks[template.label] = rawTasks?.[template.label] ?? rawTasks?.[legacyKey] ?? 'Not Started';
  });

  return tasks;
};

const compareByDateAsc = (a, b) => {
  if (!a?.date && !b?.date) return 0;
  if (!a?.date) return 1;
  if (!b?.date) return -1;
  return String(a.date).localeCompare(String(b.date));
};

const sortByDateAsc = (items) => [...(items || [])].sort(compareByDateAsc);

const normalizeExamsData = (examList, templates) =>
  sortByDateAsc(examList.map(exam => ({
    ...exam,
    materials: sortByDateAsc((exam.materials || []).map(material => ({
      ...material,
      excludedTasks: Array.isArray(material.excludedTasks) ? material.excludedTasks : [],
      name: material.name === 'New Material' || !material.name ? 'Lecture Name' : material.name,
      tasks: normalizeTasksForTemplates(material.tasks, templates, Array.isArray(material.excludedTasks) ? material.excludedTasks : []),
    }))),
  })));

const loadExams = (templates) => {
  const saved = localStorage.getItem('passTrackerExams');
  if (!saved) {
    return [{ id: 1, name: 'Exam 1', date: '', materials: [] }];
  }

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) return normalizeExamsData(parsed, templates);
    return normalizeExamsData(Object.entries(parsed).map(([key, exam]) => ({
      id: Number(key) || Date.now(),
      name: exam.name || 'Exam',
      date: exam.date || '',
      materials: exam.materials || [],
    })), templates);
  } catch {
    return [{ id: 1, name: 'Exam 1', date: '', materials: [] }];
  }
};

const EditableTextInput = ({ value, onCommit, className = '', placeholder = '', type = 'text' }) => {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const commit = () => {
    const nextValue = draft;
    if (nextValue !== value) {
      onCommit(nextValue);
    }
  };

  return (
    <input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
};

const CloudSyncPanel = ({
  isSupabaseConfigured,
  cloudUser,
  cloudLoading,
  cloudBusy,
  cloudError,
  cloudNotice,
  cloudSyncedAt,
  cloudConflict,
  onPasswordSignIn,
  onPasswordSignUp,
  onSignOut,
  onRefresh,
  onKeepCloudVersion,
  onKeepLocalVersion,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [pendingAction, setPendingAction] = useState(null);
  const signedInLabel = cloudUser?.user_metadata?.username || cloudUser?.email || 'your account';

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <Cloud className="text-blue-600" size={20} />
            <h2 className="text-xl font-bold">Cloud Sync</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Sign in once and your exams, lectures, resources, and theme will stay synced between devices.
          </p>
          {!isSupabaseConfigured && (
            <p className="mt-2 text-sm text-amber-700">
              Supabase is not configured yet. Add your URL and anon key to start syncing.
            </p>
          )}
          {cloudNotice && <p className="mt-2 text-sm text-green-700">{cloudNotice}</p>}
          {cloudError && <p className="mt-2 text-sm text-red-600">{cloudError}</p>}
        </div>

        <div className="flex flex-col gap-3">
          {cloudUser ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Signed in as <span className="font-semibold">{signedInLabel}</span>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={cloudBusy}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cloudBusy ? <Loader2 className="animate-spin" size={16} /> : <Cloud size={16} />}
                Refresh now
              </button>
              <button
                type="button"
                onClick={onSignOut}
                disabled={cloudBusy}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cloudBusy ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                Sign out
              </button>
            </div>
          ) : (
            <div className="max-w-md space-y-3">
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setPendingAction(null);
                  }}
                  className={`rounded-md px-3 py-1.5 transition ${authMode === 'signin' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setPendingAction(null);
                  }}
                  className={`rounded-md px-3 py-1.5 transition ${authMode === 'signup' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
                >
                  Create account
                </button>
              </div>

              {authMode === 'signup' && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-3">
                  <User className="text-gray-400" size={16} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-3">
                <Mail className="text-gray-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-transparent outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-3">
                <Lock className="text-gray-400" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent outline-none"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={async () => {
                    setPendingAction('signin');
                    await onPasswordSignIn(email, password);
                    setPendingAction(null);
                  }}
                  disabled={cloudBusy || !email.trim() || !password || !isSupabaseConfigured}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cloudBusy || pendingAction === 'signin' ? <Loader2 className="animate-spin" size={16} /> : <Cloud size={16} />}
                  {pendingAction === 'signin' ? 'Signing in...' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setPendingAction('signup');
                    await onPasswordSignUp(email, password, username);
                    setPendingAction(null);
                  }}
                  disabled={cloudBusy || !email.trim() || !password || !username.trim() || !isSupabaseConfigured}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cloudBusy || pendingAction === 'signup' ? <Loader2 className="animate-spin" size={16} /> : <Cloud size={16} />}
                  {pendingAction === 'signup' ? 'Creating...' : 'Create account'}
                </button>
              </div>
              {pendingAction && (
                <p className="text-sm text-gray-600">
                  {pendingAction === 'signin' ? 'Checking your email and password...' : 'Creating your account and saving your username...'}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Use the same email and password each time. New accounts also store the username in your profile.
              </p>
            </div>
          )}
        </div>
      </div>

      {cloudLoading && (
        <p className="mt-4 text-sm text-gray-500">Checking cloud session...</p>
      )}
      {cloudBusy && !cloudLoading && (
        <p className="mt-4 text-sm text-gray-500">
          {pendingAction === 'signin'
            ? 'Signing in...'
            : pendingAction === 'signup'
              ? 'Creating account...'
              : 'Syncing data...'}
        </p>
      )}
      {cloudConflict && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Conflict detected</p>
          <p className="mt-1 text-sm text-amber-800">
            {cloudConflict.message || 'Your local changes and the cloud copy both changed since the last sync.'}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onKeepCloudVersion}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
            >
              Use cloud version
            </button>
            <button
              type="button"
              onClick={onKeepLocalVersion}
              disabled={cloudBusy}
              className="inline-flex items-center justify-center rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Keep local version
            </button>
          </div>
        </div>
      )}
      {cloudSyncedAt && (
        <p className="mt-4 text-xs text-gray-500">
          Last synced {new Date(cloudSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
};

const PassTracker = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [resourcePage, setResourcePage] = useState('home');
  const [theme, setTheme] = useState(() => localStorage.getItem('passTrackerTheme') || 'light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initialTaskTemplates = loadTaskTemplates();
  const initialExams = loadExams(initialTaskTemplates);
  const [taskTemplates, setTaskTemplates] = useState(() => initialTaskTemplates);
  const [exams, setExams] = useState(() => initialExams);
  const [selectedExam, setSelectedExam] = useState(() => initialExams[0]?.id ?? null);
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(isSupabaseConfigured);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudNotice, setCloudNotice] = useState('');
  const [cloudSyncedAt, setCloudSyncedAt] = useState(null);
  const [cloudConflict, setCloudConflict] = useState(null);
  const lastSyncedPayloadRef = useRef('');
  const [resources, setResources] = useState(() => {
    const saved = localStorage.getItem('passTrackerResources');
    return saved ? JSON.parse(saved) : {
      disorders: [],
      medications: []
    };
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('passTrackerExams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('passTrackerTaskTemplates', JSON.stringify(taskTemplates));
    setExams(prev => {
      const normalized = normalizeExamsData(prev, taskTemplates);
      return JSON.stringify(normalized) === JSON.stringify(prev) ? prev : normalized;
    });
  }, [taskTemplates]);

  useEffect(() => {
    localStorage.setItem('passTrackerResources', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('passTrackerTheme', theme);
  }, [theme]);

  useEffect(() => {
    lastSyncedPayloadRef.current = JSON.stringify({
      exams,
      taskTemplates,
      resources,
      theme,
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCloudLoading(false);
      return undefined;
    }

    let mounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setCloudError(error.message);
        setCloudLoading(false);
        return;
      }

      setCloudUser(data.session?.user ?? null);
      setCloudLoading(false);
    };

    syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCloudUser(session?.user ?? null);
      setCloudLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!cloudUser || !supabase) return undefined;

    fetchCloudState(cloudUser.id);
  }, [cloudUser]);

  useEffect(() => {
    if (!cloudUser || !supabase || cloudLoading || cloudBusy || cloudConflict) return undefined;

    const currentPayload = buildCurrentCloudPayload();
    const currentSerialized = serializeCloudPayload(currentPayload);
    if (currentSerialized === lastSyncedPayloadRef.current) {
      return undefined;
    }

    const syncTimer = window.setTimeout(async () => {
      await persistCloudPayload(currentPayload);
    }, 900);

    return () => window.clearTimeout(syncTimer);
  }, [cloudUser, cloudLoading, cloudBusy, cloudConflict, exams, taskTemplates, resources, theme]);

  useEffect(() => {
    if (exams.length && !exams.some(e => e.id === selectedExam)) {
      setSelectedExam(exams[0].id);
    }
  }, [exams, selectedExam]);

  const currentExam = exams.find(e => e.id === selectedExam) ?? exams[0];

  const taskTypes = taskTemplates.map(template => template.label);
  const taskTemplateMap = Object.fromEntries(taskTemplates.map(template => [template.label, template.offsetDays]));
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tracker', label: 'Progress Tracker', icon: TrendingUp },
    { id: 'todo', label: 'To Do' },
    { id: 'resources', label: 'Resources', icon: BookOpen }
  ];
  const isDarkMode = theme === 'dark';
  const toggleTheme = () => setTheme(current => (current === 'dark' ? 'light' : 'dark'));

  const handleCloudPasswordSignIn = async (email, password) => {
    if (!supabase || !email?.trim() || !password) return;

    setCloudBusy(true);
    setCloudError('');
    setCloudNotice('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setCloudError(error.message);
        return;
      }

      setCloudNotice('Signed in successfully.');
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudPasswordSignUp = async (email, password, username) => {
    if (!supabase || !email?.trim() || !password || !username?.trim()) return;

    setCloudBusy(true);
    setCloudError('');
    setCloudNotice('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: username.trim(),
          },
        },
      });

      if (error) {
        setCloudError(error.message);
        return;
      }

      if (data?.session) {
        setCloudNotice(`Account created and signed in as ${username.trim()}.`);
      } else {
        setCloudNotice(`Account created for ${username.trim()}. Check your email if confirmation is enabled, then sign in.`);
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudSignOut = async () => {
    if (!supabase) return;
    setCloudBusy(true);
    setCloudError('');
    const { error } = await supabase.auth.signOut();
    if (error) setCloudError(error.message);
    setCloudBusy(false);
    setCloudNotice('Signed out.');
  };

  const serializeCloudPayload = (payload) => JSON.stringify({
    exams: payload.exams,
    taskTemplates: payload.taskTemplates,
    resources: payload.resources,
    theme: payload.theme,
  });

  const buildCurrentCloudPayload = () => ({
    exams,
    taskTemplates,
    resources,
    theme,
  });

  const normalizeCloudPayload = (cloudState) => {
    const nextTaskTemplates = Array.isArray(cloudState.taskTemplates) && cloudState.taskTemplates.length
      ? cloneTaskTemplates(cloudState.taskTemplates)
      : taskTemplates;

    return {
      exams: Array.isArray(cloudState.exams)
        ? normalizeExamsData(cloudState.exams, nextTaskTemplates)
        : exams,
      taskTemplates: nextTaskTemplates,
      resources: cloudState.resources && typeof cloudState.resources === 'object'
        ? cloudState.resources
        : resources,
      theme: cloudState.theme === 'light' || cloudState.theme === 'dark'
        ? cloudState.theme
        : theme,
    };
  };

  const applyCloudPayload = (payload, syncedAt) => {
    setTaskTemplates(payload.taskTemplates);
    setExams(payload.exams);
    setResources(payload.resources);
    setTheme(payload.theme);
    lastSyncedPayloadRef.current = serializeCloudPayload(payload);
    setCloudSyncedAt(syncedAt);
    setCloudConflict(null);
  };

  const persistCloudPayload = async (payload, noticeMessage) => {
    if (!supabase || !cloudUser) return false;

    setCloudBusy(true);
    setCloudError('');

    const { data: savedRow, error } = await supabase.from('user_app_state').upsert({
      user_id: cloudUser.id,
      state: payload,
      updated_at: new Date().toISOString(),
    }).select('updated_at').single();

    if (error) {
      setCloudError(error.message);
      setCloudBusy(false);
      return false;
    }

    lastSyncedPayloadRef.current = serializeCloudPayload(payload);
    setCloudSyncedAt(savedRow?.updated_at ?? new Date().toISOString());
    setCloudConflict(null);

    if (noticeMessage) {
      setCloudNotice(noticeMessage);
    }

    setCloudBusy(false);
    return true;
  };

  const fetchCloudState = async (userId) => {
    if (!supabase || !userId) return;

    setCloudBusy(true);
    setCloudError('');

    const { data, error } = await supabase
      .from('user_app_state')
      .select('state, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      setCloudError(error.message);
      setCloudBusy(false);
      return;
    }

    const cloudState = data?.state;
    if (cloudState && typeof cloudState === 'object') {
      const normalizedRemote = normalizeCloudPayload(cloudState);
      const currentSerialized = serializeCloudPayload(buildCurrentCloudPayload());
      const remoteSerialized = serializeCloudPayload(normalizedRemote);
      const baselineSerialized = lastSyncedPayloadRef.current;
      const localDirty = currentSerialized !== baselineSerialized;
      const remoteDirty = remoteSerialized !== baselineSerialized;

      if (localDirty && remoteDirty) {
        setCloudConflict({
          payload: normalizedRemote,
          updatedAt: data?.updated_at ?? new Date().toISOString(),
          message: 'Both this device and the cloud changed since the last sync.',
        });
        setCloudNotice('Conflict detected. Choose which version to keep.');
        setCloudBusy(false);
        return;
      }

      applyCloudPayload(normalizedRemote, data?.updated_at ?? new Date().toISOString());
      setCloudNotice('Cloud data loaded.');
    } else {
      setCloudNotice('Signed in. Your local changes will sync to the cloud.');
    }

    setCloudBusy(false);
  };

  const handleCloudRefresh = async () => {
    if (!cloudUser) return;
    await fetchCloudState(cloudUser.id);
  };

  const handleKeepCloudVersion = () => {
    if (!cloudConflict) return;
    applyCloudPayload(cloudConflict.payload, cloudConflict.updatedAt ?? new Date().toISOString());
    setCloudNotice('Loaded the cloud version.');
  };

  const handleKeepLocalVersion = async () => {
    if (!cloudConflict) return;
    await persistCloudPayload(buildCurrentCloudPayload(), 'Kept the local version and updated the cloud copy.');
  };

  const ThemeToggle = ({ className = '' } = {}) => (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-100 px-2.5 py-2 text-gray-700 transition hover:bg-gray-200 ${className}`}
    >
      <Sun size={15} className={isDarkMode ? 'text-gray-400' : 'text-amber-500'} />
      <Moon size={15} className={isDarkMode ? 'text-blue-700' : 'text-gray-400'} />
    </button>
  );

  const addExam = () => {
    const id = Date.now();
    setExams(prev => sortByDateAsc([...prev, { id, name: 'New Exam', date: '', materials: [] }]));
    setSelectedExam(id);
  };

  const updateExamName = (examId, name) => {
    setExams(prev => prev.map(e => e.id === examId ? { ...e, name } : e));
  };

  const deleteExam = (examId) => {
    setExams(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(e => e.id !== examId);
      if (selectedExam === examId) {
        setSelectedExam(next[0].id);
      }
      return next;
    });
  };

  const addMaterial = (examId) => {
    const targetId = examId ?? selectedExam;
    if (!targetId) return;
    setExams(prev => prev.map(e =>
      e.id === targetId
        ? {
            ...e,
            materials: sortByDateAsc([...e.materials, {
              id: Date.now(),
              name: 'Lecture Name',
              date: new Date().toISOString().split('T')[0],
              difficulty: 'Medium',
              excludedTasks: [],
              tasks: taskTypes.reduce((acc, type) => ({ ...acc, [type]: 'Not Started' }), {})
            }])
          }
        : e
    ));
  };

  const updateMaterial = (examId, materialId, field, value) => {
    setExams(prev => prev.map(e => {
      if (e.id !== examId) return e;
      const materials = e.materials.map(m =>
        m.id === materialId ? { ...m, [field]: value } : m
      );
      return {
        ...e,
        materials: field === 'date' ? sortByDateAsc(materials) : materials,
      };
    }));
  };

  const updateTask = (examId, materialId, taskType, status) => {
    setExams(prev => prev.map(e =>
      e.id === examId
        ? {
            ...e,
            materials: e.materials.map(m =>
              m.id === materialId ? { ...m, tasks: { ...m.tasks, [taskType]: status } } : m
            )
          }
        : e
    ));
  };

  const deleteMaterial = (examId, materialId) => {
    setExams(prev => prev.map(e =>
      e.id === examId
        ? { ...e, materials: e.materials.filter(m => m.id !== materialId) }
        : e
    ));
  };

  const updateExamDate = (examId, date) => {
    setExams(prev => sortByDateAsc(prev.map(e => e.id === examId ? { ...e, date } : e)));
  };

  const sortedExams = sortByDateAsc(exams);

  const completeTask = (examId, materialId, taskType) => {
    updateTask(examId, materialId, taskType, 'Complete');
  };

  const addTaskTemplate = (label, offsetDays) => {
    const nextLabel = getUniqueTaskLabel(label, new Set(taskTemplates.map(template => template.label)));
    const nextTemplate = {
      label: nextLabel,
      offsetDays: Number(offsetDays) || 0,
    };

    setTaskTemplates(prev => [...prev, nextTemplate]);
    setExams(prev => prev.map(exam => ({
      ...exam,
      materials: exam.materials.map(material => ({
        ...material,
        tasks: {
          ...material.tasks,
          [nextLabel]: material.tasks?.[nextLabel] ?? 'Not Started',
        },
      })),
    })));
  };

  const removeTaskTemplate = (label) => {
    if (taskTemplates.length <= 1) return;

    setTaskTemplates(prev => prev.filter(template => template.label !== label));
    setExams(prev => prev.map(exam => ({
      ...exam,
      materials: exam.materials.map(material => {
        const nextTasks = { ...material.tasks };
        delete nextTasks[label];
        return { ...material, tasks: nextTasks };
      }),
    })));
  };

  const removeTaskFromLecture = (examId, materialId, taskType) => {
    setExams(prev => prev.map(exam =>
      exam.id !== examId
        ? exam
        : {
            ...exam,
            materials: exam.materials.map(material => {
              if (material.id !== materialId) return material;
              const nextTasks = { ...material.tasks };
              delete nextTasks[taskType];
              const excludedTasks = Array.from(new Set([...(material.excludedTasks || []), taskType]));
              return {
                ...material,
                tasks: nextTasks,
                excludedTasks,
              };
            }),
          }
    ));
  };

  const getActiveTaskLabels = (material) => {
    const excludedTasks = new Set(material.excludedTasks || []);
    return taskTypes.filter(taskType => !excludedTasks.has(taskType) && Object.prototype.hasOwnProperty.call(material.tasks || {}, taskType));
  };

  const calculateProgress = (materials) => {
    if (materials.length === 0) return 0;
    const totalTasks = materials.reduce((acc, material) => acc + getActiveTaskLabels(material).length, 0);
    const completedTasks = materials.reduce((acc, material) =>
      acc + getActiveTaskLabels(material).filter(taskType => material.tasks?.[taskType] === 'Complete').length, 0
    );
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  const getTaskCounts = (materials) => {
    const counts = { complete: 0, inProgress: 0, notStarted: 0 };
    materials.forEach(m => {
      Object.values(m.tasks).forEach(status => {
        if (status === 'Complete') counts.complete++;
        else if (status === 'In Progress') counts.inProgress++;
        else counts.notStarted++;
      });
    });
    return counts;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTaskDueDate = (materialDate, taskType) => {
    if (!materialDate) return null;
    const dueDate = new Date(`${materialDate}T00:00:00`);
    if (Number.isNaN(dueDate.getTime())) return null;
    dueDate.setDate(dueDate.getDate() + (taskTemplateMap[taskType] ?? 0));
    return dueDate;
  };

  const getTaskSummary = (material) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = getActiveTaskLabels(material)
      .map(taskType => {
        const dueDate = getTaskDueDate(material.date, taskType);
        const status = material.tasks?.[taskType] || 'Not Started';
        return dueDate ? { taskType, dueDate, status } : null;
      })
      .filter(Boolean)
      .filter(item => item.status !== 'Complete')
      .sort((a, b) => a.dueDate - b.dueDate);

    if (items.length === 0) return 'All tasks complete';

    const todayItem = items.find(item => item.dueDate.getTime() === today.getTime());
    if (todayItem) return `Today: ${todayItem.taskType}`;

    const overdueItem = items.find(item => item.dueDate < today);
    if (overdueItem) return `Overdue: ${overdueItem.taskType}`;

    return `Next: ${items[0].taskType}`;
  };

  const buildTodoItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingCutoff = new Date(today);
    upcomingCutoff.setDate(upcomingCutoff.getDate() + 2);

    const items = exams.flatMap(exam =>
      exam.materials.flatMap(material =>
        getActiveTaskLabels(material)
          .filter(taskType => material.tasks?.[taskType] !== 'Complete')
          .map(taskType => {
            const dueDate = getTaskDueDate(material.date, taskType);
            if (!dueDate) return null;

            return ({
            examId: exam.id,
            examName: exam.name,
            materialId: material.id,
            materialName: material.name || 'Untitled Material',
            taskType,
            dueDate: dueDate.toISOString().split('T')[0],
            status: material.tasks?.[taskType] || 'Not Started'
          });
          })
      )
    );

    const buckets = {
      today: [],
      overdue: [],
      upcoming: []
    };

    items.forEach(item => {
      const dueDate = new Date(`${item.dueDate}T00:00:00`);
      if (Number.isNaN(dueDate.getTime())) return;

      if (dueDate < today) {
        buckets.overdue.push(item);
      } else if (dueDate.getTime() === today.getTime()) {
        buckets.today.push(item);
      } else if (dueDate <= upcomingCutoff) {
        buckets.upcoming.push(item);
      }
    });

    const sortItems = (a, b) => {
      const dateDiff = new Date(`${a.dueDate}T00:00:00`) - new Date(`${b.dueDate}T00:00:00`);
      if (dateDiff !== 0) return dateDiff;
      if (a.examName !== b.examName) return a.examName.localeCompare(b.examName);
      if (a.materialName !== b.materialName) return a.materialName.localeCompare(b.materialName);
      return a.taskType.localeCompare(b.taskType);
    };

    return {
      today: buckets.today.sort(sortItems),
      overdue: buckets.overdue.sort(sortItems),
      upcoming: buckets.upcoming.sort(sortItems)
    };
  };

  const TaskSetupPanel = () => {
    const [newTaskLabel, setNewTaskLabel] = useState('');
    const [newTaskOffset, setNewTaskOffset] = useState(0);

    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Label</label>
              <input
                type="text"
                value={newTaskLabel}
                onChange={(e) => setNewTaskLabel(e.target.value)}
                placeholder="e.g. Practice Quiz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Offset (days)</label>
              <input
                type="number"
                value={newTaskOffset}
                onChange={(e) => setNewTaskOffset(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                addTaskTemplate(newTaskLabel, newTaskOffset);
                setNewTaskLabel('');
                setNewTaskOffset(0);
              }}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              <span>Add Task</span>
            </button>
          </div>

          <div className="space-y-2">
            {taskTemplates.map(template => (
              <div key={template.label} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{template.label}</p>
                  <p className="text-sm text-gray-600">
                    Due {template.offsetDays === 0
                      ? 'same day as lecture'
                      : template.offsetDays > 0
                        ? `${template.offsetDays} day${template.offsetDays === 1 ? '' : 's'} after lecture`
                        : `${Math.abs(template.offsetDays)} day${Math.abs(template.offsetDays) === 1 ? '' : 's'} before lecture`}
                  </p>
                </div>
                <button
                  onClick={() => removeTaskTemplate(template.label)}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition text-sm font-medium"
                >
                  <Trash2 size={16} />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    const [showTaskSetup, setShowTaskSetup] = useState(false);

    if (!currentExam) {
      return (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-600 mb-4">No exams yet. Add one to get started.</p>
          <button
            onClick={addExam}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mx-auto"
          >
            <Plus size={20} />
            <span>Add Exam</span>
          </button>
        </div>
      );
    }

    const progress = calculateProgress(currentExam.materials);
    const counts = getTaskCounts(currentExam.materials);
    const totalTasks = currentExam.materials.length * taskTypes.length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-lg">
          <h1 className="text-4xl font-bold mb-2">PassTracker™ Command Center</h1>
          <p className="text-blue-100">Master Your Exam Prep</p>
        </div>

        {/* Exam Setup */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center gap-3 mb-3">
            <h2 className="text-xl font-bold">Exam Setup</h2>
            <button
              onClick={addExam}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm shrink-0"
            >
              <Plus size={16} />
              <span>Add Exam</span>
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Exam Name</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Exam Date</th>
                  <th className="px-3 py-2 font-medium text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedExams.map(exam => (
                  <tr key={exam.id} className="border-t border-gray-200">
                    <td className="px-3 py-2 align-middle">
                      <EditableTextInput
                        value={exam.name}
                        onCommit={(next) => updateExamName(exam.id, next)}
                        className="w-full min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="date"
                        value={exam.date}
                        onChange={(e) => updateExamDate(exam.id, e.target.value)}
                        className="w-full min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      {exams.length > 1 && (
                        <button
                          onClick={() => deleteExam(exam.id)}
                          className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 transition text-sm font-medium"
                          title="Remove Exam"
                        >
                          <Trash2 size={16} />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#173b3c] border-[#2a5060]' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Overall Progress</h3>
              <TrendingUp className={isDarkMode ? 'text-green-300' : 'text-green-600'} size={24} />
            </div>
            <div className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-green-100' : 'text-green-700'}`}>{progress}%</div>
            <div className={isDarkMode ? 'w-full bg-green-900/60 rounded-full h-2' : 'w-full bg-green-200 rounded-full h-2'}>
              <div className={isDarkMode ? 'bg-green-400 h-2 rounded-full' : 'bg-green-600 h-2 rounded-full'} style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#173046] border-[#2a5060]' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Completed Tasks</h3>
              <CheckCircle className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} size={24} />
            </div>
            <div className={`text-4xl font-bold ${isDarkMode ? 'text-blue-100' : 'text-blue-700'}`}>{counts.complete}</div>
            <p className={isDarkMode ? 'text-blue-200 text-sm mt-2' : 'text-blue-600 text-sm mt-2'}>of {totalTasks} total</p>
          </div>

          <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#1b3142] border-[#2a5060]' : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Materials</h3>
              <BookOpen className={isDarkMode ? 'text-purple-300' : 'text-purple-600'} size={24} />
            </div>
            <div className={`text-4xl font-bold ${isDarkMode ? 'text-purple-100' : 'text-purple-700'}`}>{currentExam.materials.length}</div>
            <p className={isDarkMode ? 'text-purple-200 text-sm mt-2' : 'text-purple-600 text-sm mt-2'}>topics covered</p>
          </div>
        </div>

        {/* Task Status */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Task Status Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="text-green-700 font-semibold">{counts.complete}</p>
                <p className="text-green-600 text-sm">Complete</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
              <Clock className="text-yellow-600" size={24} />
              <div>
                <p className="text-yellow-700 font-semibold">{counts.inProgress}</p>
                <p className="text-yellow-600 text-sm">In Progress</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <Circle className="text-gray-400" size={24} />
              <div>
                <p className="text-gray-700 font-semibold">{counts.notStarted}</p>
                <p className="text-gray-600 text-sm">Not Started</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <button
            onClick={() => setShowTaskSetup(prev => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h3 className="text-lg font-semibold">Task Setup</h3>
              <p className="text-sm text-gray-600 mt-1">Collapse or expand the task label editor.</p>
            </div>
            <span className="text-blue-600 font-medium">
              {showTaskSetup ? 'Hide' : 'Show'}
            </span>
          </button>
          {showTaskSetup && <div className="mt-4"><TaskSetupPanel /></div>}
        </div>
      </div>
    );
  };

  const ExamProgressTracker = ({ exam }) => {
    const toggleMaterial = (materialId) => {
      setExpandedMaterials(prev => ({
        ...prev,
        [`${exam.id}-${materialId}`]: !prev[`${exam.id}-${materialId}`]
      }));
    };

    const sortedMaterials = sortByDateAsc(exam.materials);

    return (
      <div className="space-y-3 bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-2xl font-bold">{exam.name} Materials</h2>
          <button
            onClick={() => addMaterial(exam.id)}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm shrink-0"
          >
            <Plus size={16} />
            <span>Add Lecture</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Lecture Name</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Date</th>
                <th className="px-3 py-2 font-medium">Difficulty</th>
                <th className="px-3 py-2 font-medium">Current Task</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMaterials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-600">
                    No lectures added yet. Use Add Lecture to create one.
                  </td>
                </tr>
              ) : (
                sortedMaterials.map(material => {
                  const isExpanded = expandedMaterials[`${exam.id}-${material.id}`] ?? false;
                  const activeLabels = getActiveTaskLabels(material);
                  const completedCount = activeLabels.filter(taskType => material.tasks[taskType] === 'Complete').length;
                  const progressPercent = activeLabels.length === 0
                    ? 0
                    : Math.round((completedCount / activeLabels.length) * 100);

                  return (
                    <Fragment key={material.id}>
                      <tr className="border-t border-gray-200">
                        <td className="px-3 py-2 align-middle">
                          <EditableTextInput
                            value={material.name}
                            onCommit={(next) => updateMaterial(exam.id, material.id, 'name', next)}
                            className="w-full min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="date"
                            value={material.date}
                            onChange={(e) => updateMaterial(exam.id, material.id, 'date', e.target.value)}
                            className="w-full min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <select
                            value={material.difficulty}
                            onChange={(e) => updateMaterial(exam.id, material.id, 'difficulty', e.target.value)}
                            className="w-full min-w-[110px] px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900">
                            {getTaskSummary(material)}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => toggleMaterial(material.id)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
                            >
                              {isExpanded ? 'Hide Tasks' : 'Show Tasks'}
                            </button>
                            <button
                              onClick={() => deleteMaterial(exam.id, material.id)}
                              className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 transition"
                              title="Delete lecture"
                            >
                              <Trash2 size={16} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-t border-gray-100 bg-gray-50">
                          <td colSpan={5} className="px-3 py-3">
                            {activeLabels.length === 0 ? (
                              <p className="text-sm text-gray-600">All tasks have been removed from this lecture.</p>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {activeLabels.map(type => (
                                  <div key={type} className="rounded-lg border border-gray-200 bg-white p-2">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <label className="block text-xs font-medium text-gray-600">{type}</label>
                                      <button
                                        onClick={() => removeTaskFromLecture(exam.id, material.id, type)}
                                        className="text-[11px] font-medium text-red-600 hover:text-red-700 transition"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    <select
                                      value={material.tasks[type]}
                                      onChange={(e) => updateTask(exam.id, material.id, type, e.target.value)}
                                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        material.tasks[type] === 'Complete'
                                          ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                                          : material.tasks[type] === 'In Progress'
                                          ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                                          : 'bg-gray-50 border-gray-300 text-gray-700'
                                      }`}
                                    >
                                      <option>Not Started</option>
                                      <option>In Progress</option>
                                      <option>Complete</option>
                                    </select>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Progress:</span>
                                <span className="font-semibold text-gray-900">{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const ProgressTracker = () => {
    if (exams.length === 0) {
      return (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-600 mb-4">No exams yet. Add one to start tracking progress.</p>
          <button
            onClick={addExam}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mx-auto"
          >
            <Plus size={20} />
            <span>Add Exam</span>
          </button>
        </div>
      );
    }

    return (
      <ExamProgressTracker key={currentExam.id} exam={currentExam} />
    );
  };

  const TodoPage = () => {
    const sections = buildTodoItems();
    const sectionConfig = [
      {
        key: 'today',
        title: 'Due Today',
        emptyMessage: 'No tasks are due today.',
        accent: 'border-blue-200 bg-blue-50',
      },
      {
        key: 'overdue',
        title: 'Overdue',
        emptyMessage: 'Nothing is overdue right now.',
        accent: 'border-red-200 bg-red-50',
      },
      {
        key: 'upcoming',
        title: 'Upcoming',
        emptyMessage: 'No tasks are coming up in the next two days.',
        accent: 'border-yellow-200 bg-yellow-50',
      },
    ];

    const TodoSection = ({ title, items, emptyMessage, accent }) => (
      <div className={`rounded-lg border p-6 ${accent}`}>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        {items.length === 0 ? (
          <p className="text-gray-600">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={`${item.examId}-${item.materialId}-${item.taskType}-${item.dueDate}`} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{item.materialName}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {item.taskType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">{item.examName}</span> · Due {formatDate(item.dueDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => completeTask(item.examId, item.materialId, item.taskType)}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-8 rounded-lg">
          <h1 className="text-4xl font-bold">To Do List</h1>
          <p className="text-slate-200 mt-2">Tasks grouped by due date across all exams.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {sectionConfig.map(section => (
            <TodoSection
              key={section.key}
              title={section.title}
              items={sections[section.key]}
              emptyMessage={section.emptyMessage}
              accent={section.accent}
            />
          ))}
        </div>
      </div>
    );
  };

  const ResourceManagerPanel = ({ resourceType }) => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);

    const fields = resourceType === 'disorders' 
      ? ['Name', 'Appearance', 'Histology', 'Cause', 'Treatment']
      : ['Class', 'Drug', 'Indications', 'Mechanism', 'Uses', 'Adverse Effects', 'Interactions'];

    const addResource = () => {
      if (editingId) {
        setResources(prev => ({
          ...prev,
          [resourceType]: prev[resourceType].map(r =>
            r.id === editingId ? { ...formData, id: editingId } : r
          )
        }));
        setEditingId(null);
      } else {
        setResources(prev => ({
          ...prev,
          [resourceType]: [...prev[resourceType], { ...formData, id: Date.now() }]
        }));
      }
      setFormData({});
      setShowForm(false);
    };

    const editResource = (resource) => {
      setFormData(resource);
      setEditingId(resource.id);
      setShowForm(true);
    };

    const deleteResource = (id) => {
      setResources(prev => ({
        ...prev,
        [resourceType]: prev[resourceType].filter(r => r.id !== id)
      }));
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {resourceType === 'disorders' ? 'Disorders & Diseases' : 'Medication List'}
          </h2>
          <button
            onClick={() => {
              setFormData({});
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            <span>Add {resourceType === 'disorders' ? 'Disorder' : 'Medication'}</span>
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {fields.map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field}</label>
                  <input
                    type="text"
                    placeholder={field}
                    value={formData[field.toLowerCase().replace(' ', '')] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      [field.toLowerCase().replace(' ', '')]: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={addResource}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setEditingId(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {resources[resourceType].length === 0 ? (
          <div className="bg-gray-50 p-12 rounded-lg text-center">
            <FlaskConical className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No {resourceType} added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resources[resourceType].map(resource => (
              <div key={resource.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  {fields.map(field => (
                    <div key={field}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{field}</p>
                      <p className="text-gray-900">{resource[field.toLowerCase().replace(' ', '')] || '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => editResource(resource)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteResource(resource.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ExternalResourcesPage = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">External Resources</h2>
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-gray-600 mb-4">Helpful links and references for exam prep.</p>
        <ul className="space-y-3">
          {[
            { label: 'ScholarRx', url: 'https://scholarrx.com' },
            { label: 'UWorld', url: 'https://www.uworld.com' },
            { label: 'Dirty Medicine (YouTube)', url: 'https://www.youtube.com/@DirtyMedicine' },
            { label: 'Ninja Nerd (YouTube)', url: 'https://www.youtube.com/@ninjanerdofficial' },
            { label: 'BRS', url: 'https://brs-lwwhealthlibrary-com.aucmed.idm.oclc.org/index.aspx' },
            { label: 'MedOne Thieme', url: 'https://medone.thieme.com/home/startpage' },
          ].map(link => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 underline font-medium"
              >
                <ExternalLink size={16} />
                <span>{link.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const ResourcesSection = () => {
    if (resourcePage === 'home') {
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-8 rounded-lg">
            <h1 className="text-4xl font-bold">Resources</h1>
            <p className="text-indigo-100 mt-2">Study references and reference databases</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <nav className="flex flex-col gap-3">
              {[
                { id: 'medications', label: 'Medications' },
                { id: 'disorders', label: 'Disorders and Diseases' },
                { id: 'external', label: 'External Resources' },
              ].map(page => (
                <button
                  key={page.id}
                  onClick={() => setResourcePage(page.id)}
                  className="text-left text-blue-600 hover:text-blue-800 underline font-medium text-lg"
                >
                  {page.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      );
    }

    const pageTitles = {
      medications: 'Medications',
      disorders: 'Disorders and Diseases',
      external: 'External Resources',
    };

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-8 rounded-lg">
          <h1 className="text-4xl font-bold">Resources</h1>
          <p className="text-indigo-100 mt-2">{pageTitles[resourcePage]}</p>
        </div>

        <button
          onClick={() => setResourcePage('home')}
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft size={18} />
          <span>Back to Resources</span>
        </button>

        {resourcePage === 'medications' && <ResourceManagerPanel resourceType="medications" />}
        {resourcePage === 'disorders' && <ResourceManagerPanel resourceType="disorders" />}
        {resourcePage === 'external' && <ExternalResourcesPage />}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 lg:hidden">
            <div className="text-2xl font-bold text-blue-600 whitespace-nowrap">PassTracker™</div>
            <div className="flex items-center gap-2">
              <ThemeToggle className="shrink-0" />
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-100"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          <div className="hidden flex-col gap-3 py-3 lg:flex lg:flex-row lg:items-center lg:justify-between lg:py-0">
            <div className="flex flex-wrap items-center gap-3 sm:gap-8">
              <div className="text-2xl font-bold text-blue-600 whitespace-nowrap">PassTracker™</div>
              <div className="flex flex-wrap gap-1">
                {navTabs.map(tab => {
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                        if (tab.id === 'resources') setResourcePage('home');
                      }}
                      className={`inline-flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg font-medium transition sm:px-4 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.icon && <tab.icon size={18} />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <ThemeToggle className="hidden lg:inline-flex shrink-0" />
              {/* Exam Selector */}
              {(activeTab === 'dashboard' || activeTab === 'tracker') && sortedExams.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {sortedExams.map(exam => (
                    <button
                      key={exam.id}
                      onClick={() => {
                        setSelectedExam(exam.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                        selectedExam === exam.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {exam.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      addExam();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 rounded-lg font-medium transition text-gray-600 hover:bg-gray-100 border border-dashed border-gray-300"
                    title="Add Exam"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
              {activeTab !== 'resources' && sortedExams.length === 0 && (
                <button
                  onClick={() => {
                    addExam();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  <Plus size={18} />
                  <span>Add Exam</span>
                </button>
              )}
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="space-y-3 border-t border-gray-200 pb-4 pt-3 lg:hidden">
              <div className="flex flex-col gap-2">
                {navTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                      if (tab.id === 'resources') setResourcePage('home');
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left font-medium transition ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tab.icon && <tab.icon size={18} />}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {(activeTab === 'dashboard' || activeTab === 'tracker') && sortedExams.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Exams</p>
                  <div className="flex flex-col gap-2">
                    {sortedExams.map(exam => (
                      <button
                        key={exam.id}
                        onClick={() => {
                          setSelectedExam(exam.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`rounded-lg px-3 py-2 text-left font-medium transition ${
                          selectedExam === exam.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {exam.name}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        addExam();
                        setMobileMenuOpen(false);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Plus size={18} />
                      <span>Add Exam</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab !== 'resources' && sortedExams.length === 0 && (
                <button
                  onClick={() => {
                    addExam();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  <Plus size={18} />
                  <span>Add Exam</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CloudSyncPanel
          isSupabaseConfigured={isSupabaseConfigured}
          cloudUser={cloudUser}
          cloudLoading={cloudLoading}
          cloudBusy={cloudBusy}
          cloudError={cloudError}
          cloudNotice={cloudNotice}
          cloudSyncedAt={cloudSyncedAt}
          cloudConflict={cloudConflict}
          onPasswordSignIn={handleCloudPasswordSignIn}
          onPasswordSignUp={handleCloudPasswordSignUp}
          onSignOut={handleCloudSignOut}
          onRefresh={handleCloudRefresh}
          onKeepCloudVersion={handleKeepCloudVersion}
          onKeepLocalVersion={handleKeepLocalVersion}
        />
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'tracker' && <ProgressTracker />}
        {activeTab === 'todo' && <TodoPage />}
        {activeTab === 'resources' && <ResourcesSection />}
      </div>
    </div>
  );
};

export default PassTracker;
