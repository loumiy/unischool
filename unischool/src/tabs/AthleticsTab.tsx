// Placeholder tab. Varsity teams, coaches, and the shared athletics venues
// are shallow-v1 real now, but they live on the Student Life tab (see
// StudentLifeTab.tsx's "Varsity Athletics" panel) as a growth OUT OF the
// clubs system — the same s.orgs machinery, no parallel subsystem. What
// belongs here instead, still ahead: match simulation, schedules and
// standings, and a second ranking axis (see README's roadmap) — all
// deliberately deferred out of this pass.
export default function AthleticsTab() {
  return (
    <div className="tab-content">
      <section className="panel">
        <h2>Athletics</h2>
        <p className="empty-note">
          Varsity teams and venues now live on the Student Life tab. Match play, schedules,
          standings, and a dedicated ranking axis are still coming.
        </p>
      </section>
    </div>
  );
}
