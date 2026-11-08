import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StoreApiService } from '../services/store-api.service';

interface RecommendedProductCard {
  id: number;
  name: string;
  price: number;
  category: string;
  difficulty?: string;
  playerCount?: string;
  duration?: string;
  image?: string;
}

interface SoothingPopupData {
  title: string;
  calmingText: string;
  originalText: string;
  softenedText: string;
  confirmQuestion: string;
}

interface ChatMessage {
  role: 'user' | 'bot' | 'advisor';
  text: string;
  recommendedProducts?: RecommendedProductCard[];
}

const CHATBOT_STORAGE_KEY = 'anstore.chatbot.state.v5';
const CHATBOT_GREETING =
  'Chào bạn, mình là **Thư Đồng** - Trợ lý AI của ẨN Store. Nếu bạn chưa rành về board game, hãy bấm các **Bộ lọc thuộc tính** bên dưới hoặc nhập từ khóa (VD: *tân thủ*, *suy luận khó*, *combo*, *dưới 300k*, hoặc *khiếu nại đơn hàng*) để mình gợi ý ngay nhé!';

@Component({
  selector: 'app-chatbot-component',
  standalone: false,
  templateUrl: './chatbot-component.html',
  styleUrl: './chatbot-component.css'
})
export class ChatbotComponent {
  @ViewChild('messagesList') messagesList?: ElementRef<HTMLDivElement>;
  open = false;
  quickCartOpen = false;
  loading = false;
  inputText = '';
  interactionId = '';
  messages: ChatMessage[] = [{ role: 'bot', text: CHATBOT_GREETING }];

  // Emotion status for Advisor (Right #8): GREEN | ORANGE | RED
  emotionLevel: 'GREEN' | 'ORANGE' | 'RED' = 'GREEN';
  emotionColor = '#22c55e';
  emotionLabel = 'Xanh - Khách bình tĩnh';
  advisorMode = false;
  soothingPopup: SoothingPopupData | null = null;

  // Attribute filter popup state inside Chatbot (Right #7)
  showProductFilterPopup = false;
  selectedDiffFilter = 'ALL';
  selectedCatFilter = 'ALL';

  readonly quickPrompts: Array<{ label: string; query: string }> = [
    { label: '🎲 Chưa biết chơi gì (Tân thủ)', query: 'Mình là người mới chưa biết gì về board game, gợi ý bản dễ chơi nhập môn giúp mình' },
    { label: '🔍 Thích suy luận khó (3-6 người)', query: 'Gợi ý board game suy luận độ khó cao cho nhóm 3-6 người' },
    { label: '🎁 Combo tiết kiệm', query: 'Tư vấn các gói Combo sưu tầm kèm phụ kiện' },
    { label: '⚠️ Khiếu nại / Gặp Tư vấn viên', query: 'Tôi muốn khiếu nại đơn hàng giao chậm, hộp bị móp, quá tệ và bức xúc!' }
  ];

  constructor(
    private http: HttpClient,
    public store: StoreApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.restoreState();
  }

