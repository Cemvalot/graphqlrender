const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Format number as KB or MB if large enough
 */
export function formatBytes(bytes) {
  if (bytes === 0) return "0";
  if (bytes < 1024) return bytes.toLocaleString();
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(num) {
  if (num === 0) return "0";
  if (num < 1000) return num.toLocaleString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

/**
 * Improved line chart for XP over time with better formatting and labels.
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

  // Format date helper
  function formatDate(date) {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${day} ${month}`;
  }

  // Dynamic sizing based on container - more compact
  const containerRect = container.getBoundingClientRect();
  const width = Math.max(containerRect.width || 480, 300);
  const height = Math.min(Math.max(containerRect.height || 220, 180), 280); // Max height constraint
  const padding = { top: 20, right: 25, bottom: 40, left: 50 }; // Reduced padding

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

  // Axes group
  const axis = document.createElementNS(SVG_NS, "g");
  axis.setAttribute("class", "chart__axis");

  // X-axis line
  const xAxis = document.createElementNS(SVG_NS, "line");
  xAxis.setAttribute("x1", padding.left);
  xAxis.setAttribute("y1", height - padding.bottom);
  xAxis.setAttribute("x2", width - padding.right);
  xAxis.setAttribute("y2", height - padding.bottom);
  xAxis.setAttribute("stroke", "rgba(148, 163, 184, 0.3)");
  xAxis.setAttribute("stroke-width", "1.5");
  axis.appendChild(xAxis);

  // Y-axis line
  const yAxis = document.createElementNS(SVG_NS, "line");
  yAxis.setAttribute("x1", padding.left);
  yAxis.setAttribute("y1", padding.top);
  yAxis.setAttribute("x2", padding.left);
  yAxis.setAttribute("y2", height - padding.bottom);
  yAxis.setAttribute("stroke", "rgba(148, 163, 184, 0.3)");
  yAxis.setAttribute("stroke-width", "1.5");
  axis.appendChild(yAxis);

  // Y-axis labels and grid lines
  const yTicks = 5;
  const yTickStep = (maxVal - minVal) / (yTicks - 1);
  for (let i = 0; i < yTicks; i++) {
    const value = minVal + (yTickStep * i);
    const y = yScale(value);
    
    // Grid line
    const gridLine = document.createElementNS(SVG_NS, "line");
    gridLine.setAttribute("x1", padding.left);
    gridLine.setAttribute("y1", y);
    gridLine.setAttribute("x2", width - padding.right);
    gridLine.setAttribute("y2", y);
    gridLine.setAttribute("stroke", "rgba(148, 163, 184, 0.15)");
    gridLine.setAttribute("stroke-width", "1");
    gridLine.setAttribute("stroke-dasharray", "2,2");
    axis.appendChild(gridLine);
    
    // Tick mark
    const tick = document.createElementNS(SVG_NS, "line");
    tick.setAttribute("x1", padding.left - 5);
    tick.setAttribute("y1", y);
    tick.setAttribute("x2", padding.left);
    tick.setAttribute("y2", y);
    tick.setAttribute("stroke", "rgba(148, 163, 184, 0.5)");
    tick.setAttribute("stroke-width", "1.5");
    axis.appendChild(tick);

    // Y-axis label
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", padding.left - 10);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart__axis-label");
    label.setAttribute("fill", "rgba(148, 163, 184, 0.9)");
    label.setAttribute("font-size", "11");
    label.setAttribute("font-weight", "500");
    label.textContent = formatNumber(value);
    axis.appendChild(label);
  }

  // X-axis labels (show first, middle, last dates)
  const xLabelCount = Math.min(sorted.length, 5);
  const xLabelStep = Math.max(1, Math.floor(sorted.length / xLabelCount));
  for (let i = 0; i < sorted.length; i += xLabelStep) {
    if (i === sorted.length - 1 || i === 0 || i === Math.floor(sorted.length / 2)) {
      const point = sorted[i];
      const x = xScale(point.date.getTime());
      
      const tick = document.createElementNS(SVG_NS, "line");
      tick.setAttribute("x1", x);
      tick.setAttribute("y1", height - padding.bottom);
      tick.setAttribute("x2", x);
      tick.setAttribute("y2", height - padding.bottom + 5);
      tick.setAttribute("stroke", "rgba(148, 163, 184, 0.5)");
      tick.setAttribute("stroke-width", "1.5");
      axis.appendChild(tick);

      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", x);
      label.setAttribute("y", height - padding.bottom + 20);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "rgba(148, 163, 184, 0.8)");
      label.setAttribute("font-size", "10");
      label.textContent = formatDate(point.date);
      axis.appendChild(label);
    }
  }

  svg.appendChild(axis);

  // Area under the line (gradient fill)
  const areaPath = document.createElementNS(SVG_NS, "path");
  const areaD = sorted
    .map((point, i) => {
      const x = xScale(point.date.getTime());
      const y = yScale(point.value);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ") + 
    ` L ${xScale(sorted[sorted.length - 1].date.getTime())} ${height - padding.bottom}` +
    ` L ${xScale(sorted[0].date.getTime())} ${height - padding.bottom} Z`;
  areaPath.setAttribute("d", areaD);
  areaPath.setAttribute("fill", "url(#areaGradient)");
  areaPath.setAttribute("opacity", "0.2");
  
  // Gradient definition
  const defs = document.createElementNS(SVG_NS, "defs");
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  gradient.setAttribute("id", "areaGradient");
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "0%");
  gradient.setAttribute("y2", "100%");
  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#38bdf8");
  stop1.setAttribute("stop-opacity", "0.4");
  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#38bdf8");
  stop2.setAttribute("stop-opacity", "0");
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  svg.appendChild(areaPath);

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
  path.setAttribute("stroke-width", "2.5");
  svg.appendChild(path);

  // Points + hover tooltips
  sorted.forEach((point) => {
    const x = xScale(point.date.getTime());
    const y = yScale(point.value);

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 5);
    circle.setAttribute("class", "chart__point");
    circle.style.cursor = "pointer";

    const tooltip = document.createElement("div");
    tooltip.className = "chart__tooltip hidden";
    const dateStr = formatDate(point.date);
    tooltip.textContent = `${dateStr}: ${formatNumber(point.value)} XP`;
    container.appendChild(tooltip);

    circle.addEventListener("mouseenter", () => {
      // First, make tooltip visible (but off-screen) to measure it
      tooltip.style.visibility = "hidden";
      tooltip.style.display = "block";
      tooltip.classList.remove("hidden");
      
      // Get container and SVG dimensions
      const containerRect = container.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      
      // Calculate the actual pixel position of the point
      // x and y are in SVG viewBox coordinates, need to scale to actual SVG size
      const svgActualWidth = svgRect.width;
      const svgActualHeight = svgRect.height;
      
      // Scale coordinates from viewBox to actual SVG size
      const xScaled = (x / width) * svgActualWidth;
      const yScaled = (y / height) * svgActualHeight;
      
      // Get SVG position relative to container
      const svgLeft = svgRect.left - containerRect.left;
      const svgTop = svgRect.top - containerRect.top;
      
      // Calculate absolute position of point in container
      const pointX = svgLeft + xScaled;
      const pointY = svgTop + yScaled;
      
      // Get tooltip dimensions now that it's rendered
      const tooltipRect = tooltip.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width;
      const tooltipHeight = tooltipRect.height;
      
      // Determine if point is in upper portion (show tooltip below) or lower (show above)
      const yPercent = y / height;
      let tooltipOffsetY = (yPercent < 0.35) ? 30 : -50; // Show below if in top 35%
      
      // Calculate initial tooltip position (centered on point)
      let tooltipX = pointX;
      let tooltipY = pointY + tooltipOffsetY;
      
      // Check boundaries and adjust if needed
      const margin = 10; // Minimum margin from edges
      
      // Check right boundary - if tooltip would overflow right
      const rightEdge = tooltipX + (tooltipWidth / 2);
      if (rightEdge > containerRect.width - margin) {
        // Shift tooltip left so it fits
        tooltipX = containerRect.width - margin - (tooltipWidth / 2);
      }
      
      // Check left boundary - if tooltip would overflow left
      const leftEdge = tooltipX - (tooltipWidth / 2);
      if (leftEdge < margin) {
        // Shift tooltip right so it fits
        tooltipX = margin + (tooltipWidth / 2);
      }
      
      // Check bottom boundary (if tooltip is below point)
      if (tooltipOffsetY > 0 && tooltipY + tooltipHeight > containerRect.height - margin) {
        // Move tooltip above point instead
        tooltipOffsetY = -50;
        tooltipY = pointY + tooltipOffsetY;
      }
      
      // Check top boundary (if tooltip is above point)
      if (tooltipOffsetY < 0 && tooltipY - tooltipHeight < margin) {
        // Move tooltip below point instead
        tooltipOffsetY = 30;
        tooltipY = pointY + tooltipOffsetY;
      }
      
      // Now make tooltip visible and position it
      tooltip.style.visibility = "visible";
      tooltip.style.display = "block";
      tooltip.style.left = `${tooltipX}px`;
      tooltip.style.top = `${tooltipY}px`;
      tooltip.style.transform = "translateX(-50%)"; // Center horizontally on point
      
      circle.setAttribute("r", 6);
    });

    circle.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
      circle.setAttribute("r", 5);
    });

    svg.appendChild(circle);
  });

  container.appendChild(svg);
}

/**
 * Improved donut chart for audit Done/Received with better layout.
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

  // Dynamic sizing based on container - more compact
  const containerRect = container.getBoundingClientRect();
  const size = Math.min(containerRect.width || 220, containerRect.height || 220, 240); // Reduced max size
  const width = size;
  const height = size;
  const radius = size / 2 - 18; // Reduced margin
  const innerRadius = radius * 0.55;
  const centerX = width / 2;
  const centerY = height / 2;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("class", "chart__svg");
  svg.style.width = "100%";
  svg.style.maxWidth = "260px";
  svg.style.height = "auto";
  svg.style.margin = "0 auto";

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

  // Center label - show ratio (Done / Received) with better formatting
  const ratio = doneVal === 0 ? 0 : doneVal / (receivedVal || 1);
  
  // Main ratio label
  const ratioLabel = document.createElementNS(SVG_NS, "text");
  ratioLabel.setAttribute("text-anchor", "middle");
  ratioLabel.setAttribute("dominant-baseline", "central");
  ratioLabel.setAttribute("y", "-8");
  ratioLabel.setAttribute("font-size", "24");
  ratioLabel.setAttribute("font-weight", "600");
  ratioLabel.setAttribute("fill", "#e5e7eb");
  ratioLabel.textContent = ratio.toFixed(2);
  group.appendChild(ratioLabel);

  // "Ratio" subtitle
  const subtitle = document.createElementNS(SVG_NS, "text");
  subtitle.setAttribute("text-anchor", "middle");
  subtitle.setAttribute("dominant-baseline", "central");
  subtitle.setAttribute("y", "12");
  subtitle.setAttribute("font-size", "11");
  subtitle.setAttribute("fill", "rgba(148, 163, 184, 0.7)");
  subtitle.textContent = "Ratio";
  group.appendChild(subtitle);

  container.appendChild(svg);

  // Improved legend with better layout - more compact
  const legend = document.createElement("div");
  legend.className = "chart__legend";
  legend.style.display = "flex";
  legend.style.flexDirection = "column";
  legend.style.gap = "8px"; // Reduced from 10px
  legend.style.marginTop = "12px"; // Reduced from 16px
  legend.style.fontSize = "12px"; // Reduced from 13px
  
  const doneItem = document.createElement("div");
  doneItem.className = "chart__legend-item";
  doneItem.style.display = "flex";
  doneItem.style.alignItems = "center";
  doneItem.style.gap = "8px";
  doneItem.style.justifyContent = "center";
  doneItem.innerHTML = `
    <span class="chart__legend-swatch chart__legend-swatch--up"></span>
    <span style="color: var(--color-text-muted);">Done:</span>
    <span style="font-weight: 600; color: var(--color-text);">${formatBytes(doneVal)}</span>
  `;
  
  const receivedItem = document.createElement("div");
  receivedItem.className = "chart__legend-item";
  receivedItem.style.display = "flex";
  receivedItem.style.alignItems = "center";
  receivedItem.style.gap = "8px";
  receivedItem.style.justifyContent = "center";
  receivedItem.innerHTML = `
    <span class="chart__legend-swatch chart__legend-swatch--down"></span>
    <span style="color: var(--color-text-muted);">Received:</span>
    <span style="font-weight: 600; color: var(--color-text);">${formatBytes(receivedVal)}</span>
  `;
  
  legend.appendChild(doneItem);
  legend.appendChild(receivedItem);
  container.appendChild(legend);
}

/**
 * Horizontal bar chart for skills distribution (bonus graph #3)
 * Better for displaying full skill names with wrapping
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

  // Sort by amount descending
  const sorted = [...skills]
    .map(s => ({ ...s, label: s.type.replace(/^skill_/, "").replace(/_/g, " ") }))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 8); // Top 8 skills (reduced for compactness)

  const maxAmount = Math.max(...sorted.map(s => s.amount || 0), 1);

  // Dynamic sizing based on number of skills - more compact
  const containerRect = container.getBoundingClientRect();
  const width = Math.max(containerRect.width || 480, 300);
  const barHeight = 24; // Reduced from 28
  const barSpacing = 6; // Reduced from 8
  const labelWidth = 100; // Reduced from 120
  const valueWidth = 45; // Reduced from 50
  const chartWidth = width - labelWidth - valueWidth - 30; // Reduced padding
  const padding = { top: 8, right: 15, bottom: 8, left: labelWidth + 8 }; // More compact padding
  const totalHeight = Math.min(
    sorted.length * (barHeight + barSpacing) + padding.top + padding.bottom,
    280 // Max height to prevent overflow
  );

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("class", "chart__svg");
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.minHeight = `${totalHeight}px`;

  sorted.forEach((skill, i) => {
    const y = padding.top + i * (barHeight + barSpacing);
    const barW = ((skill.amount || 0) / maxAmount) * chartWidth;

    // Skill label (left side) - more compact
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", 0);
    label.setAttribute("y", y + barHeight / 2);
    label.setAttribute("dy", "0.35em");
    label.setAttribute("text-anchor", "start");
    label.setAttribute("font-size", "11"); // Reduced from 12
    label.setAttribute("fill", "rgba(148, 163, 184, 0.9)");
    label.setAttribute("font-weight", "500");
    // Truncate long labels to fit better
    const labelText = skill.label.length > 12 ? skill.label.substring(0, 12) + "…" : skill.label;
    label.textContent = labelText;
    svg.appendChild(label);

    // Bar background
    const bgRect = document.createElementNS(SVG_NS, "rect");
    bgRect.setAttribute("x", padding.left);
    bgRect.setAttribute("y", y);
    bgRect.setAttribute("width", chartWidth);
    bgRect.setAttribute("height", barHeight);
    bgRect.setAttribute("rx", "6");
    bgRect.setAttribute("fill", "rgba(15, 23, 42, 0.6)");
    svg.appendChild(bgRect);

    // Bar (colored)
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", padding.left);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barW);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("rx", "6");
    rect.setAttribute("class", "chart__bar");
    rect.setAttribute("fill", `hsl(${i * 36}, 70%, 55%)`);
    svg.appendChild(rect);

    // Value label (on bar or after) - more compact
    const valueLabel = document.createElementNS(SVG_NS, "text");
    const valueX = padding.left + Math.max(barW + 6, 6);
    valueLabel.setAttribute("x", valueX);
    valueLabel.setAttribute("y", y + barHeight / 2);
    valueLabel.setAttribute("dy", "0.35em");
    valueLabel.setAttribute("text-anchor", "start");
    valueLabel.setAttribute("font-size", "10"); // Reduced from 11
    valueLabel.setAttribute("fill", barW > 35 ? "#e5e7eb" : "rgba(148, 163, 184, 0.9)");
    valueLabel.setAttribute("font-weight", "600");
    valueLabel.textContent = formatNumber(skill.amount || 0);
    svg.appendChild(valueLabel);
  });

  container.appendChild(svg);
}


