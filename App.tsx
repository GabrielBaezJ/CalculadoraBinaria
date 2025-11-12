import React, { useState, useCallback, useEffect } from 'react';
import { Operation, Step } from './types';
import { getAIExplanation } from './geminiService';
import StepByStepDisplay from './StepByStepDisplay';

// --- Helper Functions for Binary Logic ---

const padZero = (str: string, len: number): string => str.padStart(len, '0');

const binaryAdd = (bin1: string, bin2: string): { sum: string, steps: Step[] } => {
    let steps: Step[] = [];
    let maxLength = Math.max(bin1.length, bin2.length);
    let n1 = padZero(bin1, maxLength);
    let n2 = padZero(bin2, maxLength);

    steps.push({
        title: '1. Alineación de Números',
        description: 'Alineamos los números para asegurar que sumamos los bits de la misma posición. Si un número es más corto, se rellena con ceros a la izquierda para igualar la longitud.',
        calculation: `  ${n1}\n+ ${n2}`
    });
    
    let sum = '';
    let carry = 0;
    
    for (let i = maxLength - 1; i >= 0; i--) {
        const bit1 = parseInt(n1[i]);
        const bit2 = parseInt(n2[i]);
        const currentSum = bit1 + bit2 + carry;
        const resultBit = currentSum % 2;
        const nextCarry = Math.floor(currentSum / 2);
        
        const resultSoFar = resultBit + sum;
        const padding = ' '.repeat(maxLength - resultSoFar.length);
        const pointer = ' '.repeat(maxLength - i - 1) + '^';

        let calculation = `  ${n1}\n+ ${n2}\n` + '-'.repeat(maxLength + 2) + `\n  ${padding}${resultSoFar}\n  ${pointer}\n\n`;
        calculation += `Análisis de la columna marcada (^):\n`;
        calculation += `  ${bit1} (de ${n1})\n+ ${bit2} (de ${n2})\n+ ${carry} (acarreo anterior)\n` + '-'.repeat(25) + `\n= ${currentSum}\n\n`;
        calculation += `De la suma ${currentSum}, el bit de resultado es ${resultBit} y el nuevo acarreo para la siguiente columna es ${nextCarry}.`;

        steps.push({
            title: `2.${maxLength - i}: Sumando la columna ${maxLength - 1 - i}`,
            description: `Sumamos los bits de la columna ${maxLength - 1 - i} (de derecha a izquierda) más el acarreo de la columna anterior.`,
            calculation
        });
        
        sum = resultBit + sum;
        carry = nextCarry;
    }

    if (carry > 0) {
        sum = '1' + sum;
        steps.push({
            title: `Paso Final: Acarreo Sobrante`,
            description: 'La última suma generó un acarreo. Como no hay más columnas, este acarreo se convierte en el bit más significativo del resultado final.',
            calculation: `Resultado intermedio: ${sum.substring(1)}\nAcarreo final: 1\nResultado final: ${sum}`
        });
    }

    return { sum, steps };
};

const onesComplement = (bin: string): string => bin.split('').map(bit => bit === '0' ? '1' : '0').join('');

const binarySubtractTwosComplement = (bin1: string, bin2: string): { diff: string, steps: Step[] } => {
    let steps: Step[] = [];
    if (BigInt(`0b${bin1}`) < BigInt(`0b${bin2}`)) {
         steps.push({ title: 'Error', description: 'El segundo número no puede ser mayor que el primero para esta implementación (resultado negativo).'});
         return { diff: 'Error', steps };
    }

    let maxLength = Math.max(bin1.length, bin2.length);
    let n1 = padZero(bin1, maxLength);
    let n2 = padZero(bin2, maxLength);
    
    steps.push({
      title: '1. Preparación',
      description: `Usaremos el método del complemento a 2 para restar ${n2} de ${n1}. Primero, igualamos la longitud de ambos números.`,
      calculation: `Número 1: ${n1}\nNúmero 2: ${n2}`
    });

    const onesComp = onesComplement(n2);
    steps.push({
      title: '2. Complemento a 1',
      description: `Invertimos todos los bits del segundo número (${n2}) para obtener su complemento a 1.`,
      calculation: `Complemento a 1 de ${n2} es ${onesComp}`
    });

    const { sum: twosComp } = binaryAdd(onesComp, '1');
    steps.push({
      title: '3. Complemento a 2',
      description: 'Sumamos 1 al complemento a 1 para obtener el complemento a 2. Esto representa el negativo del número original.',
      calculation: `${onesComp} + 1 = ${twosComp}`
    });

    const { sum: finalSumRaw, steps: additionSteps } = binaryAdd(n1, padZero(twosComp, n1.length));
    
    steps.push({
      title: '4. Sumar el número original y el complemento a 2',
      description: `Ahora, la resta se convierte en una suma. Sumamos el primer número (${n1}) con el complemento a 2 del segundo. A continuación se detalla esta operación paso a paso.`,
    });

    additionSteps.forEach(step => {
        const newStep: Step = {...step, title: `Paso 4 (Detalle Suma) - ${step.title}`};
        steps.push(newStep);
    });

    let diff = finalSumRaw;
    if (finalSumRaw.length > maxLength) {
        diff = finalSumRaw.substring(1);
        steps.push({
            title: '5. Descartar Acarreo Final',
            description: 'En la resta con complemento a 2, si la suma final produce un acarreo que excede la longitud original, este debe ser descartado para obtener el resultado correcto.',
            calculation: `Resultado de la suma: ${finalSumRaw}\nDescartamos el '1' de la izquierda -> ${diff}`
        });
    }

    return { diff: diff || '0', steps };
};

