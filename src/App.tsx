import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ShieldAlert, UserPlus, Settings, 
  Server, Lock, MessageSquare, Bell, Search, ChevronDown, 
  CheckCircle2, Snowflake, ToggleRight, Activity, Terminal,
  Clock, Cpu, Users, Zap, ScrollText, Info, Calendar, Hash, Image, ShieldCheck, Flag, Crown
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, id: 'dashboard', tooltip: 'Dashboard' },
  { icon: Info, id: 'info', tooltip: 'Info' },
  { icon: UserPlus, id: 'members', tooltip: 'Entradas' },
  { icon: ShieldAlert, id: 'automod', tooltip: 'Auto-Moderação' },
  { icon: Server, id: 'infra', tooltip: 'Infraestrutura' },
  { icon: ScrollText, id: 'logs', tooltip: 'Logs do Servidor' },
  { icon: Settings, id: 'settings', tooltip: 'Configurações' },
];

const MODULES = [
  { name: 'Sistema Anti-Raid', status: 'Ativo', desc: 'Proteção automática contra ataques em massa, contas falsas e raids organizados.', icon: ShieldAlert },
  { name: 'Free Members', status: 'Ativo', desc: 'Distribuição e injeção de membros automatizada para crescimento do servidor.', icon: UserPlus },
  { name: 'Filtro de Links', status: 'Ativo', desc: 'Bloqueio de links maliciosos, phishing e convites de outros servidores.', icon: Lock },
  { name: 'Auto-Moderação', status: 'Ativo', desc: 'Filtro de palavras, prevenção de spam e flood no chat em tempo real.', icon: MessageSquare },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [discordStats, setDiscordStats] = useState({
    id: '',
    name: '---',
    icon: null as string | null,
    ownerId: '',
    verificationLevel: 0,
    explicitContentFilter: 0,
    rolesCount: 0,
    emojisCount: 0,
    stickersCount: 0,
    features: [] as string[],
    createdAt: '',
    totalMembers: '---',
    onlineMembers: '---',
    boosts: '---',
    tier: '---',
    loading: true,
    error: false
  });
  const [botInfo, setBotInfo] = useState({
    status: 'Offline',
    serverCount: 0,
    ping: 0,
    ram: 0,
    loading: true,
    error: false
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [logsError, setLogsError] = useState(false);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(false);
  const [automodState, setAutomodState] = useState({ enabled: false, logs: [] as any[] });
  const [automodLoading, setAutomodLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Por favor, permita popups para este site para conectar sua conta.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Erro ao iniciar o login. Verifique se as credenciais do Discord estão configuradas.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/discord/stats');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        setDiscordStats({
          id: data.id || '',
          name: data.name || '---',
          icon: data.icon || null,
          ownerId: data.ownerId || '',
          verificationLevel: data.verificationLevel || 0,
          explicitContentFilter: data.explicitContentFilter || 0,
          rolesCount: data.rolesCount || 0,
          emojisCount: data.emojisCount || 0,
          stickersCount: data.stickersCount || 0,
          features: data.features || [],
          createdAt: data.createdAt || '',
          totalMembers: data.totalMembers.toLocaleString('pt-BR'),
          onlineMembers: data.onlineMembers.toLocaleString('pt-BR'),
          boosts: data.boosts.toString(),
          tier: data.tier.toString(),
          loading: false,
          error: false
        });
      } catch (err) {
        setDiscordStats(prev => ({ ...prev, loading: false, error: true }));
      }
    };

    const fetchBotInfo = async () => {
      try {
        const res = await fetch('/api/discord/bot-info');
        if (!res.ok) throw new Error('Failed to fetch bot info');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        setBotInfo({
          status: data.status,
          serverCount: data.serverCount,
          ping: data.ping,
          ram: data.ram,
          loading: false,
          error: false
        });
      } catch (err) {
        setBotInfo(prev => ({ ...prev, status: 'Offline', loading: false, error: true }));
      }
    };

    fetchStats();
    fetchBotInfo();
    const interval = setInterval(() => {
      fetchStats();
      fetchBotInfo();
    }, 30000); // Fetch every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab !== 'logs') return;

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/discord/logs');
        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setLogs(data);
        setLogsError(false);
      } catch (err) {
        setLogsError(true);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'members') return;

    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const res = await fetch('/api/discord/recent-members');
        if (!res.ok) throw new Error('Failed to fetch members');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setRecentMembers(data);
        setMembersError(false);
      } catch (err) {
        setMembersError(true);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
    const interval = setInterval(fetchMembers, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'automod') return;

    const fetchAutomod = async () => {
      try {
        setAutomodLoading(true);
        const res = await fetch('/api/automod');
        if (!res.ok) throw new Error('Failed to fetch automod state');
        const data = await res.json();
        setAutomodState(data);
      } catch (err) {
        console.error(err);
      } finally {
        setAutomodLoading(false);
      }
    };

    fetchAutomod();
    const interval = setInterval(fetchAutomod, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const toggleAutomod = async () => {
    try {
      const newState = !automodState.enabled;
      setAutomodState(prev => ({ ...prev, enabled: newState }));
      const res = await fetch('/api/automod/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
      if (!res.ok) throw new Error('Failed to toggle automod');
      const data = await res.json();
      setAutomodState(prev => ({ ...prev, enabled: data.enabled }));
    } catch (err) {
      console.error(err);
      // Revert on error
      setAutomodState(prev => ({ ...prev, enabled: !prev.enabled }));
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            
            {/* Discord Server Stats */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Estatísticas do Servidor (Discord API)</h2>
                  <p className="text-sm text-slate-400 mt-1">Dados reais sincronizados com seu servidor.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Membros Totais', value: discordStats.totalMembers, icon: Users, color: 'text-white' },
                  { label: 'Membros Online', value: discordStats.onlineMembers, icon: Activity, color: 'text-emerald-400' },
                  { label: `Boosts (Nível ${discordStats.tier})`, value: discordStats.boosts, icon: Zap, color: 'text-purple-400' },
                ].map((stat, i) => (
                  <div key={i} className="glass-panel rounded-3xl p-6 relative overflow-hidden group border border-white/5 hover:border-white/20 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      {discordStats.error && <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">Erro de API</span>}
                      {discordStats.loading && <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-full">Carregando...</span>}
                    </div>
                    <div className="relative z-10">
                      <div className="text-2xl font-bold text-white mb-1 tracking-tight">{stat.value}</div>
                      <div className="text-sm text-slate-400">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bot Status Section */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Status do Bot</h2>
                  <p className="text-sm text-slate-400 mt-1">Métricas de desempenho e operação em tempo real.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Status', value: botInfo.loading ? '...' : botInfo.status, icon: Activity, color: botInfo.status === 'Online' ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Servidores', value: botInfo.loading ? '...' : botInfo.serverCount.toLocaleString('pt-BR'), icon: Server, color: 'text-white' },
                  { label: 'Ping da API', value: botInfo.loading ? '...' : `${botInfo.ping}ms`, icon: Zap, color: 'text-yellow-400' },
                  { label: 'Uso de RAM', value: botInfo.loading ? '...' : `${botInfo.ram} MB`, icon: Cpu, color: 'text-white' },
                ].map((stat, i) => (
                  <div key={i} className="glass-panel rounded-3xl p-6 relative overflow-hidden group border border-white/5 hover:border-white/20 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      {botInfo.error && <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">Erro de API</span>}
                    </div>
                    <div className="relative z-10">
                      <div className="text-2xl font-bold text-white mb-1 tracking-tight">{stat.value}</div>
                      <div className="text-sm text-slate-400">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Modules Section */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Módulos Ativos</h2>
                  <p className="text-sm text-slate-400 mt-1">Sistemas de segurança e crescimento operando no servidor.</p>
                </div>
                <button className="text-sm text-white hover:text-slate-300 font-medium transition-colors">
                  Ver todos os módulos &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {MODULES.map((mod, i) => (
                  <div key={i} className="glass-panel rounded-3xl p-6 flex gap-6 hover:bg-white/[0.04] transition-colors border border-white/5 hover:border-white/20">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <mod.icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-white">{mod.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-black bg-white px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {mod.status}
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Precisa de mais ferramentas?</h3>
                  <p className="text-slate-400 max-w-xl">
                    Explore nossa biblioteca completa de bots e integrações para automatizar, proteger e crescer sua comunidade no Discord.
                  </p>
                </div>
                <button className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] whitespace-nowrap">
                  Explorar Ferramentas
                </button>
              </div>
            </motion.div>
          </motion.div>
        );
      case 'info':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            <motion.div variants={itemVariants} className="flex items-center gap-6 glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50" />
              <div className="w-24 h-24 rounded-2xl bg-white/10 overflow-hidden border border-white/20 shrink-0 relative z-10 flex items-center justify-center">
                {discordStats.icon ? (
                  <img src={discordStats.icon} alt={discordStats.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl font-bold text-white/50">{discordStats.name.charAt(0)}</span>
                )}
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-1">{discordStats.name}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><Hash className="w-4 h-4" /> {discordStats.id || '---'}</span>
                  <span className="flex items-center gap-1.5"><Crown className="w-4 h-4 text-yellow-400" /> Dono: {discordStats.ownerId || '---'}</span>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Data de Criação', value: discordStats.createdAt ? new Date(discordStats.createdAt).toLocaleDateString('pt-BR') : '---', icon: Calendar, color: 'text-blue-400' },
                { label: 'Nível de Verificação', value: ['Nenhum', 'Baixo', 'Médio', 'Alto', 'Muito Alto'][discordStats.verificationLevel] || 'Desconhecido', icon: ShieldCheck, color: 'text-emerald-400' },
                { label: 'Filtro de Conteúdo', value: ['Desativado', 'Membros sem cargo', 'Todos os membros'][discordStats.explicitContentFilter] || 'Desconhecido', icon: ShieldAlert, color: 'text-red-400' },
                { label: 'Total de Cargos', value: discordStats.rolesCount, icon: Users, color: 'text-purple-400' },
                { label: 'Emojis', value: discordStats.emojisCount, icon: Image, color: 'text-yellow-400' },
                { label: 'Stickers', value: discordStats.stickersCount, icon: Image, color: 'text-pink-400' },
              ].map((stat, i) => (
                <motion.div key={i} variants={itemVariants} className="glass-panel rounded-2xl p-6 flex items-center gap-4 border border-white/5 hover:border-white/20 transition-all">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 shrink-0">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-0.5">{stat.label}</div>
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {discordStats.features.length > 0 && (
              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-bold text-white mb-4">Recursos do Servidor</h3>
                <div className="flex flex-wrap gap-2">
                  {discordStats.features.map((feature, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-300">
                      {feature.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      case 'members':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            <motion.div variants={itemVariants} className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-white">Logs de Entrada de Membros</h2>
                <p className="text-sm text-slate-400 mt-1">Acompanhe os membros que entraram recentemente no servidor.</p>
              </div>
              <div className="flex items-center gap-2">
                {membersLoading && recentMembers.length === 0 ? (
                  <span className="text-sm text-slate-400">Carregando...</span>
                ) : membersError ? (
                  <span className="text-sm text-red-400 font-medium">Erro de API</span>
                ) : (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm text-emerald-400 font-medium">Sincronizando</span>
                  </>
                )}
              </div>
            </motion.div>
            <motion.div variants={itemVariants} className="glass-panel rounded-2xl overflow-hidden border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-300 border-b border-white/10">
                  <tr>
                    <th className="p-4 font-medium">Usuário</th>
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Data de Entrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-400">
                  {recentMembers.length === 0 && !membersLoading && !membersError ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">Nenhum membro encontrado.</td>
                    </tr>
                  ) : (
                    recentMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10 shrink-0">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/50">{member.username.charAt(0)}</div>
                            )}
                          </div>
                          <span className="text-white font-medium">{member.username}</span>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-500">{member.id}</td>
                        <td className="p-4">{new Date(member.joinedAt).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        );
      case 'automod':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            <motion.div variants={itemVariants} className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-white">Auto-Moderação com IA</h2>
                <p className="text-sm text-slate-400 mt-1">Detecção inteligente de ofensas e punição automática (Mute de 5 min).</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${automodState.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {automodState.enabled ? 'Ativado' : 'Desativado'}
                </span>
                <button 
                  onClick={toggleAutomod}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${automodState.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${automodState.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel rounded-2xl overflow-hidden border border-white/10">
              <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Logs de Punição
                </h3>
                {automodLoading && automodState.logs.length === 0 && (
                  <span className="text-xs text-slate-400">Carregando...</span>
                )}
              </div>
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {automodState.logs.length === 0 && !automodLoading ? (
                  <div className="p-8 text-center text-slate-500">Nenhuma punição registrada recentemente.</div>
                ) : (
                  automodState.logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 font-medium">{log.user}</span>
                          <span className="text-xs text-slate-500 font-mono">{log.userId}</span>
                        </div>
                        <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="bg-black/30 rounded p-3 mb-2 border border-white/5">
                        <p className="text-sm text-slate-300">"{log.content}"</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Mute 5m
                        </span>
                        <span className="text-slate-400">- Motivo: {log.reason}</span>
                        {!log.success && (
                          <span className="text-red-400 text-xs ml-auto">Falha ao aplicar punição (Verifique as permissões do bot)</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        );
      case 'infra':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-bold text-white">Infraestrutura e Shards</h2>
              <p className="text-sm text-slate-400 mt-1">Monitoramento dos clusters e latência.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Cluster SP-01', 'Cluster US-EAST', 'Database Principal'].map((server, i) => (
                <motion.div key={i} variants={itemVariants} className="glass-panel rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <Server className="w-6 h-6 text-white" />
                    <span className="text-xs font-medium text-black bg-white px-2 py-1 rounded-full">ONLINE</span>
                  </div>
                  <h3 className="text-white font-medium mb-1">{server}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Activity className="w-4 h-4" />
                    <span>Ping: {Math.floor(Math.random() * 20) + 10}ms</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      case 'logs':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8 h-[calc(100vh-10rem)] flex flex-col">
            <motion.div variants={itemVariants} className="flex justify-between items-end shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Live Logs</h2>
                <p className="text-sm text-slate-400 mt-1">Monitorando o canal 1486929898068246537 em tempo real.</p>
              </div>
              <div className="flex items-center gap-2">
                {!logsError ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm text-emerald-400 font-medium">Sincronizando</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-sm text-red-400 font-medium">Erro de API</span>
                  </>
                )}
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col border border-white/10">
              <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-mono text-slate-300">tail -f /discord/channel/1486929898068246537</span>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-4 font-mono text-sm flex flex-col-reverse custom-scrollbar">
                {logs.length === 0 && !logsError ? (
                  <div className="text-slate-500 text-center py-10">Aguardando mensagens...</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-4 hover:bg-white/[0.02] p-2 rounded-lg transition-colors">
                      <div className="w-10 h-10 rounded-full bg-white/10 shrink-0 overflow-hidden border border-white/10">
                        {log.avatar ? (
                          <img src={log.avatar} alt={log.author} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/50">{log.author.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-white">{log.author}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-slate-300 break-words whitespace-pre-wrap">{log.content || '[Anexo/Embed]'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        );
      case 'settings':
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-bold text-white">Configurações Gerais</h2>
              <p className="text-sm text-slate-400 mt-1">Preferências do painel e do bot.</p>
            </motion.div>
            <motion.div variants={itemVariants} className="glass-panel rounded-2xl p-8 max-w-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Prefixo do Bot</label>
                <input type="text" defaultValue="!" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Canal de Logs (ID)</label>
                <input type="text" placeholder="Ex: 123456789012345678" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/50" />
              </div>
              <button className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                Salvar Alterações
              </button>
            </motion.div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden selection:bg-white/30">
      
      {/* Icon Sidebar */}
      <aside className="w-20 glass-panel border-r border-white/10 flex flex-col items-center py-6 z-20">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-slate-400 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-8">
          <Snowflake className="w-6 h-6 text-black" />
        </div>

        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative group w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
                title={item.tooltip}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                  />
                )}
                <item.icon className="w-6 h-6" />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <header className="h-20 glass-panel border-b border-white/10 flex items-center justify-between px-8 z-10">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
              Frostify Dashboard
            </h1>
            <p className="text-sm text-slate-400">Gerencie o desempenho e os módulos do seu bot.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all w-64 text-white placeholder-slate-500"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            </button>
            <div className="h-8 w-px bg-white/10" />
            
            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="text-sm text-slate-400">Carregando...</div>
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-white">{user.username}</div>
                    <div className="text-xs text-slate-400">Usuário</div>
                  </div>
                  <div className="relative group">
                    <button className="flex items-center gap-2 text-sm font-medium hover:text-white transition-colors text-slate-300">
                      {user.avatar ? (
                        <img 
                          src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} 
                          alt={user.username} 
                          className="w-8 h-8 rounded-full border border-white/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                          {user.username.charAt(0)}
                        </div>
                      )}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors rounded-xl"
                      >
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-[#5865F2]/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                  Login com Discord
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
