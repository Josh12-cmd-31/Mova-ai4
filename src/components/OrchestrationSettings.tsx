import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Trash2, 
  Save, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Settings2, 
  Users, 
  Shield, 
  Zap,
  Layout,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

interface Agent {
  id: string;
  name: string;
  responsibilities: string;
  outputFormat: string;
  model: string;
}

interface OrchestrationConfig {
  id: string;
  userId: string;
  name: string;
  globalContext: string;
  agents: Agent[];
  isDefault: boolean;
  createdAt: any;
  updatedAt: any;
}

const DEFAULT_GLOBAL_CONTEXT = `SYSTEM ROLE:
You are Mova AI Studio, a coordinated multi-agent system.
You are precise, analytical, and strategic.

COHERENCE PROTOCOL:
- Logical Flow: Ensure every paragraph or section transitions smoothly to the next.
- Consistency: Maintain consistent character voices, technical terminology, and narrative perspective.
- Structural Integrity: Adhere strictly to the requested format's standard conventions.
- Thematic Unity: Ensure all parts of the response contribute to the central objective or theme.

GLOBAL RULES:
- Each agent operates independently and critically.
- Avoid blind agreement between agents.
- Prioritize accuracy over speed.
- Never fabricate data.`;

const DEFAULT_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Request Analyzer',
    responsibilities: 'Clarify objective, identify domain, extract constraints, and reformulate task into a structured brief.',
    outputFormat: '1. Interpreted Objective\n2. Key Variables\n3. Constraints\n4. Required Output Format',
    model: 'gemini-3.1-pro-preview'
  },
  {
    id: '2',
    name: 'Research & Generation',
    responsibilities: 'Perform deep reasoning, generate solution using structured thinking, and provide draft output.',
    outputFormat: '1. Approach Used\n2. Step-by-Step Reasoning\n3. Draft Output',
    model: 'gemini-3.1-pro-preview'
  },
  {
    id: '3',
    name: 'Validation Auditor',
    responsibilities: 'Check logical consistency, detect contradictions, and ensure smooth transitions.',
    outputFormat: '1. Detected Issues\n2. Corrections Made\n3. Reliability Assessment',
    model: 'gemini-3.1-pro-preview'
  },
  {
    id: '4',
    name: 'Final Verification',
    responsibilities: 'Final fact-check, assess edge cases, and deliver refined final output.',
    outputFormat: '1. Final Answer\n2. Verification Summary\n3. Final Confidence Score',
    model: 'gemini-3.1-pro-preview'
  }
];