const binarySubtractOnesComplement = (bin1: string, bin2: string): { diff: string, steps: Step[] } => {
    let steps: Step[] = [];
    if (BigInt(`0b${bin1}`) < BigInt(`0b${bin2}`)) {
         steps.push({ title: 'Error', description: 'El segundo número no puede ser mayor que el primero para esta implementación (resultado negativo).'});
         return { diff: 'Error', steps };
    }
    
    if (bin1 === bin2) {
        return { diff: '0'.repeat(bin1.length || 1), steps: [{
            title: 'Resta del mismo número',
            description: `Al restar un número de sí mismo, el resultado es 0.`,
            calculation: `${bin1} - ${bin1} = ${'0'.repeat(bin1.length || 1)}`
        }]};
    }

    let maxLength = Math.max(bin1.length, bin2.length);
    let n1 = padZero(bin1, maxLength);
    let n2 = padZero(bin2, maxLength);

    steps.push({
      title: '1. Preparación',
      description: `Usaremos el método del complemento a 1 para restar ${n2} de ${n1}. Primero, igualamos la longitud de ambos números.`,
      calculation: `Número 1 (Minuendo): ${n1}\nNúmero 2 (Sustraendo): ${n2}`
    });

    const onesComp = onesComplement(n2);
    steps.push({
      title: '2. Complemento a 1 del Sustraendo',
      description: `Invertimos todos los bits del segundo número (${n2}) para obtener su complemento a 1.`,
      calculation: `Complemento a 1 de ${n2} es ${onesComp}`
    });

    const { sum: intermediateSum, steps: additionSteps1 } = binaryAdd(n1, onesComp);
    steps.push({
      title: '3. Sumar el Minuendo y el Complemento a 1',
      description: `Ahora, la resta se convierte en una suma. Sumamos el primer número (${n1}) con el complemento a 1 del segundo. A continuación se detalla esta operación.`,
    });

    additionSteps1.forEach(step => {
        const newStep: Step = {...step, title: `Paso 3 (Detalle Suma) - ${step.title}`};
        steps.push(newStep);
    });
    
    if (intermediateSum.length > maxLength) {
        const carry = '1';
        const sumWithoutCarry = intermediateSum.substring(1);
        steps.push({
            title: '4. Acarreo Final (End-Around Carry)',
            description: 'La suma produjo un acarreo (el "1" extra a la izquierda). En el método de complemento a 1, este acarreo se debe sumar al resultado intermedio para obtener la respuesta final.',
            calculation: `Resultado de la suma: ${intermediateSum}\nResultado intermedio sin acarreo: ${sumWithoutCarry}\nAcarreo a sumar: ${carry}`
        });

        const { sum: finalDiff, steps: additionSteps2 } = binaryAdd(sumWithoutCarry, carry);
        steps.push({
            title: '5. Sumar el Acarreo',
            description: `Sumamos el acarreo ('end-around carry') al resultado intermedio para obtener la solución final.`,
        });
        additionSteps2.forEach(step => {
            const newStep: Step = {...step, title: `Paso 5 (Detalle Suma Final) - ${step.title}`};
            steps.push(newStep);
        });
        
        return { diff: padZero(finalDiff, maxLength), steps };
    } 
    
    // This case implies a negative result, which is already handled at the top.
    return { diff: 'Error', steps: [{title: 'Error Inesperado', description: 'No se generó un acarreo final, lo que indica un resultado negativo no soportado.'}] };
};


