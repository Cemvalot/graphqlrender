/**
 * Graphs module tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderXpOverTimeLineChart, renderAuditDonutChart, renderSkillsBarChart } from '../src/graphs.js';

describe('Graphs Module', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '500px';
    container.style.height = '300px';
    document.body.appendChild(container);
  });

  describe('renderXpOverTimeLineChart', () => {
    it('should render chart with data', () => {
      const data = [
        { date: new Date('2024-01-01'), value: 100, label: 'Jan 2024' },
        { date: new Date('2024-02-01'), value: 200, label: 'Feb 2024' }
      ];

      renderXpOverTimeLineChart(container, data);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(container.querySelector('.chart__line')).toBeTruthy();
    });

    it('should show empty message when no data', () => {
      renderXpOverTimeLineChart(container, []);
      expect(container.textContent).toContain('Not enough XP data');
    });
  });

  describe('renderAuditDonutChart', () => {
    it('should render donut chart', () => {
      renderAuditDonutChart(container, 1000, 500);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(container.querySelector('.chart__slice--up')).toBeTruthy();
      expect(container.querySelector('.chart__slice--down')).toBeTruthy();
    });

    it('should show empty message when total is zero', () => {
      renderAuditDonutChart(container, 0, 0);
      expect(container.textContent).toContain('No audit data');
    });
  });

  describe('renderSkillsBarChart', () => {
    it('should render bar chart with skills', () => {
      const skills = [
        { type: 'skill_javascript', amount: 1000 },
        { type: 'skill_graphql', amount: 500 }
      ];

      renderSkillsBarChart(container, skills);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(container.querySelectorAll('rect').length).toBeGreaterThan(0);
    });

    it('should show empty message when no skills', () => {
      renderSkillsBarChart(container, []);
      expect(container.textContent).toContain('No skill data');
    });
  });
});

