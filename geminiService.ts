import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY for Gemini is not set in environment variables. AI functionality will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getAIExplanation = async (
  operation: string,
  num1: string,
  num2: string,
  steps: string,
  result: string
): Promise<string> => {
  if (!API_KEY) {
    return "La funcionalidad de IA está deshabilitada porque la API Key no está configurada.";
  }

  const opMap: { [key: string]: string } = {
    add: 'Suma',
    subtract: 'Resta',
    multiply: 'Multiplicación',
  };

  const prompt = `
    Eres un profesor experto en ciencias de la computación.
    Explica de forma clara, concisa y amigable para un principiante la siguiente operación binaria.
    No repitas los pasos de cálculo que te proporciono, en su lugar, explica el *porqué* de esos pasos y el concepto detrás de ellos.
    
    Operación: ${opMap[operation]} Binaria
    Número 1: ${num1}
    Número 2: ${num2}
    Resultado: ${result}
    
    Pasos de la resolución (para tu referencia, no los copies textualmente):
    ${steps}

    Proporciona una explicación conceptual de cómo se llegó al resultado.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Ocurrió un error al contactar a la IA. Por favor, revisa la consola para más detalles.";
  }
};