  private analyzeEmotionLocal(text: string): {
    level: 'GREEN' | 'ORANGE' | 'RED';
    color: string;
    label: string;
    soothingPopup: SoothingPopupData | null;
    needsAdvisor: boolean;
  } {
    const lower = text.trim().toLowerCase();
    const angryPattern =
      /(^biến$|\bbiến\b|biến đi|cút|xéo|dẹp|im đi|câm|nghỉ khỏe|khỏi mua|không mua nữa|dmm|đmm|dkm|đkm|đm|dm|vcl|vl|cc|loz|lồn|cặc|đéo|deo|éo|đếch|đjt|djt|dit|wtf|shit|fuck|chó|ngu|óc chó|lừa đảo|bịp|rác|tệ|tồi|bực|bực bội|bực mình|tức|quạo|cọc|ghét|chán|xàm|nhảm|vớ vẩn|tào lao|lề mề|chậm chạp|thái độ|láo|bố láo|hỗn|điên|khùng|cáu|ức chế|quá đáng|khiếu nại|tố cáo|phốt|bóc phốt|tẩy chay|hoàn tiền ngay|gặp quản lý|ăn chặn|mất dạy|vô học)/i;
    const warningPattern =
      /(sao chưa giao|lâu quá|chờ mãi|chậm trễ|giao chậm|nhầm hàng|sai mẫu|thiếu đồ|hàng lỗi|lỗi|hỏng|rách|móp|bể|vỡ|đổi trả|hoàn tiền|không hài lòng|thất vọng|tư vấn viên|gặp tư vấn)/i;

    if (angryPattern.test(lower)) {
      const cleaned = text
        .replace(/biến đi|biến|cút đi|cút|xéo|dẹp|im đi|câm|dmm|đmm|dkm|đkm|đm|dm|vcl|vl|cc|loz|lồn|cặc|đéo|deo|éo|đếch|đjt|djt|dit|wtf|shit|fuck|chó|ngu|óc chó|rác|tồi|lừa đảo|bịp/gi, '')
        .trim();
      const softenedText =
        cleaned.length >= 4
          ? `Tôi đang rất bức xúc về vấn đề: "${cleaned}". Đề nghị Tư vấn viên kiểm tra và giải quyết gấp giúp tôi!`
          : 'Tôi đang không hài lòng với phản hồi tự động và cần Tư vấn viên trực tiếp kiểm tra, hỗ trợ giải quyết ngay lập tức!';
      return {
        level: 'RED',
        color: '#ef4444',
        label: 'Đỏ - Khách đang bức xúc',
        needsAdvisor: true,
        soothingPopup: {
          title: 'Thư Đồng nhận thấy bạn đang bực bội',
          calmingText:
            'ẨN Store thành thật xin lỗi vì trải nghiệm chưa trọn vẹn khiến bạn khó chịu. Để Tư vấn viên nắm bắt và xử lý ưu tiên ngay lập tức, hệ thống gợi ý chuyển ngữ lịch sự:',
          originalText: text,
          softenedText,
          confirmQuestion: 'Có phải ý của bạn là như thế này không?'
        }
      };
    }

    if (warningPattern.test(lower)) {
      const softenedText = `Nhờ Tư vấn viên kiểm tra và hỗ trợ giúp tôi tình trạng đơn hàng/sản phẩm: "${text}"`;
      return {
        level: 'ORANGE',
        color: '#f59e0b',
        label: 'Cam - Khách đang sốt ruột',
        needsAdvisor: true,
        soothingPopup: {
          title: 'Hỗ trợ kiểm tra & Xử lý khiếu nại ưu tiên',
          calmingText:
            'Thư Đồng hiểu bạn đang sốt ruột về đơn hàng/sản phẩm. Đừng lo nhé, đội ngũ Tư vấn viên ẨN Store sẵn sàng kiểm tra hồ sơ đơn cho bạn ngay.',
          originalText: text,
          softenedText,
          confirmQuestion: 'Có phải ý của bạn là như thế này không?'
        }
      };
    }

    return {
      level: 'GREEN',
      color: '#22c55e',
      label: 'Xanh - Khách bình tĩnh',
      needsAdvisor: false,
      soothingPopup: null
    };
  }

