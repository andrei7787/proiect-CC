import { useState } from "react";

const tasks = [
  { title: "Review queues", status: "todo" },
  { title: "Study Lambda retries", status: "done" },
  { title: "Practice DynamoDB access patterns", status: "todo" }
];

export function CourseDetail() {
  const [fileName, setFileName] = useState("");

  return (
    <div className="course-layout">
      <section className="panel wide">
        <h2>Cloud Computing</h2>
        <dl>
          <div><dt>Exam date</dt><dd>2026-06-10</dd></div>
          <div><dt>Difficulty</dt><dd>Hard</dd></div>
          <div><dt>Weekly hours</dt><dd>8</dd></div>
        </dl>
      </section>

      <section className="panel">
        <h2>Material upload</h2>
        <input
          aria-label="Material file"
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
        <p>{fileName ? `${fileName} ready to upload` : "PDF, TXT, or MD"}</p>
        <p>Status: ready</p>
      </section>

      <section className="panel">
        <h2>AI summary</h2>
        <p>Distributed cloud services coordinate through APIs, queues, and managed storage.</p>
        <h3>Key concepts</h3>
        <ul>
          <li>API Gateway</li>
          <li>Lambda</li>
          <li>SQS</li>
          <li>DynamoDB</li>
        </ul>
        <button type="button">Generate Study Plan</button>
      </section>

      <section className="panel wide">
        <h2>Study tasks</h2>
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.title}>
              <span>{task.title}</span>
              <select aria-label={`${task.title} status`} defaultValue={task.status}>
                <option value="todo">todo</option>
                <option value="done">done</option>
                <option value="skipped">skipped</option>
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
