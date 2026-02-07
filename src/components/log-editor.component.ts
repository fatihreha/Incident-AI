import { Component, output, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';
import { AnalysisPersona } from '../services/gemini.service';

@Component({
  selector: 'app-log-editor',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tech-panel h-full flex flex-col p-1 overflow-hidden relative">
      
      <!-- Privacy Shield Overlay Effect -->
      <div *ngIf="isPrivacyMode()" class="absolute inset-0 pointer-events-none z-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-5"></div>

      <!-- Toolbar -->
      <div class="flex flex-wrap gap-2 justify-between items-center bg-slate-800 p-3 border-b border-slate-700 relative z-10">
        <div class="flex items-center gap-4 flex-grow">
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="flex gap-1.5">
               <div class="w-2.5 h-2.5 rounded-full transition-colors duration-500" [class.bg-emerald-500]="isPrivacyMode()" [class.bg-slate-600]="!isPrivacyMode()"></div>
               <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            </div>
            <h2 class="text-xs font-bold uppercase tracking-widest text-slate-400">
              /var/log/input_stream
            </h2>
          </div>

          <!-- Search / Grep Bar -->
          <div class="relative group flex-grow max-w-md">
            <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <i class="fas fa-search text-slate-500 text-xs group-focus-within:text-[#D4F34A] transition-colors"></i>
            </div>
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              placeholder="Filter logs (grep)..." 
              class="w-full bg-slate-900/50 border border-slate-700 text-slate-200 text-xs rounded-md py-1.5 pl-8 pr-8 focus:ring-1 focus:ring-[#D4F34A] focus:border-[#D4F34A] focus:outline-none transition-all placeholder-slate-600 font-mono"
            >
            @if (searchTerm()) {
              <button (click)="searchTerm.set('')" class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer">
                <i class="fas fa-times text-xs"></i>
              </button>
            }
          </div>
        </div>

        <div class="flex gap-2 items-center">
           
           <!-- Persona Selector -->
           <div class="relative group hidden xl:block mr-2">
             <div class="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded px-2 py-1">
               <i class="fas fa-user-tag text-[10px] text-slate-500"></i>
               <select 
                 [ngModel]="selectedPersona()" 
                 (ngModelChange)="selectedPersona.set($event)"
                 class="bg-transparent text-[10px] text-slate-300 font-bold uppercase tracking-wider border-none focus:ring-0 cursor-pointer appearance-none pr-4 outline-none">
                 <option value="Senior SRE">Senior SRE</option>
                 <option value="CTO / Executive">CTO / Executive</option>
                 <option value="Junior Developer">Junior Dev</option>
               </select>
               <i class="fas fa-chevron-down text-[8px] text-slate-500 absolute right-2 pointer-events-none"></i>
             </div>
           </div>

           <!-- Privacy Toggle -->
           <button 
            (click)="togglePrivacy()" 
            class="group px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider border transition-all rounded flex items-center gap-2"
            [class.bg-emerald-950]="isPrivacyMode()"
            [class.border-emerald-500]="isPrivacyMode()"
            [class.text-emerald-400]="isPrivacyMode()"
            [class.bg-slate-900]="!isPrivacyMode()"
            [class.border-slate-700]="!isPrivacyMode()"
            [class.text-slate-400]="!isPrivacyMode()"
            title="Toggle PII Masking (Redact IPs & Emails)">
            @if (isPrivacyMode()) {
              <i class="fas fa-shield-alt"></i> <span>SECURE</span>
            } @else {
              <i class="fas fa-shield-halved group-hover:text-emerald-400"></i> <span class="group-hover:text-emerald-400">PRIVACY OFF</span>
            }
          </button>

          <div class="w-[1px] h-6 bg-slate-700 mx-1"></div>

          <!-- Format JSON Button -->
          <button 
            (click)="formatJson()" 
            [disabled]="!logContent()"
            class="hidden sm:flex px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider bg-slate-900 border border-slate-700 hover:border-[#D4F34A] hover:text-[#D4F34A] text-slate-400 transition-all rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Prettify JSON">
            <i class="fas fa-code mr-1"></i> JSON
          </button>

          <!-- AIOps Integrations -->
          <button 
            (click)="loadSentryDemo()" 
            [disabled]="isLoadingDemo()"
            class="hidden md:flex group px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider bg-[#362D59]/50 border border-[#58449D] hover:bg-[#362D59] text-slate-300 hover:text-white transition-all rounded items-center gap-2 disabled:opacity-50">
            @if(isLoadingDemo() === 'sentry') {
              <i class="fas fa-circle-notch animate-spin text-white"></i>
            } @else {
              <i class="fab fa-sentry text-[#58449D] group-hover:text-white transition-colors"></i>
            }
            <span>Sentry</span>
          </button>

          <button 
            (click)="loadDatadogDemo()" 
            [disabled]="isLoadingDemo()"
            class="hidden md:flex group px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider bg-[#632CA6]/20 border border-[#632CA6] hover:bg-[#632CA6] text-slate-300 hover:text-white transition-all rounded items-center gap-2 disabled:opacity-50">
            @if(isLoadingDemo() === 'datadog') {
              <i class="fas fa-circle-notch animate-spin text-white"></i>
            } @else {
              <i class="fas fa-dog text-[#632CA6] group-hover:text-white transition-colors"></i>
            }
            <span>Datadog</span>
          </button>
          
          <button 
            (click)="clear()" 
            class="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider bg-slate-900 border border-slate-700 hover:border-red-500 hover:text-red-400 text-slate-400 transition-all rounded">
            Clear
          </button>
        </div>
      </div>

      <!-- Editor Area -->
      <div class="relative flex-grow bg-slate-900/50 flex flex-col min-h-0 z-0">
        
        <!-- View 1: Edit Mode (Default) -->
        @if (!searchTerm()) {
          <textarea 
            [(ngModel)]="logContent" 
            (keydown)="handleKeydown($event)"
            placeholder="// Paste stack trace, JSON logs, or raw telemetry here... (CTRL+ENTER to analyze)"
            class="w-full h-full bg-transparent border-none text-slate-200 font-mono text-sm p-4 focus:ring-0 resize-none leading-relaxed custom-scrollbar placeholder-slate-600 focus:bg-slate-900/80 transition-colors"
            spellcheck="false"
          ></textarea>
        } 
        
        <!-- View 2: Grep Mode (Filtered) -->
        @else {
          <div class="w-full h-full overflow-y-auto custom-scrollbar bg-slate-950/50 p-4 font-mono text-sm">
            @if (filteredLogs().length === 0) {
              <div class="flex flex-col items-center justify-center h-full text-slate-500 gap-2 opacity-50">
                 <i class="fas fa-filter-circle-xmark text-3xl"></i>
                 <span>No lines match "{{ searchTerm() }}"</span>
              </div>
            } @else {
              <div class="flex flex-col gap-0.5">
                @for (match of filteredLogs(); track match.line) {
                  <div class="flex gap-4 hover:bg-slate-800/50 rounded px-2 py-0.5 transition-colors group border-l-2 border-transparent hover:border-[#D4F34A]">
                    <span class="text-slate-600 select-none text-xs w-8 text-right pt-0.5 opacity-50">{{ match.line }}</span>
                    <!-- Using innerHTML to render the highlighted spans safely -->
                    <span class="text-slate-300 break-all whitespace-pre-wrap leading-relaxed" [innerHTML]="match.html"></span>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Image Preview Zone -->
        @if (selectedImage()) {
          <div class="h-24 bg-slate-800/80 border-t border-slate-700 p-2 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 shrink-0">
            <div class="relative group h-full aspect-square bg-slate-900 rounded border border-slate-600 overflow-hidden">
               <img [src]="selectedImage()" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Screenshot preview">
               <button (click)="removeImage()" class="absolute top-0.5 right-0.5 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full w-5 h-5 flex items-center justify-center transition-colors">
                 <i class="fas fa-times text-[10px]"></i>
               </button>
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold text-[#D4F34A] uppercase tracking-wide">Screenshot Attached</span>
              <span class="text-[10px] text-slate-400 font-mono">Will be analyzed with Multimodal AI</span>
            </div>
          </div>
        }
        
        <!-- Decoration lines -->
        <div class="absolute bottom-0 right-0 p-4 pointer-events-none opacity-5 z-0">
           <i class="fas fa-microchip text-6xl"></i>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="p-4 bg-slate-800 border-t border-slate-700 flex gap-3 relative z-10">
        
        <!-- Image Upload Button -->
        <div class="relative">
          <input 
            type="file" 
            #fileInput 
            (change)="onFileSelected($event)" 
            accept="image/*" 
            class="hidden"
          >
          <button 
            (click)="fileInput.click()"
            [disabled]="isAnalyzing()"
            class="h-full px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600 transition-colors flex flex-col items-center justify-center gap-1 min-w-[80px]"
            title="Attach Screenshot (Multimodal)">
            <i class="fas fa-image text-lg"></i>
            <span class="text-[9px] font-bold uppercase tracking-wider">IMG</span>
          </button>
        </div>

        <!-- Distinct Run Button -->
        <button 
          (click)="onSubmit()"
          [disabled]="(!logContent() && !selectedImage()) || isAnalyzing()"
          class="hidden sm:flex items-center justify-center gap-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 hover:border-indigo-400 rounded font-bold transition-all disabled:opacity-50 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 shadow-lg shadow-indigo-900/20"
          title="Start Analysis">
           <i class="fas fa-play"></i>
           <span class="text-xs uppercase tracking-wider">RUN</span>
        </button>

        <button 
          (click)="onSubmit()"
          [disabled]="(!logContent() && !selectedImage()) || isAnalyzing()"
          [class.opacity-50]="(!logContent() && !selectedImage()) || isAnalyzing()"
          class="flex-grow relative group overflow-hidden bg-[#D4F34A] hover:bg-[#c3e03e] disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-3.5 px-6 transition-all duration-200 rounded shadow-lg shadow-[#D4F34A]/10"
          title="Shortcut: CTRL + ENTER">
          
          <div class="relative z-10 flex items-center justify-center gap-3">
            @if (isAnalyzing()) {
              <span class="block w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></span>
              <span class="tracking-widest text-xs uppercase">AIOps Diagnosis Running...</span>
            } @else {
              <i class="fas fa-bolt"></i>
              <span class="tracking-widest text-xs uppercase">Analyze Incident</span>
            }
          </div>
        </button>
      </div>
    </div>
  `
})
export class LogEditorComponent {
  logContent = signal('');
  searchTerm = signal('');
  selectedImage = signal<string | null>(null);
  selectedPersona = signal<AnalysisPersona>('Senior SRE');
  
  isAnalyzing = signal(false);
  isLoadingDemo = signal<'sentry' | 'datadog' | null>(null);
  
  // New Feature: Privacy Mode
  isPrivacyMode = signal(false);

  private toastService = inject(ToastService);
  
  // Output emits text, optional image, and persona
  analyze = output<{ text: string, image?: string, persona: AnalysisPersona }>();

  // Computed filtered logs for Grep Mode
  filteredLogs = computed(() => {
    const term = this.searchTerm();
    const content = this.logContent();
    
    if (!term || !content) return [];

    const lines = content.split('\n');
    
    // Helper to escape HTML characters to prevent XSS in log view
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    return lines
      .map((line, index) => ({ line: index + 1, text: line }))
      .filter(item => item.text.toLowerCase().includes(term.toLowerCase()))
      .map(item => {
        const parts = item.text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        const html = parts.map(part => {
          if (part.toLowerCase() === term.toLowerCase()) {
            return `<span class="bg-[#D4F34A] text-slate-900 font-bold px-0.5 rounded-sm shadow-sm">${escapeHtml(part)}</span>`;
          } else {
            return escapeHtml(part);
          }
        }).join('');
        return { ...item, html };
      });
  });

  handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'Enter') {
      this.onSubmit();
    }
  }

  togglePrivacy() {
    this.isPrivacyMode.update(v => !v);
    if (this.isPrivacyMode()) {
      this.toastService.show('Privacy Mode: IPs & Emails will be redacted.', 'success');
    } else {
      this.toastService.show('Privacy Mode Disabled: Full logs will be sent.', 'info');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.selectedImage.set(result);
        this.toastService.show('Screenshot attached successfully', 'success');
      };
      
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedImage.set(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  formatJson() {
    const content = this.logContent().trim();
    if (!content) return;

    try {
      const json = JSON.parse(content);
      const formatted = JSON.stringify(json, null, 2);
      this.logContent.set(formatted);
      this.toastService.show('JSON formatted successfully', 'success');
    } catch (e) {
      this.toastService.show('Invalid JSON detected', 'error');
    }
  }

  sanitizeLogs(text: string): string {
    if (!text) return '';
    
    // 1. Redact Emails
    let sanitized = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    
    // 2. Redact IPv4 (Simple regex to avoid false positives on version numbers)
    // Looks for 3 dots surrounded by 1-3 digits
    sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');
    
    return sanitized;
  }

  onSubmit() {
    let finalLog = this.logContent();

    if (this.isPrivacyMode()) {
      finalLog = this.sanitizeLogs(finalLog);
    }

    if (finalLog || this.selectedImage()) {
      this.analyze.emit({ 
        text: finalLog,
        image: this.selectedImage() || undefined,
        persona: this.selectedPersona()
      });
    }
  }

  clear() {
    this.logContent.set('');
    this.searchTerm.set('');
    this.removeImage();
    this.toastService.show('Editor cleared', 'info');
  }

  loadSentryDemo() {
    this.isLoadingDemo.set('sentry');
    setTimeout(() => {
      const sentryLog = `{"event_id":"847291048201","user":{"email":"admin@corp.com","ip_address":"192.168.1.45"},"level":"error","exception":{"values":[{"type":"ChunkLoadError","value":"Loading chunk 3 failed.","stacktrace":{"frames":[{"filename":"main.js","lineno":142}]}}]}}`;
      this.logContent.set(sentryLog);
      this.isLoadingDemo.set(null);
      this.toastService.show('Fetched incident #847291048201 from Sentry', 'success');
    }, 800);
  }

  loadDatadogDemo() {
    this.isLoadingDemo.set('datadog');
    setTimeout(() => {
      const ddLog = `[ERROR] [payment-service] ConnectionPool limit reached for 'redis-cache-cluster'. IP: 10.0.0.5
[WARN] [payment-service] Retry attempt 1/3 failed. Sent alert to ops-team@finance.com
[ERROR] [payment-service] RedisTimeoutError: Timeout waiting for connection.`;
      this.logContent.set(ddLog);
      this.isLoadingDemo.set(null);
      this.toastService.show('Streamed 3 events from Datadog', 'success');
    }, 800);
  }
}