import { useEffect, useState } from 'react';
import { markAsked, openFeedback, promptDue, type FeedbackPrompt as Prompt } from '../feedback';
import type { GameState } from '../state/types';

// One of the feedback form's two prompts (Plan 97F): after the fifth
// summer's review, and on the Final Report. Each shows once per install,
// whatever the answer, and Settings turns both off. The run is saved before
// the form opens.
export default function FeedbackPrompt({ s, prompt, text, onSave }: { s: GameState; prompt: Prompt; text: string; onSave: () => void }) {
  const [shown, setShown] = useState(() => promptDue(prompt));
  useEffect(() => { if (shown) markAsked(prompt); }, []);
  if (!shown) return null;
  return (
    <p className="feedback-prompt" role="note">
      {text}{' '}
      <button type="button" className="menu-btn" onClick={() => { onSave(); openFeedback(s, prompt); setShown(false); }}>Give feedback</button>
      <button type="button" className="menu-btn btn-quiet" onClick={() => setShown(false)}>Later</button>
    </p>
  );
}
