export type Language = 'en' | 'uz' | 'ru';

export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    next: string;
    submit: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    yes: string;
    no: string;
  };
  
  // Navigation
  nav: {
    home: string;
    dashboard: string;
    signIn: string;
    signUp: string;
    signOut: string;
    createEvent: string;
  };

  // Home page
  home: {
    hero: {
      title: string;
      subtitle: string;
      subtitle2: string;
      getStarted: string;
      seeHowItWorks: string;
      freeForever: string;
      noCreditCard: string;
      noRegistration: string;
    };
    howItWorks: {
      title: string;
      subtitle: string;
      step1: { title: string; description: string };
      step2: { title: string; description: string };
      step3: { title: string; description: string };
    };
  };

  // Auth
  auth: {
    signIn: string;
    signUp: string;
    email: string;
    password: string;
    name: string;
    forgotPassword: string;
    createAccount: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    verifyEmail: string;
    emailVerificationRequired: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    welcome: string;
    noEvents: string;
    createFirstEvent: string;
    eventOwner: string;
    eventParticipant: string;
    open: string;
    closed: string;
  };

  // Event
  event: {
    create: string;
    edit: string;
    title: string;
    description: string;
    currency: string;
    status: string;
    addExpense: string;
    addParticipant: string;
    expenses: string;
    balances: string;
    photos: string;
    participants: string;
    settlements: string;
    totalExpenses: string;
    yourBalance: string;
    paidBy: string;
    when: string;
    amount: string;
    split: string;
    equally: string;
    custom: string;
    update: string;
    closeEvent: string;
    deleteEvent: string;
    joinEvent: string;
    leaveEvent: string;
    copyUrl: string;
    qrCode: string;
    balanceHelp: string;
    noExpenses: string;
    eventClosed: string;
    paymentStatus: string;
    paid: string;
    pending: string;
    markAsPaid: string;
    noPhotos: string;
    noParticipants: string;
    noteFromOrganizer: string;
  };

  // Messages
  messages: {
    eventCreated: string;
    eventUpdated: string;
    eventDeleted: string;
    expenseAdded: string;
    expenseUpdated: string;
    expenseDeleted: string;
    participantAdded: string;
    participantRemoved: string;
    urlCopied: string;
    emailSent: string;
    verificationRequired: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
    },
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      createEvent: 'Create Event',
    },
    home: {
      hero: {
        title: 'Split Expenses. Settle Debts. No Hassle.',
        subtitle: 'The easiest way to track shared expenses with friends, roommates, and groups.',
        subtitle2: 'Free forever. No registration required for participants.',
        getStarted: 'Get Started Free',
        seeHowItWorks: 'See How It Works',
        freeForever: 'Free Forever',
        noCreditCard: 'No Credit Card',
        noRegistration: 'No Registration Needed',
      },
      howItWorks: {
        title: 'How It Works',
        subtitle: 'Three simple steps to start tracking and settling expenses',
        step1: {
          title: 'Create an Event',
          description: 'Start a new expense event, add a title and description. Get a shareable link or QR code instantly.',
        },
        step2: {
          title: 'Add Expenses',
          description: 'Track all shared expenses as they happen. Add receipts, split costs equally or custom amounts.',
        },
        step3: {
          title: 'Settle Up',
          description: 'When ready, close the event and get automatic settlement calculations. Minimized transactions for easy payments.',
        },
      },
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      email: 'Email Address',
      password: 'Password',
      name: 'Name',
      forgotPassword: 'Forgot password?',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      verifyEmail: 'Verify Email',
      emailVerificationRequired: 'Please verify your email address before signing in.',
    },
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome back',
      noEvents: 'No events yet',
      createFirstEvent: 'Create Your First Event',
      eventOwner: 'Owner',
      eventParticipant: 'Participant',
      open: 'Open',
      closed: 'Closed',
    },
    event: {
      create: 'Create New Event',
      edit: 'Edit Expense',
      title: 'Event Title',
      description: 'Description',
      currency: 'Currency',
      status: 'Status',
      addExpense: 'Add Expense',
      addParticipant: 'Add Participant Manually',
      expenses: 'Expenses',
      balances: 'Balances',
      photos: 'Photos',
      participants: 'Participants',
      settlements: 'Settlements',
      totalExpenses: 'Total Expenses',
      yourBalance: 'Your Balance',
      paidBy: 'Paid By',
      when: 'When',
      amount: 'Amount',
      split: 'Split',
      equally: 'Equally',
      custom: 'Custom',
      update: 'Update',
      closeEvent: 'Close Event',
      deleteEvent: 'Delete Event',
      joinEvent: 'Join This Event',
      leaveEvent: 'Leave Event',
      copyUrl: 'Copy URL',
      qrCode: 'QR Code',
      balanceHelp: 'Green numbers show money you should receive, red numbers show money you should pay.',
      noExpenses: 'No expenses yet.',
      eventClosed: 'This event is closed',
      paymentStatus: 'Payment Status',
      paid: 'Paid',
      pending: 'Pending',
      markAsPaid: 'Mark as Paid',
      noPhotos: 'No expenses with photos yet.',
      noParticipants: 'No participants yet.',
      noteFromOrganizer: 'Note from organizer:',
    },
    messages: {
      eventCreated: 'Event created successfully!',
      eventUpdated: 'Event updated successfully!',
      eventDeleted: 'Event deleted successfully!',
      expenseAdded: 'Expense added successfully!',
      expenseUpdated: 'Expense updated successfully!',
      expenseDeleted: 'Expense deleted successfully!',
      participantAdded: 'Participant added successfully!',
      participantRemoved: 'Participant removed successfully!',
      urlCopied: 'URL copied to clipboard!',
      emailSent: 'Email sent successfully!',
      verificationRequired: 'Please verify your email before signing in.',
    },
  },
  uz: {
    common: {
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      delete: "O'chirish",
      edit: 'Tahrirlash',
      close: 'Yopish',
      back: 'Orqaga',
      next: 'Keyingi',
      submit: 'Yuborish',
      loading: 'Yuklanmoqda...',
      error: 'Xatolik',
      success: 'Muvaffaqiyat',
      confirm: 'Tasdiqlash',
      yes: 'Ha',
      no: "Yo'q",
    },
    nav: {
      home: 'Bosh sahifa',
      dashboard: 'Boshqaruv paneli',
      signIn: 'Kirish',
      signUp: 'Ro\'yxatdan o\'tish',
      signOut: 'Chiqish',
      createEvent: 'Tadbir yaratish',
    },
    home: {
      hero: {
        title: 'Xarajatlarni bo\'lish. Qarzlar. Muammosiz.',
        subtitle: 'Do\'stlar, xonadoshlar va guruhlar bilan umumiy xarajatlarni kuzatishning eng oson usuli.',
        subtitle2: 'Abadiy bepul. Ishtirokchilar uchun ro\'yxatdan o\'tish shart emas.',
        getStarted: 'Bepul boshlash',
        seeHowItWorks: 'Qanday ishlashini ko\'rish',
        freeForever: 'Doimiy bepul',
        noCreditCard: 'Kredit karta kerak emas',
        noRegistration: 'Ro\'yxatdan o\'tish shart emas',
      },
      howItWorks: {
        title: 'Qanday ishlaydi',
        subtitle: 'Xarajatlarni kuzatish va to\'lash uchun uchta oddiy qadam',
        step1: {
          title: 'Tadbir yaratish',
          description: 'Yangi xarajat tadbirini boshlang, sarlavha va tavsif qo\'shing. Darhol ulashiladigan havola yoki QR kod oling.',
        },
        step2: {
          title: 'Xarajatlar qo\'shish',
          description: 'Barcha umumiy xarajatlarni real vaqtda kuzating. Kvitansiyalar qo\'shing, xarajatlarni teng yoki maxsus miqdorda bo\'ling.',
        },
        step3: {
          title: 'To\'lash',
          description: 'Tayyor bo\'lganda, tadbirni yoping va avtomatik to\'lov hisob-kitoblarini oling. Oson to\'lovlar uchun minimallashtirilgan tranzaksiyalar.',
        },
      },
    },
    auth: {
      signIn: 'Kirish',
      signUp: 'Ro\'yxatdan o\'tish',
      email: 'Elektron pochta',
      password: 'Parol',
      name: 'Ism',
      forgotPassword: 'Parolni unutdingizmi?',
      createAccount: 'Hisob yaratish',
      alreadyHaveAccount: 'Allaqachon hisobingiz bormi?',
      dontHaveAccount: 'Hisobingiz yo\'qmi?',
      verifyEmail: 'Elektron pochtani tasdiqlash',
      emailVerificationRequired: 'Kirishdan oldin elektron pochtangizni tasdiqlang.',
    },
    dashboard: {
      title: 'Boshqaruv paneli',
      welcome: 'Xush kelibsiz',
      noEvents: 'Hali tadbirlar yo\'q',
      createFirstEvent: 'Birinchi tadbirni yarating',
      eventOwner: 'Egasi',
      eventParticipant: 'Ishtirokchi',
      open: 'Ochiq',
      closed: 'Yopiq',
    },
    event: {
      create: 'Yangi tadbir yaratish',
      edit: 'Xarajatni tahrirlash',
      title: 'Tadbir nomi',
      description: 'Tavsif',
      currency: 'Valyuta',
      status: 'Holat',
      addExpense: 'Xarajat qo\'shish',
      addParticipant: 'Ishtirokchini qo\'lda qo\'shish',
      expenses: 'Xarajatlar',
      balances: 'Balanslar',
      photos: 'Rasmlar',
      participants: 'Ishtirokchilar',
      settlements: 'To\'lovlar',
      totalExpenses: 'Jami xarajatlar',
      yourBalance: 'Sizning balansingiz',
      paidBy: 'To\'lagan',
      when: 'Qachon',
      amount: 'Summa',
      split: 'Bo\'lish',
      equally: 'Teng',
      custom: 'Maxsus',
      update: 'Yangilash',
      closeEvent: 'Tadbirni yopish',
      deleteEvent: 'Tadbirni o\'chirish',
      joinEvent: 'Bu tadbirga qo\'shilish',
      leaveEvent: 'Tadbirdan chiqish',
      copyUrl: 'URL nusxalash',
      qrCode: 'QR kod',
      balanceHelp: 'Yashil raqamlar olishingiz kerak bo\'lgan pulni, qizil raqamlar to\'lashingiz kerak bo\'lgan pulni ko\'rsatadi.',
      noExpenses: 'Hali xarajatlar yo\'q.',
      eventClosed: 'Bu tadbir yopilgan',
      paymentStatus: 'To\'lov holati',
      paid: 'To\'langan',
      pending: 'Kutilmoqda',
      markAsPaid: 'To\'langan deb belgilash',
      noPhotos: 'Hali rasmlar bilan xarajatlar yo\'q.',
      noParticipants: 'Hali ishtirokchilar yo\'q.',
      noteFromOrganizer: 'Tashkilotchidan eslatma:',
    },
    messages: {
      eventCreated: 'Tadbir muvaffaqiyatli yaratildi!',
      eventUpdated: 'Tadbir muvaffaqiyatli yangilandi!',
      eventDeleted: 'Tadbir muvaffaqiyatli o\'chirildi!',
      expenseAdded: 'Xarajat muvaffaqiyatli qo\'shildi!',
      expenseUpdated: 'Xarajat muvaffaqiyatli yangilandi!',
      expenseDeleted: 'Xarajat muvaffaqiyatli o\'chirildi!',
      participantAdded: 'Ishtirokchi muvaffaqiyatli qo\'shildi!',
      participantRemoved: 'Ishtirokchi muvaffaqiyatli olib tashlandi!',
      urlCopied: 'URL xotiraga nusxalandi!',
      emailSent: 'Elektron pochta muvaffaqiyatli yuborildi!',
      verificationRequired: 'Kirishdan oldin elektron pochtangizni tasdiqlang.',
    },
  },
  ru: {
    common: {
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      close: 'Закрыть',
      back: 'Назад',
      next: 'Далее',
      submit: 'Отправить',
      loading: 'Загрузка...',
      error: 'Ошибка',
      success: 'Успешно',
      confirm: 'Подтвердить',
      yes: 'Да',
      no: 'Нет',
    },
    nav: {
      home: 'Главная',
      dashboard: 'Панель управления',
      signIn: 'Войти',
      signUp: 'Регистрация',
      signOut: 'Выйти',
      createEvent: 'Создать событие',
    },
    home: {
      hero: {
        title: 'Разделяйте расходы. Урегулируйте долги. Без проблем.',
        subtitle: 'Самый простой способ отслеживать общие расходы с друзьями, соседями и группами.',
        subtitle2: 'Бесплатно навсегда. Регистрация не требуется для участников.',
        getStarted: 'Начать бесплатно',
        seeHowItWorks: 'Как это работает',
        freeForever: 'Навсегда бесплатно',
        noCreditCard: 'Без кредитной карты',
        noRegistration: 'Регистрация не требуется',
      },
      howItWorks: {
        title: 'Как это работает',
        subtitle: 'Три простых шага для начала отслеживания и урегулирования расходов',
        step1: {
          title: 'Создайте событие',
          description: 'Начните новое событие расходов, добавьте название и описание. Получите ссылку для sharing или QR-код мгновенно.',
        },
        step2: {
          title: 'Добавьте расходы',
          description: 'Отслеживайте все общие расходы по мере их возникновения. Добавляйте чеки, делите расходы поровну или на произвольные суммы.',
        },
        step3: {
          title: 'Рассчитайтесь',
          description: 'Когда будете готовы, закройте событие и получите автоматические расчеты расчетов. Минимизированные транзакции для легких платежей.',
        },
      },
    },
    auth: {
      signIn: 'Войти',
      signUp: 'Регистрация',
      email: 'Электронная почта',
      password: 'Пароль',
      name: 'Имя',
      forgotPassword: 'Забыли пароль?',
      createAccount: 'Создать аккаунт',
      alreadyHaveAccount: 'Уже есть аккаунт?',
      dontHaveAccount: 'Нет аккаунта?',
      verifyEmail: 'Подтвердить email',
      emailVerificationRequired: 'Пожалуйста, подтвердите вашу электронную почту перед входом.',
    },
    dashboard: {
      title: 'Панель управления',
      welcome: 'Добро пожаловать',
      noEvents: 'Событий пока нет',
      createFirstEvent: 'Создайте ваше первое событие',
      eventOwner: 'Владелец',
      eventParticipant: 'Участник',
      open: 'Открыто',
      closed: 'Закрыто',
    },
    event: {
      create: 'Создать новое событие',
      edit: 'Редактировать расход',
      title: 'Название события',
      description: 'Описание',
      currency: 'Валюта',
      status: 'Статус',
      addExpense: 'Добавить расход',
      addParticipant: 'Добавить участника вручную',
      expenses: 'Расходы',
      balances: 'Балансы',
      photos: 'Фото',
      participants: 'Участники',
      settlements: 'Расчеты',
      totalExpenses: 'Всего расходов',
      yourBalance: 'Ваш баланс',
      paidBy: 'Оплатил',
      when: 'Когда',
      amount: 'Сумма',
      split: 'Разделить',
      equally: 'Поровну',
      custom: 'Произвольно',
      update: 'Обновить',
      closeEvent: 'Закрыть событие',
      deleteEvent: 'Удалить событие',
      joinEvent: 'Присоединиться к событию',
      leaveEvent: 'Покинуть событие',
      copyUrl: 'Копировать URL',
      qrCode: 'QR-код',
      balanceHelp: 'Зеленые числа показывают деньги, которые вы должны получить, красные числа показывают деньги, которые вы должны заплатить.',
      noExpenses: 'Пока нет расходов.',
      eventClosed: 'Это событие закрыто',
      paymentStatus: 'Статус оплаты',
      paid: 'Оплачено',
      pending: 'Ожидает',
      markAsPaid: 'Отметить как оплаченное',
      noPhotos: 'Пока нет расходов с фото.',
      noParticipants: 'Пока нет участников.',
      noteFromOrganizer: 'Примечание от организатора:',
    },
    messages: {
      eventCreated: 'Событие успешно создано!',
      eventUpdated: 'Событие успешно обновлено!',
      eventDeleted: 'Событие успешно удалено!',
      expenseAdded: 'Расход успешно добавлен!',
      expenseUpdated: 'Расход успешно обновлен!',
      expenseDeleted: 'Расход успешно удален!',
      participantAdded: 'Участник успешно добавлен!',
      participantRemoved: 'Участник успешно удален!',
      urlCopied: 'URL скопирован в буфер обмена!',
      emailSent: 'Электронная почта успешно отправлена!',
      verificationRequired: 'Пожалуйста, подтвердите вашу электронную почту перед входом.',
    },
  },
};
