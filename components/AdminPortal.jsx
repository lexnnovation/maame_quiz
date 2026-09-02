'use client';

import { useEffect, useRef, useState } from 'react';

async function getJson(url) {
  const res = await fetch(url);
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }
  return { ok: res.ok, status: res.status, data };
}

async function sendJson(url, body, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }
  return { ok: res.ok, status: res.status, data };
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

function LogTab({ events }) {
  if (!events.length) {
    return (
      <div className="card">
        <div className="empty-state">
          No activity yet. Once officers start opening their codes, every event shows here in real time.
        </div>
      </div>
    );
  }
  const labels = { opened: 'OPENED', submitted: 'SUBMITTED', reopen: 'REOPENED', reuse_attempt: 'REUSE BLOCKED' };
  return (
    <div className="card">
      <h2>Audit trail</h2>
      <div className="log-feed">
        {events.map((e, i) => (
          <div className="log-row" key={i}>
            <span className="t">{fmtTime(e.t).split(' ').slice(-2).join(' ')}</span>
            <span className={'tag tag-' + e.tag}>{labels[e.tag]}</span>
            <span>
              {e.name} <span className="code-chip">{e.code}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfficersTab({ officers, lastAdded, adminMsg, addingOfficer, nameRef, copiedCode, onAdd, onCopy, onReset, onExport }) {
  return (
    <>
      <div className="card">
        <h2>
          Add officer <span className="tag">generates a single-use code</span>
        </h2>
        {adminMsg && <div className="msg msg-error">{adminMsg}</div>}
        <div className="row">
          <div className="field" style={{ flex: 2 }}>
            <input className="pt-input" ref={nameRef} placeholder="Officer full name" />
          </div>
          <div className="field">
            <button className="btn btn-primary btn-block" disabled={addingOfficer} onClick={onAdd}>
              {addingOfficer ? 'Generating...' : 'Generate code'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '-6px' }}>
          Send each code to that officer only, individually (e.g. by DM). Do not post the list in a group.
        </p>
        {lastAdded && (
          <div className="msg msg-ok" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>
              Code for <strong>{lastAdded.name}</strong>:{' '}
              <span className="code-chip" style={{ fontSize: '14px' }}>
                {lastAdded.code}
              </span>{' '}
              &mdash; send this to them privately, it works once.
            </span>
            <button className="btn btn-ghost btn-small" onClick={() => onCopy(lastAdded.code)}>
              {copiedCode === lastAdded.code ? 'Copied!' : 'Copy code'}
            </button>
          </div>
        )}
      </div>
      <div className="card">
        <h2>
          Officers{' '}
          <button className="btn btn-ghost btn-small" style={{ float: 'right' }} onClick={onExport}>
            Export CSV
          </button>
        </h2>
        {officers.length ? (
          <table className="pt-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Opened</th>
                <th>Submitted</th>
                <th>Score</th>
                <th>Flags</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => {
                const flags = [];
                if ((o.tabSwitches || 0) > 0) flags.push(o.tabSwitches + ' tab-switch' + (o.tabSwitches > 1 ? 'es' : ''));
                if ((o.reopens || []).length > 0) flags.push(o.reopens.length + ' reopen' + (o.reopens.length > 1 ? 's' : ''));
                if ((o.reuseAttempts || []).length > 0) flags.push(o.reuseAttempts.length + ' blocked reuse');
                return (
                  <tr key={o.code}>
                    <td>
                      <span className="code-chip">{o.code}</span>{' '}
                      <button className="btn btn-ghost btn-small" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => onCopy(o.code)}>
                        {copiedCode === o.code ? 'Copied!' : 'Copy'}
                      </button>
                    </td>
                    <td>{o.name}</td>
                    <td>
                      <span className={'status-pill status-' + o.status}>{o.status.replace('_', ' ')}</span>
                    </td>
                    <td>{fmtTime(o.openedAt)}</td>
                    <td>{fmtTime(o.submittedAt)}</td>
                    <td>{o.status === 'submitted' ? `${o.score}/${o.totalQuestions}` : '—'}</td>
                    <td>
                      {flags.length ? <span className="flag-badge">{flags.join(', ')}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-small" onClick={() => onReset(o.code)}>
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No officers added yet.</div>
        )}
      </div>
    </>
  );
}

function QuestionsTab({ questions, qTextRef, qOptRefs, qCorrectRef, onAdd, onDelete }) {
  return (
    <>
      <div className="card">
        <h2>Add question</h2>
        <div className="field">
          <textarea className="pt-textarea" ref={qTextRef} rows={2} placeholder="Question text" />
        </div>
        <div className="row">
          <div className="field">
            <input className="pt-input" ref={qOptRefs[0]} placeholder="Option A" />
          </div>
          <div className="field">
            <input className="pt-input" ref={qOptRefs[1]} placeholder="Option B" />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <input className="pt-input" ref={qOptRefs[2]} placeholder="Option C" />
          </div>
          <div className="field">
            <input className="pt-input" ref={qOptRefs[3]} placeholder="Option D" />
          </div>
        </div>
        <div className="field">
          <label className="pt-label">Correct option</label>
          <select className="pt-select" ref={qCorrectRef} defaultValue="0">
            <option value="0">A</option>
            <option value="1">B</option>
            <option value="2">C</option>
            <option value="3">D</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          Add question
        </button>
      </div>
      <div className="card">
        <h2>Question bank ({questions.length})</h2>
        {questions.length ? (
          questions.map((q, i) => (
            <div className="qlist-item" key={q.id}>
              <div className="qmeta">
                <div>
                  <strong>Q{i + 1}.</strong> {q.text}
                  <div className="opts-mini">
                    {q.options.map((o, oi) => (
                      <span key={oi}>
                        {oi > 0 && ' ·  '}
                        {oi === q.correctIndex ? <span className="correct-mark">✓ {o}</span> : o}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="btn btn-ghost btn-small" onClick={() => onDelete(q.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No questions yet.</div>
        )}
      </div>
    </>
  );
}

function SettingsTab({ settings, setTitleRef, setQuarterRef, setSecondsRef, setShowScoreRef, newPassRef, onSave, onChangePass }) {
  return (
    <>
      <div className="card">
        <div className="field">
          <label className="pt-label">Test title</label>
          <input className="pt-input" ref={setTitleRef} defaultValue={settings.title} />
        </div>
        <div className="row">
          <div className="field">
            <label className="pt-label">Quarter label</label>
            <input className="pt-input" ref={setQuarterRef} defaultValue={settings.quarter} />
          </div>
          <div className="field">
            <label className="pt-label">Seconds per question</label>
            <input className="pt-input" type="number" min={10} ref={setSecondsRef} defaultValue={settings.secondsPerQuestion} />
          </div>
        </div>
        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="setShowScore" ref={setShowScoreRef} defaultChecked={settings.showScoreToOfficer} />
          <label htmlFor="setShowScore" style={{ fontSize: '13px' }}>
            Show officers their score after submitting
          </label>
        </div>
        <button className="btn btn-primary" onClick={onSave}>
          Save settings
        </button>
      </div>
      <div className="card">
        <h2>Change admin passcode</h2>
        <div className="row">
          <div className="field">
            <input className="pt-input" type="password" ref={newPassRef} placeholder="New passcode" />
          </div>
          <div className="field">
            <button className="btn btn-ghost btn-block" onClick={onChangePass}>
              Update
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminPortal() {
  const [phase, setPhase] = useState('loading'); // loading | setup | login | dashboard
  const [passErr, setPassErr] = useState('');
  const [tab, setTab] = useState('log');

  const [officers, setOfficers] = useState([]);
  const [events, setEvents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState(null);

  const [lastAdded, setLastAdded] = useState(null);
  const [adminMsg, setAdminMsg] = useState('');
  const [addingOfficer, setAddingOfficer] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const passRef = useRef(null);
  const nameRef = useRef(null);
  const qTextRef = useRef(null);
  const qOptRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const qCorrectRef = useRef(null);
  const setTitleRef = useRef(null);
  const setQuarterRef = useRef(null);
  const setSecondsRef = useRef(null);
  const setShowScoreRef = useRef(null);
  const newPassRef = useRef(null);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkSession() {
    const { data } = await getJson('/api/admin/session');
    if (data.authenticated) {
      setPhase('dashboard');
      loadAll();
    } else if (data.needsSetup) {
      setPhase('setup');
    } else {
      setPhase('login');
    }
  }

  async function loadAll() {
    const [o, q, s] = await Promise.all([getJson('/api/admin/officers'), getJson('/api/admin/questions'), getJson('/api/admin/settings')]);
    if (o.ok) {
      setOfficers(o.data.officers);
      setEvents(o.data.events);
    }
    if (q.ok) setQuestions(q.data.questions);
    if (s.ok) setSettings(s.data.settings);
  }

  async function refreshOfficers() {
    const o = await getJson('/api/admin/officers');
    if (o.ok) {
      setOfficers(o.data.officers);
      setEvents(o.data.events);
    }
  }

  async function submitPasscode() {
    setPassErr('');
    const val = (passRef.current?.value || '').trim();
    if (!val) return;
    const { ok, data } = await sendJson('/api/admin/login', { passcode: val });
    if (!ok) {
      setPassErr(data.error || 'Incorrect passcode.');
      return;
    }
    setPhase('dashboard');
    loadAll();
  }

  async function logout() {
    await sendJson('/api/admin/logout', {});
    setPhase('login');
  }

  async function addOfficer() {
    const name = (nameRef.current?.value || '').trim();
    setAdminMsg('');
    if (!name) {
      setAdminMsg("Enter the officer's name first.");
      return;
    }
    setAddingOfficer(true);
    const { ok, data } = await sendJson('/api/admin/officers', { name });
    setAddingOfficer(false);
    if (!ok) {
      setAdminMsg(data.error || 'Could not save this officer — try again in a moment.');
      setLastAdded(null);
      return;
    }
    setLastAdded({ code: data.officer.code, name: data.officer.name });
    if (nameRef.current) nameRef.current.value = '';
    refreshOfficers();
  }

  async function copyCode(code) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 1200);
    } catch (e) {
      /* clipboard unavailable */
    }
  }

  async function resetOfficerCode(code) {
    await sendJson(`/api/admin/officers/${encodeURIComponent(code)}/reset`, {});
    refreshOfficers();
  }

  function exportCsv() {
    window.location.href = '/api/admin/officers/export';
  }

  async function addQuestion() {
    const text = (qTextRef.current?.value || '').trim();
    const opts = qOptRefs.map((r) => (r.current?.value || '').trim());
    if (!text || opts.some((o) => !o)) return;
    const correctIndex = parseInt(qCorrectRef.current?.value || '0', 10);
    const { ok } = await sendJson('/api/admin/questions', { text, options: opts, correctIndex });
    if (!ok) return;
    if (qTextRef.current) qTextRef.current.value = '';
    qOptRefs.forEach((r) => {
      if (r.current) r.current.value = '';
    });
    const q = await getJson('/api/admin/questions');
    if (q.ok) setQuestions(q.data.questions);
  }

  async function deleteQuestionById(id) {
    await sendJson(`/api/admin/questions/${id}`, {}, 'DELETE');
    const q = await getJson('/api/admin/questions');
    if (q.ok) setQuestions(q.data.questions);
  }

  async function saveSettings() {
    const body = {
      title: setTitleRef.current?.value.trim(),
      quarter: setQuarterRef.current?.value.trim(),
      secondsPerQuestion: parseInt(setSecondsRef.current?.value, 10),
      showScoreToOfficer: !!setShowScoreRef.current?.checked,
    };
    const { ok, data } = await sendJson('/api/admin/settings', body, 'PUT');
    if (ok) setSettings(data.settings);
  }

  async function changePasscode() {
    const v = (newPassRef.current?.value || '').trim();
    if (!v) return;
    const { ok } = await sendJson('/api/admin/passcode', { newPasscode: v });
    if (ok && newPassRef.current) newPassRef.current.value = '';
  }

  if (phase === 'loading') return null;

  if (phase === 'setup' || phase === 'login') {
    return (
      <div className="wrap narrow">
        <div className="code-entry">
          <div className="eyebrow">Admin</div>
          <h1 className="pt-title" style={{ fontSize: '20px' }}>
            {phase === 'setup' ? 'Set an admin passcode' : 'Enter admin passcode'}
          </h1>
          {passErr && <div className="msg msg-error">{passErr}</div>}
          <input
            className="pt-input"
            type="password"
            ref={passRef}
            placeholder="Passcode"
            style={{ maxWidth: '260px', margin: '0 auto' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitPasscode();
            }}
          />
          <div style={{ height: '14px' }} />
          <button className="btn btn-primary" onClick={submitPasscode}>
            {phase === 'setup' ? 'Save passcode' : 'Enter'}
          </button>
          <div>
            <a className="pt-footer-link" href="/">
              &larr; Officer view
            </a>
          </div>
        </div>
      </div>
    );
  }

  const tabs = ['log', 'officers', 'questions', 'settings'];
  const tabLabels = { log: 'Live log', officers: 'Officers & codes', questions: 'Questions', settings: 'Settings' };

  return (
    <div className="wrap">
      <div className="eyebrow">Admin</div>
      <h1 className="pt-title">{settings?.title || 'Test Portal'}</h1>
      <p className="pt-sub">
        {settings?.quarter} &middot; {questions.length} questions &middot; {officers.length} officers registered
      </p>
      <div className="tabbar">
        {tabs.map((t) => (
          <button key={t} className={'tabbtn' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === 'log' && <LogTab events={events} />}
      {tab === 'officers' && (
        <OfficersTab
          officers={officers}
          lastAdded={lastAdded}
          adminMsg={adminMsg}
          addingOfficer={addingOfficer}
          nameRef={nameRef}
          copiedCode={copiedCode}
          onAdd={addOfficer}
          onCopy={copyCode}
          onReset={resetOfficerCode}
          onExport={exportCsv}
        />
      )}
      {tab === 'questions' && (
        <QuestionsTab
          questions={questions}
          qTextRef={qTextRef}
          qOptRefs={qOptRefs}
          qCorrectRef={qCorrectRef}
          onAdd={addQuestion}
          onDelete={deleteQuestionById}
        />
      )}
      {tab === 'settings' && settings && (
        <SettingsTab
          settings={settings}
          setTitleRef={setTitleRef}
          setQuarterRef={setQuarterRef}
          setSecondsRef={setSecondsRef}
          setShowScoreRef={setShowScoreRef}
          newPassRef={newPassRef}
          onSave={saveSettings}
          onChangePass={changePasscode}
        />
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <a className="pt-footer-link" href="/">
          &larr; Officer view
        </a>
        <button className="pt-footer-link" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}