export const OrchestrationSettings: React.FC = () => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<OrchestrationConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<OrchestrationConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'orchestration_configs'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedConfigs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OrchestrationConfig[];
      setConfigs(fetchedConfigs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateNew = () => {
    const newConfig: Partial<OrchestrationConfig> = {
      name: t('new_config_name'),
      globalContext: DEFAULT_GLOBAL_CONTEXT,
      agents: [...DEFAULT_AGENTS],
      isDefault: configs.length === 0
    };
    setSelectedConfig(newConfig as OrchestrationConfig);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!auth.currentUser || !selectedConfig) return;

    const configData = {
      ...selectedConfig,
      userId: auth.currentUser.uid,
      updatedAt: serverTimestamp()
    };

    try {
      if (selectedConfig.id) {
        const { id, ...rest } = configData;
        await updateDoc(doc(db, 'orchestration_configs', id), rest);
      } else {
        await addDoc(collection(db, 'orchestration_configs'), {
          ...configData,
          createdAt: serverTimestamp()
        });
      }
      setIsEditing(false);
      setSelectedConfig(null);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete_config'))) return;
    try {
      await deleteDoc(doc(db, 'orchestration_configs', id));
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting config:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const batch: Promise<void>[] = [];
      configs.forEach(config => {
        if (config.id === id) {
          batch.push(updateDoc(doc(db, 'orchestration_configs', config.id), { isDefault: true }));
        } else if (config.isDefault) {
          batch.push(updateDoc(doc(db, 'orchestration_configs', config.id), { isDefault: false }));
        }
      });
      await Promise.all(batch);
    } catch (error) {
      console.error('Error setting default config:', error);
    }
  };

  const addAgent = () => {
    if (!selectedConfig) return;
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: t('new_agent'),
      responsibilities: '',
      outputFormat: '',
      model: 'gemini-3.1-pro-preview'
    };
    setSelectedConfig({
      ...selectedConfig,
      agents: [...selectedConfig.agents, newAgent]
    });
  };

  const removeAgent = (agentId: string) => {
    if (!selectedConfig) return;
    setSelectedConfig({
      ...selectedConfig,
      agents: selectedConfig.agents.filter(a => a.id !== agentId)
    });
  };

  const updateAgent = (agentId: string, updates: Partial<Agent>) => {
    if (!selectedConfig) return;
    setSelectedConfig({
      ...selectedConfig,
      agents: selectedConfig.agents.map(a => a.id === agentId ? { ...a, ...updates } : a)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <Settings2 className="text-emerald-500" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('orchestration_configs')}</h3>
            <p className="text-xs text-zinc-400">{t('customize_agents_desc')}</p>
          </div>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={18} />
          {t('create_new')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map(config => (
          <motion.div
            key={config.id}
            layout
            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
              selectedConfig?.id === config.id 
                ? 'bg-zinc-800 border-emerald-500/50' 
                : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
            }`}
            onClick={() => {
              setSelectedConfig(config);
              setIsEditing(true);
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layout size={16} className="text-zinc-500" />
                <span className="font-bold text-white">{config.name}</span>
                {config.isDefault && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {t('default')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!config.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault(config.id);
                    }}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-500 transition-colors"
                    title={t('set_as_default')}
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(config.id);
                  }}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                  title={t('delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-zinc-500">
              <div className="flex items-center gap-1">
                <Users size={12} />
                {config.agents.length} {t('agents')}
              </div>
              <div className="flex items-center gap-1">
                <FileText size={12} />
                {new Date(config.updatedAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isEditing && selectedConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <Settings2 size={16} className="text-zinc-400" />
                </div>
                <input
                  type="text"
                  value={selectedConfig.name}
                  onChange={(e) => setSelectedConfig({ ...selectedConfig, name: e.target.value })}
                  className="bg-transparent border-none focus:ring-0 text-lg font-bold text-white p-0"
                  placeholder={t('config_name')}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-bold transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Save size={18} />
                  {t('save_config')}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
                <Shield size={16} className="text-emerald-500" />
                {t('global_context')}
              </div>
              <textarea
                value={selectedConfig.globalContext}
                onChange={(e) => setSelectedConfig({ ...selectedConfig, globalContext: e.target.value })}
                className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-sm text-zinc-300 focus:border-emerald-500/50 focus:ring-0 transition-all min-h-[150px] font-mono"
                placeholder={t('global_context_placeholder')}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
                  <Users size={16} className="text-emerald-500" />
                  {t('agents')}
                </div>
                <button
                  onClick={addAgent}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  <Plus size={14} />
                  {t('add_agent')}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {selectedConfig.agents.map((agent, index) => (
                  <div key={agent.id} className="relative group p-6 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={agent.name}
                          onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                          className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white p-0"
                          placeholder={t('agent_name')}
                        />
                      </div>
                      <button
                        onClick={() => removeAgent(agent.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {t('agent_responsibilities')}
                        </label>
                        <textarea
                          value={agent.responsibilities}
                          onChange={(e) => updateAgent(agent.id, { responsibilities: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl p-3 text-xs text-zinc-300 focus:border-emerald-500/50 focus:ring-0 transition-all min-h-[80px]"
                          placeholder={t('responsibilities_placeholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {t('agent_output_format')}
                        </label>
                        <textarea
                          value={agent.outputFormat}
                          onChange={(e) => updateAgent(agent.id, { outputFormat: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl p-3 text-xs text-zinc-300 focus:border-emerald-500/50 focus:ring-0 transition-all min-h-[80px]"
                          placeholder={t('output_format_placeholder')}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {t('agent_model')}
                        </label>
                        <select
                          value={agent.model}
                          onChange={(e) => updateAgent(agent.id, { model: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:border-emerald-500/50 focus:ring-0 transition-all"
                        >
                          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                          <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                          <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