const binaryMultiply = (bin1: string, bin2: string): { prod: string, steps: Step[] } => {
    let steps: Step[] = [];
    let partialProducts: string[] = [];
    
    let calcString = `   ${bin1}\nx  ${bin2}\n` + '-'.repeat(Math.max(bin1.length, bin2.length) + 3) + `\n`;

    for (let i = bin2.length - 1; i >= 0; i--) {
        const bit = bin2[i];
        const shiftAmount = bin2.length - 1 - i;
        let product: string;
        if (bit === '1') {
            product = bin1 + '0'.repeat(shiftAmount);
        } else {
            product = '0'.repeat(bin1.length + shiftAmount);
        }
        partialProducts.push(product);
        calcString += `   ${product.padStart(bin1.length + bin2.length - 1, ' ')}  (-> ${bin1} * ${bit}, desplazado ${shiftAmount} veces)\n`;
    }
    
    steps.push({
      title: '1. Productos Parciales',
      description: 'Multiplicamos el primer número por cada bit del segundo (de derecha a izquierda). Si el bit es 1, copiamos el primer número; si es 0, es una fila de ceros. Cada nueva fila se desplaza un lugar a la izquierda.',
      calculation: calcString
    });

    steps.push({
      title: '2. Suma de Productos Parciales',
      description: 'A continuación, sumamos todos los productos parciales que hemos calculado para obtener el resultado final.',
    });

    let finalProduct = '0';
    const relevantProducts = partialProducts.filter(p => BigInt(`0b${p}`) !== 0n);

    if (relevantProducts.length > 0) {
        finalProduct = relevantProducts.reduce((acc, current, index) => {
            const { sum: newProduct, steps: additionSteps } = binaryAdd(acc, current);
            
            if (index > 0) { // No mostramos la suma del primer producto con '0'
                steps.push({
                    title: `2.${index}: Sumando producto parcial`,
                    description: `Sumamos el resultado acumulado (${acc}) con el siguiente producto parcial (${current}).`,
                });
                additionSteps.forEach(step => {
                    const newStep: Step = {...step, title: `... Detalle de la suma: ${step.title}`};
                    steps.push(newStep);
                });
            } else {
                 steps.push({
                    title: `2.1: Empezamos con el primer producto`,
                    description: `El acumulado inicial es el primer producto parcial: ${current}.`,
                 });
            }
            return newProduct;
        }, '0');
    }

     steps.push({
        title: 'Resultado Final de la Multiplicación',
        description: 'Después de sumar todos los productos parciales, obtenemos el resultado final.',
        calculation: `Resultado: ${finalProduct}`
    });

    return { prod: finalProduct, steps };
};


// --- React Component ---

