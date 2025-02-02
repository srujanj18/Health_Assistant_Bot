import React, { useState } from 'react';

interface SymptomLog {
  date: string;
  symptom: string;
  severity: number;
  notes: string;
}

const SymptomTracking: React.FC = () => {
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [newSymptom, setNewSymptom] = useState({
    symptom: '',
    severity: 1,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symptomLog: SymptomLog = {
      date: new Date().toISOString(),
      ...newSymptom
    };
    setSymptomLogs([...symptomLogs, symptomLog]);
    setNewSymptom({ symptom: '', severity: 1, notes: '' });
  };

  return (
    <div className="symptom-tracking">
      <h2>📊 Symptom Tracking</h2>
      
      <form onSubmit={handleSubmit} className="symptom-form">
        <div>
          <label>Symptom:</label>
          <input
            type="text"
            value={newSymptom.symptom}
            onChange={(e) => setNewSymptom({...newSymptom, symptom: e.target.value})}
            required
          />
        </div>
        
        <div>
          <label>Severity (1-10):</label>
          <input
            type="number"
            min="1"
            max="10"
            value={newSymptom.severity}
            onChange={(e) => setNewSymptom({...newSymptom, severity: parseInt(e.target.value)})}
            required
          />
        </div>
        
        <div>
          <label>Notes:</label>
          <textarea
            value={newSymptom.notes}
            onChange={(e) => setNewSymptom({...newSymptom, notes: e.target.value})}
          />
        </div>
        
        <button type="submit">Log Symptom</button>
      </form>

      <div className="symptom-history">
        <h3>Symptom History</h3>
        {symptomLogs.map((log, index) => (
          <div key={index} className="symptom-entry">
            <p>Date: {new Date(log.date).toLocaleString()}</p>
            <p>Symptom: {log.symptom}</p>
            <p>Severity: {log.severity}/10</p>
            <p>Notes: {log.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SymptomTracking; 