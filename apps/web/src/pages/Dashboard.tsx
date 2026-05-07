const todayTasks = ["Review SQS basics", "Summarize Lambda notes", "Practice API Gateway quiz"];
const activeCourses = ["Cloud Computing", "Distributed Systems"];
const deadlines = ["Cloud Computing exam: 2026-06-10", "Project demo: 2026-06-14"];
const summaries = ["Queues decouple producers from processors.", "Serverless scales per event load."];
const notifications = ["Reminder email scheduled for today", "Material processing ready"];

export function Dashboard() {
  return (
    <div className="page-grid">
      <Panel title="Today's tasks" items={todayTasks} />
      <Panel title="Active courses" items={activeCourses} />
      <Panel title="Upcoming deadlines" items={deadlines} />
      <Panel title="Recent summaries" items={summaries} />
      <Panel title="Notifications" items={notifications} />
    </div>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
