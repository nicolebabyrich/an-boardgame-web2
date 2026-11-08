import { Component, HostListener } from '@angular/core';
import { StoreApiService } from '../services/store-api.service';
import { BlogPost } from '../classes/BlogPost';
import { User } from '../classes/User';

@Component({
  selector: 'app-blog-component',
  standalone: false,
  templateUrl: './blog-component.html',
  styleUrl: './blog-component.css'
})
export class BlogComponent {
  isModalOpen = false;
  selectedPost: BlogPost | null = null;
  blogMessage = '';
  blogSuccess = false;
  blogFormError = '';

  blogForm = {
    title: '',
    excerpt: '',
    content: '',
    imageName: ''
  };

  // Bộ lọc từ ngữ tục tĩu / chửi bậy / khiếm nhã tiếng Việt
  readonly badWords = [
    'đm', 'dm', 'dcm', 'đcm', 'vcl', 'vl', 'clmm', 'đkm', 'dkm', 'đmm', 'dmm',
    'lừa đảo', 'con cặc', 'cặc', 'lồn', 'buồi', 'đĩ', 'chó đẻ', 'chó chết',
    'đù má', 'du ma', 'ngu học', 'óc chó', 'vãi lồn', 'mẹ mày', 'bố mày',
    'thằng chó', 'đm mày', 'địt', 'đụ', 'đéo', 'deo', 'vkl', 'đĩ mẹ', 'ngu lol', 'dcmm'
  ];

  constructor(public store: StoreApiService) {}

  get user(): User | null {
    return this.store.getCurrentUser();
  }

  get posts(): BlogPost[] {
    return this.store.getPublishedBlogs();
  }

  openPostDetail(post: BlogPost): void {
    this.selectedPost = post;
  }

  closePostDetail(): void {
    this.selectedPost = null;
  }

  openModal(): void {
    this.blogFormError = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.blogFormError = '';
    this.isModalOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedPost) this.closePostDetail();
    if (this.isModalOpen) this.closeModal();
  }

  onImageFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.blogForm.imageName = file.name;
      this.blogMessage = 'Đã nhận ảnh ' + file.name + '. Ảnh sẽ được dùng sau khi bài viết được duyệt.';
      this.blogSuccess = true;
    }
  }

  validateBlogContent(): boolean {
    this.blogFormError = '';
    const title = (this.blogForm.title || '').trim().toLowerCase();
    const content = (this.blogForm.content || '').trim().toLowerCase();
    const excerpt = (this.blogForm.excerpt || '').trim().toLowerCase();

    if (!title || title.length < 6) {
      this.blogFormError = 'Tiêu đề bài viết là bắt buộc và phải có tối thiểu 6 ký tự.';
      return false;
    }
    if (!content || content.length < 20) {
      this.blogFormError = 'Nội dung trải nghiệm là bắt buộc và phải có tối thiểu 20 ký tự.';
      return false;
    }

    const fullText = `${title} ${excerpt} ${content}`;
    for (const bad of this.badWords) {
      const regex = new RegExp(`(^|\\s|[.,!?;])${bad}($|\\s|[.,!?;])`, 'i');
      if (regex.test(fullText) || fullText.includes(bad)) {
        this.blogFormError = `Hệ thống phát hiện ngôn từ chưa chuẩn mực hoặc thiếu văn minh ("${bad}"). Vui lòng chỉnh sửa lại lời văn trước khi gửi duyệt.`;
        return false;
      }
    }
    return true;
  }

  async onSubmitBlog(): Promise<void> {
    if (!this.validateBlogContent()) {
      return;
    }

    try {
      await this.store.submitUserBlog({
        title: this.blogForm.title.trim(),
        excerpt: this.blogForm.excerpt.trim(),
        content: this.blogForm.content.trim(),
        imageName: this.blogForm.imageName
      });
      this.blogForm = { title: '', excerpt: '', content: '', imageName: '' };
      this.closeModal();
      this.blogMessage = 'Đã gửi bài viết thành công. Quản trị viên sẽ duyệt trước khi công bố trên Blog.';
      this.blogSuccess = true;
      this.store.showToast('Đã gửi bài viết chia sẻ thành công!');
    } catch (err: any) {
      this.blogFormError = err?.message || 'Không thể gửi bài viết.';
      this.blogMessage = this.blogFormError;
      this.blogSuccess = false;
    }
  }
}
