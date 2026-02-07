import { Component, inject, signal, onInit, onDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, IncidentAnalysis, IncidentHistoryItem, AnalysisPersona } from './services/gemini.service';
import { LogEditorComponent } from './components/log-editor.component';
import { AnalysisViewerComponent } from './components/analysis-viewer.component';
import { HistoryPanelComponent } from './components/history-panel.component';
import { ToastContainerComponent } from './components/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, LogEditorComponent, AnalysisViewerComponent, HistoryPanelComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent implements onInit, onDestroy {
  private geminiService = inject(GeminiService);

  isLoading = signal(false);
  analysisResult = signal<IncidentAnalysis | null>(null);
  
  // Keep track of the input that generated the result for Chat context
  lastAnalyzedLog = signal<string>('');
  
  // Store full request for retry capability
  lastRequest = signal<{ text: string, image?: string, persona: AnalysisPersona } | null>(null);
  
  error = signal<string | null>(null);

  // History Sidebar State
  showHistory = signal(false);

  // Live Dashboard Simulation
  latency = signal(24);
  private intervalId: any;

  ngOnInit() {
    // Simulate live connection metrics
    this.intervalId = setInterval(() => {
      // Fluctuate between 15ms and 65ms
      const fluctuation = Math.floor(Math.random() * 10) - 5;
      this.latency.update(v => Math.max(15, Math.min(65, v + fluctuation)));
    }, 2000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async onAnalyze(event: { text: string, image?: string, persona?: AnalysisPersona }) {
    this.isLoading.set(true);
    this.error.set(null);
    this.analysisResult.set(null);

    const persona = event.persona || 'Senior SRE';

    // Save for chat context
    this.lastAnalyzedLog.set(event.text + (event.image ? ' [Image Attached]' : ''));
    // Save for retry
    this.lastRequest.set({ ...event, persona });

    try {
      const result = await this.geminiService.analyzeLog(event.text, event.image, persona);
      this.analysisResult.set(result);
    } catch (err: any) {
      console.error("App Error:", err);
      this.error.set(err.message || "An unexpected error occurred during analysis.");
    } finally {
      this.isLoading.set(false);
    }
  }

  retryAnalysis() {
    const req = this.lastRequest();
    if (req) {
      this.onAnalyze(req);
    }
  }

  toggleHistory() {
    this.showHistory.update(v => !v);
  }

  loadHistoryItem(item: IncidentHistoryItem) {
    this.analysisResult.set(item.analysis);
    this.lastAnalyzedLog.set(item.logSnippet);
    this.showHistory.set(false); // Close sidebar on selection
  }
}