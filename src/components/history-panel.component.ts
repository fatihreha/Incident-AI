import { Component, signal, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentHistoryItem } from '../services/gemini.service';
import { SeverityBadgeComponent } from './severity-badge.component';

@Component({
  selector: 'app-history-panel',
  imports: [CommonModule, SeverityBadgeComponent],
  template: `
    <div class="h-full flex flex-col bg-[#1e293b] border-l border-slate-700 shadow-2xl relative w-80 md:w-96">
      
      <!-- Header -->
      <div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <h2 class="text-sm font-bold text-white uppercase tracking-widest">
          <i class="fas fa-history mr-2 text-[#D4F34A]"></i> Case History
        </h2>
        <button (click)="close.emit()" class="text-slate-400 hover:text-white transition-colors">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- List -->
      <div class="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-2">
        @if (historyItems().length === 0) {
          <div class="flex flex-col items-center justify-center h-48 text-slate-500 opacity-50">
            <i class="fas fa-archive text-3xl mb-2"></i>
            <span class="text-xs">No saved incidents</span>
          </div>
        }

        @for (item of historyItems(); track item.id) {
          <div class="group relative bg-slate-900 border border-slate-700 hover:border-[#D4F34A] rounded-lg p-3 transition-all cursor-pointer shadow-sm hover:shadow-md"
               (click)="onSelect(item)">
            
            <div class="flex justify-between items-start mb-2">
              <span class="text-[10px] text-slate-500 font-mono">{{ formatDate(item.timestamp) }}</span>
              <app-severity-badge [severity]="item.analysis.severity" class="scale-75 origin-top-right" />
            </div>
            
            <h3 class="text-slate-200 font-bold text-sm mb-1 group-hover:text-[#D4F34A] transition-colors line-clamp-1">
              {{ item.analysis.category }}
            </h3>
            
            <p class="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">
              {{ item.analysis.rootCause }}
            </p>

            <div class="flex justify-between items-center border-t border-slate-800 pt-2 mt-2">
               <span class="text-[10px] text-slate-600 font-mono">ID: {{ item.id.slice(-6) }}</span>
               <button 
                 (click)="deleteItem($event, item.id)" 
                 class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-500 transition-all"
                 title="Delete Record">
                 <i class="fas fa-trash-alt text-xs"></i>
               </button>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="p-3 border-t border-slate-700 bg-slate-800 text-center">
        <button (click)="refresh()" class="text-xs text-[#D4F34A] hover:underline uppercase tracking-wider font-bold">
          <i class="fas fa-sync-alt mr-1"></i> Refresh List
        </button>
      </div>
    </div>
  `
})
export class HistoryPanelComponent {
  close = output<void>();
  selectItem = output<IncidentHistoryItem>();

  historyItems = signal<IncidentHistoryItem[]>([]);

  constructor() {
    this.refresh();
  }

  refresh() {
    try {
      const data = localStorage.getItem('incident_history');
      if (data) {
        this.historyItems.set(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  onSelect(item: IncidentHistoryItem) {
    this.selectItem.emit(item);
  }

  deleteItem(event: Event, id: string) {
    event.stopPropagation(); // Prevent triggering selection
    const updated = this.historyItems().filter(i => i.id !== id);
    this.historyItems.set(updated);
    localStorage.setItem('incident_history', JSON.stringify(updated));
  }
}