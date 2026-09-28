import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}
function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function App() {
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem("gatherlive-session") || "null"),
  );
  const [role, setRole] = useState(
    () =>
      JSON.parse(localStorage.getItem("gatherlive-session") || "null")?.role ||
      "organizer",
  );
  const [activeNav, setActiveNav] = useState("overview");
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [, setAnalytics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "2026-10-18T18:30",
    venue: "",
    capacity: 80,
    description: "",
  });
  function authenticate(account) {
    const nextSession = {
      name: account.name,
      email: account.email,
      role: account.role,
    };
    localStorage.setItem("gatherlive-session", JSON.stringify(nextSession));
    setSession(nextSession);
    setRole(nextSession.role);
  }
  function signOut() {
    localStorage.removeItem("gatherlive-session");
    setSession(null);
  }
  function navigateTo(view) {
    setActiveNav(view);
    if (view !== "overview")
      setNotice(
        `${view === "events" ? "My events" : view === "invitees" ? "Invitees" : "Notifications"} view selected.`,
      );
  }
  const selected = events.find((event) => event.id === selectedId) || events[0];
  async function loadEvents() {
    try {
      const data = await api("/events");
      setEvents(data.events);
      setSelectedId((current) => current || data.events[0]?.id);
    } catch (err) {
      setError(err.message);
    }
  }
  async function loadDetails(eventId) {
    if (!eventId) return;
    try {
      const [stats, updates] = await Promise.all([
        api(`/events/${eventId}/analytics`),
        api(`/events/${eventId}/announcements`),
      ]);
      setAnalytics(stats);
      setAnnouncements(updates.announcements);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    loadEvents();
  }, []);
  useEffect(() => {
    loadDetails(selectedId);
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) return undefined;
    const stream = new EventSource(`${API}/events/${selectedId}/stream`);
    stream.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setEvents((current) =>
        current.map((item) =>
          item.id === update.event.id ? update.event : item,
        ),
      );
      setAnalytics(update.analytics);
    };
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [selectedId]);
  const totals = useMemo(
    () =>
      events.reduce(
        (sum, event) => ({
          going: sum.going + event.counts.going,
          maybe: sum.maybe + event.counts.maybe,
          responses:
            sum.responses +
            event.counts.going +
            event.counts.maybe +
            event.counts.notGoing,
        }),
        { going: 0, maybe: 0, responses: 0 },
      ),
    [events],
  );
  if (!session) return <AuthScreen onAuthenticate={authenticate} />;
  async function submitRsvp(status) {
    try {
      await api(`/events/${selected.id}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ attendeeId: "demo-attendee", status }),
      });
      setNotice(
        `Your RSVP is recorded as ${status.toLowerCase().replace("_", " ")}.`,
      );
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  async function createEvent(event) {
    event.preventDefault();
    try {
      const data = await api("/events", {
        method: "POST",
        body: JSON.stringify({
          ...newEvent,
          capacity: Number(newEvent.capacity),
          organizerId: "demo-organizer",
        }),
      });
      setEvents((current) => [data.event, ...current]);
      setSelectedId(data.event.id);
      setShowForm(false);
      setNotice("Event published successfully.");
      setNewEvent({
        title: "",
        date: "2026-10-18T18:30",
        venue: "",
        capacity: 80,
        description: "",
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function publishAnnouncement(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/events/${selected.id}/announcements`, {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          message: form.get("message"),
        }),
      });
      event.currentTarget.reset();
      await loadDetails(selected.id);
      setNotice("Announcement sent to confirmed invitees.");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◎</span>
          <span>
            Gather<span className="brand-accent">Live</span>
          </span>
        </div>
        <div className="topbar-actions">
          <span className="live-pill">
            <i /> Live sync active
          </span>
          <button className="avatar" title="Sign out" onClick={signOut}>
            {session.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="workspace-label">Workspace</div>
          <div className="profile">
            <div className="profile-avatar">AM</div>
            <div>
              <strong>{session.name}</strong>
              <span>
                {role === "organizer" ? "Event organizer" : "Invited attendee"}
              </span>
            </div>
            <span className="chevron">⌄</span>
          </div>
          <nav>
            <button
              className={`nav-item ${activeNav === "overview" ? "active" : ""}`}
              onClick={() => navigateTo("overview")}
            >
              <span>▦</span>Overview
            </button>
            <button
              className={`nav-item ${activeNav === "events" ? "active" : ""}`}
              onClick={() => navigateTo("events")}
            >
              <span>◫</span>My events <b>{events.length}</b>
            </button>
            <button
              className={`nav-item ${activeNav === "invitees" ? "active" : ""}`}
              onClick={() => navigateTo("invitees")}
            >
              <span>♧</span>Invitees
            </button>
            <button
              className={`nav-item ${activeNav === "notifications" ? "active" : ""}`}
              onClick={() => navigateTo("notifications")}
            >
              <span>◌</span>Notifications{" "}
              <b className="notification-count">3</b>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="role-switch">
              <span>View as</span>
              <div>
                <button
                  className={role === "organizer" ? "selected" : ""}
                  onClick={() => {
                    setRole("organizer");
                    setNotice("Organizer view selected.");
                  }}
                >
                  Organizer
                </button>
                <button
                  className={role === "attendee" ? "selected" : ""}
                  onClick={() => {
                    setRole("attendee");
                    setNotice("Attendee view selected.");
                  }}
                >
                  Attendee
                </button>
              </div>
            </div>
            <button
              className="help-link"
              onClick={() => setNotice("Help center is coming soon.")}
            >
              ? <span>Help center</span>
            </button>
          </div>
        </aside>
        <section className={`content ${activeNav !== "overview" ? "secondary-view" : ""}`}>
          <div className="content-heading">
            <div>
              <p className="eyebrow">
                {activeNav === "overview"
                  ? role === "organizer"
                    ? "Organizer overview"
                    : "Your event desk"
                  : activeNav === "events"
                    ? "Event library"
                    : activeNav === "invitees"
                      ? "People and invitations"
                      : "Your inbox"}
              </p>
              <h1>
                {activeNav === "overview"
                  ? role === "organizer"
                    ? `Good morning, ${session.name.split(" ")[0]}`
                    : "Find your next gathering"
                  : activeNav === "events"
                    ? "Your events, all in one place."
                    : activeNav === "invitees"
                      ? "Know who is coming."
                      : "Stay close to every update."}
              </h1>
              <p className="subtitle">
                {activeNav === "overview"
                  ? role === "organizer"
                    ? "Here is what is happening across your events today."
                    : "Review invitations and keep your plans in one place."
                  : activeNav === "events"
                    ? "Create, review, and manage every gathering you are hosting."
                    : activeNav === "invitees"
                      ? "Manage your guest list and follow up with the right people."
                      : "Announcements, reminders, and RSVP activity that need your attention."}
              </p>
            </div>
            <div className="heading-actions">
              <button className="secondary-btn">↗ Export report</button>
              <button className="primary-btn" onClick={() => setShowForm(true)}>
                ＋ Create event
              </button>
            </div>
          </div>
          {notice && (
            <div className="notice success">
              ✓ {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          {error && (
            <div className="notice error">
              ! {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {activeNav !== "overview" && (
            <WorkspaceView
              view={activeNav}
              events={events}
              onOpenEvent={(eventId) => {
                setSelectedId(eventId);
                setActiveNav("overview");
              }}
            />
          )}
          <div className="overview-content">
          <div className="stat-grid">
            <Stat
              label="Going"
              value={totals.going}
              detail="Across all events"
              accent="teal"
              icon="↗"
            />
            <Stat
              label="Maybe"
              value={totals.maybe}
              detail="Need a nudge"
              accent="amber"
              icon="◔"
            />
            <Stat
              label="Responses"
              value={totals.responses}
              detail="This month"
              accent="coral"
              icon="◎"
            />
            <Stat
              label="Response rate"
              value="76%"
              detail="+8.4% vs last month"
              accent="blue"
              icon="◌"
            />
          </div>
          <div className="section-row">
            <div>
              <h2>Upcoming events</h2>
              <p>Live attendance at a glance</p>
            </div>
            <button className="text-btn">View calendar →</button>
          </div>
          <div className="dashboard-grid">
            <div className="event-list">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  active={event.id === selected?.id}
                  onClick={() => setSelectedId(event.id)}
                />
              ))}
            </div>
            <aside className="detail-panel">
              {selected ? (
                <>
                  <div className="detail-head">
                    <div>
                      <span className="status-dot">{selected.status}</span>
                      <h2>{selected.title}</h2>
                      <p>
                        {formatDate(selected.date)} ·{" "}
                        {new Date(selected.date).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button className="icon-btn" title="More actions">
                      •••
                    </button>
                  </div>
                  <div className="venue-line">⌖ {selected.venue}</div>
                  <div className="capacity">
                    <div className="capacity-label">
                      <span>Capacity</span>
                      <strong>
                        {selected.counts.going}{" "}
                        <small>/ {selected.capacity} seats</small>
                      </strong>
                    </div>
                    <div className="progress">
                      <span
                        style={{
                          width: `${Math.min(100, (selected.counts.going / selected.capacity) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="live-counts">
                    <Count
                      label="Going"
                      value={selected.counts.going}
                      color="teal"
                    />
                    <Count
                      label="Maybe"
                      value={selected.counts.maybe}
                      color="amber"
                    />
                    <Count
                      label="Not going"
                      value={selected.counts.notGoing}
                      color="muted"
                    />
                  </div>
                  {role === "attendee" && (
                    <div className="rsvp-actions">
                      <p>Will you be joining?</p>
                      <div>
                        <button
                          onClick={() => submitRsvp("GOING")}
                          className="rsvp-going"
                        >
                          ✓ Going
                        </button>
                        <button
                          onClick={() => submitRsvp("MAYBE")}
                          className="rsvp-maybe"
                        >
                          Maybe
                        </button>
                        <button
                          onClick={() => submitRsvp("NOT_GOING")}
                          className="rsvp-no"
                        >
                          Not going
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="detail-description">{selected.description}</p>
                  <div className="detail-footer">
                    <span>
                      ↗ {selected.counts.going + selected.counts.maybe}{" "}
                      responses
                    </span>
                    <span>Updated just now</span>
                  </div>
                </>
              ) : (
                <p>Select an event to see its details.</p>
              )}
            </aside>
          </div>
          {role === "organizer" && selected && (
            <div className="lower-grid">
              <section className="insight-panel">
                <div className="section-row compact">
                  <div>
                    <h2>Response momentum</h2>
                    <p>Live performance for {selected.title}</p>
                  </div>
                  <span className="period-chip">Last 7 days⌄</span>
                </div>
                <div className="chart">
                  <div className="chart-grid">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <svg
                    viewBox="0 0 500 160"
                    preserveAspectRatio="none"
                    aria-label="Response trend chart"
                  >
                    <path
                      d="M0,140 C50,132 62,118 95,124 S145,84 178,100 S218,68 252,79 S298,42 330,62 S382,55 415,36 S466,22 500,8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      d="M0,140 C50,132 62,118 95,124 S145,84 178,100 S218,68 252,79 S298,42 330,62 S382,55 415,36 S466,22 500,8 V160 H0Z"
                      fill="currentColor"
                      opacity=".1"
                    />
                  </svg>
                  <div className="chart-labels">
                    <span>Oct 10</span>
                    <span>Oct 12</span>
                    <span>Oct 14</span>
                    <span>Oct 16</span>
                    <span>Today</span>
                  </div>
                </div>
              </section>
              <section className="insight-panel announcements">
                <div className="section-row compact">
                  <div>
                    <h2>Announcements</h2>
                    <p>Keep attendees in the loop</p>
                  </div>
                  <span className="announcement-count">
                    {announcements.length}
                  </span>
                </div>
                {announcements.length ? (
                  announcements.slice(0, 2).map((item) => (
                    <div className="announcement" key={item.id}>
                      <span className="announcement-icon">↗</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <small>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No announcements yet.</p>
                )}
                <form
                  className="announcement-form"
                  onSubmit={publishAnnouncement}
                >
                  <input
                    name="title"
                    placeholder="Announcement title"
                    required
                  />
                  <input
                    name="message"
                    placeholder="Share an update..."
                    required
                  />
                  <button className="text-btn" type="submit">
                    Send update →
                  </button>
                </form>
              </section>
            </div>
          )}
          </div>
        </section>
      </div>
      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setShowForm(false)
          }
        >
          <form className="modal" onSubmit={createEvent}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">New event</p>
                <h2>Bring people together</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>
            <label>
              Event title
              <input
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, title: e.target.value })
                }
                placeholder="e.g. Product design salon"
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                placeholder="What should attendees know?"
                required
              />
            </label>
            <div className="form-row">
              <label>
                Date and time
                <input
                  type="datetime-local"
                  value={newEvent.date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, date: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min="1"
                  value={newEvent.capacity}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, capacity: e.target.value })
                  }
                  required
                />
              </label>
            </div>
            <label>
              Venue
              <input
                value={newEvent.venue}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, venue: e.target.value })
                }
                placeholder="Venue or video link"
                required
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="primary-btn">Publish event</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
function WorkspaceView({ view, events, onOpenEvent }) {
  if (view === "events") {
    return (
      <section className="workspace-view event-library-view">
        <div className="workspace-view-toolbar">
          <div><span className="view-kicker">{events.length} active events</span><h2>Everything you are hosting</h2></div>
          <span className="view-filter">All events⌄</span>
        </div>
        <div className="library-grid">
          {events.map((event) => <button className="library-card" key={event.id} onClick={() => onOpenEvent(event.id)}><div className="library-date"><strong>{new Date(event.date).toLocaleDateString("en", { day: "2-digit" })}</strong><span>{new Date(event.date).toLocaleDateString("en", { month: "short" })}</span></div><div className="library-card-copy"><span>{event.type}</span><h3>{event.title}</h3><p>{event.venue}</p><div className="library-meta"><b>{event.counts.going} going</b><small>{event.capacity - event.counts.going} seats left</small></div></div><span className="library-arrow">→</span></button>)}
        </div>
      </section>
    )
  }
  if (view === "invitees") {
    const invitees = [{ name: "Jordan Kim", email: "jordan@example.com", event: events[0]?.title, status: "Going", initials: "JK" }, { name: "Sam Rivera", email: "sam@example.com", event: events[0]?.title, status: "Maybe", initials: "SR" }, { name: "Priya Shah", email: "priya@example.com", event: events[1]?.title, status: "Pending", initials: "PS" }, { name: "Mateo Cruz", email: "mateo@example.com", event: events[2]?.title, status: "Going", initials: "MC" }]
    return <section className="workspace-view table-view"><div className="workspace-view-toolbar"><div><span className="view-kicker">Guest directory</span><h2>People across your events</h2></div><button className="secondary-btn">＋ Add invitee</button></div><div className="invitee-table"><div className="table-head"><span>Person</span><span>Event</span><span>Status</span><span>Last activity</span></div>{invitees.map((invitee) => <div className="table-row" key={invitee.email}><div className="person-cell"><span className="person-avatar">{invitee.initials}</span><span><strong>{invitee.name}</strong><small>{invitee.email}</small></span></div><span className="event-cell">{invitee.event}</span><span className={`invitee-status ${invitee.status.toLowerCase()}`}>{invitee.status}</span><span className="activity-cell">Today · 10:42 AM</span></div>)}</div></section>
  }
  return <section className="workspace-view notification-view"><div className="workspace-view-toolbar"><div><span className="view-kicker">Activity center</span><h2>Updates that need you</h2></div><button className="text-btn">Mark all as read</button></div><div className="notification-list"><Notification icon="↗" title="New RSVP received" copy="Jordan Kim is going to Cloud Native Summit." time="8 min ago" /><Notification icon="!" title="Capacity is filling up" copy="Product Design Table has 13 seats remaining." time="42 min ago" /><Notification icon="✓" title="Announcement delivered" copy="Your venue reminder reached 102 attendees." time="Yesterday" /></div></section>
}
function Notification({ icon, title, copy, time }) { return <div className="notification-row"><span className="notification-icon">{icon}</span><div><strong>{title}</strong><p>{copy}</p></div><time>{time}</time></div> }
function AuthScreen({ onAuthenticate }) {
  const [mode, setMode] = useState("signin");
  const [role, setRole] = useState("organizer");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    if (mode === "signup" && name.length < 2)
      return setFormError("Please enter your full name.");
    if (!email.includes("@"))
      return setFormError("Enter a valid email address.");
    if (password.length < 6)
      return setFormError("Your password must be at least 6 characters.");
    onAuthenticate({
      name: name || email.split("@")[0],
      email,
      password,
      role,
    });
  }
  return (
    <main className="auth-shell">
      <div className="auth-visual">
        <div className="auth-brand">
          <span className="brand-mark">◎</span>
          <span>
            Gather<span className="brand-accent">Live</span>
          </span>
        </div>
        <div className="visual-copy">
          <p className="eyebrow light">The calm behind the crowd</p>
          <h1>Make every gathering feel effortless.</h1>
          <p>
            One elegant workspace for invitations, live RSVPs, and the moments
            that make an event matter.
          </p>
        </div>
        <div className="visual-proof">
          <div className="proof-avatars">
            <span>AM</span>
            <span>JK</span>
            <span>SR</span>
            <span>+</span>
          </div>
          <div>
            <strong>Trusted by thoughtful hosts</strong>
            <small>3,200+ events coordinated</small>
          </div>
        </div>
        <div className="visual-orbit orbit-one" />
        <div className="visual-orbit orbit-two" />
        <div className="visual-grid" />
      </div>
      <section className="auth-panel">
        <div className="auth-panel-top">
          <span>Already have an account?</span>
          <button
            className="auth-link"
            onClick={() => {
              setMode("signin");
              setFormError("");
            }}
          >
            Sign in
          </button>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="mobile-brand">
              <span className="brand-mark">◎</span> Gather
              <span className="brand-accent">Live</span>
            </span>
            <p className="eyebrow">
              {mode === "signin" ? "Welcome back" : "Start your workspace"}
            </p>
            <h2>
              {mode === "signin"
                ? "Let’s pick up where you left off."
                : "Your next great event starts here."}
            </h2>
            <p>
              {mode === "signin"
                ? "Sign in to see your live event desk."
                : "Create a free account for your events and community."}
            </p>
          </div>
          <div className="auth-tabs">
            <button
              className={mode === "signin" ? "active" : ""}
              onClick={() => {
                setMode("signin");
                setFormError("");
              }}
            >
              Sign in
            </button>
            <button
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setFormError("");
              }}
            >
              Create account
            </button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === "signup" && (
              <label>
                Full name
                <input
                  name="name"
                  placeholder="Alex Morgan"
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {mode === "signup" && (
              <div className="role-picker">
                <span>I’m joining as</span>
                <div>
                  <button
                    type="button"
                    className={role === "organizer" ? "chosen" : ""}
                    onClick={() => setRole("organizer")}
                  >
                    <strong>Organizer</strong>
                    <small>Create and manage events</small>
                  </button>
                  <button
                    type="button"
                    className={role === "attendee" ? "chosen" : ""}
                    onClick={() => setRole("attendee")}
                  >
                    <strong>Attendee</strong>
                    <small>Discover and RSVP</small>
                  </button>
                </div>
              </div>
            )}
            {formError && <p className="auth-error">{formError}</p>}
            <button className="auth-submit">
              {mode === "signin"
                ? "Continue to GatherLive"
                : "Create my workspace"}{" "}
              <span>→</span>
            </button>
          </form>
          <div className="auth-divider">
            <span>or continue with</span>
          </div>
          <button
            className="social-btn"
            onClick={() =>
              onAuthenticate({
                name: "Demo Guest",
                email: "demo@gatherlive.local",
                role,
              })
            }
          >
            <span className="google-g">G</span> Use a demo account
          </button>
          <p className="terms">
            By continuing, you agree to GatherLive’s <a href="#terms">Terms</a>{" "}
            and <a href="#privacy">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
function Stat({ label, value, detail, accent, icon }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
function Count({ label, value, color }) {
  return (
    <div className="count">
      <span className={`count-dot ${color}`} />
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
function EventCard({ event, active, onClick }) {
  return (
    <button
      className={`event-card ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="event-date">
        <strong>
          {new Date(event.date).toLocaleDateString("en", { day: "2-digit" })}
        </strong>
        <span>
          {new Date(event.date).toLocaleDateString("en", { month: "short" })}
        </span>
      </div>
      <div className="event-copy">
        <span className="event-type">{event.type}</span>
        <h3>{event.title}</h3>
        <p>{event.venue}</p>
        <div className="mini-progress">
          <span
            style={{
              width: `${Math.min(100, (event.counts.going / event.capacity) * 100)}%`,
            }}
          />
        </div>
      </div>
      <div className="event-total">
        <strong>{event.counts.going}</strong>
        <span>going</span>
      </div>
    </button>
  );
}
export default App;
