import { Directive, ElementRef, ViewChild } from '@angular/core';
import { ContentPage } from './content-page';

@Directive()
export abstract class DetailPage extends ContentPage {
  @ViewChild('detailDialog') detailDialog?: ElementRef<HTMLDialogElement>;
  detail: { title: string; label: string; paragraphs: string[]; enquiry?: string } | null = null;
  openDetail(title: string, label: string, paragraphs: string[], enquiry?: string) {
    this.detail = { title, label, paragraphs, enquiry };
    this.detailDialog?.nativeElement.showModal();
  }
  closeDetail() { this.detailDialog?.nativeElement.close(); }
}
