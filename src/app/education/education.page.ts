import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { schoolOutline, peopleOutline, calendarOutline, barChartOutline, playCircleOutline, bulbOutline, arrowForwardOutline, arrowBackOutline, checkmarkOutline, heartOutline, flagOutline, compassOutline, locationOutline, mailOutline, closeOutline } from 'ionicons/icons';
import { FooterComponent } from '../footer/footer.component';
import { services, universities, tutors, stories, articles } from './education.data';

@Component({ selector: 'app-education', standalone: true, imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, FooterComponent], templateUrl: './education.page.html', styleUrls: ['./education.page.scss'] })
export class EducationPage implements OnInit {
  @ViewChild('detailDialog') detailDialog?: ElementRef<HTMLDialogElement>;
  page = 'home';
  titles: Record<string, string[]> = {
    home: ['Empowering students. Building brighter futures.', 'Academic support, personal guidance, and a little more confidence for the journey ahead.'],
    about: ['About Smith Education Group', 'Education. Opportunity. Growth.'],
    services: ['Our Services', 'Support for every stage of your academic journey.'],
    universities: ['Universities & Modules', 'Find support for your university and the subjects you study.'],
    tutors: ['Meet Our Tutors', 'A personal approach to learning. A shared commitment to your progress.'],
    stories: ['Student Success Stories', 'Every student has a story. We look forward to sharing yours.'],
    resources: ['Academic Resources', 'Study tips, fresh perspectives, and practical guides.'],
    contact: ['Get in Touch', 'Your next chapter starts with a conversation.']
  };
  services = services; universities = universities; tutors = tutors; stories = stories; articles = articles;
  university = 'All'; faculty = 'All'; module = ''; subject = 'All'; category = 'All'; storyIndex = 0;
  universityTabs = ['All', 'UCT', 'Stellenbosch', 'Wits', 'UP', 'Other'];
  subjects = ['All', 'Accounting', 'Economics', 'Finance', 'Statistics', 'Business Management'];
  categories = ['All', 'Study Tips', 'Exam Preparation', 'University Life', 'Module Guides'];
  detail: { title: string; label: string; paragraphs: string[]; enquiry?: string } | null = null;
  enquiry = { name: '', email: '', phone: '', type: '', message: '', consent: false };
  formStatus = '';
  ngOnInit() { this.refreshPage(); }
  ionViewWillEnter() { this.refreshPage(); }
  private refreshPage() {
    this.page = this.route.snapshot.data['page'] || 'home';
    this.title.setTitle(`${this.titles[this.page][0]} | Smith Education Group`);
    this.meta.updateTag({ name: 'description', content: this.titles[this.page][1] });
    this.meta.updateTag({ property: 'og:title', content: this.title.getTitle() });
    this.meta.updateTag({ property: 'og:description', content: this.titles[this.page][1] });
    this.meta.updateTag({ name: 'twitter:title', content: this.title.getTitle() });
    this.meta.updateTag({ name: 'twitter:description', content: this.titles[this.page][1] });
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type) this.enquiry.type = type;
    const about = this.route.snapshot.queryParamMap.get('about');
    if (about) this.enquiry.message = `I would like to enquire about ${about}.`;
  }
  constructor(private route: ActivatedRoute, private title: Title, private meta: Meta) {
    addIcons({ schoolOutline, peopleOutline, calendarOutline, barChartOutline, playCircleOutline, bulbOutline, arrowForwardOutline, arrowBackOutline, checkmarkOutline, heartOutline, flagOutline, compassOutline, locationOutline, mailOutline, closeOutline });
  }
  get filteredUniversities() {
    return this.universities.filter(u => (this.university === 'All' || u.short === this.university) && u.modules.some(m => (!this.module || m.toLowerCase().includes(this.module.toLowerCase())) && (this.faculty === 'All' || (this.faculty === 'Science' ? /statistics|analytics/i.test(m) : !/statistics|analytics/i.test(m)))));
  }
  get filteredTutors() { return this.tutors.filter(t => this.subject === 'All' || t.subject === this.subject); }
  get filteredArticles() { return this.articles.filter(a => this.category === 'All' || a.category === this.category); }
  changeStory(step: number) { this.storyIndex = (this.storyIndex + step + this.stories.length) % this.stories.length; }
  openDetail(title: string, label: string, paragraphs: string[], enquiry?: string) {
    this.detail = { title, label, paragraphs, enquiry };
    this.detailDialog?.nativeElement.showModal();
  }
  closeDetail() { this.detailDialog?.nativeElement.close(); }
  saveEnquiry(form: NgForm) {
    this.formStatus = '';
    if (form.invalid || !this.enquiry.name.trim() || !this.enquiry.message.trim()) { form.control.markAllAsTouched(); this.formStatus = 'Please complete your name, a valid email, enquiry type, message, and consent.'; return; }
    try {
      localStorage.setItem('smith-enquiry-draft', JSON.stringify(this.enquiry));
      this.formStatus = 'Your enquiry draft is saved on this device. It has not been sent; contact details are still being confirmed.';
    } catch { this.formStatus = 'This browser could not save the draft. Please copy your message to keep it.'; }
  }
  restoreDraft() {
    try { const raw = localStorage.getItem('smith-enquiry-draft'); if (raw) { this.enquiry = { ...this.enquiry, ...JSON.parse(raw) }; this.formStatus = 'Saved draft restored.'; } else this.formStatus = 'There is no saved draft on this device.'; }
    catch { this.formStatus = 'The saved draft could not be restored.'; }
  }
  clearDraft() { try { localStorage.removeItem('smith-enquiry-draft'); this.formStatus = 'Saved draft deleted from this device.'; } catch { this.formStatus = 'Browser storage is unavailable.'; } }
}
