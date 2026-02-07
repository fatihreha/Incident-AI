import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    if (!value) return '';

    // 1. Sanitize HTML tags to prevent XSS (basic)
    let text = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 2. Code Blocks (```language ... ```)
    // Replace ```...``` with <pre><code>...</code></pre>
    text = text.replace(/```(\w*)([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="bg-slate-950 rounded-md my-2 border border-slate-700 overflow-hidden">
                <div class="bg-slate-800 px-3 py-1 text-[10px] text-slate-400 font-mono border-b border-slate-700 flex justify-between">
                  <span>${lang || 'CODE'}</span>
                </div>
                <pre class="p-3 overflow-x-auto text-xs font-mono text-slate-300"><code>${code.trim()}</code></pre>
              </div>`;
    });

    // 3. Inline Code (`...`)
    text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-[#D4F34A] px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700">$1</code>');

    // 4. Bold (**...**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');

    // 5. Lists (Unordered - and Ordered 1.)
    const lines = text.split('\n');
    let listType: 'ul' | 'ol' | null = null;
    let processedLines = [];

    for (let line of lines) {
      const trim = line.trim();
      
      // Unordered List Detection
      if (trim.startsWith('- ')) {
        if (listType !== 'ul') {
          if (listType === 'ol') processedLines.push('</ol>');
          processedLines.push('<ul class="list-disc list-outside ml-5 space-y-1 mb-2 text-slate-300">');
          listType = 'ul';
        }
        processedLines.push(`<li>${trim.substring(2)}</li>`);
      } 
      // Ordered List Detection (1. Step)
      else if (/^\d+\.\s/.test(trim)) {
        if (listType !== 'ol') {
          if (listType === 'ul') processedLines.push('</ul>');
          processedLines.push('<ol class="list-decimal list-outside ml-5 space-y-1 mb-2 text-slate-300">');
          listType = 'ol';
        }
        // Remove "1. " from start
        processedLines.push(`<li>${trim.replace(/^\d+\.\s/, '')}</li>`);
      }
      // Normal Line
      else {
        if (listType) {
          processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          listType = null;
        }
        processedLines.push(line);
      }
    }
    
    if (listType) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
    }

    text = processedLines.join('\n');

    // 6. Headers (### ...)
    text = text.replace(/### (.*)/g, '<h3 class="text-sm font-bold text-[#D4F34A] mt-4 mb-2 uppercase tracking-wide">$1</h3>');

    // 7. Paragraphs (Double newlines)
    text = text.replace(/\n\n/g, '<br><br>');

    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}