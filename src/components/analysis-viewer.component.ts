import { Component, input, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IncidentAnalysis, GeminiService, IncidentHistoryItem } from '../services/gemini.service';
import { SeverityBadgeComponent } from './severity-badge.component';
import { ConfidenceGaugeComponent } from './confidence-gauge.component';
import { MarkdownPipe } from '../pipes/markdown.pipe';
import { ToastService } from '../services/toast.service';
import { Chat } from '@google/genai';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

@Component({
  selector: 'app-analysis-viewer',
  imports: [CommonModule, SeverityBadgeComponent, FormsModule, ConfidenceGaugeComponent, MarkdownPipe],
  template: `
    <div class="tech-panel h-full flex flex-col overflow-hidden relative">
      <!-- Decorator line -->
      <div class="h-1 bg-gradient-to-r from-transparent via-[#D4F34A] to-transparent opacity-70"></div>

      <!-- Tab Navigation -->
      <div class="flex border-b border-slate-700 bg-slate-800/50">
        <button 
          (click)="activeTab.set('report')"
          [class.text-[#D4F34A]]="activeTab() === 'report'"
          [class.border-b-2]="activeTab() === 'report'"
          [class.border-[#D4F34A]]="activeTab() === 'report'"
          [class.border-transparent]="activeTab() !== 'report'"
          class="flex-1 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors text-slate-400">
          <i class="fas fa-file-medical mr-2"></i> Diagnosis Report
        </button>
        <div class="w-px bg-slate-700 h-full"></div>
        <button 
          (click)="activeTab.set('chat')"
          [class.text-[#D4F34A]]="activeTab() === 'chat'"
          [class.border-b-2]="activeTab() === 'chat'"
          [class.border-[#D4F34A]]="activeTab() === 'chat'"
          [class.border-transparent]="activeTab() !== 'chat'"
          class="flex-1 py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors text-slate-400">
          <i class="fas fa-comments mr-2"></i> SRE Assistant Chat
        </button>
      </div>

      <!-- REPORT TAB -->
      @if (activeTab() === 'report') {
        <div class="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-8 bg-slate-800 animate-in fade-in">
          <!-- Header -->
          <div class="flex justify-between items-start mb-8 border-b border-slate-700 pb-6">
            <div>
              <div class="text-[10px] text-[#D4F34A] font-mono tracking-[0.2em] mb-1 font-bold">INCIDENT REPORT</div>
              <h2 class="text-3xl font-bold text-white tracking-tight mb-4">Diagnosis Results</h2>
              
              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-2">
                 <!-- Save to Local Storage -->
                 <button 
                  (click)="saveToLocalStorage()" 
                  [disabled]="saveStatus() === 'saved'"
                  [class.border-emerald-500]="saveStatus() === 'saved'"
                  [class.text-emerald-400]="saveStatus() === 'saved'"
                  [class.bg-emerald-950]="saveStatus() === 'saved'"
                  [class.opacity-100]="saveStatus() === 'saved'"
                  class="group flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700 hover:border-[#D4F34A] hover:text-[#D4F34A] text-slate-400 text-xs font-bold transition-all shadow-sm disabled:cursor-not-allowed">
                  @if (saveStatus() === 'saved') {
                    <i class="fas fa-check"></i>
                    <span>SAVED</span>
                  } @else {
                    <i class="fas fa-save transition-transform group-hover:scale-110"></i>
                    <span>SAVE</span>
                  }
                </button>

                <!-- Copy for Slack/Teams -->
                <button 
                  (click)="copyForSlack()" 
                  class="group flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#4A154B]/30 border border-[#4A154B] hover:bg-[#4A154B] hover:text-white text-slate-300 text-xs font-bold transition-all shadow-sm"
                  title="Copy formatted for Slack/Teams">
                  <i class="fab fa-slack transition-transform group-hover:rotate-12"></i>
                  <span>COPY FOR SLACK</span>
                </button>

                <!-- Markdown Export (Labeled) -->
                <button 
                  (click)="downloadReport()" 
                  class="group flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700 hover:border-[#D4F34A] hover:text-[#D4F34A] text-slate-400 text-xs font-bold transition-all shadow-sm">
                  <i class="fas fa-file-download transition-transform group-hover:scale-110"></i>
                  <span>EXPORT MD</span>
                </button>

                <!-- JSON Export (Icon) -->
                <button 
                  (click)="downloadJson()" 
                  title="Download JSON"
                  class="group flex items-center justify-center w-8 h-8 rounded-md bg-slate-900 border border-slate-700 hover:border-[#D4F34A] hover:text-[#D4F34A] text-slate-400 text-xs font-bold transition-all shadow-sm">
                  <i class="fas fa-code"></i>
                </button>
              </div>
            </div>

            <div class="flex flex-col items-end gap-2">
              <app-severity-badge [severity]="data().severity" />
              
              <!-- D3 Gauge Visualization -->
              <div class="mt-2 flex flex-col items-center gap-2">
                <app-confidence-gauge [score]="data().confidenceScore"></app-confidence-gauge>
                
                <!-- Feedback Loop (RLHF Simulation) -->
                <div class="flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
                   <button 
                     (click)="giveFeedback('up')" 
                     [class.text-emerald-400]="feedback() === 'up'"
                     class="hover:text-emerald-400 transition-colors" title="Accurate Diagnosis">
                     <i class="fas fa-thumbs-up text-sm"></i>
                   </button>
                   <button 
                     (click)="giveFeedback('down')" 
                     [class.text-red-400]="feedback() === 'down'"
                     class="hover:text-red-400 transition-colors" title="Inaccurate Diagnosis">
                     <i class="fas fa-thumbs-down text-sm"></i>
                   </button>
                </div>
              </div>
            </div>
          </div>

          <!-- KPI Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-700 border border-slate-700 rounded-lg overflow-hidden mb-8 shadow-sm">
            <div class="bg-slate-800/80 p-5 relative group hover:bg-slate-800 transition-colors">
              <div class="absolute top-0 left-0 w-1 h-full bg-[#D4F34A] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <h3 class="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">Category</h3>
              <p class="text-xl text-slate-100 font-medium">{{ data().category }}</p>
            </div>
            <div class="bg-slate-800/80 p-5 relative group hover:bg-slate-800 transition-colors">
               <div class="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <h3 class="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">Root Cause</h3>
              <p class="text-lg text-slate-100 leading-snug">{{ data().rootCause }}</p>
            </div>
          </div>
          
          <!-- Knowledge Base Matches (AIOps Feature) -->
          @if (data().relatedKnowledgeBaseArticles.length > 0) {
            <div class="mb-8 bg-slate-900/40 border border-slate-700/50 rounded-lg overflow-hidden">
               <!-- Header with Search -->
               <div class="px-4 py-3 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900">
                  <h3 class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <i class="fas fa-book-medical"></i> Knowledge Base Matches
                  </h3>
                  
                  <div class="relative w-full sm:w-auto group">
                     <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                       <i class="fas fa-search text-slate-500 text-[10px] group-focus-within:text-[#D4F34A] transition-colors"></i>
                     </div>
                     <input 
                       type="text" 
                       [ngModel]="kbFilter()" 
                       (ngModelChange)="kbFilter.set($event)"
                       placeholder="Filter KB articles..." 
                       aria-label="Filter knowledge base articles"
                       class="w-full sm:w-56 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 py-1.5 pl-8 pr-7 focus:border-[#D4F34A] focus:outline-none placeholder-slate-600 transition-colors"
                     >
                     @if (kbFilter()) {
                        <button 
                          (click)="kbFilter.set('')" 
                          class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-white cursor-pointer"
                          title="Clear filter">
                          <i class="fas fa-times text-[10px]"></i>
                        </button>
                     }
                  </div>
               </div>

               <div class="p-4 flex flex-col gap-2">
                 @if (filteredKbArticles().length === 0) {
                    <div class="text-slate-500 text-xs text-center py-6 border border-dashed border-slate-800 rounded">
                       <i class="fas fa-filter-circle-xmark mb-2 block text-xl opacity-50"></i>
                       No articles match "{{ kbFilter() }}"
                    </div>
                 }

                 @for (kb of filteredKbArticles(); track kb) {
                   <div class="flex items-center gap-3 text-sm text-slate-300 hover:text-[#D4F34A] cursor-pointer transition-colors group p-1">
                      <i class="fas fa-external-link-alt text-xs text-slate-600 group-hover:text-[#D4F34A]"></i>
                      <span class="underline decoration-slate-700 underline-offset-4 group-hover:decoration-[#D4F34A]">{{ kb }}</span>
                   </div>
                 }
               </div>
            </div>
          }

          <!-- Summary -->
          <div class="mb-10 bg-slate-800/50 p-6 rounded-lg border border-slate-700/50 relative">
            <div class="flex justify-between items-start mb-4">
               <h3 class="flex items-center gap-3 text-sm font-bold text-[#D4F34A] uppercase tracking-widest">
                 <i class="fas fa-layer-group"></i> Executive Summary
               </h3>
               
               <!-- TTS Button -->
               <button 
                 (click)="speakSummary()" 
                 [disabled]="isSpeaking()"
                 class="group flex items-center gap-2 px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:border-[#D4F34A] hover:text-[#D4F34A] text-slate-400 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-wait">
                 @if (isSpeaking()) {
                   <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4F34A] opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-[#D4F34A]"></span>
                    </span>
                    <span>Speaking...</span>
                 } @else {
                   <i class="fas fa-volume-up group-hover:scale-110 transition-transform"></i>
                   <span>Read Aloud</span>
                 }
               </button>
            </div>
            <p class="text-slate-300 leading-relaxed text-base">
              {{ data().summary }}
            </p>
          </div>

          <!-- Remediation Protocol & Actions (Interactive Checklist) -->
          <div class="mb-10">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 class="flex items-center gap-3 text-sm font-bold text-[#D4F34A] uppercase tracking-widest">
                <i class="fas fa-wrench"></i> Resolution Protocol
              </h3>
              
              @if (completedStepsCount() > 0) {
                <div class="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                  <span class="text-[#D4F34A]">{{ completedStepsCount() }}</span> / {{ data().resolutionSteps.length }} Steps Complete
                </div>
              }
            </div>
            
            <div class="space-y-4">
              @for (step of data().resolutionSteps; track $index) {
                <div 
                  (click)="toggleStep($index)"
                  class="group flex gap-4 p-3 rounded border cursor-pointer transition-all select-none"
                  [class.bg-slate-900]="!isStepComplete($index)"
                  [class.border-transparent]="!isStepComplete($index)"
                  [class.hover:bg-slate-800]="!isStepComplete($index)"
                  
                  [class.bg-emerald-950/20]="isStepComplete($index)"
                  [class.border-emerald-900/50]="isStepComplete($index)"
                  >
                  
                  <!-- Checkbox / Number -->
                  <div class="flex-shrink-0 flex flex-col items-center pt-1">
                     <div 
                       class="w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded shadow-sm transition-all duration-300"
                       [class.bg-slate-700]="!isStepComplete($index)"
                       [class.text-[#D4F34A]]="!isStepComplete($index)"
                       [class.bg-emerald-500]="isStepComplete($index)"
                       [class.text-slate-900]="isStepComplete($index)">
                       
                       @if (isStepComplete($index)) {
                         <i class="fas fa-check"></i>
                       } @else {
                         {{ $index + 1 }}
                       }
                     </div>
                  </div>
                  
                  <!-- Content -->
                  <div class="flex-grow">
                    <p 
                      class="text-sm leading-6 transition-all duration-300"
                      [class.text-slate-200]="!isStepComplete($index)"
                      [class.text-emerald-400]="isStepComplete($index)"
                      [class.line-through]="isStepComplete($index)"
                      [class.opacity-60]="isStepComplete($index)">
                      {{ step }}
                    </p>
                  </div>
                  
                  <!-- Hover Action Hint -->
                  <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span class="text-[9px] uppercase font-bold text-slate-500">
                       {{ isStepComplete($index) ? 'Undo' : 'Mark Done' }}
                     </span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Terminal Output -->
          @if (data().commandSuggestions.length > 0) {
            <div class="bg-slate-950 border border-slate-700 rounded-md overflow-hidden shadow-inner">
              
              <!-- Terminal Header with Filter and Copy All -->
              <div class="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                 <div class="flex items-center gap-2 self-start sm:self-center">
                   <i class="fas fa-terminal text-slate-600 text-xs"></i>
                   <span class="text-xs font-mono text-slate-500 font-bold">SUGGESTED COMMANDS</span>
                 </div>
                 
                 <div class="flex items-center gap-2 w-full sm:w-auto">
                   <!-- Copy All Button -->
                   <button 
                      (click)="copyAllCommands()"
                      [disabled]="filteredCommands().length === 0"
                      class="px-3 py-1.5 rounded text-xs font-bold border transition-all duration-200 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      [class.bg-[#D4F34A]]="copiedAll()"
                      [class.text-slate-900]="copiedAll()"
                      [class.border-[#D4F34A]]="copiedAll()"
                      [class.bg-slate-800]="!copiedAll()"
                      [class.text-slate-400]="!copiedAll()"
                      [class.border-slate-700]="!copiedAll()"
                      [class.hover:text-white]="!copiedAll()"
                      [class.hover:border-slate-500]="!copiedAll()"
                      title="Copy all visible commands to clipboard">
                      @if (copiedAll()) {
                        <i class="fas fa-check"></i>
                        <span>Copied All</span>
                      } @else {
                        <i class="fas fa-layer-group"></i>
                        <span>Copy All</span>
                      }
                   </button>

                   <div class="relative w-full sm:w-auto group flex-grow sm:flex-grow-0">
                     <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                         <i class="fas fa-search text-slate-500 text-[10px] group-focus-within:text-[#D4F34A] transition-colors"></i>
                     </div>
                     <input 
                       type="text" 
                       [ngModel]="commandFilter()" 
                       (ngModelChange)="commandFilter.set($event)"
                       placeholder="Filter commands..." 
                       aria-label="Filter commands"
                       class="w-full sm:w-56 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300 py-1.5 pl-8 pr-7 focus:border-[#D4F34A] focus:outline-none placeholder-slate-600 transition-colors"
                     >
                      @if (commandFilter()) {
                          <button 
                            (click)="commandFilter.set('')" 
                            class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-white cursor-pointer"
                            title="Clear filter">
                            <i class="fas fa-times text-[10px]"></i>
                          </button>
                       }
                   </div>
                 </div>
              </div>

              <div class="p-4 space-y-2 font-mono text-sm">
                @if (filteredCommands().length === 0) {
                   <div class="text-slate-500 text-xs text-center py-8 border border-dashed border-slate-800 rounded">
                      <i class="fas fa-filter-circle-xmark mb-2 block text-xl opacity-50"></i>
                      No commands match "{{ commandFilter() }}"
                   </div>
                }
                
                @for (cmd of filteredCommands(); track cmd) {
                  <div class="flex items-center justify-between group py-2 px-2 hover:bg-slate-900/50 rounded transition-colors">
                    <div class="flex items-center gap-3 overflow-hidden flex-grow">
                      <!-- Added select-none to $ so copying text manually doesn't catch it -->
                      <span class="text-[#D4F34A] flex-shrink-0 select-none">$</span>
                      <span class="text-slate-300 break-all">{{ cmd }}</span>
                    </div>
                    
                    <button 
                      type="button"
                      (click)="copyToClipboard(cmd)" 
                      [attr.aria-label]="copiedCommand() === cmd ? 'Command copied' : 'Copy command to clipboard'"
                      class="ml-4 px-2 py-1 rounded text-xs font-bold border transition-all duration-200 flex items-center gap-2 min-w-[80px] justify-center cursor-pointer active:scale-95"
                      [class.bg-[#D4F34A]]="copiedCommand() === cmd"
                      [class.text-slate-900]="copiedCommand() === cmd"
                      [class.border-[#D4F34A]]="copiedCommand() === cmd"
                      [class.bg-slate-800]="copiedCommand() !== cmd"
                      [class.text-slate-400]="copiedCommand() !== cmd"
                      [class.border-slate-700]="copiedCommand() !== cmd"
                      [class.hover:text-white]="copiedCommand() !== cmd"
                      [class.hover:border-slate-500]="copiedCommand() !== cmd"
                      [title]="copiedCommand() === cmd ? 'Copied!' : 'Copy to buffer'">
                      
                      @if (copiedCommand() === cmd) {
                        <i class="fas fa-check"></i> Copied
                      } @else {
                        <i class="far fa-copy"></i> Copy
                      }
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } 
      
      <!-- CHAT TAB -->
      @else {
        <div class="flex-grow flex flex-col bg-slate-900 animate-in fade-in">
           <!-- Messages Area -->
           <div class="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
              <!-- System Intro -->
              <div class="flex gap-4 max-w-3xl">
                 <div class="w-8 h-8 rounded bg-[#D4F34A] flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-slate-900"></i>
                 </div>
                 <div class="bg-slate-800 rounded-lg rounded-tl-none p-4 border border-slate-700">
                    <p class="text-sm text-slate-300">
                      I have analyzed the incident regarding <span class="text-[#D4F34A] font-bold">{{data().category}}</span>. 
                      I am ready to answer specific questions about the root cause or help you execute the resolution steps.
                    </p>
                 </div>
              </div>

              @for (msg of chatHistory(); track $index) {
                <div class="flex gap-4 max-w-3xl" [class.ml-auto]="msg.role === 'user'" [class.flex-row-reverse]="msg.role === 'user'">
                   <div 
                     class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                     [class.bg-[#D4F34A]]="msg.role === 'model'"
                     [class.bg-slate-700]="msg.role === 'user'">
                      @if (msg.role === 'model') {
                        <i class="fas fa-robot text-slate-900"></i>
                      } @else {
                        <i class="fas fa-user text-slate-300"></i>
                      }
                   </div>
                   
                   <div 
                     class="rounded-lg p-4 border max-w-[80%]"
                     [class.rounded-tl-none]="msg.role === 'model'"
                     [class.rounded-tr-none]="msg.role === 'user'"
                     [class.bg-slate-800]="msg.role === 'model'"
                     [class.border-slate-700]="msg.role === 'model'"
                     [class.bg-slate-700]="msg.role === 'user'"
                     [class.border-slate-600]="msg.role === 'user'">
                      <!-- USE MARKDOWN PIPE HERE -->
                      <div class="text-sm text-slate-200 leading-relaxed" [innerHTML]="msg.text | markdown"></div>
                   </div>
                </div>
              }
              
              @if (isChatThinking()) {
                 <div class="flex gap-4 max-w-3xl">
                   <div class="w-8 h-8 rounded bg-[#D4F34A] flex items-center justify-center flex-shrink-0 opacity-50">
                      <i class="fas fa-robot text-slate-900"></i>
                   </div>
                   <div class="flex items-center gap-1 h-8">
                      <div class="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                      <div class="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                      <div class="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                   </div>
                 </div>
              }
           </div>

           <!-- Input Area -->
           <div class="p-4 bg-slate-800 border-t border-slate-700">
             <div class="relative max-w-4xl mx-auto flex gap-3">
               <input 
                 type="text" 
                 [(ngModel)]="chatInput"
                 (keyup.enter)="sendMessage()"
                 [disabled]="isChatThinking()"
                 placeholder="Ask a follow-up question (e.g., 'How do I backup the DB first?')" 
                 class="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:border-[#D4F34A] focus:outline-none placeholder-slate-500 disabled:opacity-50"
               >
               <button 
                 (click)="sendMessage()"
                 [disabled]="!chatInput() || isChatThinking()"
                 class="px-6 bg-[#D4F34A] hover:bg-[#c3e03e] text-slate-900 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                 <i class="fas fa-paper-plane"></i>
               </button>
             </div>
           </div>
        </div>
      }
      
      <!-- Footer Decoration -->
      <div class="h-2 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-10"></div>
    </div>
  `
})
export class AnalysisViewerComponent {
  data = input.required<IncidentAnalysis>();
  originalLog = input.required<string>(); // We need context for the chat
  
