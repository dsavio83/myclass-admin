import React from 'react';
import { RESOURCE_TYPES } from '../constants';
import { ResourceType, ResourceCounts } from '../types';
import { CascadeSelectors } from './CascadeSelectors';
import { useApi } from '../hooks/useApi';
import { getCountsByLessonId } from '../services/api';
import { BubbleLayer } from './BubbleLayer';

interface MobileHomeProps {
    onSelectResourceType: (type: ResourceType) => void;
    currentResourceType: ResourceType | null;
    classId: string | null;
    subjectId: string | null;
    unitId: string | null;
    subUnitId: string | null;
    lessonId: string | null;
    onClassChange: (id: string | null) => void;
    onSubjectChange: (id: string | null) => void;
    onUnitChange: (id: string | null) => void;
    onSubUnitChange: (id: string | null) => void;
    onLessonChange: (id: string | null) => void;
    userRole?: string;
    userClass?: string;
    userName?: string;
    onlyPublished?: boolean;
}

const FloatingSymbol: React.FC<{ icon: string, delay: number, left: string, top: string, size: string }> = ({ icon, delay, left, top, size }) => (
    <div
        className="absolute animate-float opacity-[0.05] dark:opacity-[0.1] pointer-events-none select-none z-0"
        style={{ left, top, fontSize: size, animationDelay: `${delay}s` }}
    >
        {icon}
    </div>
);

