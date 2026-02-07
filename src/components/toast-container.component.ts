import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto min-w-[300px] max-w-sm rounded shadow-lg border p-4 flex items-start gap-3 animate-in slide-in-from-right fade-in duration-300"
          [class.bg-slate-900]="true"
          [class.border-emerald-500]="toast.type === 'success'"
          [class.border-red-500]="toast.type === 'error'"
          [class.border-blue-500]="toast.type === 'info'"
        >
          <!-- Icon -->
          <div class="mt-0.5">
            @if (toast.type === 'success') {
              <i class="fas fa-check-circle text-emerald-400 text-lg"></i>
            } @else if (toast.type === 'error') {
              <i class="fas fa-exclamation-circle text-red-400 text-lg"></i>
            } @else {
              <i class="fas fa-info-circle text-blue-400 text-lg"></i>
            }
          </div>
          
          <!-- Content -->
          <div class="flex-grow">
            <h4 class="text-sm font-bold text-white uppercase tracking-wide mb-0.5">
              {{ toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Info' }}
            </h4>
            <p class="text-xs text-slate-300">{{ toast.message }}</p>
          </div>

          <!-- Close -->
          <button (click)="toastService.remove(toast.id)" class="text-slate-500 hover:text-white transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}