  private geminiService = inject(GeminiService);
  private toastService = inject(ToastService);
  
  // UI State
  activeTab = signal<'report' | 'chat'>('report');
  copiedCommand = signal<string | null>(null);
  copiedAll = signal(false);
  saveStatus = signal<'idle' | 'saved'>('idle');
  feedback = signal<'up' | 'down' | null>(null);
  
  // TTS State
  isSpeaking = signal(false);
  
  // Filtering
  commandFilter = signal('');
  kbFilter = signal('');

  // Interactive Checklist
  completedSteps = signal<Set<number>>(new Set());

  // Chat State
  chatSession: Chat | null = null;
  chatHistory = signal<ChatMessage[]>([]);
  chatInput = signal('');
  isChatThinking = signal(false);

  // Initialize Chat when data changes
  constructor() {
    effect(() => {
       const incidentData = this.data();
       const log = this.originalLog();
       
       if (incidentData && log) {
         // Reset chat when new analysis arrives
         this.chatSession = this.geminiService.createChatSession(incidentData, log);
         this.chatHistory.set([]);
         this.activeTab.set('report'); // Reset to report view
         this.saveStatus.set('idle');
         this.copiedAll.set(false);
         this.completedSteps.set(new Set()); // Reset checklist
         this.feedback.set(null); // Reset feedback
         this.cancelSpeech(); // Stop any previous speech
       }
    });
  }

