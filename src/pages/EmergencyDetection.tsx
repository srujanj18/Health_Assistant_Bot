import React from 'react';

const EmergencyDetection: React.FC = () => {
  return (
    <div className="emergency-detection">
      <h2>🚨 Emergency Symptom Detection</h2>
      <div className="emergency-info">
        <p>Call emergency services immediately if you experience:</p>
        <ul>
          <li>Chest pain or pressure (possible heart attack)</li>
          <li>Difficulty breathing or shortness of breath</li>
          <li>Sudden severe headache</li>
          <li>Sudden confusion or difficulty speaking</li>
          <li>Fainting or loss of consciousness</li>
          <li>Severe bleeding</li>
          <li>Severe burns</li>
          <li>Seizures</li>
        </ul>
        
        <div className="emergency-contacts">
          <h3>Emergency Contacts:</h3>
          <ul>
            <li>Emergency Services: 911</li>
            <li>Poison Control: 1-800-222-1222</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDetection; 