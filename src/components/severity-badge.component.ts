import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-severity-badge',
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses()">
      <span class="w-2 h-2 mr-2 animate-pulse" [class]="dotColor()"></span>
      <span class="tracking-widest uppercase font-mono text-xs font-bold">{{ severity() }}</span>
    </div>
  `
})
export class SeverityBadgeComponent {
  severity = input.required<string>();

  containerClasses = computed(() => {
    const base = "inline-flex items-center px-3 py-1 border border-l-4 shadow-sm select-none";
    switch (this.severity()) {
      case 'Critical': return `${base} bg-red-950/30 border-red-600 text-red-500`;
      case 'High': return `${base} bg-orange-950/30 border-orange-600 text-orange-500`;
      case 'Medium': return `${base} bg-yellow-950/30 border-yellow-600 text-yellow-500`;
      case 'Low': return `${base} bg-emerald-950/30 border-emerald-600 text-emerald-500`;
      default: return `${base} bg-gray-900 border-gray-600 text-gray-400`;
    }
  });

  dotColor = computed(() => {
    switch (this.severity()) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  });
}