const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Format number as KB or MB if large enough
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0";
  if (bytes < 1024) return bytes.toLocaleString();
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num) {
  if (num === 0) return "0";
  if (num < 1000) return num.toLocaleString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

/**
 * Simple line chart for XP over time.
 * data: [{ date: Date, value: number }]
 */
export function renderXpOverTimeLineChart(container, data) {
  container.innerHTML = "";

  if (!data || data.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text--muted";
    empty.textContent = "Not enough XP data to plot.";
    container.appendChild(empty);
    return;
  }

  // Dynamic sizing based on container
  const containerRect = container.getBoundingClientRect();
  const width = Math.max(containerRect.width || 480, 300);
  const height = Math.max(containerRect.height || 220, 180);
  const padding = { top: 20, right: 40, bottom: 35, left: 50 };

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("class", "chart__svg");
  svg.style.width = "100%";
  svg.style.height = "auto";

  // Sort by date
  const sorted = [...data].sort((a, b) => a.date - b.date);

  const values = sorted.map((d) => d.value);
  const minVal = 0;
  const maxVal = Math.max(...values, 1);

  const dates = sorted.map((d) => d.date.getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);

  const xScale = (t) =>
    padding.left +
    ((t - minDate) / (maxDate - minDate || 1)) *
      (width - padding.left - padding.right);
  const yScale = (v) =>
    height -
    padding.bottom -
    ((v - minVal) / (maxVal - minVal || 1)) *
      (height - padding.top - padding.bottom);

  // Axes
  const axis = document.createElementNS(SVG_NS, "g");
  axis.setAttribute("class", "chart__axis");

  const xAxis = document.createElementNS(SVG_NS, "line");
  xAxis.setAttribute("x1", padding.left);
  xAxis.setAttribute("y1", height - padding.bottom);
  xAxis.setAttribute("x2", width - padding.right);
  xAxis.setAttribute("y2", height - padding.bottom);
  axis.appendChild(xAxis);

  const yAxis = document.createElementNS(SVG_NS, "line");
  yAxis.setAttribute("x1", padding.left);
  yAxis.setAttribute("y1", padding.top);
  yAxis.setAttribute("x2", padding.left);
  yAxis.setAttribute("y2", height - padding.bottom);
  axis.appendChild(yAxis);

  // Y-axis labels
  const yTicks = 5;
  const yTickStep = (maxVal - minVal) / (yTicks - 1);
  for (let i = 0; i < yTicks; i++) {
    const value = minVal + (yTickStep * i);
    const y = yScale(value);
    
    const tick = document.createElementNS(SVG_NS, "line");
    tick.setAttribute("x1", padding.left - 4);
    tick.setAttribute("y1", y);
    tick.setAttribute("x2", padding.left);
    tick.setAttribute("y2", y);
    tick.setAttribute("stroke", "rgba(148, 163, 184, 0.4)");
    tick.setAttribute("stroke-width", "1");
    axis.appendChild(tick);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", padding.left - 8);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart__axis-label");
    label.setAttribute("fill", "rgba(148, 163, 184, 0.8)");
    label.setAttribute("font-size", "11");
    label.textContent = formatNumber(value);
    axis.appendChild(label);
  }

  svg.appendChild(axis);

  // Line path
  const path = document.createElementNS(SVG_NS, "path");
  const d = sorted
    .map((point, i) => {
      const x = xScale(point.date.getTime());
      const y = yScale(point.value);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("class", "chart__line");
  svg.appendChild(path);

  // Points + hover tooltips
  sorted.forEach((point) => {
    const x = xScale(point.date.getTime());
    const y = yScale(point.value);

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 4);
    circle.setAttribute("class", "chart__point");

    const tooltip = document.createElement("div");
    tooltip.className = "chart__tooltip hidden";
    tooltip.textContent = `${point.label}: ${formatNumber(point.value)} XP`;
    container.appendChild(tooltip);

    circle.addEventListener("mouseenter", () => {
      tooltip.classList.remove("hidden");
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${((x / width) * rect.width).toFixed(0)}px`;
      tooltip.style.top = `${((y / height) * rect.height).toFixed(0)}px`;
    });

    circle.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
    });

    svg.appendChild(circle);
  });

  container.appendChild(svg);
}

/**
 * Donut chart for audit Done/Received.
 */
export function renderAuditDonutChart(container, done, received) {
  container.innerHTML = "";

  const doneVal = Number(done) || 0;
  const receivedVal = Number(received) || 0;
  const total = doneVal + receivedVal;

  if (total === 0) {
    const empty = document.createElement("p");
    empty.className = "text--muted";
    empty.textContent = "No audit data available.";
    container.appendChild(empty);
    return;
  }

  // Dynamic sizing based on container
  const containerRect = container.getBoundingClientRect();
  const size = Math.min(containerRect.width || 220, containerRect.height || 220, 280);
  const width = size;
  const height = size;
  const radius = size / 2 - 10;
  const innerRadius = radius * 0.6;
  const centerX = width / 2;
  const centerY = height / 2;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("class", "chart__svg");
  svg.style.width = "100%";
  svg.style.maxWidth = "280px";
  svg.style.height = "auto";

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("transform", `translate(${centerX}, ${centerY})`);
  svg.appendChild(group);

  // Helper to create donut arc path
  function arcPath(startAngle, endAngle) {
    const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;

    const x1 = radius * Math.cos(startAngle);
    const y1 = radius * Math.sin(startAngle);
    const x2 = radius * Math.cos(endAngle);
    const y2 = radius * Math.sin(endAngle);

    const x3 = innerRadius * Math.cos(endAngle);
    const y3 = innerRadius * Math.sin(endAngle);
    const x4 = innerRadius * Math.cos(startAngle);
    const y4 = innerRadius * Math.sin(startAngle);

    return [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z"
    ].join(" ");
  }

  const doneAngle = (doneVal / total) * Math.PI * 2;
  const receivedAngle = (receivedVal / total) * Math.PI * 2;

  // Done slice (green)
  const donePath = document.createElementNS(SVG_NS, "path");
  donePath.setAttribute("d", arcPath(0, doneAngle));
  donePath.setAttribute("class", "chart__slice chart__slice--up");
  group.appendChild(donePath);

  // Received slice (red/pink)
  const receivedPath = document.createElementNS(SVG_NS, "path");
  receivedPath.setAttribute("d", arcPath(doneAngle, doneAngle + receivedAngle));
  receivedPath.setAttribute("class", "chart__slice chart__slice--down");
  group.appendChild(receivedPath);

  // Center label - show ratio (Done / Received)
  const ratio = doneVal === 0 ? 0 : doneVal / (receivedVal || 1);
  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "central");
  label.setAttribute("class", "chart__label");
  label.textContent = ratio.toFixed(2);
  group.appendChild(label);

  // Legend with KB/MB formatting
  const legend = document.createElement("div");
  legend.className = "chart__legend";
  legend.innerHTML = `
    <span class="chart__legend-item">
      <span class="chart__legend-swatch chart__legend-swatch--up"></span>
      Done: ${formatBytes(doneVal)}
    </span>
    <span class="chart__legend-item">
      <span class="chart__legend-swatch chart__legend-swatch--down"></span>
      Received: ${formatBytes(receivedVal)}
    </span>
  `;

  container.appendChild(svg);
  container.appendChild(legend);
}

/**
 * Bar chart for skills distribution (bonus graph #3)
 */
export function renderSkillsBarChart(container, skills) {
  container.innerHTML = "";

  if (!skills || skills.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text--muted";
    empty.textContent = "No skill data available.";
    container.appendChild(empty);
    return;
  }

  // Dynamic sizing
  const containerRect = container.getBoundingClientRect();
  const width = Math.max(containerRect.width || 480, 300);
  const height = Math.max(containerRect.height || 200, 150);
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("class", "chart__svg");
  svg.style.width = "100%";
  svg.style.height = "auto";

  // Sort by amount descending
  const sorted = [...skills]
    .map(s => ({ ...s, label: s.type.replace(/^skill_/, "") }))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 8); // Top 8 skills

  const maxAmount = Math.max(...sorted.map(s => s.amount || 0), 1);
  const barWidth = (width - padding.left - padding.right) / sorted.length - 4;
  const barHeight = height - padding.top - padding.bottom;

  sorted.forEach((skill, i) => {
    const x = padding.left + i * (barWidth + 4);
    const barH = ((skill.amount || 0) / maxAmount) * barHeight;
    const y = height - padding.bottom - barH;

    // Bar
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barH);
    rect.setAttribute("class", "chart__bar");
    rect.setAttribute("fill", `hsl(${i * 45}, 70%, 55%)`);
    svg.appendChild(rect);

    // Label
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", x + barWidth / 2);
    label.setAttribute("y", height - padding.bottom + 14);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "10");
    label.setAttribute("fill", "rgba(148, 163, 184, 0.8)");
    label.textContent = skill.label.length > 8 ? skill.label.substring(0, 7) + "…" : skill.label;
    svg.appendChild(label);

    // Value on bar
    if (barH > 15) {
      const valueLabel = document.createElementNS(SVG_NS, "text");
      valueLabel.setAttribute("x", x + barWidth / 2);
      valueLabel.setAttribute("y", y - 4);
      valueLabel.setAttribute("text-anchor", "middle");
      valueLabel.setAttribute("font-size", "11");
      valueLabel.setAttribute("fill", "#e5e7eb");
      valueLabel.setAttribute("font-weight", "500");
      valueLabel.textContent = formatNumber(skill.amount || 0);
      svg.appendChild(valueLabel);
    }

    // Hover tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "chart__tooltip hidden";
    tooltip.textContent = `${skill.label}: ${formatBytes(skill.amount || 0)}`;
    container.appendChild(tooltip);

    rect.addEventListener("mouseenter", () => {
      tooltip.classList.remove("hidden");
      const rectBounds = rect.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();
      tooltip.style.left = `${rectBounds.left - containerBounds.left + rectBounds.width / 2}px`;
      tooltip.style.top = `${rectBounds.top - containerBounds.top - 30}px`;
    });

    rect.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
    });
  });

  container.appendChild(svg);
}


