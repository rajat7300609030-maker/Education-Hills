
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS',
  STUDENT_PROFILE = 'STUDENT_PROFILE',
  PARENT_PROFILE = 'PARENT_PROFILE',
  EMPLOYEES = 'EMPLOYEES',
  EMPLOYEE_PROFILE = 'EMPLOYEE_PROFILE',
  FEES = 'FEES',
  EXPENSES = 'EXPENSES',
  RECYCLE_BIN = 'RECYCLE_BIN',
  SCHOOL_PROFILE = 'SCHOOL_PROFILE',
  USER_PROFILE = 'USER_PROFILE',
  SETTINGS = 'SETTINGS'
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  parentName: string;
  phone: string;
  email: string;
  enrollmentDate: string;
  session?: string;
  isDeleted: boolean;
  deletedAt?: string;
  photo?: string;
  dob?: string;
  address?: string;
  totalAgreedFees?: number;
  backLogs?: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  salary: number;
  phone: string;
  email: string;
  joiningDate: string;
  dob?: string;
  password?: string;
  status: 'Active' | 'Resigned';
  photo?: string;
  isDeleted: boolean;
  deletedAt?: string;
  session?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  type: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentMethod?: 'Cash' | 'UPI' | 'Online' | 'Bank Transfer' | 'Cheque';
  description?: string;
  isDeleted: boolean;
  deletedAt?: string;
  session?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: 'Salary' | 'Maintenance' | 'Utilities' | 'Supplies' | 'Events' | 'Other';
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque';
  description?: string;
  isDeleted: boolean;
  deletedAt?: string;
  session?: string;
}

export interface SchoolProfileData {
  name: string;
  address: string;
  contactEmail: string;
  contactNumber?: string;
  motto: string;
  website: string;
  sessions: string[];
  currentSession: string;
  logo?: string;
  logoSize?: number;
  banner?: string;
  bannerEffect?: 'Standard' | 'Blur' | 'Sepia' | 'Grayscale' | 'Dark';
  affiliationNumber?: string;
  principalName?: string;
  board?: string;
  establishedYear?: string;
  termsAndConditions?: string;
  authorizedSignature?: string;
  departments?: string[];
}

export interface UserProfileData {
  name: string;
  role: string;
  email: string;
  bio: string;
  userId: string;
  dateOfBirth: string;
  contactNumber: string;
  photo?: string;
  joiningDate?: string;
  address?: string;
}

export interface SliderImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'vibrant' | 'midnight' | 'sunset' | 'forest' | 'system' | 'glass-light' | 'glass-dark' | 'glass-vibrant' | 'glass-midnight' | 'glass-sunset' | 'glass-forest';
  fontSize: number;
  language: string;
  enableNotifications: boolean;
  enableAutoBackup: boolean;
  currency: string;
  notificationLimit: number;
  notificationStyle: 'Modern' | 'Minimal' | 'Vibrant' | 'Glass' | 'Pill' | 'Retro' | 'Dark' | 'Gradient' | 'Outline' | 'Float';
  studentAnimationStyle?: 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'flip';
  enableHapticFeedback?: boolean;
  enableLateFees: boolean;
  lateFeePercentage: number;
  lateFeeGracePeriod: number;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  sidebarAutoCollapse?: boolean;
  imageSlider: {
    enabled: boolean;
    autoplay: boolean;
    interval: number;
    images: SliderImage[];
    showDots?: boolean;
    showArrows?: boolean;
  };
  security: {
    enableAppLock: boolean;
    lockTimeout: number;
    pin?: string;
    requirePinForExport?: boolean;
  };
}

export interface AppData {
  students: Student[];
  employees: Employee[];
  classes: string[];
  feeCategories: string[];
  fees: FeeRecord[];
  expenses: ExpenseRecord[];
  schoolProfile: SchoolProfileData;
  userProfile: UserProfileData;
  settings: AppSettings;
}