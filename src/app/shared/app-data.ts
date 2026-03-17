export interface University {
  id: number;
  name: string;
  suburb: string;
  province: string;
  logo: string;
  image: string;
  openingDate: string;
  closingDate: string;
  closingDateNote?: string;
  status?: string;
  application_fee: number;
  link: string;
  webscrap_link: string;
  brochure_link: string;
  brochure_asset?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export const STUDY_FIELDS: SelectOption[] = [
  { value: '', label: 'All Fields' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'medicine', label: 'Medicine & Health Sciences' },
  { value: 'business', label: 'Business & Commerce' },
  { value: 'law', label: 'Law' },
  { value: 'arts', label: 'Arts & Humanities' },
  { value: 'science', label: 'Natural Sciences' },
  { value: 'social', label: 'Social Sciences' },
  { value: 'education', label: 'Education' },
  { value: 'it', label: 'Information Technology' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'architecture', label: 'Architecture & Built Environment' }
];

export const PROVINCES: SelectOption[] = [
  { value: '', label: 'All Provinces' },
  { value: 'western-cape', label: 'Western Cape' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'kwazulu-natal', label: 'KwaZulu-Natal' },
  { value: 'eastern-cape', label: 'Eastern Cape' },
  { value: 'free-state', label: 'Free State' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'north-west', label: 'North West' },
  { value: 'northern-cape', label: 'Northern Cape' }
];

export const STUDY_LEVELS: SelectOption[] = [
  { value: 'high-school', label: 'High School Learner' },
  { value: 'gap-year', label: 'Gap Year' },
  { value: 'undergraduate', label: 'Undergraduate Student' },
  { value: 'postgraduate', label: 'Postgraduate Student' },
  { value: 'working-professional', label: 'Working Professional' },
  { value: 'other', label: 'Other' }
];

export const INTEREST_OPTIONS: SelectOption[] = STUDY_FIELDS
  .filter((item) => item.value !== '')
  .map((item) => ({ value: item.value, label: item.label }));
