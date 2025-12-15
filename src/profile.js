import { getToken, logout } from "./auth.js";
import { gqlRequest, PROFILE_QUERY, ONE_OBJECT_QUERY, ONE_OBJECT_QUERY_ALT, ONE_OBJECT_VIA_TRANSACTION } from "./gql.js";
import { renderXpOverTimeLineChart, renderAuditDonutChart, renderSkillsBarChart } from "./graphs.js";
import { escapeHtml, validateInput, checkRateLimit } from "./utils.js";

const loadingOverlay = document.getElementById("global-loading");

function showLoading() {
  if (loadingOverlay) loadingOverlay.classList.remove("hidden");
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add("hidden");
}

function ensureAuthenticated() {
  const token = getToken();
  if (!token) {
    logout();
  }
}

function safeSum(node) {
  return (
    node?.aggregate?.sum?.amount ??
    node?.aggregate?.sum?.amount ?? // compat if shape changes
    0
  );
}

function renderInfoCards(user) {
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const login = user.login || "";
  const fullName = [firstName, lastName].join(" ").trim() || login || "Unknown";

  const totalXP = safeSum(user.totalXP);
  // Based on Zone01: "Done" = audits completed, "Received" = audits received
  // Ratio = Done / Received
  const auditDone = safeSum(user.audit_up); // Audits you've done (given)
  const auditReceived = safeSum(user.audit_down); // Audits you've received

  // Get level from events - should be the level for /athens/div-01
  let level = null;
  if (Array.isArray(user.events) && user.events.length > 0) {
    // events query returns array of { level } objects
    // Get the first (or highest) level
    const levels = user.events
      .map((e) => (typeof e.level === "number" ? e.level : null))
      .filter((v) => v != null);
    if (levels.length > 0) {
      level = Math.max(...levels);
    }
  }

  const nameEl = document.getElementById("stat-name");
  const totalXpEl = document.getElementById("stat-total-xp");
  const auditRatioEl = document.getElementById("stat-audit-ratio");
  const auditMetaEl = document.getElementById("stat-audit-meta");
  const levelEl = document.getElementById("stat-level");
  const topbarUsername = document.getElementById("topbar-username");

  if (nameEl) nameEl.textContent = fullName;
  if (topbarUsername) topbarUsername.textContent = fullName;

  if (totalXpEl) totalXpEl.textContent = `${totalXP.toLocaleString()} XP`;

  // Format bytes to KB/MB
  function formatBytes(bytes) {
    if (bytes === 0) return "0";
    if (bytes < 1024) return bytes.toLocaleString();
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " kB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  // Calculate ratio: Done / Received
  const ratio =
    auditDone === 0 && auditReceived === 0
      ? "—"
      : (auditDone / (auditReceived || 1)).toFixed(2);
  if (auditRatioEl) auditRatioEl.textContent = ratio;

  if (auditMetaEl) {
    auditMetaEl.innerHTML = `Done: ${formatBytes(auditDone)}<br>Received: ${formatBytes(auditReceived)}`;
  }

  if (levelEl) {
    levelEl.textContent = level != null ? level.toFixed(2) : "—";
  }

  // Skills
  const skillsList = document.getElementById("skills-list");
  const skillsEmpty = document.getElementById("skills-empty");
  if (Array.isArray(user.skills) && user.skills.length > 0) {
    if (skillsEmpty) skillsEmpty.classList.add("hidden");
    if (skillsList) {
      skillsList.innerHTML = "";
      user.skills.slice(0, 8).forEach((skill) => {
        const li = document.createElement("li");
        li.className = "chip";
        const label = skill.type.replace(/^skill_/, "");
        li.textContent = `${label} · ${skill.amount.toFixed(0)}`;
        skillsList.appendChild(li);
      });
    }
  } else {
    if (skillsEmpty) skillsEmpty.classList.remove("hidden");
  }
}

function renderXpProjectTable(xpProjects) {
  const tbody = document.getElementById("xp-project-table-body");
  const empty = document.getElementById("xp-project-empty");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(xpProjects) || xpProjects.length === 0) {
    if (empty) empty.classList.remove("hidden");
    // Update available object IDs section
    updateAvailableObjectIds([]);
    return;
  }
  if (empty) empty.classList.add("hidden");

  // Collect unique object IDs for the query tester
  const objectIds = new Set();
  const objectIdToName = new Map();

  xpProjects.forEach((item) => {
    const tr = document.createElement("tr");

    const name = item.object?.name || "Unknown";
    const type = item.object?.type || "—";
    let date = "—";
    if (item.createdAt) {
      try {
        // Parse ISO date string like "2019-03-27T12:09:48.443401+00:00"
        const dateStr = item.createdAt;
        const dateObj = new Date(dateStr);
        
        if (!isNaN(dateObj.getTime())) {
          // Format as: "Mar 27, 2019" or "Oct 2, 2024"
          date = dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        } else {
          date = dateStr; // Fallback to raw string if parsing fails
        }
      } catch (e) {
        console.warn("Failed to parse date:", item.createdAt, e);
        date = item.createdAt || "—"; // Fallback to raw value
      }
    }
    const amount = item.amount ?? 0;
    const objectId = item.object?.id;

    if (objectId) {
      objectIds.add(objectId);
      objectIdToName.set(objectId, name);
    }

    tr.innerHTML = `
      <td>${name}</td>
      <td>${type}</td>
      <td>${date}</td>
      <td class="table__numeric">${amount.toLocaleString()}</td>
    `;

    tbody.appendChild(tr);
  });

  // Update available object IDs section
  updateAvailableObjectIds(Array.from(objectIds).slice(0, 10), objectIdToName);
}

