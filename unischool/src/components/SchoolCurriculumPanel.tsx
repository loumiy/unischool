import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { completion, sectionForBuilding } from '../tabs/curriculumData';
import { CellGrid, CellLegend } from './courseCells';
import { ProgressRing } from './Progress';

// ONE SCHOOL'S COURSE LIST, opened from that school's building on the
// campus map (see CampusMap.tsx's info panel, which is what raises it).
//
// This is the card list the Curriculum tab used to be, kept rather than
// thrown away and moved to where it now belongs. The tab itself became the
// constellation — the shape of the whole catalogue, which is what a tab
// covering all of it should show — and the shape of the whole catalogue is
// exactly the wrong place to read one school's forty-odd course titles,
// costs and prereqs off a wall of text. So the reading view follows the
// question: you ask about the School of Business by clicking the School of
// Business, and get its own courses, grouped the way they have always been
// grouped (shared tier-1s and tier-2s, then a sub-group per established
// major, then any graduate program). Nothing about that grouping changed
// in the move — it is the same DiscoverySection, from the same
// curriculumData.ts, with the same reveal rules behind it.
const SECTION_RING_SIZE = 30;

export default function SchoolCurriculumPanel({ s, act, buildingId }: {
  s: GameState;
  act: (a: Action) => void;
  buildingId: string;
}) {
  const section = sectionForBuilding(s, buildingId);
  if (!section) return <p className="stall-note">This building has no curriculum of its own.</p>;

  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const comp = completion(s, section.schoolCourseIds);
  const building = s.tech.find((t) => t.id === buildingId);
  const underConstruction = building?.status === 'developing';
  const nothingOpen = section.courseIds.length === 0 && section.subgroups.length === 0;

  return (
    <div className="tab-content">
      <section className="panel curriculum-panel">
        <div className="panel-head">
          <span className="panel-head-title"><h2>{section.heading}</h2></span>
          <span className="panel-head-figure">
            <span className="progress-figure">
              <ProgressRing
                fraction={comp.fraction}
                size={SECTION_RING_SIZE}
                title={`${comp.done} of ${comp.total} courses developed`}
              />
              <span className="stat">{comp.done} / {comp.total}<br />developed</span>
            </span>
          </span>
        </div>
        <CellLegend />
        {underConstruction && (
          <p className="stall-note">
            The hall is still going up. Its tier-2 curriculum opens the week it is finished.
          </p>
        )}
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — the school is running an operating deficit, so nothing can be started until the balance recovers.</p>
        )}

        <div className="curriculum-scroll">
          {nothingOpen && !underConstruction && (
            <p className="discovery-pool-caption">No coursework has opened here yet.</p>
          )}
          {section.courseIds.length > 0 && <CellGrid s={s} act={act} ids={section.courseIds} lookup={lookup} />}
          {section.subgroups.map((sub) => (
            <div key={sub.key} className={`discovery-subgroup${sub.graduate ? ' graduate' : ''}`}>
              <h4>
                {sub.label}
                {sub.graduate && <span className="subgroup-degree">{sub.graduate.degree}</span>}
              </h4>
              {sub.graduate && <p className="subgroup-note">Graduate · opened by {sub.graduate.gate}</p>}
              <CellGrid s={s} act={act} ids={sub.courseIds} lookup={lookup} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
