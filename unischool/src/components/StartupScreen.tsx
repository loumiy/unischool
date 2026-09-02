import { useState } from 'react';
import { SCHOOL_TYPE_PRESETS } from '../data/schoolTypeData';
import { STARTING_INSTITUTION_SUFFIX } from '../state/actions';
import type { SchoolType } from '../state/types';

// Shown once, before play begins: name the school and pick private vs.
// public. That single choice sets starting conditions via
// SCHOOL_TYPE_PRESETS (see data/schoolTypeData.ts) — no other customization
// here, per README ("archetypes emerge, they are not chosen").
//
// The player writes only HALF the name. Every school opens as a College,
// and the word after the name is fixed and shown here rather than typed,
// because it is the thing the game later offers to change: completing the
// first lab offers a one-time promotion to University (see
// systems/events/eventSystem.ts). Showing the suffix as a fixed chip makes
// that promotion legible as a real change to something the player has been
// looking at for hours, rather than a surprise rewrite of what they typed.
//
// The field is PREFILLED rather than left empty with a placeholder: a
// founder who wants to get straight into the game gets a real school with
// a real name, and everyone else types over it.
const DEFAULT_NAME = 'Blackmoor';

export default function StartupScreen({ onStart }: { onStart: (name: string, schoolType: SchoolType) => void }) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [schoolType, setSchoolType] = useState<SchoolType>('private');

  return (
    <div className="startup">
      <div className="startup-card">
        <div className="eyebrow">Found a University</div>
        <h1>Name your school</h1>
        <div className="startup-name-row">
          <input
            className="startup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ashcombe"
            maxLength={60}
          />
          <span className="startup-name-suffix">{STARTING_INSTITUTION_SUFFIX}</span>
        </div>
        <p className="startup-name-note">
          Every school opens its doors as a College. Build your first laboratory and the trustees
          may offer you a university charter.
        </p>
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