export const MobileHome: React.FC<MobileHomeProps> = ({
    onSelectResourceType,
    currentResourceType,
    classId,
    subjectId,
    unitId,
    subUnitId,
    lessonId,
    onClassChange,
    onSubjectChange,
    onUnitChange,
    onSubUnitChange,
    onLessonChange,
    userRole,
    userClass,
    userName,
    onlyPublished = false
}) => {
    const { data: counts } = useApi<ResourceCounts>(
        () => getCountsByLessonId(lessonId!),
        [lessonId],
        !!lessonId
    );

    const hasLesson = !!lessonId;

    return (
        <>
        <style>{`
          .mobile-home.mesh-gradient { background-color: rgba(248,250,252,.82); background-image: radial-gradient(at 0% 0%, rgba(59,130,246,.15) 0, transparent 50%), radial-gradient(at 100% 0%, rgba(147,51,234,.15) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(16,185,129,.15) 0, transparent 50%), radial-gradient(at 0% 100%, rgba(239,68,68,.15) 0, transparent 50%); }
          .dark .mobile-home.mesh-gradient { background-color: rgba(15,23,42,.82); }
          .mobile-home .glass-card { background: rgba(255,255,255,.4); backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); border: 1px solid rgba(255,255,255,.3); }
          .dark .mobile-home .glass-card { background: rgba(15,23,42,.4); border-color: rgba(255,255,255,.08); }
          .mobile-home .hi-tech-border { position: relative; }
          .mobile-home .hi-tech-border::after { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; background: linear-gradient(45deg, transparent 40%, rgba(59,130,246,.3), transparent 60%); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
        `}</style>
        <div className="mobile-home relative flex flex-col h-full mesh-gradient overflow-y-auto pb-10 scroll-smooth">

            {/* Background Decorative Symbols */}
            <FloatingSymbol icon="🎓" delay={0} left="10%" top="15%" size="4rem" />
            <FloatingSymbol icon="📚" delay={2} left="80%" top="10%" size="3rem" />
            <FloatingSymbol icon="✏️" delay={4} left="5%" top="45%" size="2.5rem" />
            <FloatingSymbol icon="🔬" delay={1} left="85%" top="55%" size="3.5rem" />
            <FloatingSymbol icon="🎨" delay={5} left="15%" top="75%" size="3rem" />
            <FloatingSymbol icon="📱" delay={3} left="75%" top="85%" size="2.5rem" />

            {/* Bubble animation */}
            <BubbleLayer />

            <div className="p-6 pt-10 relative z-10 flex flex-col gap-8">

                {/* Hero Header Section */}
                <div className="flex flex-col gap-5 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter font-tau-marutham leading-tight">
                                வணக்கம்!
                            </h1>
                            <p className="text-blue-600 dark:text-blue-400 font-bold font-tau-paalai text-[18px] tracking-wide animate-pulse-subtle">
                                இனிய கற்றல் பயணம் தொடர்கிறது
                            </p>
                        </div>
                        {userName && (
                            <div className="relative p-1">
                                <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                                <div className="relative flex items-center justify-center w-16 h-16 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl">
                                    <span className="text-3xl">🏛️</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {userName && (
                        <div className="glass-card p-5 rounded-[2.5rem] hi-tech-border animate-fade-in-up shadow-2xl shadow-blue-500/10" style={{ animationDelay: '0.1s' }}>
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-600 rounded-full blur-md opacity-30 animate-ping shadow-blue-400"></div>
                                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-inner ring-4 ring-white dark:ring-slate-800">
                                        {userName.charAt(0)}
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[13px] font-bold text-blue-500/80 dark:text-blue-400/80 font-tau-paalai uppercase tracking-widest">மாணவர் பெயர்</div>
                                    <div className="text-[18px] font-extrabold text-slate-900 dark:text-white font-tau-paalai leading-none">{userName}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Selection Section */}
                <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-tau-paalai">பாடத்தேர்வு</h2>
                    </div>

                    <div className="glass-card p-6 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-white/60 dark:border-slate-800/60 overflow-hidden relative">
                        {/* Decorative background element for the selector box */}
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="relative z-10">
                            <CascadeSelectors
                                classId={classId}
                                subjectId={subjectId}
                                unitId={unitId}
                                subUnitId={subUnitId}
                                lessonId={lessonId}
                                onClassChange={onClassChange}
                                onSubjectChange={onSubjectChange}
                                onUnitChange={onUnitChange}
                                onSubUnitChange={onSubUnitChange}
                                onLessonChange={onLessonChange}
                                onlyPublished={onlyPublished}
                                portalModal
                            />
                        </div>
                    </div>
                </div>

                {/* Grid Section */}
                {hasLesson ? (
                    <div className="space-y-6 animate-grid-entrance">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-8 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-tau-paalai">பாடத் தொகுப்புகள்</h2>
                            </div>
                            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 font-tau-paalai uppercase tracking-[0.2em]">{RESOURCE_TYPES.length} பிரிவுகள்</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 px-1">
                            {RESOURCE_TYPES.map((resource, index) => {
                                const Icon = resource.Icon;
                                const isSelected = currentResourceType === resource.key;

                                return (
                                    <button
                                        key={resource.key}
                                        onClick={() => onSelectResourceType(resource.key)}
                                        className={`
                                            relative group overflow-hidden rounded-[2.5rem] p-7 flex flex-col items-center justify-center gap-5
                                            transition-all duration-500 active:scale-90 shadow-xl
                                            ${isSelected
                                                ? 'bg-blue-600 text-white shadow-blue-500/40 translate-y-[-6px] ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-4 dark:ring-offset-slate-900'
                                                : 'glass-card hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-blue-500/20'
                                            }
                                        `}
                                        style={{ animationDelay: `${index * 80}ms` }}
                                    >
                                        {/* Background Patterns for Grid */}
                                        <div className="absolute inset-0 opacity-[0.06] pointer-events-none group-hover:opacity-[0.1] transition-opacity">
                                            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <pattern id={`pattern-${index}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                                                        <path d="M0 8h16M8 0v16" stroke="currentColor" strokeWidth="0.5" fill="none" />
                                                    </pattern>
                                                </defs>
                                                <rect width="100%" height="100%" fill={`url(#pattern-${index})`} />
                                            </svg>
                                        </div>

                                        {/* Radial Glow */}
                                        <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-40 bg-gradient-to-br ${resource.gradient} group-hover:scale-150 transition-transform duration-700`} />

                                        {/* Badge for counts */}
                                        {counts && (counts[resource.key as keyof ResourceCounts] || 0) > 0 && (
                                            <div className="absolute top-5 right-5 z-20">
                                                <div className="relative flex items-center justify-center w-7 h-7">
                                                    <div className="absolute inset-0 bg-red-500/40 rounded-full animate-ping"></div>
                                                    <div className="absolute inset-0 bg-red-600 rounded-full shadow-lg"></div>
                                                    <span className="relative z-10 text-[11px] font-black text-white leading-none">{counts[resource.key as keyof ResourceCounts]}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className={`
                                            w-18 h-18 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 shadow-inner overflow-hidden relative
                                            ${isSelected ? 'bg-white/20 scale-110 rotate-3' : 'bg-slate-100 dark:bg-slate-800 group-hover:scale-110 group-hover:rotate-3'}
                                        `}>
                                            {/* Inner glow for icon container */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <Icon className={`w-11 h-11 transition-all duration-1000 ${isSelected ? 'text-white' : resource.color} animate-subtle-float`} />
                                        </div>

                                        <span className={`
                                            font-black text-center leading-none font-tau-paalai text-[13px] uppercase tracking-[0.15em] relative z-10
                                            ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}
                                        `}>
                                            {resource.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center glass-card rounded-[3.5rem] border-dashed border-4 border-blue-500/10 animate-fade-in relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

                        <div className="w-28 h-28 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping [animation-duration:3s]"></div>
                            <div className="absolute inset-0 bg-blue-500/5 rounded-full scale-150 animate-pulse"></div>
                            <svg className="w-14 h-14 text-blue-600 dark:text-blue-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 font-tau-paalai tracking-wide">தயார் நிலையில்...</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-tau-paalai text-[16px] max-w-[240px] leading-relaxed font-medium">
                            வகுப்பு மற்றும் பாடத்தைத் தேர்வு செய்தவுடன் மெனுக்கள் இங்கு தோன்றும்
                        </p>
                    </div>
                )}

                {/* Footer Section - Ultimate Premium Look */}
                <div className="mt-12 py-12 flex flex-col items-center gap-8 animate-fade-in border-t border-slate-200/50 dark:border-slate-800/50">
                    <div className="flex flex-col items-center gap-4 px-6 text-center">
                        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent rounded-full"></div>
                        <p className="text-[16px] text-slate-500/80 dark:text-slate-400/80 font-tau-paalai font-medium italic leading-loose">
                            "கல்வியே ஒரு சமூகத்தின் முதுகெலும்பு. தமிழ்விழுதுகள் உங்களை வெற்றியின் சிகரத்திற்கு அழைத்துச் செல்லும்."
                        </p>
                        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent rounded-full"></div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="px-5 py-2 glass-card rounded-2xl border border-blue-500/20 shadow-xl shadow-blue-500/5">
                            <p className="text-[13px] font-black text-blue-600 dark:text-blue-400 font-tau-paalai uppercase tracking-[0.4em]">
                                தமிழ்விழுதுகள் © 2026
                            </p>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black tracking-[0.3em] uppercase">Next-Gen Digital Education Hub</div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes subtleFloat {
                    0%, 100% { transform: translateY(0) rotate(0); }
                    50%       { transform: translateY(-10px) rotate(4deg); }
                }
                .animate-subtle-float {
                    animation: subtleFloat 6s ease-in-out infinite;
                }
                @keyframes gridEntrance {
                    from { opacity: 0; transform: translateY(50px) scale(0.8); filter: blur(20px); }
                    to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                .animate-grid-entrance {
                    animation: gridEntrance 1s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
                    33%      { transform: translateY(-30px) translateX(15px) rotate(8deg); }
                    66%      { transform: translateY(15px) translateX(-15px) rotate(-8deg); }
                }
                .animate-float {
                    animation: float 12s ease-in-out infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 1.2s ease-out forwards;
                }
                @keyframes pulseSubtle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.98); }
                }
                .animate-pulse-subtle {
                    animation: pulseSubtle 4s ease-in-out infinite;
                }
                .mesh-gradient {
                    background: 
                        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.12) 0, transparent 60%),
                        radial-gradient(at 100% 0%, rgba(147, 51, 234, 0.12) 0, transparent 60%),
                        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.12) 0, transparent 60%),
                        radial-gradient(at 0% 100%, rgba(239, 68, 68, 0.12) 0, transparent 60%);
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.65);
                    backdrop-filter: blur(25px) saturate(180%);
                    -webkit-backdrop-filter: blur(25px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                }
                .dark .glass-card {
                    background: rgba(15, 23, 42, 0.75);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
      </>
    );
};
