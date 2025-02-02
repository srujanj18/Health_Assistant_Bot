import React, { useState } from 'react';

const medicalTerms = {
  "Acute": "Sudden onset, usually severe, of short duration.",
  "Chronic": "Persisting over a long period of time.",
  "Benign": "Not cancerous, usually not harmful.",
  "Malignant": "Cancerous, capable of spreading.",
  "Diagnosis": "Identification of a medical condition or disease.",
  "Prognosis": "Likely course of a medical condition.",
  "Anemia": "Condition where blood lacks enough healthy red blood cells.",
  "Biopsy": "Removal of tissue for examination.",
  "Edema": "Swelling caused by excess fluid in body tissues.",
  "Hypertension": "High blood pressure.",
  "Lesion": "Area of damaged tissue.",
  "Myalgia": "Muscle pain.",
  "Nausea": "Sensation of unease in the stomach with urge to vomit.",
  "Vertigo": "Sensation of dizziness or spinning.",
  // Add more terms as needed
};

const MedicalTerms: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTerms = Object.entries(medicalTerms).filter(([term, definition]) =>
    term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="medical-terms">
      <h2>📚 Medical Terms Dictionary</h2>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search medical terms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="terms-list">
        {filteredTerms.map(([term, definition]) => (
          <div key={term} className="term-entry">
            <h3>{term}</h3>
            <p>{definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicalTerms; 