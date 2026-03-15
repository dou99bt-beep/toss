import React, { useState } from 'react';
import { FileText, MessageSquare, ClipboardCheck, Shield, CheckCircle, ChevronRight, ChevronLeft, Eye } from 'lucide-react';
import { leadFormScreens } from '../mocks/tossAdsMockData';

export function LeadFormPreview() {
  const [activeStep, setActiveStep] = useState(0);
  const screen = leadFormScreens[activeStep];

  const stepIcons = [FileText, Eye, MessageSquare, MessageSquare, ClipboardCheck, Shield, CheckCircle];

  const renderScreenContent = () => {
    switch (screen.type) {
      case 'title':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-lg">
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚖️</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{screen.content.publicTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">공개 제목 ({screen.content.publicTitle.length}/{screen.content.maxLength}자)</p>
          </div>
        );

      case 'intro':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <p className="text-xs opacity-80">{screen.content.category} | {screen.content.type}</p>
              <p className="text-sm mt-1">{screen.content.notice}</p>
            </div>
            {screen.content.hasEventImage && (
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 h-40 flex items-center justify-center">
                <span className="text-white text-lg font-bold">이벤트 이미지 영역 (1500×760px)</span>
              </div>
            )}
            <div className="p-6 space-y-4">
              {screen.content.listItems?.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.highlight}</p>
                    <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">{item.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'question':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              {screen.content.required && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">필수</span>}
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{screen.content.questionType}</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                {screen.content.multiple ? '복수 선택' : '단일 선택'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{screen.content.question}</h3>
            <div className="space-y-3">
              {screen.content.answers?.map((answer: string, i: number) => (
                <label key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <div className={`w-5 h-5 rounded-${screen.content.multiple ? 'md' : 'full'} border-2 border-slate-300 dark:border-slate-500 flex items-center justify-center`}>
                    {i === 0 && <div className={`w-3 h-3 bg-blue-600 rounded-${screen.content.multiple ? 'sm' : 'full'}`}></div>}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{answer}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">정보 확인</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{screen.content.previewText}</p>
            <div className="space-y-4">
              {screen.content.collectPhone && (
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <span className="text-sm text-slate-500 dark:text-slate-400">휴대전화 번호</span>
                  <span className="font-mono text-slate-900 dark:text-white">010-****-5678</span>
                </div>
              )}
              {screen.content.collectName && (
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <span className="text-sm text-slate-500 dark:text-slate-400">이름</span>
                  <span className="text-slate-900 dark:text-white">김토스</span>
                </div>
              )}
              {screen.content.collectBirthdate && (
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <span className="text-sm text-slate-500 dark:text-slate-400">생년월일</span>
                  <span className="text-slate-900 dark:text-white">1990.01.01</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'consent':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">약관 동의</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">광고 집행사: {screen.content.advertiserName} ({screen.content.advertiserType})</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">이용 및 보유기간: {screen.content.retentionPeriod}</p>
            <div className="space-y-3">
              {screen.content.consents?.map((consent: string, i: number) => (
                <label key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center">
                    <CheckCircle size={14} className="text-white" />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{consent}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'completion':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-lg">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{screen.content.formType} 완료!</h2>
            <p className="text-blue-600 dark:text-blue-400 font-medium mb-4">{screen.content.subText}</p>
            <div className="inline-block px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400">완료 후: {screen.content.completionAction}</p>
            </div>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">참고 URL: {screen.content.referenceUrl}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">리드 양식 미리보기</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">토스애즈 리드수집 광고 — 7화면 양식 구조</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl">
          <Eye size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">법무법인 명율</span>
        </div>
      </div>

      {/* Step Navigator */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {leadFormScreens.map((s, i) => {
            const Icon = stepIcons[i];
            const isActive = i === activeStep;
            const isCompleted = i < activeStep;
            return (
              <React.Fragment key={i}>
                <button
                  onClick={() => setActiveStep(i)}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                    isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                  }`}>
                    {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
                  </div>
                  <span className={`text-[10px] font-medium ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>{s.title}</span>
                </button>
                {i < leadFormScreens.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    isCompleted ? 'bg-green-300 dark:bg-green-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Phone Frame */}
      <div className="max-w-md mx-auto">
        <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-3 shadow-2xl">
          {/* Phone Notch */}
          <div className="bg-slate-900 dark:bg-slate-950 h-7 rounded-t-[2rem] flex items-center justify-center">
            <div className="w-20 h-5 bg-black rounded-full"></div>
          </div>
          {/* Screen */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] overflow-hidden min-h-[500px] p-4">
            {/* Status Bar */}
            <div className="flex justify-between items-center px-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
              <span>토스</span>
              <span className="font-medium text-slate-900 dark:text-white">
                Step {activeStep + 1} / {leadFormScreens.length}
              </span>
              <span>✕</span>
            </div>
            
            {/* Content */}
            {renderScreenContent()}
          </div>
          {/* Home Bar */}
          <div className="h-5 flex items-center justify-center mt-1">
            <div className="w-32 h-1 bg-slate-700 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between max-w-md mx-auto">
        <button 
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))} 
          disabled={activeStep === 0}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">이전</span>
        </button>
        <button 
          onClick={() => setActiveStep(Math.min(leadFormScreens.length - 1, activeStep + 1))} 
          disabled={activeStep === leadFormScreens.length - 1}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-sm disabled:opacity-30 hover:bg-blue-700 transition-colors"
        >
          <span className="text-sm font-medium">다음</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Form Settings Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">양식 설정 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-xs text-blue-500 dark:text-blue-400">양식 유형</p>
            <p className="font-bold text-blue-700 dark:text-blue-300 mt-1">상담 신청</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <p className="text-xs text-purple-500 dark:text-purple-400">총 화면</p>
            <p className="font-bold text-purple-700 dark:text-purple-300 mt-1">{leadFormScreens.length}개</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <p className="text-xs text-green-500 dark:text-green-400">질문 수</p>
            <p className="font-bold text-green-700 dark:text-green-300 mt-1">2개 (직업/채무)</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <p className="text-xs text-amber-500 dark:text-amber-400">수집 정보</p>
            <p className="font-bold text-amber-700 dark:text-amber-300 mt-1">전화/이름/생년월일</p>
          </div>
        </div>
      </div>
    </div>
  );
}
