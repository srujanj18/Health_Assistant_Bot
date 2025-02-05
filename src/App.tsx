import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse'; // Importing the papaparse library
import { Bot, Volume2, VolumeX, User, History, Save, Download } from 'lucide-react';
import EmergencyDetection from './pages/EmergencyDetection';
import SymptomTracking from './pages/SymptomTracking';
import MedicalTerms from './pages/MedicalTerms';
import './styles.css';

interface Message {
  text: string;
  sender: 'bot' | 'user';
  isEmergency?: boolean;
  isDefinition?: boolean;
}

interface Symptom {
  name: string;
  timestamp: Date;
  severity: number;
}

interface Disease {
  disease: string;
  symptoms: string[];
  description?: string;
  precautions?: string[];
  severity?: { [key: string]: number };
}

const initialMessage: Message = {
  text: "Hello! I'm your medical health assistant. How can I help you today? You can ask about symptoms, track your health, or learn medical terms. Please note that I provide general health information only and am not a substitute for professional medical advice.",
  sender: 'bot'
};

const medicalTerms: Record<string, string> = {
  hypertension: "High blood pressure, a condition where the force of blood against artery walls is consistently too high.",
  tachycardia: "Abnormally rapid heart rate.",
  arrhythmia: "Irregular heartbeat or abnormal heart rhythm.",
  dyspnea: "Difficulty breathing or shortness of breath.",
  myalgia: "Muscle pain or muscle aches.",
  vertigo: "A sensation of dizziness where you feel like you or your surroundings are spinning.",
};

