import React, { useState, useEffect } from 'react';
import Papa from 'papaparse'; // Importing the papaparse library
import { Send, Plus, Bot, User, AlertTriangle, History, Book, Volume2, VolumeX } from 'lucide-react';
import EmergencyDetection from './pages/EmergencyDetection';
import SymptomTracking from './pages/SymptomTracking';
import MedicalTerms from './pages/MedicalTerms';

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

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'chat' | 'emergency' | 'tracking' | 'terms'>('chat');
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [dataset, setDataset] = useState<Disease[]>([]);

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        // Load all datasets
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

        // Parse severity data
        const severityMap: { [key: string]: number } = {};
        severityText.split('\n')
          .slice(1) // Skip header
          .filter(line => line.trim())
          .forEach(line => {
            const [symptom, weight] = line.split(',');
            severityMap[symptom.trim().toLowerCase()] = parseInt(weight);
          });

        // Parse description data
        const descriptionMap: { [key: string]: string } = {};
        descriptionText.split('\n')
          .slice(1) // Skip header
          .filter(line => line.trim())
          .forEach(line => {
            const [disease, description] = line.split(',');
            descriptionMap[disease.trim()] = description;
          });

        // Parse precaution data
        const precautionMap: { [key: string]: string[] } = {};
        precautionText.split('\n')
          .slice(1) // Skip header
          .filter(line => line.trim())
          .forEach(line => {
            const [disease, ...precautions] = line.split(',');
            precautionMap[disease.trim()] = precautions.filter(p => p.trim());
          });

        // Parse main dataset and combine all information
        const diseaseMap = new Map<string, Disease>();
        
        datasetText.split('\n')
          .slice(1) // Skip header
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

  const speakText = (text: string) => {
    if (isSpeechEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSpeech = () => {
    setIsSpeechEnabled(!isSpeechEnabled);
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

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

  const generateResponse = (userInput: string): string => {
    // Common greetings and farewells
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const farewells = ['bye', 'goodbye', 'see you', 'thanks', 'thank you'];
    const howAreYou = ['how are you', 'how are you doing', 'how do you do', 'whats up', "what's up"];
    
    const userText = userInput.toLowerCase();

    // Handle greetings
    if (greetings.some(greeting => userText.includes(greeting))) {
      return "Hello! I'm your medical assistant. How are you feeling today?";
    }

    // Handle farewells
    if (farewells.some(farewell => userText.includes(farewell))) {
      return "Take care! Remember to consult a healthcare professional for proper medical advice.";
    }

    // Handle "how are you"
    if (howAreYou.some(phrase => userText.includes(phrase))) {
      return "I'm doing well, thank you! I'm here to help you with any health concerns. How can I assist you today?";
    }

    // Handle general questions about the bot
    if (userText.includes('who are you') || userText.includes('what are you')) {
      return "I'm a medical health assistant designed to help you understand symptoms and provide general health information. While I can offer guidance, please remember to consult healthcare professionals for proper medical advice.";
    }

    // Handle "can you help"
    if (userText.includes('can you help') || userText.includes('i need help')) {
      return "Of course! I can help you understand symptoms, provide general health information, or guide you through emergency situations. What would you like to know about?";
    }

    // Handle common health questions
    if (userText.includes('what should i do') || userText.includes('what can i do')) {
      return "I can help guide you better if you tell me specific symptoms or health concerns you're experiencing. What symptoms are you having?";
    }

    // If no conversational patterns match, proceed with symptom analysis
    return analyzeSymptoms(userText);
  };

  const analyzeSymptoms = (userText: string): string => {
    // Extract the actual symptom from user input
    const commonPrefixes = ['i have', 'i am having', 'i feel', 'i am feeling', 'experiencing', 'suffering from'];
    let symptom = userText.toLowerCase();
    
    // Remove common prefixes to get the actual symptom
    for (const prefix of commonPrefixes) {
      if (symptom.includes(prefix)) {
        symptom = symptom.replace(prefix, '').trim();
        break;
      }
    }

    // Normalize the extracted symptom
    const normalizedInput = symptom.replace(/[\s_-]+/g, '').trim();

    // Find matching diseases
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
      let response = `I understand you're experiencing ${symptom}. `;
      response += `Based on this symptom, here are some possible conditions to be aware of:\n\n`;
      
      matchingDiseases.forEach((disease, index) => {
        response += `${index + 1}. ${disease.disease}\n`;
        response += `• Description: ${disease.description}\n`;
        if (disease.precautions && disease.precautions.length > 0) {
          response += `• Recommended precautions:\n  - ${disease.precautions.join('\n  - ')}\n`;
        }
        response += '\n';
      });

      response += "Would you like to tell me about any other symptoms you're experiencing? This would help me provide better information. Also, remember that this is just for general guidance - please consult a healthcare professional for proper diagnosis.";
      
      return response;
    } else {
      return "I notice you might be describing a health concern, but I'm not quite sure I understand. Could you describe your symptoms differently? For example, you can say things like 'headache' or 'fever'.";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    // Generate bot response
    const botResponse = generateResponse(input);
    const botMessage = { role: 'assistant', content: botResponse };
    setMessages(prev => [...prev, botMessage]);

    // Clear input
    setInput('');

    // Text-to-speech if enabled
    if (isSpeechEnabled) {
      speakText(botResponse);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>🤖 Medical Health Assistant</h1>
        <nav>
          <button 
            className={currentPage === 'emergency' ? 'active' : ''} 
            onClick={() => setCurrentPage('emergency')}
          >
            🚨 Emergency Detection
          </button>
          <button 
            className={currentPage === 'tracking' ? 'active' : ''} 
            onClick={() => setCurrentPage('tracking')}
          >
            📊 Symptom Tracking
          </button>
          <button 
            className={currentPage === 'terms' ? 'active' : ''} 
            onClick={() => setCurrentPage('terms')}
          >
            📚 Medical Terms
          </button>
          <button 
            className={currentPage === 'chat' ? 'active' : ''} 
            onClick={() => setCurrentPage('chat')}
          >
            💬 Chat
          </button>
        </nav>
      </header>

      <main>
        {currentPage === 'chat' && (
          <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
              <span className="text-2xl">🤖</span>
              <h1 className="text-2xl font-bold">Medical Health Assistant</h1>
              <button 
                onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                className="ml-auto p-2 rounded-full hover:bg-gray-100"
              >
                {isSpeechEnabled ? '🔊' : '🔇'}
              </button>
            </div>

            {/* Chat Container */}
            <div className="flex-1 overflow-y-auto mb-4 p-4">
              {/* Initial Bot Message */}
              <div className="mb-4">
                <div className="inline-block bg-gray-200 p-3 rounded-lg">
                  <p>Hello! I'm your medical health assistant. How can I help you today? You can ask about symptoms, track your health, or learn medical terms. Please note that I provide general health information only and am not a substitute for professional medical advice.</p>
                </div>
              </div>

              {/* Chat Messages */}
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div 
                    className={`inline-block p-3 rounded-lg max-w-[80%] ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your health concern or 'track' to see symptom history..."
                  className="flex-1 p-2 border rounded-lg"
                />
                <button 
                  type="submit"
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Send
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Disclaimer: This is a demo health assistant. Always consult with qualified healthcare professionals for medical advice. In case of emergency, dial emergency services immediately.
              </p>
            </div>
          </div>
        )}
        {currentPage === 'emergency' && <EmergencyDetection />}
        {currentPage === 'tracking' && <SymptomTracking />}
        {currentPage === 'terms' && <MedicalTerms />}
      </main>
    </div>
  );
};

export default App;