// Helper function to format dates in objects for display
function formatDatesInObject(obj) {
  if (!obj) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => formatDatesInObject(item));
  }
  
  if (typeof obj === 'object') {
    const formatted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'createdAt' && typeof value === 'string') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            formatted[key] = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } else {
            formatted[key] = value;
          }
        } catch {
          formatted[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        formatted[key] = formatDatesInObject(value);
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  }
  
  return obj;
}

function updateAvailableObjectIds(ids, idToName = new Map()) {
  const container = document.getElementById("object-id-list");
  if (!container) return;

  if (ids.length === 0) {
    container.innerHTML = '<span style="font-style: italic;">No object IDs available. Load profile data first.</span>';
    return;
  }

  container.innerHTML = ids.map(id => {
    const name = idToName.get(id) || '';
    const label = name ? `${id} (${name})` : id;
    return `<button type="button" class="chip" data-object-id="${id}" style="cursor: pointer; transition: all 0.2s;">${label}</button>`;
  }).join('');

  // Add click handlers to each button
  container.querySelectorAll('[data-object-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-object-id');
      const idInput = document.getElementById('object-id');
      if (idInput) {
        idInput.value = id;
        idInput.focus();
        // Auto-submit the form
        const form = document.getElementById('object-query-form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    });
  });
}


function prepareXpTimeSeries(xpProjects) {
  if (!Array.isArray(xpProjects) || xpProjects.length === 0) return [];

  // Group by month (YYYY-MM)
  const byMonth = new Map();
  xpProjects.forEach((t) => {
    if (!t.createdAt) return;
    const d = new Date(t.createdAt);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const prev = byMonth.get(key) || 0;
    byMonth.set(key, prev + (t.amount || 0));
  });

  const sortedKeys = Array.from(byMonth.keys()).sort();
  const series = [];
  let cumulative = 0;
  sortedKeys.forEach((key) => {
    cumulative += byMonth.get(key);
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    series.push({
      label: key,
      date,
      value: cumulative
    });
  });

  return series;
}

async function loadProfile() {
  ensureAuthenticated();
  showLoading();

  try {
    // Load profile data (user, level, XP, audits, skills, etc.)
    const data = await gqlRequest(PROFILE_QUERY);
    
    if (!data) {
      throw new Error("No data returned from GraphQL.");
    }

    // Zone01 returns arrays for table queries, user might be array or single object
    const userInfo = Array.isArray(data.user) ? data.user[0] : data.user;
    if (!userInfo) {
      throw new Error("No user data returned from GraphQL.");
    }

    // All data is already nested under user - userInfo contains everything
    const profileData = userInfo;

    renderInfoCards(profileData);
    renderXpProjectTable(profileData.xp_project);

    // Charts
    const xpSeries = prepareXpTimeSeries(profileData.xp_project);
    const xpContainer = document.getElementById("xp-line-chart");
    const auditContainer = document.getElementById("audit-donut-chart");
    if (xpContainer) {
      renderXpOverTimeLineChart(xpContainer, xpSeries);
    }
    if (auditContainer) {
      // For donut chart: Done (up) and Received (down)
      const done = safeSum(profileData.audit_up);
      const received = safeSum(profileData.audit_down);
      renderAuditDonutChart(auditContainer, done, received);
    }
    
    // Bonus: Skills bar chart
    const skillsContainer = document.getElementById("skills-bar-chart");
    if (skillsContainer && Array.isArray(profileData.skills) && profileData.skills.length > 0) {
      renderSkillsBarChart(skillsContainer, profileData.skills);
    }
  } catch (err) {
    console.error(err);
    alert(`Failed to load profile: ${err.message}`);
  } finally {
    hideLoading();
  }
}

function initLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    logout();
  });
}


function initObjectQueryForm() {
  const form = document.getElementById("object-query-form");
  const output = document.getElementById("object-query-result");
  if (!form || !output) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idInput = document.getElementById("object-id");
    if (!idInput || !idInput.value) return;

    try {
      checkRateLimit('object-query', 20, 60000);
      const id = validateInput(idInput.value, 'int');
      if (id <= 0) {
        output.textContent = "Please enter a positive integer id.";
        return;
      }
    } catch (err) {
      output.textContent = `Error: ${escapeHtml(err.message)}`;
      return;
    }

    const id = Number(idInput.value);

    output.textContent = "Loading...";
    try {
      let data = null;
      let result = null;
      
      // Try queries in order of likelihood
      try {
        // Method 1: Direct object query (singular)
        data = await gqlRequest(ONE_OBJECT_QUERY, { id });
        result = data.object;
      } catch (err1) {
        console.log("Method 1 failed, trying method 2...", err1.message);
        try {
          // Method 2: Objects query (plural)
          data = await gqlRequest(ONE_OBJECT_QUERY_ALT, { id });
          result = data.objects;
        } catch (err2) {
          console.log("Method 2 failed, trying method 3...", err2.message);
          try {
            // Method 3: Query through transactions (most reliable)
            data = await gqlRequest(ONE_OBJECT_VIA_TRANSACTION, { objectId: id });
            if (data.transactions && data.transactions.length > 0) {
              result = data.transactions[0].object;
            }
          } catch (err3) {
            throw new Error(`All query methods failed:\n1. object query: ${err1.message}\n2. objects query: ${err2.message}\n3. via transactions: ${err3.message}`);
          }
        }
      }
      
      if (!result || (Array.isArray(result) && result.length === 0)) {
        output.textContent = `No object found with id: ${id}\n\nNote: Object queries might need to be accessed through transactions. Try using an objectId from the XP by Project table above.`;
        return;
      }
      
      // If result is an array, take first item
      const finalResult = Array.isArray(result) ? result[0] : result;
      
      if (!finalResult) {
        output.textContent = `No object found with id: ${id}`;
        return;
      }
      
      // Format dates in the result before displaying
      const formattedResult = formatDatesInObject(finalResult);
      output.textContent = JSON.stringify(formattedResult, null, 2);
    } catch (err) {
      console.error("Object query error:", err);
      output.textContent = `Error: ${escapeHtml(err.message)}\n\nTips:\n- Try an object id from the "XP by Project" table above\n- Check browser console (F12) for more details\n- Object queries may need to be accessed through transactions`;
    }
  });
}