  toggleStep(index: number) {
    this.completedSteps.update(set => {
      const newSet = new Set(set);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  isStepComplete(index: number): boolean {
    return this.completedSteps().has(index);
  }

  completedStepsCount = computed(() => this.completedSteps().size);

  filteredCommands = computed(() => {
    const rawFilter = this.commandFilter().trim();
    const commands = this.data().commandSuggestions;
    
    if (!rawFilter) return commands;

    // Split filter into tokens for flexible order (e.g. "pods get")
    const tokens = rawFilter.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    const matches = commands.map(cmd => {
      const lowerCmd = cmd.toLowerCase();
      let totalScore = 0;

      // Check if ALL tokens match
      const allTokensMatch = tokens.every(token => {
        // 1. Exact substring match (Highest priority)
        if (lowerCmd.includes(token)) {
          totalScore += 100;
          // Bonus for starting with token
          if (lowerCmd.startsWith(token)) totalScore += 20;
          // Penalty for position
          totalScore -= (lowerCmd.indexOf(token) * 0.5); 
          return true;
        }

        // 2. Fuzzy Sequence Match
        // Token characters must appear in order within the command
        let tokenIdx = 0;
        let cmdIdx = 0;
        let fuzzyScore = 0;
        let consecutiveMatches = 0;

        while (tokenIdx < token.length && cmdIdx < lowerCmd.length) {
          if (token[tokenIdx] === lowerCmd[cmdIdx]) {
            tokenIdx++;
            fuzzyScore += 1;
            consecutiveMatches++;
            if (consecutiveMatches > 1) fuzzyScore += 2; // Bonus for consecutive
          } else {
            consecutiveMatches = 0;
          }
          cmdIdx++;
        }

        if (tokenIdx === token.length) {
          // Token matched completely
          // Penalty for how spread out the match was
          const spreadPenalty = (cmdIdx - token.length) * 0.5;
          totalScore += Math.max(1, 10 + fuzzyScore - spreadPenalty);
          return true;
        }

        return false;
      });

      if (allTokensMatch) {
        return { cmd, score: totalScore };
      }
      return { cmd, score: 0 };
    });
    
    // Filter out non-matches and sort by score (descending)
    return matches
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(m => m.cmd);
  });

  filteredKbArticles = computed(() => {
    const filter = this.kbFilter().toLowerCase().trim();
    const articles = this.data().relatedKnowledgeBaseArticles;
    if (!filter) return articles;
    return articles.filter(article => article.toLowerCase().includes(filter));
  });

  async sendMessage() {
    const text = this.chatInput().trim();
    if (!text || !this.chatSession || this.isChatThinking()) return;

    // UI Update
    this.chatHistory.update(h => [...h, { role: 'user', text }]);
    this.chatInput.set('');
    this.isChatThinking.set(true);

    try {
      const response = await this.chatSession.sendMessage(text);
      this.chatHistory.update(h => [...h, { role: 'model', text: response.text }]);
    } catch (err) {
      this.chatHistory.update(h => [...h, { role: 'model', text: 'Error: Could not connect to SRE Assistant.' }]);
    } finally {
      this.isChatThinking.set(false);
    }
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedCommand.set(text);
      this.toastService.show('Command copied to clipboard', 'success');
      setTimeout(() => {
        if (this.copiedCommand() === text) {
          this.copiedCommand.set(null);
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      this.toastService.show('Failed to copy command', 'error');
    }
  }

  async copyAllCommands() {
    const commands = this.filteredCommands().join('\n');
    if (!commands) return;

    try {
      await navigator.clipboard.writeText(commands);
      this.copiedAll.set(true);
      this.toastService.show('All commands copied to clipboard', 'success');
      setTimeout(() => {
        this.copiedAll.set(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy all commands: ', err);
      this.toastService.show('Failed to copy commands', 'error');
    }
  }

  giveFeedback(type: 'up' | 'down') {
    this.feedback.set(type);
    if (type === 'up') {
      this.toastService.show('Thanks! We will use this to improve the model.', 'success');
    } else {
      this.toastService.show('Noted. We will review this incident analysis.', 'info');
    }
  }

  async copyForSlack() {
    const d = this.data();
    
    // Slack-specific formatting (simpler than markdown)
    const slackText = `*🚨 INCIDENT REPORT*\n` +
      `*Category:* ${d.category} | *Severity:* ${d.severity.toUpperCase()}\n` +
      `*Confidence:* ${d.confidenceScore}%\n\n` +
      `*Executive Summary:*\n> ${d.summary}\n\n` +
      `*Root Cause:*\n${d.rootCause}\n\n` +
      `*Resolution Steps:*\n${d.resolutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
      `_Generated by Incident.AI_`;

    try {
      await navigator.clipboard.writeText(slackText);
      this.toastService.show('Copied to clipboard (Slack Format)', 'success');
    } catch (err) {
       this.toastService.show('Failed to copy', 'error');
    }
  }

  saveToLocalStorage() {
    const historyItem: IncidentHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      analysis: this.data(),
      logSnippet: this.originalLog().substring(0, 200)
    };

    try {
      const existingStr = localStorage.getItem('incident_history');
      let existing: IncidentHistoryItem[] = existingStr ? JSON.parse(existingStr) : [];
      
      // Add to top
      existing = [historyItem, ...existing];
      
      // Limit history to 50 items
      if (existing.length > 50) {
        existing = existing.slice(0, 50);
      }

      localStorage.setItem('incident_history', JSON.stringify(existing));
      
      this.saveStatus.set('saved');
      this.toastService.show('Analysis saved to Local Storage history', 'success');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
    } catch (e: any) {
      console.error('Local Storage Error', e);
      if (e.name === 'QuotaExceededError') {
         this.toastService.show('Storage full. Clear history to save more.', 'error');
      } else {
         this.toastService.show('Failed to save analysis', 'error');
      }
    }
  }

  downloadJson() {
    const dataStr = JSON.stringify(this.data(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, 'json');
    this.toastService.show('JSON report downloaded', 'info');
  }

  downloadReport() {
    const d = this.data();
    
    const text = `# INCIDENT REPORT
Generated by Incident.AI (AIOps Engine)
Date: ${new Date().toLocaleString()}

------------------------------------------------
SEVERITY: ${d.severity}
CONFIDENCE: ${d.confidenceScore}%
CATEGORY: ${d.category}
------------------------------------------------

## EXECUTIVE SUMMARY
${d.summary}

## ROOT CAUSE
${d.rootCause}

## KNOWLEDGE BASE MATCHES
${d.relatedKnowledgeBaseArticles.map(kb => `- ${kb}`).join('\n')}

## RESOLUTION STEPS
${d.resolutionSteps.map((s, i) => `${i + 1}. ${s} [${this.isStepComplete(i) ? 'X' : ' '}]`).join('\n')}

## SUGGESTED COMMANDS
\`\`\`bash
${d.commandSuggestions.join('\n')}
\`\`\`
`;

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, 'md');
    this.toastService.show('Markdown report downloaded', 'info');
  }

  private downloadFile(url: string, extension: string) {
    const d = this.data();
    const date = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident_report_${date}_${d.category.toLowerCase().replace(/\s+/g, '_')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Text-to-Speech Functionality
  speakSummary() {
    if (!('speechSynthesis' in window)) {
      this.toastService.show('Text-to-Speech not supported in this browser', 'error');
      return;
    }

    if (this.isSpeaking()) {
      this.cancelSpeech();
      return;
    }

    const text = `Executive Summary. ${this.data().summary}. Root Cause. ${this.data().rootCause}`;
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => {
      this.isSpeaking.set(false);
      this.toastService.show('Error playing audio', 'error');
    };

    // Try to select a good voice (English)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  }

  cancelSpeech() {
    window.speechSynthesis.cancel();
    this.isSpeaking.set(false);
  }
}