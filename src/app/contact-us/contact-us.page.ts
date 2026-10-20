import { addIcons } from 'ionicons';
import { logoWhatsapp } from 'ionicons/icons';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { ContentPage } from '../shared/content-page';
const services = [
  {
    "title": "University Tutoring",
    "icon": "school-outline",
    "text": "Expert support for the modules that matter to you.",
    "detail": "Work through challenging concepts, practise module questions, and build a study plan around your university coursework."
  },
  {
    "title": "School Tutoring",
    "icon": "school-outline",
    "text": "Personalised subject support for Grades 4–12.",
    "detail": "Build understanding in Maths, Physics, Economics, Life Science and Accounting, with lessons suited to the learner’s grade and curriculum. Confirm subject availability for your grade on enquiry."
  },
  {
    "title": "Private Tutoring",
    "icon": "people-outline",
    "text": "One-on-one sessions tailored to your learning needs.",
    "detail": "Individual learning support shaped around your goals, pace, and areas of difficulty. Enquire about subject and tutor availability."
  },
  {
    "title": "Revision Camps",
    "icon": "calendar-outline",
    "text": "Focused preparation. A more confident exam season.",
    "detail": "Structured revision covering core concepts, practice questions, and exam technique. Enquire about upcoming dates and subjects."
  },
  {
    "title": "Academic Workshops",
    "icon": "bar-chart-outline",
    "text": "Build study skills that stay with you.",
    "detail": "Explore time management, effective note-taking, academic writing, and exam preparation in guided group sessions."
  },
  {
    "title": "Recorded Learning Packages",
    "icon": "play-circle-outline",
    "text": "Revisit the lesson. Learn at your own pace.",
    "detail": "Register your interest in recorded lessons and supporting study materials for your module."
  },
  {
    "title": "Learning & Development",
    "icon": "bulb-outline",
    "text": "More opportunities to learn and grow.",
    "detail": "Tell us about your academic and career goals to discuss your learning and development needs."
  }
];

const universities = [
  {
    "name": "University of the Witwatersrand",
    "short": "Wits",
    "image": "assets/logos/wits.svg",
    "province": "Gauteng",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "University of Cape Town",
    "short": "UCT",
    "image": "assets/logos/uct.svg",
    "province": "Western Cape",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "Stellenbosch University",
    "short": "Stellies",
    "image": "assets/logos/su.svg",
    "province": "Western Cape",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "University of Pretoria",
    "short": "UP",
    "image": "assets/logos/up.svg",
    "province": "Gauteng",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "Varsity College",
    "short": "Varsity College",
    "image": "",
    "province": "Multiple provinces",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  }
];

@Component({ selector: 'app-contact-us', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, FooterComponent], templateUrl: './contact-us.page.html', styleUrls: ['./contact-us.page.scss'] })
export class ContactUsPage extends ContentPage {
  readonly seo = {
  "title": "Contact Us for Tutoring | Smith Education Group",
  "description": "Enquire about school or university tutoring. WhatsApp +27 62 409 7103 or email info@smitheducationgroup.co.za to discuss your learning goals.",
  "path": "/tabs/contact-us",
  "index": true
};
  constructor() { super(); addIcons({ logoWhatsapp }); }
  readonly pageTitle = "Get in Touch";
  readonly pageDescription = "Your next chapter starts with a conversation.";
  private readonly route = inject(ActivatedRoute);
  services = services;
  enquiry = { name: '', email: '', phone: '', university: '', type: '', message: '', consent: false };
  submitting = false;
  website = '';
  formStatus = '';
  override ngOnInit(): void { super.ngOnInit(); this.prefillEnquiry(); }
  override ionViewWillEnter(): void { super.ionViewWillEnter(); this.prefillEnquiry(); }
  private prefillEnquiry(): void {
    const params = this.route.snapshot.queryParamMap;
    const university = params.get('university');
    if (university) this.enquiry.university = universities.find(item => [item.name, item.short].includes(university))?.name ?? university;
    const type = params.get('type');
    if (type) this.enquiry.type = type;
    const about = params.get('about');
    if (about) this.enquiry.message = `I would like to enquire about ${about}.`;
  }
  preparePartnership(form: HTMLFormElement) {
    this.enquiry.type = 'University Partnership';
    const field = form.querySelector<HTMLSelectElement>('select[name="type"]');
    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  async submitEnquiry(form: NgForm, element: HTMLFormElement): Promise<void> {
    if (this.submitting) return;
    this.formStatus = '';
    if (form.invalid || !this.enquiry.name.trim() || !this.enquiry.message.trim()) {
      form.control.markAllAsTouched();
      this.formStatus = 'Please complete the required fields highlighted below.';
      element.querySelector<HTMLElement>('.ng-invalid')?.focus();
      return;
    }
    this.submitting = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/contact.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...this.enquiry, website: this.website }), signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error('Submission failed');
      form.resetForm({ name: '', email: '', phone: '', university: '', type: '', message: '', consent: false });
      this.formStatus = 'Thank you. Your enquiry has been submitted. Our team will be in touch.';
    } catch {
      this.formStatus = 'We could not confirm your submission. Your details are still here. Please try again or email info@smitheducationgroup.co.za.';
    } finally {
      clearTimeout(timeout);
      this.submitting = false;
    }
  }
}