  private restoreState(): void {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(CHATBOT_STORAGE_KEY) || '{}');
      if (Array.isArray(parsed.messages) && parsed.messages.length) {
        this.messages = parsed.messages;
      }
      if (typeof parsed.interactionId === 'string') {
        this.interactionId = parsed.interactionId;
      }
      if (parsed.emotionLevel) {
        this.emotionLevel = parsed.emotionLevel;
        this.emotionColor = parsed.emotionColor || '#22c55e';
        this.emotionLabel =
          parsed.emotionLevel === 'RED'
            ? 'Đỏ - Khách đang bức xúc'
            : parsed.emotionLevel === 'ORANGE'
              ? 'Cam - Khách đang sốt ruột'
              : 'Xanh - Khách bình tĩnh';
      }
      this.open = Boolean(parsed.open);
    } catch {
      this.messages = [{ role: 'bot', text: CHATBOT_GREETING }];
    }
  }

  private persistState(): void {
    sessionStorage.setItem(
      CHATBOT_STORAGE_KEY,
      JSON.stringify({
        messages: this.messages.slice(-14),
        interactionId: this.interactionId,
        emotionLevel: this.emotionLevel,
        emotionColor: this.emotionColor,
        emotionLabel: this.emotionLabel,
        open: this.open
      })
    );
  }

  toggleChatbot(): void {
    this.open = !this.open;
    if (this.open) {
      this.quickCartOpen = false;
    }
    this.persistState();
  }

  toggleQuickCart(): void {
    this.quickCartOpen = !this.quickCartOpen;
    if (this.quickCartOpen) {
      this.open = false;
      this.persistState();
    }
  }

  jumpToMiniGame(): void {
    this.open = false;
    this.quickCartOpen = false;
    this.persistState();
    this.router.navigate(['/home'], { queryParams: { section: 'simulation' } }).then(() => {
      setTimeout(() => {
        document.getElementById('mini-game-le-chi-vien')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    });
  }

  get quickCartSummary() {
    return this.store.cartSummary();
  }

  get filteredPopupProducts(): RecommendedProductCard[] {
    return this.store
      .getProducts()
      .filter((p) => {
        const matchCat = this.selectedCatFilter === 'ALL' || p.category === this.selectedCatFilter;
        const matchDiff =
          this.selectedDiffFilter === 'ALL' ||
          (p.difficulty || '').toLowerCase().includes(this.selectedDiffFilter.toLowerCase());
        return matchCat && matchDiff;
      })
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.discountPrice ?? p.price,
        category: p.category,
        difficulty: p.difficulty,
        playerCount: p.playerCount,
        duration: p.duration,
        image: p.images?.[0] || '/img/products/23.png'
      }));
  }

  sendQuickPrompt(query: string): void {
    this.inputText = query;
    this.sendMessage();
  }

  switchToAdvisor(customNote?: string): void {
    this.advisorMode = true;
    const lastUserMsg = [...this.messages].reverse().find((m) => m.role === 'user')?.text || 'Khách hàng yêu cầu kết nối Tư vấn viên trực tiếp';
    const note =
      customNote ||
      `Đã điều hướng sang **Tư vấn viên trực tuyến**. Tư vấn viên đã nhận được hồ sơ và trạng thái cảm xúc hiện tại (**${this.emotionLabel}**) để hỗ trợ bạn ưu tiên ngay lập tức.`;
    this.messages.push({
      role: 'advisor',
      text: `👩‍💼 **[Tư vấn viên ẨN Store]:** ${note}`
    });
    this.store.createAdvisorTicket({
      customerName: this.store.getCurrentUser()?.fullName || 'Hoàng Lan',
      customerPhone: this.store.getCurrentUser()?.phone || '0704477397',
      emotionLevel: this.emotionLevel,
      emotionLabel: this.emotionLabel,
      originalMessage: lastUserMsg,
      softenedMessage: this.soothingPopup?.softenedText || lastUserMsg
    });
    this.persistState();
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  confirmSoothingTranslation(): void {
    if (!this.soothingPopup) return;
    const origText = this.soothingPopup.originalText;
    const politeText = this.soothingPopup.softenedText;
    this.soothingPopup = null;
    this.advisorMode = true;
    this.messages.push({
      role: 'user',
      text: `[Đã xác nhận chuyển ngữ lịch sự]: "${politeText}"`
    });
    this.messages.push({
      role: 'advisor',
      text: `👩‍💼 **[Tư vấn viên Chăm sóc KH - Ưu tiên ${this.emotionLevel === 'RED' ? 'ĐỎ' : 'CAM'}]:** Cảm ơn bạn đã xác nhận nội dung: *"${politeText}"*. Hồ sơ đã được chuyển tới Tab Tư vấn viên trên hệ thống quản trị để xử lý đổi mới / đền bù ngay trong 5 phút ạ!`
    });
    this.store.createAdvisorTicket({
      customerName: this.store.getCurrentUser()?.fullName || 'Hoàng Lan',
      customerPhone: this.store.getCurrentUser()?.phone || '0704477397',
      emotionLevel: this.emotionLevel,
      emotionLabel: this.emotionLabel,
      originalMessage: origText,
      softenedMessage: politeText
    });
    this.persistState();
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  dismissSoothingPopup(): void {
    this.soothingPopup = null;
    this.cdr.detectChanges();
  }

  viewProductFromChat(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  buyProductFromChat(productId: number): void {
    try {
      this.store.addToCart(productId, 1, 'Bản Tiêu Chuẩn');
      this.store.showToast('Đã thêm sản phẩm từ Thư Đồng vào giỏ!', false, 'Thanh toán', '/checkout');
      this.router.navigate(['/checkout']);
    } catch (err: any) {
      this.store.showToast(err?.message || 'Không thể mua ngay.', true);
    }
  }

  formatBotReply(text = ''): string {
    const escaped = String(text || '')
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const withBold = escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    const lines = withBold
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return '';

    const html: string[] = [];
    let listOpen = false;
    lines.forEach((line) => {
      const numbered = line.match(/^(\d+)\.\s+(.+)$/);
      const bullet = line.match(/^\*\s+(.+)$/);
      if (numbered || bullet) {
        if (!listOpen) {
          html.push('<ol class="chatbot-reply-list">');
          listOpen = true;
        }
        html.push(`<li>${numbered ? numbered[2] : bullet![1]}</li>`);
        return;
      }
      if (listOpen) {
        html.push('</ol>');
        listOpen = false;
      }
      html.push(`<p>${line}</p>`);
    });
    if (listOpen) html.push('</ol>');
    return html.join('');
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.loading) return;
    this.messages.push({ role: 'user', text });
    this.inputText = '';
    this.loading = true;
    this.open = true;

    // Phân tích cảm xúc tức thì ngay phía Client để thanh trạng thái Đỏ/Cam/Xanh & Pop-up xoa dịu phản hồi lập tức
    const localAnalysis = this.analyzeEmotionLocal(text);
    this.emotionLevel = localAnalysis.level;
    this.emotionColor = localAnalysis.color;
    this.emotionLabel = localAnalysis.label;
    if (localAnalysis.soothingPopup) {
      this.soothingPopup = localAnalysis.soothingPopup;
    }
    if (localAnalysis.needsAdvisor) {
      this.advisorMode = true;
    }

    this.persistState();
    this.cdr.detectChanges();
    this.scrollToBottom();

    try {
      const user = this.store.getCurrentUser();
      const res = await firstValueFrom(
        this.http.post<any>('/api/chatbot', {
          message: text,
          customerName: user?.fullName || 'Hoàng Lan',
          customerPhone: user?.phone || '0704477397',
          previousInteractionId: this.interactionId,
          page: document.title,
          path: window.location.pathname
        })
      );
      this.interactionId = res.interactionId || this.interactionId;
      if (res.emotion) {
        this.emotionLevel = res.emotion.level || localAnalysis.level;
        this.emotionColor = res.emotion.color || localAnalysis.color;
        this.emotionLabel = res.emotion.label || localAnalysis.label;
      } else if (res.emotionLevel) {
        this.emotionLevel = res.emotionLevel;
        this.emotionColor = res.emotionColor || localAnalysis.color;
        this.emotionLabel = res.emotionLabel || localAnalysis.label;
      }
      if (res.soothingPopup) {
        this.soothingPopup = {
          title: res.soothingPopup.title || localAnalysis.soothingPopup?.title || 'Hỗ trợ xoa dịu & Chuyển ngữ lịch sự',
          calmingText: res.soothingPopup.calmingText || res.soothingPopup.calmingMessage || localAnalysis.soothingPopup?.calmingText || '',
          originalText: res.soothingPopup.originalText || text,
          softenedText: res.soothingPopup.softenedText || res.soothingPopup.rephrasedText || localAnalysis.soothingPopup?.softenedText || text,
          confirmQuestion: res.soothingPopup.confirmQuestion || 'Có phải ý của bạn là như thế này không?'
        };
      }
      if (res.needsAdvisor) {
        this.advisorMode = true;
        this.store.syncStateFromBackend();
      }
      this.messages.push({
        role: 'bot',
        text: res.message || 'Mình chưa có phản hồi phù hợp lúc này.',
        recommendedProducts: Array.isArray(res.recommendedProducts) ? res.recommendedProducts : []
      });
    } catch (err: any) {
      const fallbackReply = localAnalysis.needsAdvisor
        ? 'Mình thật sự xin lỗi vì sự bất tiện này! **Thư Đồng** đã ghi nhận trạng thái ưu tiên (**' +
          localAnalysis.label +
          '**) và chuyển hồ sơ sang **Tư vấn viên trực tuyến** để hỗ trợ bạn ngay lập tức.'
        : err?.error?.message || 'Thư Đồng đang bận xử lý hồ sơ. Bạn thử lại sau ít phút nhé.';
      this.messages.push({
        role: 'bot',
        text: fallbackReply
      });
    } finally {
      this.loading = false;
      this.persistState();
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesList?.nativeElement) {
        this.messagesList.nativeElement.scrollTop = this.messagesList.nativeElement.scrollHeight;
      }
    }, 40);
  }
}
