import React from 'react';
import type { Step } from './types';

interface StepByStepDisplayProps {
  steps: Step[];
}

const StepByStepDisplay: React.FC<StepByStepDisplayProps> = ({ steps }) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 w-full">
      <h3 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-4 text-center">Paso a Paso</h3>
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-md animate-fade-in">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{step.title}</h4>
            <p className="text-slate-600 dark:text-slate-300 mb-3">{step.description}</p>
            {step.calculation && (
              <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap font-mono break-words">{step.calculation}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepByStepDisplay;
