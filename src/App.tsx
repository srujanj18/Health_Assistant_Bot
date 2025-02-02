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
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [pausedAt, setPausedAt] = useState<number>(0);
  const [dataset, setDataset] = useState<Disease[]>([]);
  const [lastMessage, setLastMessage] = useState<string>('');

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

  const toggleSpeech = () => {
    const newSpeechState = !isSpeechEnabled;
    setIsSpeechEnabled(newSpeechState);
    
    if (!newSpeechState) {
      // Muting - pause speech and store position
      window.speechSynthesis.pause();
      if (window.speechSynthesis.speaking) {
        setPausedAt(window.speechSynthesis.getPosition?.() || 0);
      }
    } else {
      // Unmuting - resume from last position if there was speech
      if (lastSpokenText && pausedAt > 0) {
        const remainingText = lastSpokenText.slice(pausedAt);
        if (remainingText.trim()) {
          const resumeUtterance = new SpeechSynthesisUtterance(remainingText);
          resumeUtterance.rate = 0.9;
          resumeUtterance.pitch = 1;
          window.speechSynthesis.cancel(); // Clear any pending speech
          window.speechSynthesis.speak(resumeUtterance);
        }
      }
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis || !isSpeechEnabled) return;

    // Clean up the text for speech
    const cleanText = text
      .replace(/[•\-]/g, '')
      .replace(/\d+\./g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s,.]/g, '')
      .split(/[.•]/)
      .filter(sentence => sentence.trim().length > 0)
      .join('. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Track speech progress
    utterance.onboundary = (event) => {
      setPausedAt(event.charIndex);
    };

    // Store the utterance and text
    setCurrentUtterance(utterance);
    setLastSpokenText(cleanText);

    window.speechSynthesis.speak(utterance);
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
      const response = [
        `• Symptom detected:\n    - ${symptom}`,
        ``,
        `• Possible conditions:`,
        ``
      ];
      
      matchingDiseases.forEach((disease, index) => {
        response.push(`${index + 1}. ${disease.disease}`);
        response.push(``);
        
        // Description
        if (disease.description) {
          response.push(`    • Description:`);
          response.push(`        - ${disease.description.replace(/"/g, '')}`);
          response.push(``);
        }
        
        // Severity
        response.push(`    • Severity:`);
        response.push(`        - ${disease.severity || 'N/A'}/10`);
        response.push(``);
        
        // Precautions
        if (disease.precautions && disease.precautions.length > 0) {
          response.push(`    • Precautions:`);
          disease.precautions.forEach(precaution => {
            response.push(`        - ${precaution}`);
          });
          response.push(``);
        }
        
        // Related symptoms
        const otherSymptoms = disease.symptoms
          .filter(s => !disease.matchingSymptoms.includes(s))
          .slice(0, 3);
        if (otherSymptoms.length > 0) {
          response.push(`    • Related symptoms:`);
          otherSymptoms.forEach(symptom => {
            response.push(`        - ${symptom.replace(/_/g, ' ')}`);
          });
          response.push(``);
        }
      });
      
      // Next steps
      response.push(`• Next steps:`);
      response.push(`    - Share any other symptoms you're experiencing`);
      response.push(`    - Consult a healthcare professional for proper diagnosis`);
      response.push(``);
      
      // Disclaimer
      response.push(`• Disclaimer:`);
      response.push(`    - This is general guidance only`);
      response.push(`    - Not a substitute for professional medical advice`);
      
      return response.join('\n');
    } else {
      return [
        `• Error:`,
        `    - Symptom not recognized`,
        `    - Please try describing it differently`,
        `    - Example: headache, fever, cough`
      ].join('\n');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Cancel any ongoing speech for new messages
    window.speechSynthesis.cancel();
    setPausedAt(0);
    setLastSpokenText('');

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    // Generate bot response
    const botResponse = generateResponse(input);
    const botMessage = { role: 'assistant', content: botResponse };
    setMessages(prev => [...prev, botMessage]);
    
    // Speak if enabled
    if (isSpeechEnabled) {
      speak(botResponse);
    }

    setInput('');
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="app">
      <header className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <Bot size={32} className="text-blue-500" />
          <h1 className="text-xl font-bold">Medical Health Assistant</h1>
        </div>
        <button
          onClick={toggleSpeech}
          className="p-2 rounded-full hover:bg-gray-100"
          title={isSpeechEnabled ? "Mute" : "Unmute"}
        >
          {isSpeechEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </header>

      <main>
        {currentPage === 'chat' && (
          <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
              <span className="text-2xl">🤖</span>
              <h1 className="text-2xl font-bold">Medical Health Assistant</h1>
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