const styles = {
  messageContainer: `
    bg-white/90 rounded-lg shadow-md p-4 mb-4 
    transition-all duration-300 hover:shadow-lg
    border-l-4 border-blue-500
  `,
  userMessage: `
    bg-blue-50/90 rounded-lg p-4 mb-4
    border-l-4 border-blue-600
  `,
  botMessage: `
    bg-white/90 rounded-lg p-4 mb-4
    border-l-4 border-green-500
  `,
  input: `
    w-full p-4 rounded-lg border-2 border-gray-200
    focus:border-blue-500 focus:ring-2 focus:ring-blue-200
    transition-all duration-300
  `,
  button: `
    bg-blue-500 text-white px-6 py-2 rounded-lg
    hover:bg-blue-600 transition-all duration-300
    flex items-center gap-2
  `,
  muteButton: `
    fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full
    hover:bg-blue-600 transition-all duration-300 shadow-lg z-30
  `,
  voiceControls: `
    fixed bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-lg z-30
    w-48 scale-75 origin-bottom-left
  `
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'chat' | 'emergency' | 'tracking' | 'terms' | 'history'>('chat');
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const currentSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [pausedAt, setPausedAt] = useState<number>(0);
  const [dataset, setDataset] = useState<Disease[]>([]);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedChats, setSavedChats] = useState<Message[][]>([]);

  // Save chat history
  const saveChat = () => {
    setSavedChats(prev => [...prev, messages]);
    setMessages([]);
  };

  // Export chat
  const exportChat = () => {
    const text = messages
      .map(m => `${m.sender}: ${m.text}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-history.txt';
    a.click();
  };

  // Toolbar component
  const Toolbar = () => (
    <div className="fixed top-4 right-4 flex gap-2">
      <button
        onClick={() => setCurrentPage('history')}
        className={styles.button}
        title="Chat History"
        aria-label="Chat History"
      >
        <History size={20} />
      </button>
      <button
        onClick={() => saveChat()}
        className={styles.button}
        title="Save Chat"
        aria-label="Save Chat"
      >
        <Save size={20} />
      </button>
      <button
        onClick={() => exportChat()}
        className={styles.button}
        title="Export Chat"
        aria-label="Export Chat"
      >
        <Download size={20} />
      </button>
    </div>
  );

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const [datasetResponse, descriptionResponse, precautionResponse, severityResponse] = await Promise.all([
          fetch('/dataset.csv'),
          fetch('/symptom_Description.csv'),
          fetch('/symptom_precaution.csv'),
          fetch('/Symptom-severity.csv')
        ]);

        const [datasetText, descriptionText, precautionText, severityText] = await Promise.all([
          datasetResponse.text(),
          descriptionResponse.text(),
          precautionResponse.text(),
          severityResponse.text()
        ]);

        const severityMap: { [key: string]: number } = {};
        severityText.split('\n')
          .slice(1)
          .filter(line => line.trim())
          .forEach(line => {
            const [symptom, weight] = line.split(',');
            severityMap[symptom.trim().toLowerCase()] = parseInt(weight);
          });

        const descriptionMap: { [key: string]: string } = {};
        descriptionText.split('\n')
          .slice(1)
          .filter(line => line.trim())
          .forEach(line => {
            const [disease, description] = line.split(',');
            descriptionMap[disease.trim()] = description;
          });

        const precautionMap: { [key: string]: string[] } = {};
        precautionText.split('\n')
          .slice(1)
          .filter(line => line.trim())
          .forEach(line => {
            const [disease, ...precautions] = line.split(',');
            precautionMap[disease.trim()] = precautions.filter(p => p.trim());
          });

        const diseaseMap = new Map<string, Disease>();
        
        datasetText.split('\n')
          .slice(1)
          .filter(line => line.trim())
          .forEach(line => {
            const [disease, ...symptoms] = line.split(',');
            const diseaseName = disease.trim();
            const cleanSymptoms = symptoms
              .filter(s => s.trim())
              .map(s => s.trim().toLowerCase());

            if (diseaseMap.has(diseaseName)) {
              const existing = diseaseMap.get(diseaseName)!;
              const allSymptoms = new Set([...existing.symptoms, ...cleanSymptoms]);
              existing.symptoms = Array.from(allSymptoms);
            } else {
              diseaseMap.set(diseaseName, {
                disease: diseaseName,
                symptoms: cleanSymptoms,
                description: descriptionMap[diseaseName],
                precautions: precautionMap[diseaseName],
                severity: severityMap
              });
            }
          });

        setDataset(Array.from(diseaseMap.values()));
      } catch (error) {
        console.error('Error loading datasets:', error);
      }
    };

    loadDatasets();
  }, []);

  const checkForEmergency = (text: string): boolean => {
    const emergencyKeywords = [
      'chest pain', 'difficulty breathing', 'stroke', 'unconscious',
      'severe bleeding', 'head injury', 'seizure', 'heart attack',
      'severe allergic reaction', 'anaphylaxis', 'suicide', 'overdose'
    ];
    return emergencyKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  const checkForMedicalTerm = (text: string): string | null => {
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (medicalTerms[word]) {
        return `${word}: ${medicalTerms[word]}`;
      }
    }
    return null;
  };

  const trackSymptom = (symptom: string) => {
    const newSymptom: Symptom = {
      name: symptom,
      timestamp: new Date(),
      severity: 1
    };
    setSymptoms(prev => [...prev, newSymptom]);
    return `I've recorded your ${symptom}. I'll help you track this symptom over time.`;
  };

  const generateResponse = (userText: string): string => {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const farewells = ['bye', 'goodbye', 'see you', 'thanks', 'thank you'];
    const howAreYou = ['how are you', 'how are you doing', 'how do you do', 'whats up', "what's up"];
    
    const userTextLower = userText.toLowerCase();

    if (greetings.some(greeting => userTextLower.includes(greeting))) {
      return "Hello! I'm your medical assistant. How are you feeling today?";
    }

    if (farewells.some(farewell => userTextLower.includes(farewell))) {
      return "Take care! Remember to consult a healthcare professional for proper medical advice.";
    }

    if (howAreYou.some(phrase => userTextLower.includes(phrase))) {
      return "I'm doing well, thank you! I'm here to help you with any health concerns. How can I assist you today?";
    }

    if (userTextLower.includes('who are you') || userTextLower.includes('what are you')) {
      return "I'm a medical health assistant designed to help you understand symptoms and provide general health information. While I can offer guidance, please remember to consult healthcare professionals for proper medical advice.";
    }

    if (userTextLower.includes('can you help') || userTextLower.includes('i need help')) {
      return "Of course! I can help you understand symptoms, provide general health information, or guide you through emergency situations. What would you like to know about?";
    }

    if (userTextLower.includes('what should i do') || userTextLower.includes('what can i do')) {
      return "I can help guide you better if you tell me specific symptoms or health concerns you're experiencing. What symptoms are you having?";
    }

    return analyzeSymptoms(userText);
  };

  const analyzeSymptoms = (userText: string): string => {
    const commonPrefixes = ['i have', 'i am having', 'i feel', 'i am feeling', 'experiencing', 'suffering from'];
    let symptom = userText.toLowerCase();
    
    for (const prefix of commonPrefixes) {
      if (symptom.includes(prefix)) {
        symptom = symptom.replace(prefix, '').trim();
        break;
      }
    }

    const normalizedInput = symptom.replace(/[\s_-]+/g, '').trim();

    const matchingDiseases = dataset
      .filter(item => 
        item.symptoms.some(symptom => {
          const normalizedSymptom = symptom.toLowerCase().replace(/[\s_-]+/g, '');
          return normalizedSymptom.includes(normalizedInput) || 
                 normalizedInput.includes(normalizedSymptom);
        })
      )
      .map(disease => ({
        ...disease,
        matchingSymptoms: disease.symptoms.filter(symptom => {
          const normalizedSymptom = symptom.toLowerCase().replace(/[\s_-]+/g, '');
          return normalizedSymptom.includes(normalizedInput) || 
                 normalizedInput.includes(normalizedSymptom);
        })
      }))
      .sort((a, b) => {
        const aScore = a.matchingSymptoms.reduce((acc, symptom) => acc + (a.severity?.[symptom] || 0), 0);
        const bScore = b.matchingSymptoms.reduce((acc, symptom) => acc + (b.severity?.[symptom] || 0), 0);
        return bScore - aScore;
      })
      .slice(0, 2);

    if (matchingDiseases.length > 0) {
      const lines: string[] = [];
      
      lines.push(`1. Symptom Detected:`);
      lines.push(`   - ${symptom}`);
      lines.push(``);
      
      lines.push(`2. Possible Conditions:`);
      
      matchingDiseases.forEach((disease, index) => {
        const letter = String.fromCharCode(97 + index);
        
        lines.push(``);
        lines.push(`   ${letter}. ${disease.disease}`);
        
        if (disease.description) {
          lines.push(`      Description:`);
          lines.push(`      - ${disease.description.replace(/"/g, '')}`);
          lines.push(``);
        }
        
        lines.push(`      Severity:`);
        lines.push(`      - ${disease.severity || '3'}/10`);
        lines.push(``);
        
        if (disease.precautions && disease.precautions.length > 0) {
          lines.push(`      Precautions:`);
          disease.precautions.forEach(precaution => {
            lines.push(`      - ${precaution}`);
          });
          lines.push(``);
        }
        
        const otherSymptoms = disease.symptoms
          .filter(s => !disease.matchingSymptoms.includes(s))
          .slice(0, 3);
        if (otherSymptoms.length > 0) {
          lines.push(`      Related Symptoms:`);
          otherSymptoms.forEach(symptom => {
            lines.push(`      - ${symptom.replace(/_/g, ' ')}`);
          });
          lines.push(``);
        }
      });
      
      lines.push(`3. Next Steps:`);
      lines.push(`   - Share any other symptoms you're experiencing`);
      lines.push(`   - Consult a healthcare professional for proper diagnosis`);
      lines.push(``);
      
      lines.push(`4. Disclaimer:`);
      lines.push(`   - This is general guidance only`);
      lines.push(`   - Not a substitute for professional medical advice`);
      
      return lines.join('\n');
    }
    
    return [
      `Error:`,
      `- Could not analyze symptoms`,
      `- Please try describing them differently`
    ].join('\n\n');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);

    const botResponse = generateResponse(input);
    const botMessage = { text: botResponse, sender: 'bot' };
    setMessages(prev => [...prev, botMessage]);
    
    setInput('');
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);
   // Add CSS to preserve whitespace and line breaks
   const messageStyle = {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'monospace'
  };

  return (
    <div className="app min-h-screen relative">
      <Toolbar /> {/* Place the toolbar at the top */}
      <div className="container mx-auto p-4">
        <main className="max-w-4xl mx-auto chatbot-container"> {/* Chat container */}
          {currentPage === 'chat' && (
            <div className="bg-white/80 rounded-lg shadow-lg p-4">
              {/* Chat Messages */}
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
                >
                  <div className={`inline-block p-3 rounded-lg`}>
                    <div style={messageStyle}>
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {currentPage === 'emergency' && <EmergencyDetection />}
          {currentPage === 'tracking' && <SymptomTracking />}
          {currentPage === 'terms' && <MedicalTerms />}
          {currentPage === 'history' && <ChatHistory messages={messages} />}
        </main>
      </div>
      
      {/* Fixed Input Area */}
      <div className="fixed-input-container">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your health concern or 'track' to see symptom history..."
            className="input"
          />
          <button 
            type="submit"
            className="button"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Disclaimer: This is a demo health assistant. Always consult with qualified healthcare professionals for medical advice. In case of emergency, dial emergency services immediately.
        </p>
      </div>
    </div>
  );
};

export default App;