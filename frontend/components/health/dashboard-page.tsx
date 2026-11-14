"use client";

import { ArrowLeft, Check, ChevronRight, CircleHelp, Clock3, Menu, Moon, Radio, ShieldAlert, Sun } from "lucide-react";
import { metrics, bodyAreas, type BodyArea, type CrewMember, type PageName } from "./health-data";
import { BodyMap, LineChart } from "./visualizations";

function DashboardPage({
  astronaut,
  page,
  dark,
  time,
  checking,
  selected,
  mood,
  onThemeToggle,
  onSendEmergency,
  onBack,
  onOpenForm,
  onBeginSensorCheck,
  onSelectArea,
  onSetPage,
}: {
  astronaut: CrewMember | null;
  page: PageName;
  dark: boolean;
  time: Date;
  checking: boolean;
  selected: string;
  mood: string;
  onThemeToggle: () => void;
  onSendEmergency: () => void;
  onBack: () => void;
  onOpenForm: () => void;
  onBeginSensorCheck: () => void;
  onSelectArea: (area: BodyArea) => void;
  onSetPage: (page: "daily" | "reports") => void;
}) {
  const selectedMetric =
    selected === "Heart"
      ? metrics[0]
      : selected === "Skin"
        ? metrics[1]
        : selected === "Legs"
          ? metrics[2]
          : selected === "Head"
            ? metrics[4]
            : selected === "Arm"
              ? metrics[6]
              : metrics[7];

  return (
    <>
      <nav className="nav-bar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft /> Home
        </button>
        <span className="nav-time">
          EARTH UTC{" "}
          <b>
            {time.toLocaleTimeString("en-GB", {
              timeZone: "UTC",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </b>
        </span>
        <div className="nav-tabs">
          <button
            className={page === "daily" ? "active" : ""}
            onClick={() => onSetPage("daily")}
          >
            Daily check &amp; trends
          </button>
          <button
            className={page === "reports" ? "active" : ""}
            onClick={() => onSetPage("reports")}
          >
            Reports
          </button>
        </div>
        <div className="nav-actions">
          <button
            className="icon-button"
            onClick={onThemeToggle}
            aria-label="Toggle theme"
          >
            {dark ? <Sun /> : <Moon />}
          </button>
          <button className="nav-emergency" onClick={onSendEmergency}>
            <ShieldAlert /> Emergency
          </button>
        </div>
      </nav>

      <section className="dashboard">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">
              MISSION DAY 184{" "}
              <span className="status-chip">
                <span className="live-dot" /> SYNCED LOCALLY
              </span>
            </div>
            <h1>Welcome, {astronaut?.name.split(" ")[0] || "Alex"}</h1>
            <p className="subtle">Your daily check-in, at a glance.</p>
          </div>

          <div className="welcome-actions">
            <button className="secondary-button" onClick={onBeginSensorCheck}>
              <Radio /> {checking ? "Checking sensors…" : "Check all sensors"}
            </button>
            <button className="primary-button" onClick={onOpenForm}>
              Fill today&apos;s form <ChevronRight />
            </button>
          </div>
        </div>

        <div className="task-row">
          {["Sensor check", "Mood", "Sleep", "Symptoms"].map((task, index) => (
            <span className="task-chip" key={task}>
              <span className={index < 2 ? "task-check" : ""}>
                {index < 2 ? (
                  <Check size={13} />
                ) : (
                  <span className="task-dot" />
                )}
              </span>
              {task}
            </span>
          ))}
        </div>

        <div className="overview-grid">
          <article className="body-card">
            <div className="body-heading">
              <div>
                <div className="eyebrow">BODY MAP</div>
                <h2>{selected}</h2>
                <p>
                  {selected === "Heart"
                    ? "Your heartbeat, measured throughout the day."
                    : "Explore your body readings in one place."}
                </p>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  document
                    .getElementById("sensor-cards")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                View details <ChevronRight />
              </button>
            </div>

            <div className="body-map">
              <BodyMap selected={selected} onSelect={onSelectArea} />
              <div className="body-legend">
                <span>
                  <i /> Measured
                </span>
                <span>
                  <i className="empty-dot" /> Not measured yet
                </span>
              </div>
            </div>

            <div className="area-list" aria-label="Choose body area">
              {bodyAreas.map((area) => (
                <button
                  key={area}
                  className={selected === area ? "selected" : ""}
                  onClick={() => onSelectArea(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </article>

          <article className="detail-card">
            <div className="detail-top">
              <div>
                <div className="eyebrow">
                  CURRENT READING{" "}
                  <span className="source-label">
                    <span className="live-dot" /> {selectedMetric.source}
                  </span>
                </div>
                <h2>{selectedMetric.name}</h2>
              </div>
              <button
                className="icon-button small"
                aria-label="Reading information"
              >
                <CircleHelp />
              </button>
            </div>

            <div className="reading">
              <strong>{selectedMetric.value}</strong>
              <span>{selectedMetric.unit}</span>
            </div>

            <div className="reading-status">
              <span className="usable-icon">
                <Check />
              </span>
              <b>Usable</b>
              <span>Updated just now</span>
            </div>

            <div className="gauge-wrap">
              <div
                className="gauge"
                role="img"
                aria-label={`${selectedMetric.value} ${selectedMetric.unit}, compared with this person's recent readings`}
              >
                <div className="gauge-inner">
                  <strong>{selectedMetric.value}</strong>
                  <span>{selectedMetric.unit}</span>
                  <small>JUST NOW</small>
                </div>
              </div>
            </div>

            <div className="range-labels">
              <div>
                <small>NOW</small>
                <b>{selectedMetric.value}</b>
              </div>
              <div>
                <small>LOWEST TODAY</small>
                <b>
                  62 <em>bpm</em>
                </b>
              </div>
              <div>
                <small>HIGHEST TODAY</small>
                <b>
                  81 <em>bpm</em>
                </b>
              </div>
            </div>

            <p className="plain-explanation">
              Heart rate is the number of times your heart beats in a minute. It
              helps the crew follow how your body responds to activity and rest.
            </p>

            <div className="detail-links">
              <button className="text-button">
                View source <ChevronRight />
              </button>
              <span>Linked hazard: Gravity fields</span>
            </div>

            {checking && (
              <div className="sensor-check">
                <span className="live-dot" /> Testing sensors · about 10 seconds
              </div>
            )}

            <button
              className="trust-link"
              onClick={() =>
                alert(
                  "Readings are compared with this person’s own recent history. Sensor fit, movement and signal quality can affect a reading. If it does not feel right, tell the crew.",
                )
              }
            >
              Why can&apos;t I trust this reading?
            </button>
          </article>
        </div>

        <section className="trends-section">
          <div className="section-head">
            <div>
              <div className="eyebrow">YOUR LAST 24 HOURS</div>
              <h2>Today</h2>
            </div>
            <button className="date-pill">
              <Clock3 /> Last 24 hours
            </button>
          </div>

          <article className="chart-card">
            <div className="chart-title">
              <div>
                <span className="metric-dot coral-dot" />
                <b>Heart rate</b>
                <span className="chart-source">Live sensor · bpm</span>
              </div>
              <button
                className="icon-button small"
                aria-label="More chart options"
              >
                <Menu />
              </button>
            </div>

            <div className="chart-plot">
              <LineChart color="var(--coral)" tall />
              <div className="x-axis">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>NOW</span>
              </div>
            </div>

            <div className="chart-stats">
              <div>
                <small>NOW</small>
                <b>
                  68 <em>bpm</em>
                </b>
              </div>
              <div>
                <small>LOWEST TODAY</small>
                <b>
                  58 <em>bpm</em>
                </b>
              </div>
              <div>
                <small>HIGHEST TODAY</small>
                <b>
                  92 <em>bpm</em>
                </b>
              </div>
            </div>

            <p className="chart-alt">
              Text summary: heart rate readings across today, ranging from 58 to
              92 bpm. Current reading is 68 bpm.
            </p>
          </article>

          <div className="mini-chart-grid">
            {[
              { n: "Skin temperature", val: "36.4 °C", c: "var(--amber)" },
              { n: "Motion", val: "Active now", c: "var(--blue)" },
              {
                n: "Sleep · last 14 days",
                val: "7h 20m",
                c: "var(--lavender)",
              },
              {
                n: "Mood · last 14 days",
                val: mood || "Calm",
                c: "var(--accent)",
              },
            ].map((item) => (
              <article className="mini-chart" key={item.n}>
                <div>
                  <small>{item.n}</small>
                  <b>{item.val}</b>
                </div>
                <LineChart color={item.c} />
                <span className="mini-foot">Gaps mean no reading</span>
              </article>
            ))}
          </div>
        </section>

        <section className="sensors-section" id="sensor-cards">
          <div className="section-head">
            <div>
              <div className="eyebrow">A CLOSER LOOK</div>
              <h2>Your readings</h2>
            </div>
            <span className="subtle">Each number shows its source</span>
          </div>

          <div className="sensor-grid">
            {metrics.map((metric) => (
              <article key={metric.name} className="sensor-card">
                <div className="sensor-head">
                  <span className={`sensor-icon ${metric.color}`}>
                    <metric.icon />
                  </span>
                  <span className="source-dot">
                    <i className="live-dot" />
                    {metric.source}
                  </span>
                </div>
                <h3>{metric.name}</h3>
                <div className="sensor-value">
                  {metric.value}
                  <small>{metric.unit}</small>
                </div>
                <LineChart
                  color={
                    metric.color === "coral"
                      ? "var(--coral)"
                      : metric.color === "amber"
                        ? "var(--amber)"
                        : metric.color === "blue"
                          ? "var(--blue)"
                          : "var(--accent)"
                  }
                />
                <p>{metric.note}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}

export { DashboardPage };
