import { useState } from 'react';
import { SCHOOL_TYPE_PRESETS } from '../data/schoolTypeData';
import type { SchoolType } from '../state/types';

// Shown once, before play begins: name the university and pick private vs.
// public. That single choice sets starting conditions via
// SCHOOL_TYPE_PRESETS (see data/schoolTypeData.ts) — no other customization
// here, per README ("archetypes emerge, they are not chosen").
export default function StartupScreen({ onStart }: { onStart: (name: string, schoolType: SchoolType) => void }) {
  const [name, setName] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolType>('private');

  return (
    <div className="startup">
      <div className="startup-card">
        <div className="eyebrow">Found a University</div>
        <h1>Name your school</h1>
        <input
          className="startup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ashcombe University"
          maxLength={60}
        />
        <div className="startup-types">
          {(Object.keys(SCHOOL_TYPE_PRESETS) as SchoolType[]).map((type) => (
            <button
              key={type}
              className={`startup-type-btn ${schoolType === type ? 'active' : ''}`}
              onClick={() => setSchoolType(type)}
            >
              <strong>{SCHOOL_TYPE_PRESETS[type].label}</strong>
              <span>{SCHOOL_TYPE_PRESETS[type].description}</span>
            </button>
          ))}
        </div>
        <button
          className="startup-begin-btn"
          disabled={name.trim().length === 0}
          onClick={() => onStart(name.trim(), schoolType)}
        >
          Open the Doors
        </button>
      </div>
    </div>
  );
}