const App: React.FC = () => {
  const [num1, setNum1] = useState<string>('');
  const [num2, setNum2] = useState<string>('');
  const [operation, setOperation] = useState<Operation>(Operation.Add);
  const [result, setResult] = useState<string>('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string>('');

  enum SubtractionMethod {
    OnesComplement = 'ones',
    TwosComplement = 'twos'
  }
  const [subtractionMethod, setSubtractionMethod] = useState<SubtractionMethod>(SubtractionMethod.TwosComplement);
  
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const validateInput = (value: string): boolean => {
    if (value === '') return true;
    const isValid = /^[01]+$/.test(value);
    if (!isValid) {
      setError('Por favor, introduce solo números binarios (0 y 1).');
    } else {
      setError('');
    }
    return isValid;
  };

  const handleNum1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateInput(value)) {
      setNum1(value);
    }
  };

  const handleNum2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateInput(value)) {
      setNum2(value);
    }
  };

  const handleCalculate = useCallback(() => {
    if (error || !num1 || !num2) {
      setError(error || 'Ambos números son requeridos.');
      return;
    }
    setAiExplanation('');
    let calculationResult;
    switch (operation) {
      case Operation.Add:
        calculationResult = binaryAdd(num1, num2);
        setResult(calculationResult.sum);
        setSteps(calculationResult.steps);
        break;
      case Operation.Subtract:
        if (subtractionMethod === SubtractionMethod.OnesComplement) {
            calculationResult = binarySubtractOnesComplement(num1, num2);
        } else {
            calculationResult = binarySubtractTwosComplement(num1, num2);
        }
        setResult(calculationResult.diff);
        setSteps(calculationResult.steps);
        break;
      case Operation.Multiply:
        calculationResult = binaryMultiply(num1, num2);
        setResult(calculationResult.prod);
        setSteps(calculationResult.steps);
        break;
    }
  }, [num1, num2, operation, error, subtractionMethod]);
  
  const handleGetAIExplanation = async () => {
      setIsAiLoading(true);
      setAiExplanation('');
      const stepsText = steps.map(s => `${s.title}:\n${s.description}\n${s.calculation || ''}`).join('\n\n');
      const explanation = await getAIExplanation(operation, num1, num2, stepsText, result);
      setAiExplanation(explanation);
      setIsAiLoading(false);
  }

  const getOperationSymbol = (op: Operation) => {
    switch(op) {
      case Operation.Add: return '+';
      case Operation.Subtract: return '-';
      case Operation.Multiply: return '×';
    }
  }
  
  const ThemeToggleButton = () => (
    <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 transition-colors"
        aria-label="Toggle theme"
    >
        {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 sm:p-8 font-sans transition-colors duration-300">
      <div className="w-full max-w-4xl mx-auto relative">
        <ThemeToggleButton />
        <header className="text-center mb-10 pt-12 sm:pt-0">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100">Calculadora Binaria</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-2">Realiza operaciones y visualiza cada paso del proceso.</p>
        </header>

        <main className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Input Section */}
            <div className="space-y-4">
              <input
                type="text"
                value={num1}
                onChange={handleNum1Change}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-3 text-lg text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition duration-200"
                placeholder="Ejem: 100100"
                aria-label="Primer número binario"
              />
              <div className="flex justify-center text-2xl font-bold text-slate-500 dark:text-slate-400" aria-hidden="true">{getOperationSymbol(operation)}</div>
              <input
                type="text"
                value={num2}
                onChange={handleNum2Change}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-3 text-lg text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition duration-200"
                placeholder="Ejem: 100100"
                aria-label="Segundo número binario"
              />
            </div>

            {/* Controls Section */}
            <div className="flex flex-col items-center justify-center space-y-5">
              <div className="flex space-x-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg" role="group" aria-label="Seleccionar operación">
                <button onClick={() => setOperation(Operation.Add)} className={`px-4 py-2 rounded-md transition font-medium ${operation === Operation.Add ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`} aria-pressed={operation === Operation.Add}>Suma</button>
                <button onClick={() => setOperation(Operation.Subtract)} className={`px-4 py-2 rounded-md transition font-medium ${operation === Operation.Subtract ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`} aria-pressed={operation === Operation.Subtract}>Resta</button>
                <button onClick={() => setOperation(Operation.Multiply)} className={`px-4 py-2 rounded-md transition font-medium ${operation === Operation.Multiply ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`} aria-pressed={operation === Operation.Multiply}>Multiplicación</button>
              </div>

               {operation === Operation.Subtract && (
                <div className="flex flex-col items-center space-y-2 animate-fade-in pt-2">
                    <label className="text-sm text-slate-500 dark:text-slate-400">Método de Resta:</label>
                    <div className="flex space-x-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg" role="group" aria-label="Seleccionar método de resta">
                        <button 
                            onClick={() => setSubtractionMethod(SubtractionMethod.TwosComplement)}
                            className={`px-3 py-1 text-sm rounded-md transition ${subtractionMethod === SubtractionMethod.TwosComplement ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                            aria-pressed={subtractionMethod === SubtractionMethod.TwosComplement}
                        >
                            Complemento a 2
                        </button>
                        <button 
                            onClick={() => setSubtractionMethod(SubtractionMethod.OnesComplement)}
                            className={`px-3 py-1 text-sm rounded-md transition ${subtractionMethod === SubtractionMethod.OnesComplement ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                            aria-pressed={subtractionMethod === SubtractionMethod.OnesComplement}
                        >
                            Complemento a 1
                        </button>
                    </div>
                </div>
              )}

              <button
                onClick={handleCalculate}
                className="w-full max-w-xs bg-slate-900 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-300 text-white dark:text-slate-900 font-bold py-3 px-4 rounded-lg text-lg transition duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 mt-2"
                disabled={!!error || !num1 || !num2}
              >
                Calcular
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 dark:text-red-400 mt-4 text-center" role="alert">{error}</p>}
        </main>

        {result && !error && (
          <section className="mt-10 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 animate-fade-in" aria-live="polite">
              <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2 text-center">Resultado</h2>
              <p className="text-4xl font-bold text-slate-900 dark:text-slate-100 text-center font-mono break-all bg-slate-100 dark:bg-slate-900/50 py-4 rounded-lg">{result}</p>

              <StepByStepDisplay steps={steps} />
              
              <div className="mt-8 text-center border-t border-slate-200 dark:border-slate-700 pt-6">
                <button
                  onClick={handleGetAIExplanation}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAiLoading}
                >
                  {isAiLoading ? 'Generando...' : '✨ Explicar con IA'}
                </button>
              </div>

              {isAiLoading && <div className="text-center mt-4 text-slate-500 dark:text-slate-400" aria-label="Cargando explicación de la IA">Consultando al asistente de IA...</div>}
              
              {aiExplanation && (
                  <div className="mt-6 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Explicación de la IA</h3>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{aiExplanation}</p>
                  </div>
              )}
          </section>
        )}

      </div>
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
       `}</style>
    </div>
  );
};

export default App;
