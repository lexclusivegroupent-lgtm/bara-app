export const adminDashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bära Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f6;color:#1a1a2e;font-size:14px}
a{color:#1B2A4A;text-decoration:none}a:hover{text-decoration:underline}

/* Login */
#login-screen{position:fixed;inset:0;background:#1B2A4A;display:flex;align-items:center;justify-content:center;z-index:100}
.login-box{background:#fff;border-radius:12px;padding:40px;width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
.login-box h1{font-size:22px;font-weight:700;color:#1B2A4A;margin-bottom:6px}
.login-box p{color:#6c757d;margin-bottom:24px;font-size:13px}
.login-box input{width:100%;padding:10px 14px;border:1.5px solid #dde1ec;border-radius:8px;font-size:14px;outline:none;transition:border-color .15s}
.login-box input:focus{border-color:#1B2A4A}
.login-box button{width:100%;margin-top:12px;padding:11px;background:#1B2A4A;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s}
.login-box button:hover{background:#243252}
.login-error{color:#dc3545;font-size:12px;margin-top:8px;text-align:center}
.brand-logo{font-size:28px;font-weight:800;color:#1B2A4A;margin-bottom:2px}
.brand-logo span{color:#C9A84C}

/* Layout */
#app{display:none;min-height:100vh;flex-direction:column}
header{background:#1B2A4A;color:#fff;display:flex;align-items:center;gap:0;padding:0 20px;height:54px;position:sticky;top:0;z-index:50;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
.header-brand{font-size:16px;font-weight:800;color:#C9A84C;margin-right:28px;white-space:nowrap}
nav{display:flex;gap:2px;flex:1;overflow-x:auto}
.tab-btn{background:none;border:none;color:rgba(255,255,255,0.6);padding:16px 14px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:3px solid transparent;transition:all .15s;line-height:1}
.tab-btn:hover{color:#fff;background:rgba(255,255,255,0.06)}
.tab-btn.active{color:#C9A84C;border-bottom-color:#C9A84C}
.header-actions{display:flex;align-items:center;gap:12px;margin-left:16px}
.btn-sm{padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .15s}
.btn-logout{background:rgba(255,255,255,0.1);color:#fff}.btn-logout:hover{background:rgba(255,255,255,0.18)}
main{flex:1;padding:20px}

/* Content */
.tab-content{display:none}
.tab-content.active{display:block}
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.page-title{font-size:18px;font-weight:700;color:#1B2A4A}

/* Stats grid */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);text-align:center;border-top:3px solid transparent}
.stat-card.blue{border-top-color:#1B2A4A}
.stat-card.gold{border-top-color:#C9A84C}
.stat-card.green{border-top-color:#28a745}
.stat-card.red{border-top-color:#dc3545}
.stat-card.orange{border-top-color:#fd7e14}
.stat-icon{font-size:22px;margin-bottom:6px}
.stat-value{font-size:26px;font-weight:800;color:#1B2A4A;line-height:1}
.stat-label{font-size:11px;color:#6c757d;margin-top:4px;font-weight:500;text-transform:uppercase;letter-spacing:.4px}

/* Cards */
.card{background:#fff;border-radius:10px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:16px}
.card-row{display:flex;gap:14px;flex-wrap:wrap}
.card-row .card{flex:1;min-width:240px}
.card h3{font-size:13px;font-weight:700;color:#1B2A4A;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
.rate-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f2f6;font-size:13px}
.rate-row:last-child{border-bottom:none}

/* Filter bar */
.filter-bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:flex-end}
.filter-bar select,.filter-bar input{padding:7px 10px;border:1.5px solid #dde1ec;border-radius:7px;font-size:13px;background:#fff;outline:none}
.filter-bar select:focus,.filter-bar input:focus{border-color:#1B2A4A}
.btn-primary{background:#1B2A4A;color:#fff;padding:7px 16px;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer}
.btn-primary:hover{background:#243252}
.btn-gold{background:#C9A84C;color:#fff;padding:7px 16px;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer}
.btn-gold:hover{background:#b8963e}
.btn-danger{background:#dc3545;color:#fff;padding:6px 12px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
.btn-danger:hover{background:#c82333}
.btn-success{background:#28a745;color:#fff;padding:6px 12px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
.btn-success:hover{background:#218838}
.btn-ghost{background:none;color:#1B2A4A;padding:5px 10px;border:1.5px solid #dde1ec;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
.btn-ghost:hover{background:#f0f2f6}

/* Table */
.table-wrap{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:auto}
.data-table{width:100%;border-collapse:collapse;font-size:13px}
.data-table th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid #eef0f6;background:#fafbfd;white-space:nowrap}
.data-table td{padding:10px 14px;border-bottom:1px solid #f4f5f9;vertical-align:middle}
.data-table tr:last-child td{border-bottom:none}
.data-table tbody tr:hover{background:#fafbfd}
.data-table .link{color:#1B2A4A;cursor:pointer;font-weight:600}
.data-table .link:hover{color:#C9A84C;text-decoration:underline}

/* Badges */
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.badge-pending{background:#fff3cd;color:#856404}
.badge-accepted{background:#cfe2ff;color:#084298}
.badge-arrived{background:#e8d5ff;color:#5a1aac}
.badge-in_progress{background:#ffe0d0;color:#8b3a00}
.badge-completed{background:#d1e7dd;color:#0a5228}
.badge-cancelled,.badge-cancelled_by_customer,.badge-cancelled_by_driver{background:#f8d7da;color:#721c24}
.badge-disputed{background:#ffe5d0;color:#8b4000}
.badge-unverified{background:#f0f2f6;color:#6c757d}
.badge-pending-v{background:#fff3cd;color:#856404}
.badge-verified{background:#d1e7dd;color:#0a5228}
.badge-rejected{background:#f8d7da;color:#721c24}
.badge-available{background:#d1e7dd;color:#0a5228}
.badge-unavailable{background:#f0f2f6;color:#6c757d}

/* Modal */
#modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:none;align-items:flex-start;justify-content:center;z-index:200;padding:40px 16px;overflow-y:auto}
#modal-overlay.open{display:flex}
#modal-box{background:#fff;border-radius:12px;width:100%;max-width:680px;box-shadow:0 12px 40px rgba(0,0,0,0.25);overflow:hidden}
.modal-header{background:#1B2A4A;color:#fff;padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
.modal-header h2{font-size:15px;font-weight:700}
.modal-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;opacity:.7}
.modal-close:hover{opacity:1}
.modal-body{padding:20px;max-height:calc(100vh - 160px);overflow-y:auto}
.detail-section{margin-bottom:18px}
.detail-section h4{font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.detail-item{background:#f8f9fa;border-radius:7px;padding:10px 12px}
.detail-item label{display:block;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
.detail-item span{font-size:13px;font-weight:500;color:#1a1a2e;word-break:break-word}
.detail-item.full{grid-column:1/-1}
.photos-row{display:flex;flex-wrap:wrap;gap:8px}
.photo-thumb{width:90px;height:70px;object-fit:cover;border-radius:7px;border:1.5px solid #eef0f6;cursor:pointer}
.timeline-row{display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f0f2f6}
.timeline-dot{width:8px;height:8px;border-radius:50%;background:#C9A84C;margin-top:5px;flex-shrink:0}
.timeline-row .tl-time{font-size:11px;color:#6c757d;min-width:130px}
.timeline-row .tl-label{font-size:13px;font-weight:500}

/* Resolve form */
.resolve-form{margin-top:16px;padding-top:16px;border-top:1.5px solid #eef0f6}
.resolve-form textarea{width:100%;padding:10px;border:1.5px solid #dde1ec;border-radius:8px;font-size:13px;resize:vertical;min-height:80px;outline:none}
.resolve-form textarea:focus{border-color:#1B2A4A}
.resolve-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.refund-note{font-size:11px;color:#6c757d;margin-top:8px;font-style:italic}

/* Toast */
#toast{position:fixed;bottom:24px;right:24px;background:#1B2A4A;color:#fff;padding:12px 20px;border-radius:9px;font-size:13px;font-weight:500;z-index:300;box-shadow:0 4px 16px rgba(0,0,0,0.2);transform:translateY(80px);opacity:0;transition:all .25s}
#toast.show{transform:translateY(0);opacity:1}
#toast.success{background:#28a745}
#toast.error{background:#dc3545}

/* Empty/Loading */
.empty-state{text-align:center;padding:48px 20px;color:#999}
.empty-state svg{margin-bottom:12px;opacity:.3}
.loading-text{text-align:center;padding:32px;color:#999;font-size:13px}

@media(max-width:600px){
  .stats-grid{grid-template-columns:1fr 1fr}
  .detail-grid{grid-template-columns:1fr}
  header{padding:0 12px}
  main{padding:12px}
  .tab-btn{padding:14px 10px;font-size:12px}
}
</style>
</head>
<body>

<div id="login-screen">
  <div class="login-box">
    <div class="brand-logo">Bä<span>ra</span></div>
    <h1>Admin Dashboard</h1>
    <p>Enter your admin key to continue</p>
    <input type="password" id="login-key" placeholder="Admin key" onkeydown="if(event.key==='Enter')doLogin()">
    <button onclick="doLogin()">Sign in</button>
    <div class="login-error" id="login-error"></div>
  </div>
</div>

<div id="app" style="display:none;flex-direction:column">
  <header>
    <div class="header-brand">Bära Admin</div>
    <nav>
      <button class="tab-btn active" data-tab="overview" onclick="showTab('overview')">Overview</button>
      <button class="tab-btn" data-tab="jobs" onclick="showTab('jobs')">Jobs</button>
      <button class="tab-btn" data-tab="users" onclick="showTab('users')">Users</button>
      <button class="tab-btn" data-tab="drivers" onclick="showTab('drivers')">Drivers</button>
      <button class="tab-btn" data-tab="disputes" onclick="showTab('disputes')">Disputes <span id="dispute-badge"></span></button>
    </nav>
    <div class="header-actions">
      <button class="btn-sm btn-logout" onclick="logout()">Sign out</button>
    </div>
  </header>
  <main>

    <!-- OVERVIEW -->
    <div class="tab-content active" id="tab-overview">
      <div class="page-header">
        <div class="page-title">Overview</div>
        <button class="btn-ghost" onclick="reloadTab('overview')">↻ Refresh</button>
      </div>
      <div id="overview-content"><div class="loading-text">Loading...</div></div>
    </div>

    <!-- JOBS -->
    <div class="tab-content" id="tab-jobs">
      <div class="page-header">
        <div class="page-title">All Jobs</div>
        <button class="btn-ghost" onclick="reloadTab('jobs')">↻ Refresh</button>
      </div>
      <div class="filter-bar">
        <select id="jobs-filter-status" onchange="applyJobFilters()">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="arrived">Arrived</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="disputed">Disputed</option>
        </select>
        <input id="jobs-filter-city" placeholder="Filter by city…" oninput="applyJobFilters()" style="width:160px">
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>Type</th><th>City</th><th>Customer</th><th>Driver</th><th>Price</th><th>Status</th><th>Created</th></tr></thead>
          <tbody id="jobs-tbody"><tr><td colspan="8" class="loading-text">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- USERS -->
    <div class="tab-content" id="tab-users">
      <div class="page-header">
        <div class="page-title">Users</div>
        <button class="btn-ghost" onclick="reloadTab('users')">↻ Refresh</button>
      </div>
      <div class="filter-bar">
        <select id="users-filter-role" onchange="applyUserFilters()">
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="driver">Driver</option>
          <option value="both">Both</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Rating</th><th>Jobs</th><th>Joined</th></tr></thead>
          <tbody id="users-tbody"><tr><td colspan="8" class="loading-text">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- DRIVERS -->
    <div class="tab-content" id="tab-drivers">
      <div class="page-header">
        <div class="page-title">Drivers</div>
        <button class="btn-ghost" onclick="reloadTab('drivers')">↻ Refresh</button>
      </div>
      <div class="filter-bar">
        <select id="drivers-filter-status" onchange="applyDriverFilters()">
          <option value="">All statuses</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending approval</option>
          <option value="verified">Verified</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>Name</th><th>City</th><th>Verification</th><th>Available</th><th>Rating</th><th>Jobs</th><th>Cancellations</th><th>Actions</th></tr></thead>
          <tbody id="drivers-tbody"><tr><td colspan="9" class="loading-text">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- DISPUTES -->
    <div class="tab-content" id="tab-disputes">
      <div class="page-header">
        <div class="page-title">Disputes</div>
        <button class="btn-ghost" onclick="reloadTab('disputes')">↻ Refresh</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>Type</th><th>City</th><th>Customer</th><th>Driver</th><th>Reason</th><th>Disputed</th><th>Resolved</th><th>Actions</th></tr></thead>
          <tbody id="disputes-tbody"><tr><td colspan="9" class="loading-text">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>

  </main>
</div>

<!-- MODAL -->
<div id="modal-overlay" onclick="handleModalClick(event)">
  <div id="modal-box">
    <div class="modal-header">
      <h2 id="modal-title">Detail</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<div id="toast"></div>

<script>
const S = {
  key: '',
  loaded: {},
  jobsData: [],
  usersData: [],
  driversData: [],
  disputesData: [],
};

// ── Auth ──────────────────────────────────────────────────────────────
async function doLogin() {
  const k = document.getElementById('login-key').value.trim();
  if (!k) return;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-key': k } });
    if (res.status === 401) { errEl.textContent = 'Invalid admin key.'; return; }
    S.key = k;
    sessionStorage.setItem('bara_admin_key', k);
    document.getElementById('login-screen').style.display = 'none';
    const app = document.getElementById('app');
    app.style.display = 'flex';
    loadTab('overview');
  } catch(e) { errEl.textContent = 'Cannot reach server.'; }
}

function logout() {
  sessionStorage.removeItem('bara_admin_key');
  S.key = '';
  S.loaded = {};
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-key').value = '';
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'x-admin-key': S.key, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

// ── Tabs ──────────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(t => {
    t.classList.toggle('active', t.id === 'tab-' + name);
  });
  if (!S.loaded[name]) loadTab(name);
}

async function loadTab(name) {
  S.loaded[name] = true;
  if (name === 'overview') await renderOverview();
  if (name === 'jobs')     await renderJobs();
  if (name === 'users')    await renderUsers();
  if (name === 'drivers')  await renderDrivers();
  if (name === 'disputes') await renderDisputes();
}

async function reloadTab(name) {
  S.loaded[name] = false;
  await loadTab(name);
}

// ── Formatters ────────────────────────────────────────────────────────
function fmtDate(d) { return d ? new Date(d).toLocaleString('sv-SE', { year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' }) : '—'; }
function fmtSEK(n) { return n != null ? Number(n).toFixed(0) + ' kr' : '—'; }
function fmtRating(r) { return r ? Number(r).toFixed(1) + ' ★' : '—'; }
function fmtJobType(t) { return t ? t.replace(/_/g,' ').replace(/\\b\\w/g, c => c.toUpperCase()) : '—'; }
function truncate(s, n=60) { return s && s.length > n ? s.slice(0,n) + '…' : (s || '—'); }

function statusBadge(s) {
  const cls = 'badge badge-' + (s || 'unknown').replace(/_by_.+$','');
  return \`<span class="\${cls}">\${(s||'').replace(/_/g,' ')}</span>\`;
}
function verifyBadge(s) {
  const map = { unverified:'badge-unverified', pending:'badge-pending-v', verified:'badge-verified', rejected:'badge-rejected' };
  return \`<span class="badge \${map[s]||'badge-unverified'}">\${s||'—'}</span>\`;
}

// ── Overview ──────────────────────────────────────────────────────────
async function renderOverview() {
  const el = document.getElementById('overview-content');
  el.innerHTML = '<div class="loading-text">Loading…</div>';
  const data = await api('/api/admin/stats');
  if (!data) return;
  const o = data.overview;

  const disputeCount = Number(o.totalDisputedJobs);
  document.getElementById('dispute-badge').textContent = disputeCount > 0 ? \`(\${disputeCount})\` : '';

  el.innerHTML = \`
    <div class="stats-grid">
      \${sc('Users',o.totalUsers,'👥','blue')}
      \${sc('Active Drivers',o.activeDrivers,'🚗','gold')}
      \${sc('Total Jobs',o.totalJobs,'📦','blue')}
      \${sc('Pending',o.totalPendingJobs,'⏳','orange')}
      \${sc('Completed',o.totalCompletedJobs,'✅','green')}
      \${sc('Disputes',o.totalDisputedJobs,'⚠️',disputeCount>0?'red':'blue')}
    </div>
    <div class="card-row">
      <div class="card" style="min-width:200px">
        <h3>Platform rates</h3>
        <div class="rate-row"><span>Completion rate</span><strong>\${o.completionRate}%</strong></div>
        <div class="rate-row"><span>Cancellation rate</span><strong>\${o.cancellationRate}%</strong></div>
        \${o.avgCompletionMinutes ? \`<div class="rate-row"><span>Avg completion time</span><strong>\${o.avgCompletionMinutes} min</strong></div>\` : ''}
        \${o.avgJobsPerDay ? \`<div class="rate-row"><span>Avg jobs / day</span><strong>\${o.avgJobsPerDay}</strong></div>\` : ''}
      </div>
      <div class="card" style="flex:2;min-width:240px">
        <h3>Jobs by type</h3>
        <table class="data-table">
          <thead><tr><th>Type</th><th>Total</th><th>Completed</th></tr></thead>
          <tbody>\${data.jobsByType.map(t=>\`<tr><td>\${fmtJobType(t.jobType)}</td><td>\${t.total}</td><td>\${t.completed}</td></tr>\`).join('')||'<tr><td colspan=3 style="color:#999">No data</td></tr>'}</tbody>
        </table>
      </div>
      <div class="card" style="flex:2;min-width:240px">
        <h3>Jobs by city</h3>
        <table class="data-table">
          <thead><tr><th>City</th><th>Total</th><th>Done</th><th>Cancelled</th></tr></thead>
          <tbody>\${data.jobsByCity.map(c=>\`<tr><td>\${c.city}</td><td>\${c.total}</td><td>\${c.completed}</td><td>\${c.cancelled}</td></tr>\`).join('')||'<tr><td colspan=4 style="color:#999">No data</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  \`;
}

function sc(label, value, icon, type) {
  return \`<div class="stat-card \${type}">
    <div class="stat-icon">\${icon}</div>
    <div class="stat-value">\${value}</div>
    <div class="stat-label">\${label}</div>
  </div>\`;
}

// ── Jobs ──────────────────────────────────────────────────────────────
async function renderJobs() {
  const tbody = document.getElementById('jobs-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Loading…</td></tr>';
  const status = document.getElementById('jobs-filter-status').value;
  const city   = document.getElementById('jobs-filter-city').value;
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (city)   qs.set('city', city);
  const data = await api('/api/admin/jobs?' + qs);
  if (!data) return;
  S.jobsData = data;
  renderJobsTable(data);
}

function renderJobsTable(jobs) {
  const tbody = document.getElementById('jobs-tbody');
  if (!jobs.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:#999">No jobs found</td></tr>'; return; }
  tbody.innerHTML = jobs.map(j => \`
    <tr>
      <td><span class="link" onclick="showJobDetail(\${j.id})">#\${j.id}</span></td>
      <td>\${fmtJobType(j.jobType)}</td>
      <td>\${j.city||'—'}</td>
      <td>\${j.customerName||'—'}</td>
      <td>\${j.driverName||'<span style="color:#999">unassigned</span>'}</td>
      <td>\${fmtSEK(j.priceTotal)}</td>
      <td>\${statusBadge(j.status)}</td>
      <td style="color:#999;font-size:12px">\${fmtDate(j.createdAt)}</td>
    </tr>
  \`).join('');
}

function applyJobFilters() { if (S.loaded.jobs) renderJobs(); }

async function showJobDetail(id) {
  openModal('Job #' + id, '<div class="loading-text">Loading…</div>');
  const data = await api('/api/admin/jobs/' + id);
  if (!data) return;
  const j = data;
  const timeline = [];
  if (j.createdAt)   timeline.push([j.createdAt, 'Posted']);
  if (j.acceptedAt)  timeline.push([j.acceptedAt, 'Accepted by driver']);
  if (j.arrivedAt)   timeline.push([j.arrivedAt, 'Driver arrived']);
  if (j.completedAt) timeline.push([j.completedAt, 'Completed']);

  const pickupPhotos  = (j.photosPickup  || []).map(p => \`<img class="photo-thumb" src="\${p}" onerror="this.style.display='none'" onclick="window.open('\${p}')">\`).join('');
  const dropoffPhotos = (j.photosDropoff || []).map(p => \`<img class="photo-thumb" src="\${p}" onerror="this.style.display='none'" onclick="window.open('\${p}')">\`).join('');
  const custPhotos    = (j.photosCustomer|| []).map(p => \`<img class="photo-thumb" src="\${p}" onerror="this.style.display='none'" onclick="window.open('\${p}')">\`).join('');

  document.getElementById('modal-body').innerHTML = \`
    <div class="detail-section">
      <h4>Status</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>Status</label><span>\${statusBadge(j.status)}</span></div>
        <div class="detail-item"><label>Type</label><span>\${fmtJobType(j.jobType)}</span></div>
        <div class="detail-item"><label>City</label><span>\${j.city||'—'}</span></div>
        <div class="detail-item"><label>Payment</label><span>\${j.paymentStatus||'—'}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Pricing</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>Total price</label><span>\${fmtSEK(j.priceTotal)}</span></div>
        <div class="detail-item"><label>Driver payout</label><span>\${fmtSEK(j.driverPayout)}</span></div>
        <div class="detail-item"><label>Platform fee</label><span>\${fmtSEK(j.platformFee)}</span></div>
        <div class="detail-item"><label>Customer offer</label><span>\${j.customerPrice ? fmtSEK(j.customerPrice) : '—'}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Addresses</h4>
      <div class="detail-grid">
        <div class="detail-item full"><label>Pickup</label><span>\${j.pickupAddress||'—'}</span></div>
        <div class="detail-item full"><label>Drop-off</label><span>\${j.dropoffAddress||'—'}</span></div>
        \${j.distanceKm ? \`<div class="detail-item"><label>Distance</label><span>\${Number(j.distanceKm).toFixed(1)} km</span></div>\` : ''}
      </div>
    </div>
    <div class="detail-section">
      <h4>Item</h4>
      <div class="detail-grid">
        <div class="detail-item full"><label>Description</label><span>\${j.itemDescription||'—'}</span></div>
        \${j.preferredTime ? \`<div class="detail-item full"><label>Preferred time</label><span>\${j.preferredTime}</span></div>\` : ''}
      </div>
    </div>
    \${j.customer || j.driver ? \`
    <div class="detail-section">
      <h4>People</h4>
      <div class="detail-grid">
        \${j.customer ? \`
          <div class="detail-item"><label>Customer</label><span>\${j.customer.fullName||'—'}</span></div>
          <div class="detail-item"><label>Customer email</label><span>\${j.customer.email||'—'}</span></div>
        \` : ''}
        \${j.driver ? \`
          <div class="detail-item"><label>Driver</label><span>\${j.driver.fullName||'—'}</span></div>
          <div class="detail-item"><label>Driver rating</label><span>\${fmtRating(j.driver.rating)}</span></div>
        \` : ''}
      </div>
    </div>
    \` : ''}
    \${j.rating ? \`
    <div class="detail-section">
      <h4>Rating</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>Stars</label><span>\${j.rating} ★</span></div>
        \${j.ratingNote ? \`<div class="detail-item full"><label>Note</label><span>\${j.ratingNote}</span></div>\` : ''}
      </div>
    </div>
    \` : ''}
    \${timeline.length ? \`
    <div class="detail-section">
      <h4>Timeline</h4>
      \${timeline.sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([t,l]) => \`
        <div class="timeline-row"><div class="timeline-dot"></div><span class="tl-time">\${fmtDate(t)}</span><span class="tl-label">\${l}</span></div>
      \`).join('')}
    </div>
    \` : ''}
    \${pickupPhotos || dropoffPhotos || custPhotos ? \`
    <div class="detail-section">
      <h4>Photos</h4>
      \${pickupPhotos  ? \`<p style="font-size:11px;color:#999;margin-bottom:4px">PICKUP</p><div class="photos-row" style="margin-bottom:10px">\${pickupPhotos}</div>\` : ''}
      \${dropoffPhotos ? \`<p style="font-size:11px;color:#999;margin-bottom:4px">DROP-OFF</p><div class="photos-row" style="margin-bottom:10px">\${dropoffPhotos}</div>\` : ''}
      \${custPhotos    ? \`<p style="font-size:11px;color:#999;margin-bottom:4px">CUSTOMER</p><div class="photos-row">\${custPhotos}</div>\` : ''}
    </div>
    \` : ''}
    \${j.disputed ? \`
    <div class="detail-section" style="background:#fff8f0;border-radius:8px;padding:14px;border:1.5px solid #ffe0c0">
      <h4 style="color:#8b4000">⚠️ Dispute</h4>
      <p style="margin-top:6px;font-size:13px">\${j.disputeReason||'No reason provided'}</p>
      \${j.disputeResolvedAt ? \`<p style="margin-top:8px;font-size:12px;color:#28a745">✓ Resolved \${fmtDate(j.disputeResolvedAt)}: \${j.disputeResolvedNote}</p>\` : ''}
    </div>
    \` : ''}
  \`;
}

// ── Users ─────────────────────────────────────────────────────────────
async function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Loading…</td></tr>';
  const role = document.getElementById('users-filter-role').value;
  const qs = new URLSearchParams();
  if (role) qs.set('role', role);
  const data = await api('/api/admin/users?' + qs);
  if (!data) return;
  S.usersData = data;
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:#999">No users found</td></tr>'; return; }
  tbody.innerHTML = data.map(u => \`
    <tr>
      <td><span class="link" onclick="showUserDetail(\${u.id})">#\${u.id}</span></td>
      <td><span class="link" onclick="showUserDetail(\${u.id})">\${u.fullName||'—'}</span></td>
      <td style="color:#6c757d;font-size:12px">\${u.email||'—'}</td>
      <td><span class="badge badge-\${u.role||'unknown'}">\${u.role||'—'}</span></td>
      <td>\${u.city||'—'}</td>
      <td>\${fmtRating(u.rating)}</td>
      <td>\${u.totalJobs||0}</td>
      <td style="color:#999;font-size:12px">\${fmtDate(u.createdAt)}</td>
    </tr>
  \`).join('');
}

function applyUserFilters() { if (S.loaded.users) renderUsers(); }

async function showUserDetail(id) {
  openModal('User #' + id, '<div class="loading-text">Loading…</div>');
  const data = await api('/api/admin/users/' + id);
  if (!data) return;
  const { user: u, jobsAsCustomer, jobsAsDriver } = data;
  document.getElementById('modal-body').innerHTML = \`
    <div class="detail-section">
      <h4>Profile</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>Full name</label><span>\${u.fullName||'—'}</span></div>
        <div class="detail-item"><label>Email</label><span>\${u.email||'—'}</span></div>
        <div class="detail-item"><label>Role</label><span>\${u.role||'—'}</span></div>
        <div class="detail-item"><label>City</label><span>\${u.city||'—'}</span></div>
        <div class="detail-item"><label>Rating</label><span>\${fmtRating(u.rating)}</span></div>
        <div class="detail-item"><label>Total jobs</label><span>\${u.totalJobs||0}</span></div>
        <div class="detail-item"><label>Joined</label><span>\${fmtDate(u.createdAt)}</span></div>
        \${u.vehicleDescription ? \`<div class="detail-item full"><label>Vehicle</label><span>\${u.vehicleDescription}</span></div>\` : ''}
        \${u.verificationStatus !== 'unverified' ? \`<div class="detail-item"><label>Verification</label><span>\${verifyBadge(u.verificationStatus)}</span></div>\` : ''}
      </div>
    </div>
    \${jobsAsCustomer.length ? \`
    <div class="detail-section">
      <h4>Jobs as customer (\${jobsAsCustomer.length})</h4>
      <table class="data-table">
        <thead><tr><th>#</th><th>Type</th><th>City</th><th>Price</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>\${jobsAsCustomer.map(j=>\`<tr><td>#\${j.id}</td><td>\${fmtJobType(j.jobType)}</td><td>\${j.city||'—'}</td><td>\${fmtSEK(j.priceTotal)}</td><td>\${statusBadge(j.status)}</td><td style="font-size:11px;color:#999">\${fmtDate(j.createdAt)}</td></tr>\`).join('')}</tbody>
      </table>
    </div>
    \` : ''}
    \${jobsAsDriver.length ? \`
    <div class="detail-section">
      <h4>Jobs as driver (\${jobsAsDriver.length})</h4>
      <table class="data-table">
        <thead><tr><th>#</th><th>Type</th><th>City</th><th>Payout</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>\${jobsAsDriver.map(j=>\`<tr><td>#\${j.id}</td><td>\${fmtJobType(j.jobType)}</td><td>\${j.city||'—'}</td><td>\${fmtSEK(j.driverPayout)}</td><td>\${statusBadge(j.status)}</td><td style="font-size:11px;color:#999">\${fmtDate(j.createdAt)}</td></tr>\`).join('')}</tbody>
      </table>
    </div>
    \` : ''}
  \`;
}

// ── Drivers ───────────────────────────────────────────────────────────
async function renderDrivers() {
  const tbody = document.getElementById('drivers-tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading-text">Loading…</td></tr>';
  const status = document.getElementById('drivers-filter-status').value;
  const qs = new URLSearchParams();
  if (status) qs.set('verificationStatus', status);
  const data = await api('/api/admin/drivers?' + qs);
  if (!data) return;
  S.driversData = data;
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#999">No drivers found</td></tr>'; return; }
  tbody.innerHTML = data.map(d => \`
    <tr>
      <td><span class="link" onclick="showUserDetail(\${d.id})">#\${d.id}</span></td>
      <td><span class="link" onclick="showUserDetail(\${d.id})">\${d.fullName||'—'}</span></td>
      <td>\${d.city||'—'}</td>
      <td>\${verifyBadge(d.verificationStatus)}</td>
      <td><span class="badge \${d.isAvailable?'badge-available':'badge-unavailable'}">\${d.isAvailable?'Yes':'No'}</span></td>
      <td>\${fmtRating(d.rating)}</td>
      <td>\${d.totalJobs||0}</td>
      <td>\${d.cancellationsCount||0}\${d.noShowCount>0?' / '+d.noShowCount+' no-show':''}
      </td>
      <td>
        \${d.verificationStatus === 'pending' || d.verificationStatus === 'unverified' ? \`
          <button class="btn-success" style="margin-right:4px" onclick="verifyDriver(\${d.id},'approve')">Approve</button>
          <button class="btn-danger" onclick="verifyDriver(\${d.id},'reject')">Reject</button>
        \` : d.verificationStatus === 'verified' ? \`
          <button class="btn-danger" onclick="verifyDriver(\${d.id},'reject')">Revoke</button>
        \` : \`
          <button class="btn-success" onclick="verifyDriver(\${d.id},'approve')">Approve</button>
        \`}
      </td>
    </tr>
  \`).join('');
}

function applyDriverFilters() { if (S.loaded.drivers) renderDrivers(); }

async function verifyDriver(id, action) {
  const label = action === 'approve' ? 'approve' : 'reject';
  if (!confirm(\`Are you sure you want to \${label} this driver?\`)) return;
  const data = await api('/api/admin/drivers/' + id + '/verify', {
    method: 'PUT', body: JSON.stringify({ action }),
  });
  if (!data || !data.success) { showToast('Failed to update driver', 'error'); return; }
  showToast(\`Driver \${action === 'approve' ? 'approved' : 'rejected'}: \${data.driver.fullName}\`, 'success');
  S.loaded.drivers = false;
  renderDrivers();
}

// ── Disputes ──────────────────────────────────────────────────────────
async function renderDisputes() {
  const tbody = document.getElementById('disputes-tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading-text">Loading…</td></tr>';
  const data = await api('/api/admin/disputes');
  if (!data) return;
  S.disputesData = data;
  document.getElementById('dispute-badge').textContent = data.length > 0 ? \`(\${data.length})\` : '';
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#999">No disputes — great!</td></tr>'; return; }
  tbody.innerHTML = data.map(j => \`
    <tr style="\${j.disputeResolvedAt?'opacity:.6':''}">
      <td><span class="link" onclick="showJobDetail(\${j.id})">#\${j.id}</span></td>
      <td>\${fmtJobType(j.jobType)}</td>
      <td>\${j.city||'—'}</td>
      <td>\${j.customerName||'—'}</td>
      <td>\${j.driverName||'—'}</td>
      <td style="max-width:180px">\${truncate(j.disputeReason,50)}</td>
      <td style="font-size:12px;color:#999">\${fmtDate(j.createdAt)}</td>
      <td>\${j.disputeResolvedAt ? \`<span class="badge badge-verified" style="font-size:10px">Resolved</span>\` : '<span class="badge badge-rejected" style="font-size:10px">Open</span>'}</td>
      <td>
        <button class="btn-ghost" style="margin-bottom:4px" onclick="showDisputeDetail(\${j.id})">View</button>
        \${!j.disputeResolvedAt ? \`<br><button class="btn-primary" style="margin-top:4px;font-size:11px;padding:4px 10px" onclick="openResolveModal(\${j.id})">Resolve</button>\` : ''}
      </td>
    </tr>
  \`).join('');
}

async function showDisputeDetail(id) { showJobDetail(id); }

function openResolveModal(jobId) {
  openModal('Resolve Dispute — Job #' + jobId, \`
    <div class="detail-section">
      <h4>Resolution note</h4>
      <p style="font-size:13px;color:#6c757d;margin-bottom:12px">Describe the resolution decision. This note is stored internally and is not shown to users.</p>
      <div class="resolve-form">
        <textarea id="resolve-note" placeholder="e.g. Reviewed photos — damage confirmed. Partial refund of 200 kr approved. Customer notified."></textarea>
        <div class="resolve-actions">
          <button class="btn-success" onclick="submitResolve(\${jobId})">✓ Mark as resolved</button>
          <button class="btn-ghost" onclick="triggerRefund(\${jobId})">💳 Trigger refund (UI only)</button>
          <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        </div>
        <p class="refund-note">Refund button is UI-only. Payment integrations will be wired in a future release.</p>
      </div>
    </div>
  \`);
}

async function submitResolve(jobId) {
  const note = (document.getElementById('resolve-note').value || '').trim();
  if (!note) { showToast('Please enter a resolution note', 'error'); return; }
  const data = await api('/api/admin/disputes/' + jobId + '/resolve', {
    method: 'POST', body: JSON.stringify({ note }),
  });
  if (!data || !data.success) { showToast('Failed to resolve dispute', 'error'); return; }
  showToast('Dispute resolved for job #' + jobId, 'success');
  closeModal();
  S.loaded.disputes = false;
  renderDisputes();
}

function triggerRefund(jobId) {
  showToast('Refund flagged for job #' + jobId + ' (integration pending)', 'success');
}

// ── Modal ─────────────────────────────────────────────────────────────
function openModal(title, body) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

function handleModalClick(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

// ── Toast ─────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  setTimeout(() => { t.className = ''; }, 3200);
}

// ── Init ──────────────────────────────────────────────────────────────
(function init() {
  const saved = sessionStorage.getItem('bara_admin_key');
  if (saved) {
    document.getElementById('login-key').value = saved;
    S.key = saved;
    fetch('/api/admin/stats', { headers: { 'x-admin-key': saved } }).then(r => {
      if (r.ok) {
        document.getElementById('login-screen').style.display = 'none';
        const app = document.getElementById('app');
        app.style.display = 'flex';
        loadTab('overview');
      } else { sessionStorage.removeItem('bara_admin_key'); }
    }).catch(() => {});
  }
})();
</script>
</body>
</html>`;
