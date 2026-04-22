'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, HelpCircle, CheckCircle2 } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  target?: string; // CSS selector if we want to point to something, but for simplicity we'll do a center modal first
}

interface TutorialProps {
  role: 'admin' | 'manager' | 'coordinator' | 'supervisor' | 'employee';
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export default function Tutorial({ role, steps, isOpen, onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose(dontShowAgain);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden relative"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-700">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            className="h-full bg-indigo-600 dark:bg-indigo-500"
          />
        </div>

        <button 
          onClick={() => onClose(false)}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-10 pt-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <HelpCircle size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                Tutorial: {role.toUpperCase()}
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {steps[currentStep].title}
              </h2>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg font-medium">
            {steps[currentStep].description}
          </p>

          <div className="mt-12 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {[...Array(steps.length)].map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button 
                    onClick={prevStep}
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <button 
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                  {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                    dontShowAgain 
                      ? 'bg-indigo-600 border-indigo-600' 
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                  }`}>
                    {dontShowAgain && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Não mostrar novamente</span>
              </label>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
