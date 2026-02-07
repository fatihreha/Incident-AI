import { Component, ElementRef, input, viewChild, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';

@Component({
  selector: 'app-confidence-gauge',
  imports: [CommonModule],
  template: `
    <div class="relative flex flex-col items-center">
      <div #chartContainer class="relative"></div>
      <div class="absolute bottom-0 flex flex-col items-center">
        <span class="text-2xl font-bold text-white tracking-tighter">{{ score() }}%</span>
        <span class="text-[9px] text-slate-500 font-mono uppercase tracking-widest font-bold">Confidence</span>
      </div>
    </div>
  `
})
export class ConfidenceGaugeComponent implements OnDestroy {
  score = input.required<number>();
  chartContainer = viewChild<ElementRef>('chartContainer');

  private width = 120;
  private height = 70; // Half circle roughly
  private radius = Math.min(this.width, this.height * 2) / 2;
  private margin = 10;

  constructor() {
    effect(() => {
      const container = this.chartContainer();
      const val = this.score();
      if (container) {
        this.drawChart(container.nativeElement, val);
      }
    });
  }

  ngOnDestroy() {
    const container = this.chartContainer();
    if (container) {
      d3.select(container.nativeElement).selectAll('*').remove();
    }
  }

  private drawChart(element: HTMLElement, value: number) {
    // Clear previous
    d3.select(element).selectAll('*').remove();

    const svg = d3.select(element)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', `translate(${this.width / 2},${this.height - 5})`);

    // Scale
    const scale = d3.scaleLinear()
      .domain([0, 100])
      .range([-Math.PI / 2, Math.PI / 2]);

    // Color interpolation
    let colorHex = '#D4F34A'; // Default Volt
    if (value < 50) colorHex = '#ef4444'; // Red
    else if (value < 80) colorHex = '#f59e0b'; // Amber

    // Background Arc (Grey track)
    const arcBg = d3.arc()
      .innerRadius(this.radius - 8)
      .outerRadius(this.radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    svg.append('path')
      .datum({ endAngle: Math.PI / 2 })
      .style('fill', '#334155') // Slate-700
      .attr('d', arcBg as any);

    // Foreground Arc (Value)
    const arcFg = d3.arc()
      .innerRadius(this.radius - 8)
      .outerRadius(this.radius)
      .startAngle(-Math.PI / 2)
      .cornerRadius(4);

    svg.append('path')
      .datum({ endAngle: scale(value) })
      .style('fill', colorHex)
      .style('filter', `drop-shadow(0 0 6px ${colorHex}80)`) // Glow effect
      .attr('d', arcFg as any)
      .transition()
      .duration(1000)
      .attrTween('d', function(d: any) {
        const i = d3.interpolate(-Math.PI / 2, d.endAngle);
        return function(t: any) {
          d.endAngle = i(t);
          return arcFg(d) as string;
        };
      } as any);
      
    // Needle (Optional - keeping it simple with just arcs for modern look)
  }
}