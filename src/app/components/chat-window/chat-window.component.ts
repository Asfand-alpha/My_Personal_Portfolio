import { Component, EventEmitter, OnDestroy, Output, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import emailjs from '@emailjs/browser';
import { environment } from '../../../environments/environment';

interface ChatMessage {
  from: 'bot' | 'visitor';
  text: string;
}

// Same EmailJS project already wired up for the Contact form - one inquiry
// inbox regardless of whether the visitor used the form or the chat widget.
// Only fires once per conversation now (see sendConversationSummary), not on
// every message - a per-message email for every visitor question was too
// noisy in practice.
const EMAILJS_SERVICE_ID = 'service_enljqrp';
const EMAILJS_TEMPLATE_ID = 'template_hd61kee';
const EMAILJS_PUBLIC_KEY = '5bVg-CE-woI22kKgw';

const FALLBACK_REPLY =
  "Sorry, I'm having a little trouble connecting right now. Please try again in a moment, or reach Asfandyar directly through the contact form.";

// Sent alongside the display history, but capped independently so a very
// long session doesn't keep growing the token cost of every follow-up call.
const MAX_HISTORY_MESSAGES = 30;
const STORAGE_KEY = 'portfolio-chat-history';

// A trailing instruction appended (invisibly - never pushed into `messages`,
// so the visitor never sees it) when the chat closes, asking Alpha to write
// an internal note for Asfandyar instead of a visitor-facing reply. See the
// "Internal Summary Requests" section of the system prompt.
const SUMMARY_REQUEST_TEXT =
  '[System note: The visitor has closed this chat. Please write a short internal summary for Asfand covering what the visitor wanted, key details/requirements/budget/timeline discussed, and their contact info if they gave any.]';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss'
})
export class ChatWindowComponent implements OnDestroy, AfterViewChecked {
  @Output() closeWindow = new EventEmitter<void>();
  @ViewChild('messagesEl') messagesRef?: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [
    { from: 'bot', text: "Hi! I'm Alpha, Asfandyar's assistant 👋 Tell me a bit about your project and I'll pass it along." }
  ];

  visitorName = '';
  visitorEmail = '';
  draft = '';
  isBotTyping = false;

  private shouldScroll = false;
  // How many messages existed the last time a summary email was sent - only
  // send another one if real new content was added since then, so closing
  // and reopening an already-summarized chat doesn't spam another email.
  private lastSummarizedMessageCount = 0;

  constructor(private http: HttpClient) {
    // "Session" history: survives a page refresh in the same tab, cleared
    // when the tab/browser closes - no backend/database needed for this.
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages = parsed;
          this.lastSummarizedMessageCount = parsed.length;
        }
      } catch {
        // Corrupt/old-shape storage - ignore and keep the default greeting.
      }
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messagesRef) {
      this.messagesRef.nativeElement.scrollTop = this.messagesRef.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    if (this.isBotTyping) window.setBotTyping?.(false);
  }

  send() {
    const text = this.draft.trim();
    if (!text) return;

    this.messages.push({ from: 'visitor', text });
    this.draft = '';
    this.shouldScroll = true;
    this.persistHistory();
    this.isBotTyping = true;
    window.setBotTyping?.(true);

    const apiMessages = this.messages
      .map((m) => ({ role: m.from === 'visitor' ? ('user' as const) : ('assistant' as const), content: m.text }))
      .slice(-MAX_HISTORY_MESSAGES);

    this.http
      .post<{ reply?: string; error?: string }>(environment.chatApiUrl, { messages: apiMessages })
      .pipe(timeout(25000))
      .subscribe({
        next: (res) => {
          this.messages.push({ from: 'bot', text: res.reply?.trim() || FALLBACK_REPLY });
          this.finishTyping();
        },
        error: (err) => {
          console.error('[ChatWindow] Assistant request failed:', err);
          this.messages.push({ from: 'bot', text: FALLBACK_REPLY });
          this.finishTyping();
        }
      });
  }

  close() {
    this.sendConversationSummary();
    this.closeWindow.emit();
  }

  private finishTyping() {
    this.isBotTyping = false;
    window.setBotTyping?.(false);
    this.shouldScroll = true;
    this.persistHistory();
  }

  private persistHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
    } catch {
      // Storage full/unavailable (e.g. private browsing) - non-critical.
    }
  }

  /** Asks Alpha to write one internal summary of the whole conversation and
   *  emails it to Asfandyar - fire-and-forget, never blocks closing the
   *  window, and never shown in the visitor-facing message list. Skipped
   *  entirely if the visitor never actually said anything, or if nothing new
   *  happened since the last summary was already sent. */
  private sendConversationSummary() {
    const hasNewContent = this.messages.length > this.lastSummarizedMessageCount;
    const hasVisitorMessage = this.messages.some((m) => m.from === 'visitor');
    if (!hasNewContent || !hasVisitorMessage) return;

    this.lastSummarizedMessageCount = this.messages.length;

    const apiMessages = this.messages
      .map((m) => ({ role: m.from === 'visitor' ? ('user' as const) : ('assistant' as const), content: m.text }))
      .slice(-MAX_HISTORY_MESSAGES);
    apiMessages.push({ role: 'user', content: SUMMARY_REQUEST_TEXT });

    this.http
      .post<{ reply?: string; error?: string }>(environment.chatApiUrl, { messages: apiMessages })
      .pipe(timeout(25000))
      .subscribe({
        next: (res) => {
          const summary = res.reply?.trim();
          if (!summary) return;
          this.emailSummary(summary);
        },
        error: (err) => console.error('[ChatWindow] Failed to generate conversation summary:', err)
      });
  }

  private emailSummary(summary: string) {
    const params = {
      name: this.visitorName.trim() || 'Portfolio Visitor (Chat Widget)',
      email: this.visitorEmail.trim() || 'not provided',
      subject: "Alpha's chat summary - portfolio visitor",
      message: summary,
      time: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    };
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, { publicKey: EMAILJS_PUBLIC_KEY }).catch((err) => {
      console.error('[ChatWindow] Failed to email conversation summary:', err);
    });
  }
}