function initGraphiQL() {
  const queryInput = document.getElementById("graphql-query-input");
  const varsInput = document.getElementById("graphql-variables-input");
  const executeBtn = document.getElementById("graphql-execute-btn");
  const formatBtn = document.getElementById("graphql-format-btn");
  const clearBtn = document.getElementById("graphql-clear-btn");
  const copyBtn = document.getElementById("graphql-copy-btn");
  const responseEl = document.getElementById("graphql-response");
  const examplesSelect = document.getElementById("graphql-examples");
  const helpBtn = document.getElementById("graphql-help-btn");
  const helpTooltip = document.getElementById("graphql-help-tooltip");
  const queryStatus = document.getElementById("query-status");
  const varsStatus = document.getElementById("vars-status");
  const responseStatus = document.getElementById("response-status");

  if (!queryInput || !executeBtn || !responseEl) return;

  // Update line numbers for textarea
  function updateLineNumbers(textarea, lineNumbersEl) {
    const lines = textarea.value.split('\n').length;
    lineNumbersEl.innerHTML = Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('<br>');
  }

  const queryLineNumbers = document.getElementById("query-line-numbers");
  const varsLineNumbers = document.getElementById("vars-line-numbers");

  [queryInput, varsInput].forEach((input, idx) => {
    if (!input) return;
    const lineEl = idx === 0 ? queryLineNumbers : varsLineNumbers;
    
    input.addEventListener('input', () => {
      updateLineNumbers(input, lineEl);
      validateEditor(input, idx === 0 ? queryStatus : varsStatus);
    });
    
    input.addEventListener('scroll', () => {
      if (lineEl) lineEl.scrollTop = input.scrollTop;
    });

    // Initial line numbers
    updateLineNumbers(input, lineEl);
  });

  // Validate editor content
  function validateEditor(input, statusEl) {
    if (!statusEl) return;
    const value = input.value.trim();
    
    if (input === varsInput) {
      // Validate JSON
      if (!value || value === '{}') {
        statusEl.textContent = 'Optional';
        statusEl.style.color = 'var(--color-text-muted)';
        return;
      }
      try {
        JSON.parse(value);
        statusEl.textContent = '✓ Valid JSON';
        statusEl.style.color = '#34d399';
      } catch {
        statusEl.textContent = '✗ Invalid JSON';
        statusEl.style.color = '#f97373';
      }
    } else {
      // Query validation
      const lines = value.split('\n').length;
      statusEl.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
      statusEl.style.color = 'var(--color-text-muted)';
    }
  }

  // Query examples - all must be nested under 'user' for Zone01
  const queryExamples = {
    user: `query {
  user {
    firstName
    lastName
    login
    email
  }
}`,
    transactions: `query {
  user {
    xp_project: transactions(
      where: {
        type: {_eq: "xp"}
        event: {path: {_ilike: "/athens/div-01%"}}
        object: {type: {_eq: "project"}}
      }
      order_by: {createdAt: desc}
    ) {
      id
      amount
      createdAt
      object {
        id
        name
        type
      }
    }
  }
}`,
    skills: `query {
  user {
    skills: transactions(
      order_by: {type: asc, amount: desc}
      distinct_on: [type]
      where: {
        eventId: {_eq: 200}
        _and: {type: {_like: "skill_%"}}
      }
    ) {
      type
      amount
    }
  }
}`,
    object: `query GetObject($objectId: Int!) {
  user {
    object_transactions: transactions(
      where: {objectId: {_eq: $objectId}}
      limit: 1
    ) {
      id
      amount
      createdAt
      object {
        id
        name
        type
        createdAt
      }
    }
  }
}`
  };

  const varsExamples = {
    user: '{}',
    transactions: '{}',
    skills: '{}',
    object: '{\n  "objectId": 1\n}'
  };

  examplesSelect?.addEventListener('change', (e) => {
    const example = e.target.value;
    if (example && queryExamples[example]) {
      queryInput.value = queryExamples[example];
      varsInput.value = varsExamples[example] || '{}';
      updateLineNumbers(queryInput, queryLineNumbers);
      updateLineNumbers(varsInput, varsLineNumbers);
      validateEditor(queryInput, queryStatus);
      validateEditor(varsInput, varsStatus);
    }
  });

  // Help tooltip toggle
  helpBtn?.addEventListener('click', () => {
    helpTooltip?.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!helpBtn?.contains(e.target) && !helpTooltip?.contains(e.target)) {
      helpTooltip?.classList.add('hidden');
    }
  });

  // Security: Sanitize and validate query
  function sanitizeQuery(query) {
    const dangerous = ['mutation', 'subscription', '__schema', '__type'];
    const lowerQuery = query.toLowerCase();
    if (dangerous.some(d => lowerQuery.includes(d))) {
      throw new Error("Only queries are allowed. Mutations and introspection are disabled for security.");
    }
    return query.trim();
  }

  function parseVariables(varsStr) {
    if (!varsStr || !varsStr.trim() || varsStr.trim() === '{}') return {};
    try {
      return JSON.parse(varsStr);
    } catch (e) {
      throw new Error(`Invalid JSON in variables: ${e.message}`);
    }
  }

  function updateResponseStatus(status, message) {
    if (!responseStatus) return;
    responseStatus.className = `response-status ${status}`;
    responseStatus.textContent = message;
  }

  async function executeQuery() {
    try {
      checkRateLimit('graphql-query', 30, 60000);
      
      const query = sanitizeQuery(queryInput.value);
      if (!query) {
        updateResponseStatus('error', 'Error: Empty query');
        responseEl.textContent = "Error: Query cannot be empty";
        return;
      }

      const variables = parseVariables(varsInput.value);
      updateResponseStatus('loading', 'Loading...');
      responseEl.textContent = "Loading...";

      const data = await gqlRequest(query, variables);
      
      // Handle nested user structure properly (Zone01 returns data.user)
      const formatted = formatDatesInObject(data);
      const jsonStr = JSON.stringify(formatted, null, 2);
      responseEl.textContent = jsonStr;
      updateResponseStatus('success', 'Success');
      
      // Syntax highlight JSON (simple version)
      highlightJSON(responseEl);
    } catch (err) {
      updateResponseStatus('error', 'Error');
      responseEl.textContent = `Error: ${escapeHtml(err.message)}`;
    }
  }

  // Simple JSON syntax highlighting
  function highlightJSON(element) {
    const text = element.textContent;
    if (!text || text.startsWith('Error:')) return;
    
    try {
      // Colorize JSON
      let html = escapeHtml(text)
        .replace(/"([^"]+)":/g, '<span style="color: #a855f7;">"$1"</span>:')
        .replace(/: ("[^"]*")/g, ': <span style="color: #34d399;">$1</span>')
        .replace(/: (\d+)/g, ': <span style="color: #38bdf8;">$1</span>')
        .replace(/: (true|false|null)/g, ': <span style="color: #f59e0b;">$1</span>')
        .replace(/(\{|\})/g, '<span style="color: #f97373;">$1</span>')
        .replace(/(\[|\])/g, '<span style="color: #f59e0b;">$1</span>');
      
      element.innerHTML = html;
    } catch {
      // Keep plain text if highlighting fails
    }
  }

  executeBtn.addEventListener("click", executeQuery);

  formatBtn.addEventListener("click", () => {
    try {
      const query = queryInput.value;
      // Better formatting
      let formatted = query
        .replace(/\s*\{\s*/g, ' {\n  ')
        .replace(/\s*\}\s*/g, '\n}')
        .replace(/\s*\(\s*/g, ' (')
        .replace(/\s*\)\s*/g, ')')
        .replace(/,\s*/g, ',\n    ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .split('\n')
        .map((line, i, arr) => {
          if (line.trim() === '') return '';
          const depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          const prevDepth = i > 0 ? (arr[i-1].match(/\{/g) || []).length - (arr[i-1].match(/\}/g) || []).length : 0;
          const indent = Math.max(0, (prevDepth + depth) * 2);
          return ' '.repeat(indent) + line.trim();
        })
        .filter(line => line.trim() || line === '')
        .join('\n');
      
      queryInput.value = formatted;
      updateLineNumbers(queryInput, queryLineNumbers);
      validateEditor(queryInput, queryStatus);
    } catch (err) {
      console.error("Format error:", err);
    }
  });

  clearBtn.addEventListener("click", () => {
    queryInput.value = "";
    varsInput.value = "{}";
    responseEl.textContent = "";
    responseEl.innerHTML = "";
    updateLineNumbers(queryInput, queryLineNumbers);
    updateLineNumbers(varsInput, varsLineNumbers);
    validateEditor(queryInput, queryStatus);
    validateEditor(varsInput, varsStatus);
    updateResponseStatus('', 'Ready');
  });

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(responseEl.textContent || '');
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copy';
      }, 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = responseEl.textContent || '';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copy';
      }, 2000);
    }
  });

  // Keyboard shortcuts
  [queryInput, varsInput].forEach(input => {
    input.addEventListener("keydown", (e) => {
      // Ctrl+Enter to execute
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        executeBtn.click();
      }
      // Tab key inserts 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.substring(0, start) + '  ' + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + 2;
      }
    });
  });

  // Initial validation
  validateEditor(queryInput, queryStatus);
  validateEditor(varsInput, varsStatus);
}

document.addEventListener("DOMContentLoaded", () => {
  ensureAuthenticated();
  initLogout();
  initObjectQueryForm();
  initGraphiQL();
  loadProfile();
});


